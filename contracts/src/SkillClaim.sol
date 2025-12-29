// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentOracle.sol";
import "./SkillProfile.sol";

/// @title SkillClaim - Skill verification claims management
/// @notice Manages skill verification claims with evidence and verifier approval
/// @dev Contract with role-based access control and automatic tier updates
contract SkillClaim is 
    AccessControl, 
    Pausable,
    ReentrancyGuard 
{
    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role identifier for verifier operations
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Reference to AgentOracle contract for AI verification
    AgentOracle public agentOracle;

    /// @notice Reference to SkillProfile contract for tier updates
    SkillProfile public skillProfile;

    /// @notice Maximum number of claims per user to prevent gas griefing
    uint256 public constant MAX_CLAIMS_PER_USER = 200;

    /// @notice Maximum length for string fields
    uint256 public constant MAX_STRING_LENGTH = 500;

    /// @notice Maximum length for IPFS hash
    uint256 public constant MAX_IPFS_HASH_LENGTH = 100;

    /// @notice Claim status enumeration
    enum ClaimStatus {
        Pending,
        Approved,
        Rejected,
        Disputed
    }

    /// @notice Represents a skill verification claim
    struct Claim {
        address claimant;
        string skillName;
        string description;
        string evidenceIpfsHash;
        ClaimStatus status;
        address verifier;
        uint256 createdAt;
        uint256 updatedAt;
        string verifierNotes;
        uint256 skillIndex; // Index of skill in SkillProfile for tier updates
    }

    /// @notice Mapping from claim ID to claim data
    mapping(uint256 => Claim) public claims;

    /// @notice Mapping from user address to their claim IDs
    mapping(address => uint256[]) public userClaims;

    /// @notice Mapping from verifier address to assigned claim IDs
    mapping(address => uint256[]) public verifierClaims;

    /// @notice Total number of claims created
    uint256 public totalClaims;

    /// @notice Counter for approved claims
    uint256 public approvedClaims;

    /// @notice Counter for rejected claims
    uint256 public rejectedClaims;

    /// @notice Emitted when a new claim is created
    event ClaimCreated(
        uint256 indexed claimId,
        address indexed claimant,
        string skillName,
        uint256 timestamp
    );

    /// @notice Emitted when a claim is assigned to a verifier
    event ClaimAssigned(
        uint256 indexed claimId,
        address indexed verifier,
        uint256 timestamp
    );

    /// @notice Emitted when a claim is approved
    event ClaimApproved(
        uint256 indexed claimId,
        address indexed verifier,
        uint256 timestamp
    );

    /// @notice Emitted when a claim is rejected
    event ClaimRejected(
        uint256 indexed claimId,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when a claim is disputed
    event ClaimDisputed(
        uint256 indexed claimId,
        address indexed claimant,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when evidence is updated
    event EvidenceUpdated(
        uint256 indexed claimId,
        string newEvidenceIpfsHash,
        uint256 timestamp
    );

    /// @notice Initializes the contract
    /// @param admin Address to be granted admin role (can be TimelockController)
    /// @param _agentOracle Address of AgentOracle contract for AI verification
    /// @param _skillProfile Address of SkillProfile contract for tier updates
    /// @dev For production, admin should be TakumiTimelock contract address
    /// @dev TimelockController will control all ADMIN_ROLE operations
    constructor(address admin, address _agentOracle, address _skillProfile) {
        require(admin != address(0), "Invalid admin address");
        require(_agentOracle != address(0), "Invalid oracle address");
        require(_skillProfile != address(0), "Invalid profile address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        agentOracle = AgentOracle(_agentOracle);
        skillProfile = SkillProfile(_skillProfile);
    }

    /// @notice Creates a new skill verification claim
    /// @param skillName Name of the skill being claimed
    /// @param description Description of the skill claim
    /// @param evidenceIpfsHash IPFS hash containing evidence
    /// @param skillIndex Index of the skill in SkillProfile to verify
    /// @return claimId The ID of the created claim
    function createClaim(
        string calldata skillName,
        string calldata description,
        string calldata evidenceIpfsHash,
        uint256 skillIndex
    ) external whenNotPaused nonReentrant returns (uint256) {
        // Validate claim count
        require(userClaims[msg.sender].length < MAX_CLAIMS_PER_USER, "Maximum claims reached");
        
        // Validate string lengths
        {
            uint256 skillNameLen = bytes(skillName).length;
            uint256 descLen = bytes(description).length;
            uint256 evidenceLen = bytes(evidenceIpfsHash).length;
            
            require(skillNameLen > 0 && skillNameLen <= MAX_STRING_LENGTH, "Invalid skill name length");
            require(descLen <= MAX_STRING_LENGTH, "Description too long");
            require(evidenceLen > 0 && evidenceLen <= MAX_IPFS_HASH_LENGTH, "Invalid evidence hash length");
        }

        uint256 claimId = totalClaims;
        address claimant = msg.sender;
        
        claims[claimId] = Claim({
            claimant: claimant,
            skillName: skillName,
            description: description,
            evidenceIpfsHash: evidenceIpfsHash,
            status: ClaimStatus.Pending,
            verifier: address(0),
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            verifierNotes: "",
            skillIndex: skillIndex
        });

        userClaims[claimant].push(claimId);
        
        unchecked {
            ++totalClaims;
        }

        emit ClaimCreated(claimId, claimant, skillName, block.timestamp);

        return claimId;
    }

    /// @notice Assigns a claim to a verifier
    /// @param claimId ID of the claim to assign
    /// @param verifier Address of the verifier
    function assignClaim(uint256 claimId, address verifier) 
        external 
        whenNotPaused 
        onlyRole(ADMIN_ROLE) 
    {
        require(claimId < totalClaims, "Invalid claim ID");
        require(hasRole(VERIFIER_ROLE, verifier), "Not a verifier");
        
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending, "Claim not pending");
        require(claim.verifier == address(0), "Claim already assigned");

        claim.verifier = verifier;
        uint256 currentTime = block.timestamp;
        claim.updatedAt = currentTime;
        verifierClaims[verifier].push(claimId);

        emit ClaimAssigned(claimId, verifier, currentTime);
    }

    /// @notice Approves a skill claim (human verifier path)
    /// @param claimId ID of the claim to approve
    /// @param notes Verifier's notes
    function approveClaim(uint256 claimId, string calldata notes) 
        external 
        whenNotPaused 
        onlyRole(VERIFIER_ROLE) 
    {
        require(claimId < totalClaims, "Invalid claim ID");
        require(bytes(notes).length <= MAX_STRING_LENGTH, "Notes too long");
        
        Claim storage claim = claims[claimId];
        require(claim.verifier == msg.sender, "Not assigned verifier");
        require(claim.status == ClaimStatus.Pending, "Claim not pending");

        claim.status = ClaimStatus.Approved;
        claim.verifierNotes = notes;
        uint256 currentTime = block.timestamp;
        claim.updatedAt = currentTime;
        
        unchecked {
            ++approvedClaims;
        }

        // Verify skill in SkillProfile and trigger tier update
        skillProfile.verifySkill(claim.claimant, claim.skillIndex);

        emit ClaimApproved(claimId, msg.sender, currentTime);
    }

    /// @notice Approves a claim using AI Agent verification
    /// @param claimId ID of the claim to approve
    /// @param signature ECDSA signature from AI agent
    /// @param notes Verification notes
    function approveClaimWithAgent(
        uint256 claimId,
        bytes calldata signature,
        string calldata notes
    ) external whenNotPaused nonReentrant {
        require(claimId < totalClaims, "Invalid claim ID");
        require(bytes(notes).length <= MAX_STRING_LENGTH, "Notes too long");
        
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending, "Claim not pending");

        // Verify claim through AgentOracle
        agentOracle.verifyClaim(claimId, true, signature);
        
        // Get agent address from oracle
        (bool isVerified, bool isValid, address agent,) = agentOracle.getVerificationStatus(claimId);
        require(isVerified && isValid, "Agent verification failed");

        // Update claim status
        claim.status = ClaimStatus.Approved;
        claim.verifier = agent;
        claim.verifierNotes = notes;
        uint256 currentTime = block.timestamp;
        claim.updatedAt = currentTime;
        
        unchecked {
            ++approvedClaims;
        }

        // Verify skill in SkillProfile and trigger tier update
        skillProfile.verifySkill(claim.claimant, claim.skillIndex);

        emit ClaimApproved(claimId, agent, currentTime);
    }

    /// @notice Rejects a skill claim (human verifier path)
    /// @param claimId ID of the claim to reject
    /// @param reason Reason for rejection
    function rejectClaim(uint256 claimId, string calldata reason) 
        external 
        whenNotPaused 
        onlyRole(VERIFIER_ROLE) 
    {
        require(claimId < totalClaims, "Invalid claim ID");
        
        uint256 reasonLen = bytes(reason).length;
        require(reasonLen > 0 && reasonLen <= MAX_STRING_LENGTH, "Invalid reason length");
        
        Claim storage claim = claims[claimId];
        require(claim.verifier == msg.sender, "Not assigned verifier");
        require(claim.status == ClaimStatus.Pending, "Claim not pending");

        claim.status = ClaimStatus.Rejected;
        claim.verifierNotes = reason;
        uint256 currentTime = block.timestamp;
        claim.updatedAt = currentTime;
        
        unchecked {
            ++rejectedClaims;
        }

        emit ClaimRejected(claimId, msg.sender, reason, currentTime);
    }

    /// @notice Rejects a claim using AI Agent verification
    /// @param claimId ID of the claim to reject
    /// @param signature ECDSA signature from AI agent
    /// @param reason Rejection reason
    function rejectClaimWithAgent(
        uint256 claimId,
        bytes calldata signature,
        string calldata reason
    ) external whenNotPaused nonReentrant {
        require(claimId < totalClaims, "Invalid claim ID");
        
        uint256 reasonLen = bytes(reason).length;
        require(reasonLen > 0 && reasonLen <= MAX_STRING_LENGTH, "Invalid reason length");
        
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending, "Claim not pending");

        // Verify claim through AgentOracle (isValid = false for rejection)
        agentOracle.verifyClaim(claimId, false, signature);
        
        // Get agent address from oracle
        (bool isVerified, bool isValid, address agent,) = agentOracle.getVerificationStatus(claimId);
        require(isVerified && !isValid, "Agent verification failed");

        // Update claim status
        claim.status = ClaimStatus.Rejected;
        claim.verifier = agent;
        claim.verifierNotes = reason;
        uint256 currentTime = block.timestamp;
        claim.updatedAt = currentTime;
        
        unchecked {
            ++rejectedClaims;
        }

        emit ClaimRejected(claimId, agent, reason, currentTime);
    }

    /// @notice Disputes a claim decision
    /// @param claimId ID of the claim to dispute
    /// @param reason Reason for dispute
    function disputeClaim(uint256 claimId, string calldata reason) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(claimId < totalClaims, "Invalid claim ID");
        
        uint256 reasonLen = bytes(reason).length;
        require(reasonLen > 0 && reasonLen <= MAX_STRING_LENGTH, "Invalid reason length");
        
        Claim storage claim = claims[claimId];
        require(claim.claimant == msg.sender, "Not claim owner");
        
        ClaimStatus currentStatus = claim.status;
        require(currentStatus == ClaimStatus.Approved || currentStatus == ClaimStatus.Rejected, "Cannot dispute pending claim");

        claim.status = ClaimStatus.Disputed;
        claim.updatedAt = block.timestamp;

        emit ClaimDisputed(claimId, msg.sender, reason, block.timestamp);
    }

    /// @notice Updates evidence for a pending claim
    /// @param claimId ID of the claim
    /// @param newEvidenceIpfsHash New IPFS hash for evidence
    function updateEvidence(uint256 claimId, string calldata newEvidenceIpfsHash) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(claimId < totalClaims, "Invalid claim ID");
        
        uint256 evidenceLen = bytes(newEvidenceIpfsHash).length;
        require(evidenceLen > 0 && evidenceLen <= MAX_IPFS_HASH_LENGTH, "Invalid evidence hash length");
        
        Claim storage claim = claims[claimId];
        require(claim.claimant == msg.sender, "Not claim owner");
        require(claim.status == ClaimStatus.Pending, "Can only update pending claims");

        claim.evidenceIpfsHash = newEvidenceIpfsHash;
        uint256 currentTime = block.timestamp;
        claim.updatedAt = currentTime;

        emit EvidenceUpdated(claimId, newEvidenceIpfsHash, currentTime);
    }

    /// @notice Gets claim details
    /// @param claimId ID of the claim
    /// @return Claim data
    function getClaim(uint256 claimId) external view returns (Claim memory) {
        require(claimId < totalClaims, "Invalid claim ID");
        return claims[claimId];
    }

    /// @notice Gets paginated claims for a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return claimIds Array of claim IDs
    /// @return total Total number of claims for the user
    function getUserClaims(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory claimIds, uint256 total) 
    {
        total = userClaims[user].length;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            claimIds = new uint256[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                claimIds[i] = userClaims[user][offset + i];
            }
        }

        return (claimIds, total);
    }

    /// @notice Gets paginated claims assigned to a verifier
    /// @param verifier Verifier address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return claimIds Array of claim IDs
    /// @return total Total number of claims assigned to the verifier
    function getVerifierClaims(address verifier, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory claimIds, uint256 total) 
    {
        total = verifierClaims[verifier].length;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            claimIds = new uint256[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                claimIds[i] = verifierClaims[verifier][offset + i];
            }
        }

        return (claimIds, total);
    }

    /// @notice Gets paginated claims by status
    /// @param status Claim status to filter by
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return claimIds Array of claim IDs
    /// @return total Total number of claims with the specified status
    function getClaimsByStatus(ClaimStatus status, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory claimIds, uint256 total) 
    {
        // Cache totalClaims to avoid multiple SLOAD operations
        uint256 _totalClaims = totalClaims;
        
        // First pass: count matching claims
        uint256 count = 0;
        unchecked {
            for (uint256 i = 0; i < _totalClaims; ++i) {
                if (claims[i].status == status) {
                    ++count;
                }
            }
        }

        total = count;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            claimIds = new uint256[](resultLength);

            // Second pass: populate result array with pagination
            uint256 matchIndex = 0;
            uint256 resultIndex = 0;
            
            for (uint256 i = 0; i < _totalClaims && resultIndex < resultLength; ++i) {
                if (claims[i].status == status) {
                    if (matchIndex >= offset) {
                        claimIds[resultIndex] = i;
                        ++resultIndex;
                    }
                    ++matchIndex;
                }
            }
        }

        return (claimIds, total);
    }

    /// @notice Gets total count of claims for a user
    /// @param user User address
    /// @return Total number of claims
    function getUserClaimsCount(address user) external view returns (uint256) {
        return userClaims[user].length;
    }

    /// @notice Gets total count of claims assigned to a verifier
    /// @param verifier Verifier address
    /// @return Total number of claims
    function getVerifierClaimsCount(address verifier) external view returns (uint256) {
        return verifierClaims[verifier].length;
    }

    /// @notice Pauses the contract
    /// @dev Emits Paused event from OpenZeppelin Pausable
    /// @dev In production, only TimelockController (via Gnosis Safe proposal) can call this
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    /// @dev Emits Unpaused event from OpenZeppelin Pausable
    /// @dev In production, only TimelockController (via Gnosis Safe proposal) can call this
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Grants admin role to new address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (TimelockController in production)
    /// @param account Address to grant admin role
    function grantAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        _grantRole(ADMIN_ROLE, account);
    }

    /// @notice Revokes admin role from address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (TimelockController in production)
    /// @param account Address to revoke admin role from
    function revokeAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ADMIN_ROLE, account);
    }

    /// @notice Grants verifier role to new address
    /// @dev Only callable by ADMIN_ROLE (controlled by TimelockController in production)
    /// @param account Address to grant verifier role
    function grantVerifierRole(address account) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        _grantRole(VERIFIER_ROLE, account);
    }

    /// @notice Revokes verifier role from address
    /// @dev Only callable by ADMIN_ROLE (controlled by TimelockController in production)
    /// @param account Address to revoke verifier role from
    function revokeVerifierRole(address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, account);
    }

    /// @notice Updates AgentOracle contract address
    /// @param _agentOracle New AgentOracle contract address
    function setAgentOracle(address _agentOracle) external onlyRole(ADMIN_ROLE) {
        require(_agentOracle != address(0), "Invalid oracle address");
        agentOracle = AgentOracle(_agentOracle);
    }

    /// @notice Updates SkillProfile contract address
    /// @param _skillProfile New SkillProfile contract address
    function setSkillProfile(address _skillProfile) external onlyRole(ADMIN_ROLE) {
        require(_skillProfile != address(0), "Invalid profile address");
        skillProfile = SkillProfile(_skillProfile);
    }

    /// @notice Gets AgentOracle contract address
    /// @return Address of AgentOracle contract
    function getAgentOracle() external view returns (address) {
        return address(agentOracle);
    }

    /// @notice Gets SkillProfile contract address
    /// @return Address of SkillProfile contract
    function getSkillProfile() external view returns (address) {
        return address(skillProfile);
    }
}
