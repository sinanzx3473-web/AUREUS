// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VerifierRegistry - Trusted verifier management
/// @notice Manages trusted verifiers with specializations and reputation tracking
/// @dev Contract with role-based access control
contract VerifierRegistry is 
    AccessControl, 
    Pausable,
    ReentrancyGuard 
{
    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role identifier for verifier operations
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Maximum number of specializations per verifier to prevent gas griefing
    uint256 public constant MAX_SPECIALIZATIONS = 50;

    /// @notice Maximum length for string fields
    uint256 public constant MAX_STRING_LENGTH = 500;

    /// @notice Maximum length for IPFS hash
    uint256 public constant MAX_IPFS_HASH_LENGTH = 100;

    /// @notice Verifier status enumeration
    enum VerifierStatus {
        Inactive,
        Active,
        Suspended
    }

    /// @notice Represents a verifier profile
    struct Verifier {
        address verifierAddress;
        string name;
        string organization;
        string[] specializations;
        string ipfsHash; // Credentials, certifications
        VerifierStatus status;
        uint256 totalVerifications;
        uint256 approvedVerifications;
        uint256 rejectedVerifications;
        uint256 disputedVerifications;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    /// @notice Mapping from verifier address to verifier data
    mapping(address => Verifier) public verifiers;

    /// @notice Array of all verifier addresses
    address[] public verifierList;

    /// @notice Mapping to check if address is registered verifier
    mapping(address => bool) public isRegisteredVerifier;

    /// @notice Total number of active verifiers
    uint256 public activeVerifierCount;

    /// @notice Emitted when a new verifier is registered
    event VerifierRegistered(
        address indexed verifier,
        string name,
        string organization,
        uint256 timestamp
    );

    /// @notice Emitted when verifier profile is updated
    event VerifierUpdated(
        address indexed verifier,
        uint256 timestamp
    );

    /// @notice Emitted when verifier status changes
    event VerifierStatusChanged(
        address indexed verifier,
        VerifierStatus oldStatus,
        VerifierStatus newStatus,
        uint256 timestamp
    );

    /// @notice Emitted when verifier statistics are updated
    event VerificationRecorded(
        address indexed verifier,
        bool approved,
        uint256 timestamp
    );

    /// @notice Emitted when a specialization is added
    event SpecializationAdded(
        address indexed verifier,
        string specialization,
        uint256 timestamp
    );

    /// @notice Emitted when a specialization is removed
    event SpecializationRemoved(
        address indexed verifier,
        string specialization,
        uint256 timestamp
    );

    /// @notice Initializes the contract
    /// @param admin Address to be granted admin role (can be TimelockController)
    /// @dev For production, admin should be TakumiTimelock contract address
    /// @dev TimelockController will control all ADMIN_ROLE and VERIFIER_ROLE operations
    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Registers a new verifier
    /// @param verifierAddress Address of the verifier
    /// @param name Verifier's name
    /// @param organization Verifier's organization
    /// @param specializations Array of specialization areas
    /// @param ipfsHash IPFS hash for credentials
    function registerVerifier(
        address verifierAddress,
        string calldata name,
        string calldata organization,
        string[] calldata specializations,
        string calldata ipfsHash
    ) external whenNotPaused onlyRole(ADMIN_ROLE) {
        require(verifierAddress != address(0), "Invalid verifier address");
        require(!isRegisteredVerifier[verifierAddress], "Verifier already registered");
        
        // Validate inputs in scoped blocks
        {
            uint256 nameLen = bytes(name).length;
            require(nameLen > 0 && nameLen <= MAX_STRING_LENGTH, "Invalid name length");
        }
        
        require(bytes(organization).length <= MAX_STRING_LENGTH, "Organization name too long");
        require(bytes(ipfsHash).length <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");
        
        {
            uint256 specLen = specializations.length;
            require(specLen > 0 && specLen <= MAX_SPECIALIZATIONS, "Invalid specializations count");
            
            // Validate each specialization length
            unchecked {
                for (uint256 i = 0; i < specLen; ++i) {
                    require(bytes(specializations[i]).length > 0 && bytes(specializations[i]).length <= MAX_STRING_LENGTH, "Invalid specialization length");
                }
            }
        }

        uint256 currentTime = block.timestamp;

        verifiers[verifierAddress] = Verifier({
            verifierAddress: verifierAddress,
            name: name,
            organization: organization,
            specializations: specializations,
            ipfsHash: ipfsHash,
            status: VerifierStatus.Active,
            totalVerifications: 0,
            approvedVerifications: 0,
            rejectedVerifications: 0,
            disputedVerifications: 0,
            registeredAt: currentTime,
            updatedAt: currentTime
        });

        verifierList.push(verifierAddress);
        isRegisteredVerifier[verifierAddress] = true;
        
        unchecked {
            ++activeVerifierCount;
        }

        _grantRole(VERIFIER_ROLE, verifierAddress);

        emit VerifierRegistered(verifierAddress, name, organization, currentTime);
    }

    /// @notice Updates verifier profile
    /// @param verifierAddress Address of the verifier
    /// @param name Updated name
    /// @param organization Updated organization
    /// @param ipfsHash Updated IPFS hash
    function updateVerifier(
        address verifierAddress,
        string calldata name,
        string calldata organization,
        string calldata ipfsHash
    ) external whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        
        // Cache string lengths
        uint256 nameLen = bytes(name).length;
        uint256 orgLen = bytes(organization).length;
        uint256 ipfsLen = bytes(ipfsHash).length;
        
        require(nameLen > 0 && nameLen <= MAX_STRING_LENGTH, "Invalid name length");
        require(orgLen <= MAX_STRING_LENGTH, "Organization name too long");
        require(ipfsLen <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");

        Verifier storage verifier = verifiers[verifierAddress];
        verifier.name = name;
        verifier.organization = organization;
        verifier.ipfsHash = ipfsHash;
        verifier.updatedAt = block.timestamp;

        emit VerifierUpdated(verifierAddress, block.timestamp);
    }

    /// @notice Adds a specialization to verifier
    /// @param verifierAddress Address of the verifier
    /// @param specialization Specialization to add
    function addSpecialization(
        address verifierAddress,
        string calldata specialization
    ) external whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        
        uint256 specLen = bytes(specialization).length;
        require(specLen > 0 && specLen <= MAX_STRING_LENGTH, "Invalid specialization length");

        Verifier storage verifier = verifiers[verifierAddress];
        uint256 currentSpecLen = verifier.specializations.length;
        require(currentSpecLen < MAX_SPECIALIZATIONS, "Maximum specializations reached");
        
        // Check if specialization already exists
        unchecked {
            for (uint256 i = 0; i < currentSpecLen; ++i) {
                require(
                    keccak256(bytes(verifier.specializations[i])) != keccak256(bytes(specialization)),
                    "Specialization already exists"
                );
            }
        }

        verifier.specializations.push(specialization);
        verifier.updatedAt = block.timestamp;

        emit SpecializationAdded(verifierAddress, specialization, block.timestamp);
    }

    /// @notice Removes a specialization from verifier
    /// @param verifierAddress Address of the verifier
    /// @param specializationIndex Index of specialization to remove
    function removeSpecialization(
        address verifierAddress,
        uint256 specializationIndex
    ) external whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        
        Verifier storage verifier = verifiers[verifierAddress];
        uint256 specLength = verifier.specializations.length;
        require(specializationIndex < specLength, "Invalid index");
        require(specLength > 1, "Cannot remove last specialization");

        string memory removedSpecialization = verifier.specializations[specializationIndex];

        // Move last element to deleted position and pop
        unchecked {
            uint256 lastIndex = specLength - 1;
            if (specializationIndex != lastIndex) {
                verifier.specializations[specializationIndex] = verifier.specializations[lastIndex];
            }
        }
        verifier.specializations.pop();
        verifier.updatedAt = block.timestamp;

        emit SpecializationRemoved(verifierAddress, removedSpecialization, block.timestamp);
    }

    /// @notice Changes verifier status
    /// @param verifierAddress Address of the verifier
    /// @param newStatus New status
    function changeVerifierStatus(
        address verifierAddress,
        VerifierStatus newStatus
    ) external whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        
        Verifier storage verifier = verifiers[verifierAddress];
        VerifierStatus oldStatus = verifier.status;
        require(oldStatus != newStatus, "Status unchanged");

        verifier.status = newStatus;
        verifier.updatedAt = block.timestamp;

        // Update active count
        if (oldStatus == VerifierStatus.Active && newStatus != VerifierStatus.Active) {
            unchecked {
                --activeVerifierCount;
            }
        } else if (oldStatus != VerifierStatus.Active && newStatus == VerifierStatus.Active) {
            unchecked {
                ++activeVerifierCount;
            }
        }

        // Revoke or grant verifier role based on status
        if (newStatus == VerifierStatus.Active) {
            _grantRole(VERIFIER_ROLE, verifierAddress);
        } else {
            _revokeRole(VERIFIER_ROLE, verifierAddress);
        }

        emit VerifierStatusChanged(verifierAddress, oldStatus, newStatus, block.timestamp);
    }

    /// @notice Records a verification action
    /// @param verifierAddress Address of the verifier
    /// @param approved Whether the verification was approved
    /// @param disputed Whether the verification was disputed
    function recordVerification(
        address verifierAddress,
        bool approved,
        bool disputed
    ) external whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");

        Verifier storage verifier = verifiers[verifierAddress];
        
        unchecked {
            ++verifier.totalVerifications;

            if (disputed) {
                ++verifier.disputedVerifications;
            } else if (approved) {
                ++verifier.approvedVerifications;
            } else {
                ++verifier.rejectedVerifications;
            }
        }

        verifier.updatedAt = block.timestamp;

        emit VerificationRecorded(verifierAddress, approved, block.timestamp);
    }

    /// @notice Gets verifier details
    /// @param verifierAddress Address of the verifier
    /// @return Verifier data
    function getVerifier(address verifierAddress) 
        external 
        view 
        returns (Verifier memory) 
    {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        return verifiers[verifierAddress];
    }

    /// @notice Gets verifier specializations
    /// @param verifierAddress Address of the verifier
    /// @return Array of specializations
    function getSpecializations(address verifierAddress) 
        external 
        view 
        returns (string[] memory) 
    {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        return verifiers[verifierAddress].specializations;
    }

    /// @notice Gets paginated active verifiers
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return verifierAddresses Array of active verifier addresses
    /// @return total Total number of active verifiers
    function getActiveVerifiers(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory verifierAddresses, uint256 total) 
    {
        total = activeVerifierCount;
        
        if (offset >= total) {
            return (new address[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            verifierAddresses = new address[](resultLength);

            uint256 activeIndex = 0;
            uint256 resultIndex = 0;
            uint256 listLength = verifierList.length;

            for (uint256 i = 0; i < listLength && resultIndex < resultLength; ++i) {
                if (verifiers[verifierList[i]].status == VerifierStatus.Active) {
                    if (activeIndex >= offset) {
                        verifierAddresses[resultIndex] = verifierList[i];
                        ++resultIndex;
                    }
                    ++activeIndex;
                }
            }
        }

        return (verifierAddresses, total);
    }

    /// @notice Gets paginated list of all verifiers
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return verifierAddresses Array of all verifier addresses
    /// @return total Total number of verifiers
    function getAllVerifiers(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory verifierAddresses, uint256 total) 
    {
        total = verifierList.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            verifierAddresses = new address[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                verifierAddresses[i] = verifierList[offset + i];
            }
        }

        return (verifierAddresses, total);
    }

    /// @notice Gets total count of all verifiers
    /// @return Total number of verifiers
    function getAllVerifiersCount() external view returns (uint256) {
        return verifierList.length;
    }

    /// @notice Gets verifier statistics
    /// @param verifierAddress Address of the verifier
    /// @return total Total verifications
    /// @return approved Approved verifications
    /// @return rejected Rejected verifications
    /// @return disputed Disputed verifications
    function getVerifierStats(address verifierAddress) 
        external 
        view 
        returns (
            uint256 total,
            uint256 approved,
            uint256 rejected,
            uint256 disputed
        ) 
    {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        Verifier memory verifier = verifiers[verifierAddress];
        return (
            verifier.totalVerifications,
            verifier.approvedVerifications,
            verifier.rejectedVerifications,
            verifier.disputedVerifications
        );
    }

    /// @notice Calculates verifier approval rate
    /// @param verifierAddress Address of the verifier
    /// @return Approval rate in basis points (0-10000, where 10000 = 100%)
    function getApprovalRate(address verifierAddress) 
        external 
        view 
        returns (uint256) 
    {
        require(isRegisteredVerifier[verifierAddress], "Verifier not registered");
        Verifier memory verifier = verifiers[verifierAddress];
        
        if (verifier.totalVerifications == 0) {
            return 0;
        }

        unchecked {
            return (verifier.approvedVerifications * 10000) / verifier.totalVerifications;
        }
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
}
