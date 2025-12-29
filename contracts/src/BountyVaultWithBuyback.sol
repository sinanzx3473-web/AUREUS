// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SkillClaim.sol";
import "./UniswapIntegration.sol";

/// @title BountyVaultWithBuyback - Liquidity pool with AUREUS buyback & burn
/// @notice Allows companies to deposit USDC and users to claim bounties with 2% buyback fee
/// @dev 2% of every bounty claim is used to buyback and burn AUREUS tokens
contract BountyVaultWithBuyback is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Role identifier for company/employer operations
    bytes32 public constant EMPLOYER_ROLE = keccak256("EMPLOYER_ROLE");

    /// @notice Reference to SkillClaim contract for verification checks
    SkillClaim public skillClaim;

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice AUREUS token contract
    IERC20 public immutable aureusToken;

    /// @notice Uniswap integration contract for buyback & burn
    UniswapIntegration public uniswapIntegration;

    /// @notice Fixed bounty amount per claim (50 USDC with 6 decimals)
    uint256 public constant BOUNTY_AMOUNT = 50 * 10 ** 6;

    /// @notice Buyback fee percentage (2%)
    uint256 public constant BUYBACK_FEE_PERCENTAGE = 2;

    /// @notice Cooldown period between claims (30 days)
    uint256 public constant CLAIM_COOLDOWN = 30 days;

    /// @notice Maximum string length for skill tags
    uint256 public constant MAX_STRING_LENGTH = 100;

    /// @notice Total AUREUS burned through buybacks
    uint256 public totalAureusBurned;

    /// @notice Total USDC spent on buybacks
    uint256 public totalBuybackUSDC;

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
        uint256 totalAmount,
        uint256 buybackAmount,
        uint256 claimantAmount,
        uint256 timestamp
    );

    /// @notice Emitted when buyback and burn is executed
    event BuybackAndBurn(
        uint256 usdcAmount,
        uint256 aureusAmount,
        uint256 totalBurned,
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

    /// @notice Emitted when Uniswap integration is updated
    event UniswapIntegrationUpdated(
        address indexed oldIntegration,
        address indexed newIntegration,
        uint256 timestamp
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
    /// @param _aureusToken Address of AUREUS token contract
    /// @param _uniswapIntegration Address of UniswapIntegration contract
    constructor(
        address _skillClaim,
        address _usdc,
        address _aureusToken,
        address _uniswapIntegration
    ) {
        require(_skillClaim != address(0), "Invalid SkillClaim address");
        require(_usdc != address(0), "Invalid USDC address");
        require(_aureusToken != address(0), "Invalid AUREUS address");
        require(_uniswapIntegration != address(0), "Invalid UniswapIntegration address");

        skillClaim = SkillClaim(_skillClaim);
        usdc = IERC20(_usdc);
        aureusToken = IERC20(_aureusToken);
        uniswapIntegration = UniswapIntegration(_uniswapIntegration);

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

    /// @notice Claim bounty for a verified skill claim with 2% buyback & burn
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

        // Check cooldown period
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

        // Calculate amounts: 2% for buyback, 98% for claimant
        uint256 buybackAmount = (BOUNTY_AMOUNT * BUYBACK_FEE_PERCENTAGE) / 100;
        uint256 claimantAmount = BOUNTY_AMOUNT - buybackAmount;

        // Mark as claimed
        hasClaimed[msg.sender][skillTagHash] = true;
        lastClaimTime[msg.sender][skillTagHash] = block.timestamp;

        // Update pool balances
        pool.availableBalance -= BOUNTY_AMOUNT;
        pool.totalClaimed += BOUNTY_AMOUNT;

        // Execute buyback & burn
        uint256 aureusBurned = _buybackAndBurn(buybackAmount);

        // Transfer remaining bounty to claimant
        usdc.safeTransfer(msg.sender, claimantAmount);

        emit BountyClaimed(
            msg.sender,
            skillTag,
            skillTagHash,
            claimId,
            BOUNTY_AMOUNT,
            buybackAmount,
            claimantAmount,
            block.timestamp
        );
    }

    /// @notice Internal function to execute buyback and burn
    /// @param usdcAmount Amount of USDC to use for buyback
    /// @return aureusBurned Amount of AUREUS burned
    function _buybackAndBurn(uint256 usdcAmount) internal returns (uint256 aureusBurned) {
        // Approve UniswapIntegration to spend USDC
        usdc.forceApprove(address(uniswapIntegration), usdcAmount);

        // Execute buyback and burn through UniswapIntegration
        aureusBurned = uniswapIntegration.buybackAndBurn(usdcAmount);

        // Update statistics
        totalBuybackUSDC += usdcAmount;
        totalAureusBurned += aureusBurned;

        emit BuybackAndBurn(
            usdcAmount,
            aureusBurned,
            totalAureusBurned,
            block.timestamp
        );

        return aureusBurned;
    }

    /// @notice Set Uniswap integration contract (admin only)
    /// @param newIntegration Address of new UniswapIntegration contract
    function setUniswapIntegration(address newIntegration) external onlyRole(ADMIN_ROLE) {
        require(newIntegration != address(0), "Invalid integration address");
        address oldIntegration = address(uniswapIntegration);
        uniswapIntegration = UniswapIntegration(newIntegration);
        emit UniswapIntegrationUpdated(oldIntegration, newIntegration, block.timestamp);
    }

    /// @notice Get total AUREUS burned
    /// @return Total amount of AUREUS burned
    function getTotalBurned() external view returns (uint256) {
        return totalAureusBurned;
    }

    /// @notice Get buyback statistics
    /// @return usdcSpent Total USDC spent on buybacks
    /// @return aureusBurned Total AUREUS burned
    function getBuybackStats() 
        external 
        view 
        returns (uint256 usdcSpent, uint256 aureusBurned) 
    {
        return (totalBuybackUSDC, totalAureusBurned);
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
