// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SkillClaim.sol";

/// @title BountyVault - Liquidity pool for skill verification bounties
/// @notice Allows companies to deposit USDC and users to claim bounties for verified skills
/// @dev Contract with role-based access control, reentrancy protection, and cooldown periods
contract BountyVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Role identifier for company/employer operations
    bytes32 public constant EMPLOYER_ROLE = keccak256("EMPLOYER_ROLE");

    /// @notice Reference to SkillClaim contract for verification checks
    SkillClaim public skillClaim;

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice Fixed bounty amount per claim (50 USDC with 6 decimals)
    uint256 public constant BOUNTY_AMOUNT = 50 * 10 ** 6;

    /// @notice Cooldown period between claims (30 days)
    uint256 public constant CLAIM_COOLDOWN = 30 days;

    /// @notice Maximum string length for skill tags
    uint256 public constant MAX_STRING_LENGTH = 100;

    /// @notice Represents a skill pool funded by employers
    struct SkillPool {
        string skillTag;
        uint256 totalDeposited;
        uint256 totalClaimed;
        uint256 availableBalance;
        bool active;
    }

    /// @notice Mapping from skill tag hash to pool data
    mapping(bytes32 => SkillPool) public skillPools;

    /// @notice Mapping from user address => skill tag hash => last claim timestamp
    mapping(address => mapping(bytes32 => uint256)) public lastClaimTime;

    /// @notice Mapping from user address => skill tag hash => has claimed
    mapping(address => mapping(bytes32 => bool)) public hasClaimed;

    /// @notice Array of all skill tag hashes for enumeration
    bytes32[] public skillTagHashes;

    /// @notice Mapping to check if skill tag hash exists
    mapping(bytes32 => bool) public skillTagExists;

    /// @notice Emitted when an employer deposits USDC into a skill pool
    event PoolDeposit(
        address indexed employer,
        string indexed skillTag,
        bytes32 indexed skillTagHash,
        uint256 amount,
        uint256 newBalance
    );

    /// @notice Emitted when a user claims a bounty
    event BountyClaimed(
        address indexed claimant,
        string indexed skillTag,
        bytes32 indexed skillTagHash,
        uint256 claimId,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when a skill pool is created
    event PoolCreated(string indexed skillTag, bytes32 indexed skillTagHash);

    /// @notice Emitted when a skill pool is deactivated
    event PoolDeactivated(string indexed skillTag, bytes32 indexed skillTagHash);

    /// @notice Emitted when an employer withdraws from a pool
    event PoolWithdrawal(
        address indexed employer,
        string indexed skillTag,
        bytes32 indexed skillTagHash,
        uint256 amount,
        uint256 remainingBalance
    );

    /// @notice Thrown when skill tag is empty or too long
    error InvalidSkillTag();

    /// @notice Thrown when deposit amount is zero
    error ZeroDepositAmount();

    /// @notice Thrown when pool has insufficient balance
    error InsufficientPoolBalance();

    /// @notice Thrown when claim is not verified
    error ClaimNotVerified();

    /// @notice Thrown when user has already claimed for this skill
    error AlreadyClaimed();

    /// @notice Thrown when cooldown period has not elapsed
    error CooldownNotElapsed();

    /// @notice Thrown when skill pool does not exist
    error PoolDoesNotExist();

    /// @notice Thrown when skill pool is inactive
    error PoolInactive();

    /// @notice Thrown when claim does not match skill tag
    error SkillMismatch();

    /// @notice Thrown when withdrawal amount exceeds available balance
    error WithdrawalExceedsBalance();

    /// @notice Constructor
    /// @param _skillClaim Address of SkillClaim contract
    /// @param _usdc Address of USDC token contract
    constructor(address _skillClaim, address _usdc) {
        require(_skillClaim != address(0), "Invalid SkillClaim address");
        require(_usdc != address(0), "Invalid USDC address");

        skillClaim = SkillClaim(_skillClaim);
        usdc = IERC20(_usdc);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /// @notice Deposit USDC into a skill pool
    /// @param skillTag The skill tag identifier (e.g., "Solidity")
    /// @param amount Amount of USDC to deposit (with 6 decimals)
    function depositToPool(string calldata skillTag, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        onlyRole(EMPLOYER_ROLE)
    {
        if (bytes(skillTag).length == 0 || bytes(skillTag).length > MAX_STRING_LENGTH) {
            revert InvalidSkillTag();
        }
        if (amount == 0) revert ZeroDepositAmount();

        bytes32 skillTagHash = keccak256(abi.encodePacked(skillTag));

        // Create pool if it doesn't exist
        if (!skillTagExists[skillTagHash]) {
            skillPools[skillTagHash] = SkillPool({
                skillTag: skillTag,
                totalDeposited: 0,
                totalClaimed: 0,
                availableBalance: 0,
                active: true
            });
            skillTagHashes.push(skillTagHash);
            skillTagExists[skillTagHash] = true;
            emit PoolCreated(skillTag, skillTagHash);
        }

        SkillPool storage pool = skillPools[skillTagHash];
        if (!pool.active) revert PoolInactive();

        // Transfer USDC from employer to contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update pool balances
        pool.totalDeposited += amount;
        pool.availableBalance += amount;

        emit PoolDeposit(msg.sender, skillTag, skillTagHash, amount, pool.availableBalance);
    }

    /// @notice Claim bounty for a verified skill claim
    /// @param claimId The ID of the verified claim
    /// @param skillTag The skill tag to claim bounty for
    function claimBounty(uint256 claimId, string calldata skillTag)
        external
        whenNotPaused
        nonReentrant
    {
        if (bytes(skillTag).length == 0 || bytes(skillTag).length > MAX_STRING_LENGTH) {
            revert InvalidSkillTag();
        }

        bytes32 skillTagHash = keccak256(abi.encodePacked(skillTag));

        // Check pool exists and is active
        if (!skillTagExists[skillTagHash]) revert PoolDoesNotExist();
        SkillPool storage pool = skillPools[skillTagHash];
        if (!pool.active) revert PoolInactive();

        // Check pool has sufficient balance
        if (pool.availableBalance < BOUNTY_AMOUNT) revert InsufficientPoolBalance();

        // Check user hasn't claimed for this skill
        if (hasClaimed[msg.sender][skillTagHash]) revert AlreadyClaimed();

        // Check cooldown period (for future claims if we allow multiple)
        if (lastClaimTime[msg.sender][skillTagHash] != 0) {
            if (block.timestamp < lastClaimTime[msg.sender][skillTagHash] + CLAIM_COOLDOWN) {
                revert CooldownNotElapsed();
            }
        }

        // Verify claim exists and is approved
        (
            address claimant,
            string memory skillName,
            ,
            ,
            SkillClaim.ClaimStatus status,
            ,
            ,
            ,
            ,
        ) = skillClaim.claims(claimId);

        if (claimant != msg.sender) revert ClaimNotVerified();
        if (status != SkillClaim.ClaimStatus.Approved) revert ClaimNotVerified();

        // Check skill name matches skill tag
        if (keccak256(abi.encodePacked(skillName)) != skillTagHash) {
            revert SkillMismatch();
        }

        // Mark as claimed
        hasClaimed[msg.sender][skillTagHash] = true;
        lastClaimTime[msg.sender][skillTagHash] = block.timestamp;

        // Update pool balances
        pool.availableBalance -= BOUNTY_AMOUNT;
        pool.totalClaimed += BOUNTY_AMOUNT;

        // Transfer bounty to claimant
        usdc.safeTransfer(msg.sender, BOUNTY_AMOUNT);

        emit BountyClaimed(msg.sender, skillTag, skillTagHash, claimId, BOUNTY_AMOUNT, block.timestamp);
    }

    /// @notice Withdraw funds from a skill pool (admin only)
    /// @param skillTag The skill tag identifier
    /// @param amount Amount to withdraw
    function withdrawFromPool(string calldata skillTag, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        onlyRole(ADMIN_ROLE)
    {
        if (bytes(skillTag).length == 0 || bytes(skillTag).length > MAX_STRING_LENGTH) {
            revert InvalidSkillTag();
        }

        bytes32 skillTagHash = keccak256(abi.encodePacked(skillTag));
        if (!skillTagExists[skillTagHash]) revert PoolDoesNotExist();

        SkillPool storage pool = skillPools[skillTagHash];
        if (amount > pool.availableBalance) revert WithdrawalExceedsBalance();

        pool.availableBalance -= amount;

        usdc.safeTransfer(msg.sender, amount);

        emit PoolWithdrawal(msg.sender, skillTag, skillTagHash, amount, pool.availableBalance);
    }

    /// @notice Deactivate a skill pool (admin only)
    /// @param skillTag The skill tag identifier
    function deactivatePool(string calldata skillTag) external onlyRole(ADMIN_ROLE) {
        bytes32 skillTagHash = keccak256(abi.encodePacked(skillTag));
        if (!skillTagExists[skillTagHash]) revert PoolDoesNotExist();

        SkillPool storage pool = skillPools[skillTagHash];
        pool.active = false;

        emit PoolDeactivated(skillTag, skillTagHash);
    }

    /// @notice Get pool information
    /// @param skillTag The skill tag identifier
    /// @return Pool data
    function getPool(string calldata skillTag) external view returns (SkillPool memory) {
        bytes32 skillTagHash = keccak256(abi.encodePacked(skillTag));
        if (!skillTagExists[skillTagHash]) revert PoolDoesNotExist();
        return skillPools[skillTagHash];
    }

    /// @notice Get total number of skill pools
    /// @return Number of pools
    function getPoolCount() external view returns (uint256) {
        return skillTagHashes.length;
    }

    /// @notice Get skill tag hash by index
    /// @param index Index in the array
    /// @return Skill tag hash
    function getSkillTagHashByIndex(uint256 index) external view returns (bytes32) {
        require(index < skillTagHashes.length, "Index out of bounds");
        return skillTagHashes[index];
    }

    /// @notice Check if user can claim bounty for a skill
    /// @param user User address
    /// @param skillTag Skill tag
    /// @return canClaim Whether user can claim
    /// @return reason Reason if cannot claim
    function canClaimBounty(address user, string calldata skillTag)
        external
        view
        returns (bool canClaim, string memory reason)
    {
        bytes32 skillTagHash = keccak256(abi.encodePacked(skillTag));

        if (!skillTagExists[skillTagHash]) {
            return (false, "Pool does not exist");
        }

        SkillPool storage pool = skillPools[skillTagHash];

        if (!pool.active) {
            return (false, "Pool is inactive");
        }

        if (pool.availableBalance < BOUNTY_AMOUNT) {
            return (false, "Insufficient pool balance");
        }

        if (hasClaimed[user][skillTagHash]) {
            return (false, "Already claimed");
        }

        if (lastClaimTime[user][skillTagHash] != 0) {
            if (block.timestamp < lastClaimTime[user][skillTagHash] + CLAIM_COOLDOWN) {
                return (false, "Cooldown period not elapsed");
            }
        }

        return (true, "");
    }

    /// @notice Pause contract (admin only)
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause contract (admin only)
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Emergency withdrawal of all USDC (admin only)
    /// @param recipient Address to receive funds
    function emergencyWithdraw(address recipient) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = usdc.balanceOf(address(this));
        usdc.safeTransfer(recipient, balance);
    }
}
