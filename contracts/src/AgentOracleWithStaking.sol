// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title AgentOracleWithStaking - AI Agent verification oracle with AUREUS staking
/// @notice Manages AI Agent-based skill claim verification with 10,000 AUREUS stake requirement
/// @dev Uses ECDSA signature verification and requires agents to stake AUREUS tokens
contract AgentOracleWithStaking is 
    AccessControl, 
    Pausable,
    ReentrancyGuard 
{
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role identifier for AI agent operations
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    /// @notice AUREUS token contract
    IERC20 public immutable aureusToken;

    /// @notice Required stake amount: 10,000 AUREUS
    uint256 public constant AGENT_STAKE_REQUIREMENT = 10_000 * 10 ** 18;

    /// @notice Unstake cooldown period: 7 days
    uint256 public constant UNSTAKE_COOLDOWN = 7 days;

    /// @notice Mapping from agent address to staked amount
    mapping(address => uint256) public agentStakes;

    /// @notice Mapping from agent address to unstake request timestamp
    mapping(address => uint256) public unstakeTimestamp;

    /// @notice Mapping from claim ID to verification status
    mapping(uint256 => bool) public verifiedClaims;

    /// @notice Mapping from claim ID to verifying agent address
    mapping(uint256 => address) public claimVerifiers;

    /// @notice Mapping from claim ID to verification timestamp
    mapping(uint256 => uint256) public verificationTimestamps;

    /// @notice Counter for total verified claims
    uint256 public totalVerifiedClaims;

    /// @notice Counter for total rejected claims
    uint256 public totalRejectedClaims;

    /// @notice Mapping to prevent signature replay attacks
    mapping(bytes32 => bool) public usedSignatures;

    /// @notice Total AUREUS staked by all agents
    uint256 public totalStaked;

    /// @notice Emitted when a claim is verified by an AI agent
    event ClaimVerified(
        uint256 indexed claimId,
        address indexed agent,
        bool isValid,
        uint256 timestamp
    );

    /// @notice Emitted when an agent stakes AUREUS
    event AgentStaked(
        address indexed agent,
        uint256 amount,
        uint256 totalStake,
        uint256 timestamp
    );

    /// @notice Emitted when an agent unstakes AUREUS
    event AgentUnstaked(
        address indexed agent,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when an unstake request is initiated
    event UnstakeRequested(
        address indexed agent,
        uint256 cooldownEnd,
        uint256 timestamp
    );

    /// @notice Emitted when an agent role is granted
    event AgentRegistered(
        address indexed agent,
        uint256 timestamp
    );

    /// @notice Emitted when an agent role is revoked
    event AgentRevoked(
        address indexed agent,
        uint256 timestamp
    );

    /// @notice Emitted when an agent is slashed
    event AgentSlashed(
        address indexed agent,
        uint256 slashedAmount,
        string reason,
        uint256 timestamp
    );

    /// @notice Initializes the contract
    /// @param admin Address to be granted admin role
    /// @param _aureusToken Address of AUREUS token contract
    constructor(address admin, address _aureusToken) {
        require(admin != address(0), "Invalid admin address");
        require(_aureusToken != address(0), "Invalid AUREUS token address");
        
        aureusToken = IERC20(_aureusToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Stake AUREUS to become an agent
    /// @param amount Amount of AUREUS to stake (must be >= 10,000 AUREUS)
    function stakeAureus(uint256 amount) external whenNotPaused nonReentrant {
        require(amount >= AGENT_STAKE_REQUIREMENT, "Insufficient stake amount");
        require(agentStakes[msg.sender] == 0, "Agent already staked");

        // Transfer AUREUS from sender to this contract
        aureusToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update stake
        agentStakes[msg.sender] = amount;
        totalStaked += amount;

        // Grant agent role
        _grantRole(AGENT_ROLE, msg.sender);

        emit AgentStaked(msg.sender, amount, agentStakes[msg.sender], block.timestamp);
        emit AgentRegistered(msg.sender, block.timestamp);
    }

    /// @notice Request to unstake AUREUS (initiates cooldown period)
    function requestUnstake() external {
        require(agentStakes[msg.sender] > 0, "No stake to unstake");
        require(unstakeTimestamp[msg.sender] == 0, "Unstake already requested");

        unstakeTimestamp[msg.sender] = block.timestamp;

        emit UnstakeRequested(
            msg.sender,
            block.timestamp + UNSTAKE_COOLDOWN,
            block.timestamp
        );
    }

    /// @notice Unstake AUREUS after cooldown period
    function unstakeAureus() external nonReentrant {
        require(agentStakes[msg.sender] > 0, "No stake to unstake");
        require(unstakeTimestamp[msg.sender] > 0, "Unstake not requested");
        require(
            block.timestamp >= unstakeTimestamp[msg.sender] + UNSTAKE_COOLDOWN,
            "Cooldown period not elapsed"
        );

        uint256 stakeAmount = agentStakes[msg.sender];

        // Reset state
        agentStakes[msg.sender] = 0;
        unstakeTimestamp[msg.sender] = 0;
        totalStaked -= stakeAmount;

        // Revoke agent role
        _revokeRole(AGENT_ROLE, msg.sender);

        // Transfer AUREUS back to agent
        aureusToken.safeTransfer(msg.sender, stakeAmount);

        emit AgentUnstaked(msg.sender, stakeAmount, block.timestamp);
        emit AgentRevoked(msg.sender, block.timestamp);
    }

    /// @notice Cancel unstake request
    function cancelUnstake() external {
        require(unstakeTimestamp[msg.sender] > 0, "No unstake request");
        unstakeTimestamp[msg.sender] = 0;
    }

    /// @notice Verifies a claim using AI agent signature
    /// @param claimId ID of the claim to verify
    /// @param isValid Whether the claim is valid
    /// @param signature ECDSA signature from the AI agent
    /// @dev Signature must be from an address with AGENT_ROLE and sufficient stake
    function verifyClaim(
        uint256 claimId,
        bool isValid,
        bytes memory signature
    ) external whenNotPaused nonReentrant {
        require(signature.length > 0, "Empty signature");
        
        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(this), block.chainid)
        );
        
        // Convert to Ethereum signed message hash
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        // Prevent signature replay attacks
        require(!usedSignatures[ethSignedMessageHash], "Signature already used");
        
        // Recover signer from signature
        address signer = ethSignedMessageHash.recover(signature);
        require(signer != address(0), "Invalid signature");
        
        // Verify signer has AGENT_ROLE and sufficient stake
        require(hasRole(AGENT_ROLE, signer), "Signer not authorized agent");
        require(agentStakes[signer] >= AGENT_STAKE_REQUIREMENT, "Insufficient agent stake");
        
        // Prevent verification during unstake cooldown
        require(unstakeTimestamp[signer] == 0, "Agent in unstake cooldown");
        
        // Prevent double verification
        require(verificationTimestamps[claimId] == 0, "Claim already verified");
        
        // Mark signature as used
        usedSignatures[ethSignedMessageHash] = true;
        
        // Update verification status
        verifiedClaims[claimId] = isValid;
        claimVerifiers[claimId] = signer;
        uint256 currentTime = block.timestamp;
        verificationTimestamps[claimId] = currentTime;
        
        // Update counters
        if (isValid) {
            unchecked {
                ++totalVerifiedClaims;
            }
        } else {
            unchecked {
                ++totalRejectedClaims;
            }
        }
        
        emit ClaimVerified(claimId, signer, isValid, currentTime);
    }

    /// @notice Slash an agent's stake for malicious behavior (admin only)
    /// @param agent Address of the agent to slash
    /// @param slashAmount Amount to slash
    /// @param reason Reason for slashing
    function slashAgent(
        address agent,
        uint256 slashAmount,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(agentStakes[agent] > 0, "Agent has no stake");
        require(slashAmount <= agentStakes[agent], "Slash amount exceeds stake");

        agentStakes[agent] -= slashAmount;
        totalStaked -= slashAmount;

        // If stake falls below requirement, revoke agent role
        if (agentStakes[agent] < AGENT_STAKE_REQUIREMENT) {
            _revokeRole(AGENT_ROLE, agent);
            emit AgentRevoked(agent, block.timestamp);
        }

        // Transfer slashed amount to admin
        aureusToken.safeTransfer(msg.sender, slashAmount);

        emit AgentSlashed(agent, slashAmount, reason, block.timestamp);
    }

    /// @notice Gets verification status for a claim
    /// @param claimId ID of the claim
    /// @return isVerified Whether the claim has been verified
    /// @return isValid Whether the claim is valid
    /// @return agent Address of the verifying agent
    /// @return timestamp Verification timestamp
    function getVerificationStatus(uint256 claimId) 
        external 
        view 
        returns (
            bool isVerified,
            bool isValid,
            address agent,
            uint256 timestamp
        ) 
    {
        timestamp = verificationTimestamps[claimId];
        isVerified = timestamp > 0;
        isValid = verifiedClaims[claimId];
        agent = claimVerifiers[claimId];
    }

    /// @notice Get agent stake information
    /// @param agent Address of the agent
    /// @return stakeAmount Amount staked
    /// @return isActive Whether agent is active
    /// @return unstakeTime Unstake request timestamp (0 if none)
    function getAgentStakeInfo(address agent)
        external
        view
        returns (
            uint256 stakeAmount,
            bool isActive,
            uint256 unstakeTime
        )
    {
        stakeAmount = agentStakes[agent];
        isActive = hasRole(AGENT_ROLE, agent) && stakeAmount >= AGENT_STAKE_REQUIREMENT;
        unstakeTime = unstakeTimestamp[agent];
    }

    /// @notice Checks if a claim has been verified
    /// @param claimId ID of the claim
    /// @return Whether the claim has been verified
    function isClaimVerified(uint256 claimId) external view returns (bool) {
        return verificationTimestamps[claimId] > 0;
    }

    /// @notice Checks if a claim is valid (approved)
    /// @param claimId ID of the claim
    /// @return Whether the claim is valid
    function isClaimValid(uint256 claimId) external view returns (bool) {
        require(verificationTimestamps[claimId] > 0, "Claim not verified");
        return verifiedClaims[claimId];
    }

    /// @notice Grants agent role to new address (admin only, bypasses staking)
    /// @param agent Address to grant agent role
    function grantAgentRole(address agent) external onlyRole(ADMIN_ROLE) {
        require(agent != address(0), "Invalid agent address");
        _grantRole(AGENT_ROLE, agent);
        emit AgentRegistered(agent, block.timestamp);
    }

    /// @notice Revokes agent role from address (admin only)
    /// @param agent Address to revoke agent role from
    function revokeAgentRole(address agent) external onlyRole(ADMIN_ROLE) {
        _revokeRole(AGENT_ROLE, agent);
        emit AgentRevoked(agent, block.timestamp);
    }

    /// @notice Grants admin role to new address
    /// @param account Address to grant admin role
    function grantAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        _grantRole(ADMIN_ROLE, account);
    }

    /// @notice Revokes admin role from address
    /// @param account Address to revoke admin role from
    function revokeAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ADMIN_ROLE, account);
    }

    /// @notice Pauses the contract
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Gets total verification statistics
    /// @return verified Total verified claims
    /// @return rejected Total rejected claims
    function getVerificationStats() 
        external 
        view 
        returns (uint256 verified, uint256 rejected) 
    {
        return (totalVerifiedClaims, totalRejectedClaims);
    }

    /// @notice Emergency withdrawal of AUREUS (admin only)
    /// @param recipient Address to receive tokens
    function emergencyWithdraw(address recipient) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = aureusToken.balanceOf(address(this));
        aureusToken.safeTransfer(recipient, balance);
    }
}
