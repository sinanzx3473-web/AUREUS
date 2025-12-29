// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Endorsement - Peer endorsements and references management
/// @notice Manages peer-to-peer skill endorsements and professional references
/// @dev Contract with role-based access control
contract Endorsement is 
    AccessControl, 
    Pausable,
    ReentrancyGuard 
{
    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Maximum number of endorsements per user to prevent gas griefing
    uint256 public constant MAX_ENDORSEMENTS_PER_USER = 500;

    /// @notice Maximum number of references per user
    uint256 public constant MAX_REFERENCES_PER_USER = 100;

    /// @notice Maximum length for string fields
    uint256 public constant MAX_STRING_LENGTH = 500;

    /// @notice Maximum length for IPFS hash
    uint256 public constant MAX_IPFS_HASH_LENGTH = 100;

    /// @notice Represents a skill endorsement
    struct SkillEndorsement {
        address endorser;
        address endorsee;
        string skillName;
        string message;
        uint256 timestamp;
        bool revoked;
    }

    /// @notice Represents a professional reference
    struct Reference {
        address referrer;
        address referee;
        string relationship;
        string message;
        string ipfsHash; // Detailed reference letter
        uint256 timestamp;
        bool revoked;
    }

    /// @notice Mapping from endorsement ID to endorsement data
    mapping(uint256 => SkillEndorsement) public endorsements;

    /// @notice Mapping from reference ID to reference data
    mapping(uint256 => Reference) public references;

    /// @notice Mapping from user to received endorsement IDs
    mapping(address => uint256[]) public receivedEndorsements;

    /// @notice Mapping from user to given endorsement IDs
    mapping(address => uint256[]) public givenEndorsements;

    /// @notice Mapping from user to received reference IDs
    mapping(address => uint256[]) public receivedReferences;

    /// @notice Mapping from user to given reference IDs
    mapping(address => uint256[]) public givenReferences;

    /// @notice Mapping to track if user A has endorsed user B for a specific skill
    mapping(address => mapping(address => mapping(string => bool))) public hasEndorsed;

    /// @notice Mapping to track if user A has given reference to user B
    mapping(address => mapping(address => bool)) public hasGivenReference;

    /// @notice Total number of endorsements
    uint256 public totalEndorsements;

    /// @notice Total number of references
    uint256 public totalReferences;

    /// @notice Emitted when an endorsement is created
    event EndorsementCreated(
        uint256 indexed endorsementId,
        address indexed endorser,
        address indexed endorsee,
        string skillName,
        uint256 timestamp
    );

    /// @notice Emitted when an endorsement is revoked
    event EndorsementRevoked(
        uint256 indexed endorsementId,
        address indexed endorser,
        uint256 timestamp
    );

    /// @notice Emitted when a reference is created
    event ReferenceCreated(
        uint256 indexed referenceId,
        address indexed referrer,
        address indexed referee,
        uint256 timestamp
    );

    /// @notice Emitted when a reference is revoked
    event ReferenceRevoked(
        uint256 indexed referenceId,
        address indexed referrer,
        uint256 timestamp
    );

    /// @notice Initializes the contract
    /// @param admin Address to be granted admin role (can be TimelockController)
    /// @dev For production, admin should be TakumiTimelock contract address
    /// @dev TimelockController will control all ADMIN_ROLE operations
    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Creates a skill endorsement
    /// @param endorsee Address of the person being endorsed
    /// @param skillName Name of the skill being endorsed
    /// @param message Endorsement message
    /// @return endorsementId The ID of the created endorsement
    function createEndorsement(
        address endorsee,
        string calldata skillName,
        string calldata message
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(endorsee != address(0), "Invalid endorsee address");
        require(endorsee != msg.sender, "Cannot endorse yourself");
        
        // Cache array length to avoid multiple SLOAD operations
        uint256 receivedLength = receivedEndorsements[endorsee].length;
        require(receivedLength < MAX_ENDORSEMENTS_PER_USER, "Maximum endorsements reached");
        
        // Cache string lengths
        uint256 skillNameLen = bytes(skillName).length;
        uint256 messageLen = bytes(message).length;
        
        require(skillNameLen > 0 && skillNameLen <= MAX_STRING_LENGTH, "Invalid skill name length");
        require(messageLen <= MAX_STRING_LENGTH, "Message too long");
        require(!hasEndorsed[msg.sender][endorsee][skillName], "Already endorsed this skill");

        uint256 endorsementId = totalEndorsements;
        uint256 currentTime = block.timestamp;

        endorsements[endorsementId] = SkillEndorsement({
            endorser: msg.sender,
            endorsee: endorsee,
            skillName: skillName,
            message: message,
            timestamp: currentTime,
            revoked: false
        });

        receivedEndorsements[endorsee].push(endorsementId);
        givenEndorsements[msg.sender].push(endorsementId);
        hasEndorsed[msg.sender][endorsee][skillName] = true;
        
        unchecked {
            ++totalEndorsements;
        }

        emit EndorsementCreated(endorsementId, msg.sender, endorsee, skillName, currentTime);

        return endorsementId;
    }

    /// @notice Revokes an endorsement
    /// @param endorsementId ID of the endorsement to revoke
    function revokeEndorsement(uint256 endorsementId) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(endorsementId < totalEndorsements, "Invalid endorsement ID");
        
        SkillEndorsement storage endorsement = endorsements[endorsementId];
        require(endorsement.endorser == msg.sender, "Not the endorser");
        require(!endorsement.revoked, "Already revoked");

        endorsement.revoked = true;
        hasEndorsed[endorsement.endorser][endorsement.endorsee][endorsement.skillName] = false;

        emit EndorsementRevoked(endorsementId, msg.sender, block.timestamp);
    }

    /// @notice Creates a professional reference
    /// @param referee Address of the person being referenced
    /// @param relationship Relationship description (e.g., "Former Manager", "Colleague")
    /// @param message Reference message
    /// @param ipfsHash IPFS hash for detailed reference letter
    /// @return referenceId The ID of the created reference
    function createReference(
        address referee,
        string calldata relationship,
        string calldata message,
        string calldata ipfsHash
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(referee != address(0), "Invalid referee address");
        require(referee != msg.sender, "Cannot reference yourself");
        require(receivedReferences[referee].length < MAX_REFERENCES_PER_USER, "Maximum references reached");
        require(!hasGivenReference[msg.sender][referee], "Already gave reference");
        
        {
            uint256 relationshipLen = bytes(relationship).length;
            require(relationshipLen > 0 && relationshipLen <= MAX_STRING_LENGTH, "Invalid relationship length");
        }
        
        require(bytes(message).length <= MAX_STRING_LENGTH, "Message too long");
        require(bytes(ipfsHash).length <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");

        uint256 referenceId = totalReferences;
        uint256 currentTime = block.timestamp;

        references[referenceId] = Reference({
            referrer: msg.sender,
            referee: referee,
            relationship: relationship,
            message: message,
            ipfsHash: ipfsHash,
            timestamp: currentTime,
            revoked: false
        });

        receivedReferences[referee].push(referenceId);
        givenReferences[msg.sender].push(referenceId);
        hasGivenReference[msg.sender][referee] = true;
        
        unchecked {
            ++totalReferences;
        }

        emit ReferenceCreated(referenceId, msg.sender, referee, currentTime);

        return referenceId;
    }

    /// @notice Revokes a reference
    /// @param referenceId ID of the reference to revoke
    function revokeReference(uint256 referenceId) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(referenceId < totalReferences, "Invalid reference ID");
        
        Reference storage ref = references[referenceId];
        require(ref.referrer == msg.sender, "Not the referrer");
        require(!ref.revoked, "Already revoked");

        ref.revoked = true;
        hasGivenReference[ref.referrer][ref.referee] = false;

        emit ReferenceRevoked(referenceId, msg.sender, block.timestamp);
    }

    /// @notice Gets endorsement details
    /// @param endorsementId ID of the endorsement
    /// @return Endorsement data
    function getEndorsement(uint256 endorsementId) 
        external 
        view 
        returns (SkillEndorsement memory) 
    {
        require(endorsementId < totalEndorsements, "Invalid endorsement ID");
        return endorsements[endorsementId];
    }

    /// @notice Gets reference details
    /// @param referenceId ID of the reference
    /// @return Reference data
    function getReference(uint256 referenceId) 
        external 
        view 
        returns (Reference memory) 
    {
        require(referenceId < totalReferences, "Invalid reference ID");
        return references[referenceId];
    }

    /// @notice Gets paginated endorsements received by a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return endorsementIds Array of endorsement IDs
    /// @return total Total number of received endorsements
    function getReceivedEndorsements(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory endorsementIds, uint256 total) 
    {
        total = receivedEndorsements[user].length;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            endorsementIds = new uint256[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                endorsementIds[i] = receivedEndorsements[user][offset + i];
            }
        }

        return (endorsementIds, total);
    }

    /// @notice Gets paginated endorsements given by a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return endorsementIds Array of endorsement IDs
    /// @return total Total number of given endorsements
    function getGivenEndorsements(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory endorsementIds, uint256 total) 
    {
        total = givenEndorsements[user].length;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            endorsementIds = new uint256[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                endorsementIds[i] = givenEndorsements[user][offset + i];
            }
        }

        return (endorsementIds, total);
    }

    /// @notice Gets paginated references received by a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return referenceIds Array of reference IDs
    /// @return total Total number of received references
    function getReceivedReferences(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory referenceIds, uint256 total) 
    {
        total = receivedReferences[user].length;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            referenceIds = new uint256[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                referenceIds[i] = receivedReferences[user][offset + i];
            }
        }

        return (referenceIds, total);
    }

    /// @notice Gets paginated references given by a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return referenceIds Array of reference IDs
    /// @return total Total number of given references
    function getGivenReferences(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory referenceIds, uint256 total) 
    {
        total = givenReferences[user].length;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            referenceIds = new uint256[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                referenceIds[i] = givenReferences[user][offset + i];
            }
        }

        return (referenceIds, total);
    }

    /// @notice Gets paginated active (non-revoked) endorsements for a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return endorsementIds Array of active endorsement IDs
    /// @return total Total number of active endorsements
    function getActiveEndorsements(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory endorsementIds, uint256 total) 
    {
        uint256[] memory allEndorsements = receivedEndorsements[user];
        uint256 allLength = allEndorsements.length;
        
        // Count active endorsements
        uint256 activeCount = 0;
        unchecked {
            for (uint256 i = 0; i < allLength; ++i) {
                if (!endorsements[allEndorsements[i]].revoked) {
                    ++activeCount;
                }
            }
        }

        total = activeCount;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            endorsementIds = new uint256[](resultLength);

            // Populate result array with pagination
            uint256 activeIndex = 0;
            uint256 resultIndex = 0;
            
            for (uint256 i = 0; i < allLength && resultIndex < resultLength; ++i) {
                if (!endorsements[allEndorsements[i]].revoked) {
                    if (activeIndex >= offset) {
                        endorsementIds[resultIndex] = allEndorsements[i];
                        ++resultIndex;
                    }
                    ++activeIndex;
                }
            }
        }

        return (endorsementIds, total);
    }

    /// @notice Gets paginated active (non-revoked) references for a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return referenceIds Array of active reference IDs
    /// @return total Total number of active references
    function getActiveReferences(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory referenceIds, uint256 total) 
    {
        uint256[] memory allReferences = receivedReferences[user];
        uint256 allLength = allReferences.length;
        
        // Count active references
        uint256 activeCount = 0;
        unchecked {
            for (uint256 i = 0; i < allLength; ++i) {
                if (!references[allReferences[i]].revoked) {
                    ++activeCount;
                }
            }
        }

        total = activeCount;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            referenceIds = new uint256[](resultLength);

            // Populate result array with pagination
            uint256 activeIndex = 0;
            uint256 resultIndex = 0;
            
            for (uint256 i = 0; i < allLength && resultIndex < resultLength; ++i) {
                if (!references[allReferences[i]].revoked) {
                    if (activeIndex >= offset) {
                        referenceIds[resultIndex] = allReferences[i];
                        ++resultIndex;
                    }
                    ++activeIndex;
                }
            }
        }

        return (referenceIds, total);
    }

    /// @notice Gets total count of endorsements received by a user
    /// @param user User address
    /// @return Total number of received endorsements
    function getReceivedEndorsementsCount(address user) external view returns (uint256) {
        return receivedEndorsements[user].length;
    }

    /// @notice Gets total count of endorsements given by a user
    /// @param user User address
    /// @return Total number of given endorsements
    function getGivenEndorsementsCount(address user) external view returns (uint256) {
        return givenEndorsements[user].length;
    }

    /// @notice Gets total count of references received by a user
    /// @param user User address
    /// @return Total number of received references
    function getReceivedReferencesCount(address user) external view returns (uint256) {
        return receivedReferences[user].length;
    }

    /// @notice Gets total count of references given by a user
    /// @param user User address
    /// @return Total number of given references
    function getGivenReferencesCount(address user) external view returns (uint256) {
        return givenReferences[user].length;
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
}
