// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title AgentOracle - AI Agent verification oracle
/// @notice Manages AI Agent-based skill claim verification using cryptographic signatures
/// @dev Uses ECDSA signature verification to authenticate AI agents
contract AgentOracle is 
    AccessControl, 
    Pausable,
    ReentrancyGuard 
{
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role identifier for AI agent operations
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

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

    /// @notice Emitted when a claim is verified by an AI agent
    event ClaimVerified(
        uint256 indexed claimId,
        address indexed agent,
        bool isValid,
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

    /// @notice Initializes the contract
    /// @param admin Address to be granted admin role (can be TimelockController)
    /// @dev For production, admin should be TakumiTimelock contract address
    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Verifies a claim using AI agent signature
    /// @param claimId ID of the claim to verify
    /// @param isValid Whether the claim is valid
    /// @param signature ECDSA signature from the AI agent
    /// @dev Signature must be from an address with AGENT_ROLE
    function verifyClaim(
        uint256 claimId,
        bool isValid,
        bytes memory signature
    ) external whenNotPaused nonReentrant {
        require(signature.length > 0, "Empty signature");
        
        // Create message hash: keccak256(abi.encodePacked(claimId, isValid, address(this), block.chainid))
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
        
        // Verify signer has AGENT_ROLE
        require(hasRole(AGENT_ROLE, signer), "Signer not authorized agent");
        
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

    /// @notice Gets verification status for a claim
    /// @param claimId ID of the claim
    /// @return isVerified Whether the claim has been verified
    /// @return isValid Whether the claim is valid (only meaningful if isVerified is true)
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

    /// @notice Grants agent role to new address
    /// @param agent Address to grant agent role
    function grantAgentRole(address agent) external onlyRole(ADMIN_ROLE) {
        require(agent != address(0), "Invalid agent address");
        _grantRole(AGENT_ROLE, agent);
        emit AgentRegistered(agent, block.timestamp);
    }

    /// @notice Revokes agent role from address
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
}
