// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title SkillProfile - User profile management with Dynamic Soulbound NFTs
/// @notice Manages user profiles with skills, experience, education, and evolving NFT tiers
/// @dev Contract with role-based access control and soulbound NFT mechanics
contract SkillProfile is 
    AccessControl, 
    Pausable,
    ReentrancyGuard,
    ERC721URIStorage
{
    /// @notice Role identifier for admin operations (controlled by TimelockController)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role identifier for verifier operations
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Maximum number of skills per user to prevent gas griefing
    uint256 public constant MAX_SKILLS_PER_USER = 100;

    /// @notice Maximum number of experience entries per user
    uint256 public constant MAX_EXPERIENCE_PER_USER = 50;

    /// @notice Maximum number of education entries per user
    uint256 public constant MAX_EDUCATION_PER_USER = 20;

    /// @notice Maximum length for string fields to prevent gas griefing
    uint256 public constant MAX_STRING_LENGTH = 500;

    /// @notice Maximum length for IPFS hash strings (for skills, experience, education)
    uint256 public constant MAX_IPFS_HASH_LENGTH = 100;

    /// @notice NFT tier enumeration
    enum Tier {
        Iron,    // 0-2 verified skills
        Silver,  // 3-9 verified skills
        Gold     // 10+ verified skills
    }

    /// @notice Represents a skill entry in user profile
    struct Skill {
        string name;
        uint8 proficiencyLevel; // 1-100
        string ipfsHash; // Detailed metadata
        uint256 timestamp;
        bool verified;
    }

    /// @notice Represents work experience entry
    struct Experience {
        string company;
        string position;
        uint256 startDate;
        uint256 endDate; // 0 for current position
        string ipfsHash; // Detailed description
        uint256 timestamp;
    }

    /// @notice Represents education entry
    struct Education {
        string institution;
        string degree;
        string fieldOfStudy;
        uint256 graduationDate;
        string ipfsHash; // Certificates, transcripts
        uint256 timestamp;
    }

    /// @notice User profile data structure
    /// @dev Optimized for gas: bio and metadata stored in IPFS, only hash stored on-chain
    struct Profile {
        string name;
        bytes32 ipfsHash; // IPFS hash containing bio, profile picture, and additional metadata
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
        uint256 tokenId; // NFT token ID for this profile
        Tier currentTier; // Current NFT tier
    }

    /// @notice Mapping from user address to profile
    mapping(address => Profile) public profiles;

    /// @notice Mapping from user address to skills array
    mapping(address => Skill[]) public userSkills;

    /// @notice Mapping from user address to experience array
    mapping(address => Experience[]) public userExperience;

    /// @notice Mapping from user address to education array
    mapping(address => Education[]) public userEducation;

    /// @notice Mapping from tier to IPFS URI
    mapping(Tier => string) public tierURIs;

    /// @notice Total number of profiles created
    uint256 public totalProfiles;

    /// @notice Counter for NFT token IDs
    uint256 private _nextTokenId;

    /// @notice Emitted when a new profile is created
    event ProfileCreated(address indexed user, string name, uint256 timestamp, uint256 tokenId);

    /// @notice Emitted when a profile is updated
    event ProfileUpdated(address indexed user, uint256 timestamp);

    /// @notice Emitted when a skill is added
    event SkillAdded(address indexed user, string skillName, uint8 proficiencyLevel, uint256 timestamp);

    /// @notice Emitted when a skill is verified
    event SkillVerified(address indexed user, uint256 skillIndex, address indexed verifier, uint256 timestamp);

    /// @notice Emitted when experience is added
    event ExperienceAdded(address indexed user, string company, string position, uint256 timestamp);

    /// @notice Emitted when education is added
    event EducationAdded(address indexed user, string institution, string degree, uint256 timestamp);

    /// @notice Emitted when a skill is removed
    event SkillRemoved(address indexed user, uint256 skillIndex, uint256 timestamp);

    /// @notice Emitted when experience is removed
    event ExperienceRemoved(address indexed user, uint256 experienceIndex, uint256 timestamp);

    /// @notice Emitted when education is removed
    event EducationRemoved(address indexed user, uint256 educationIndex, uint256 timestamp);

    /// @notice Emitted when a user's tier is updated
    event TierUpdated(address indexed user, Tier oldTier, Tier newTier, uint256 verifiedSkillCount, uint256 timestamp);

    /// @notice Initializes the contract
    /// @param admin Address to be granted admin role (can be TimelockController)
    /// @dev For production, admin should be TakumiTimelock contract address
    /// @dev TimelockController will control all ADMIN_ROLE and VERIFIER_ROLE operations
    constructor(address admin) ERC721("Takumi Skill Profile", "TSP") {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);

        // Set default tier URIs (can be updated by admin)
        tierURIs[Tier.Iron] = "ipfs://QmIronTierDefault";
        tierURIs[Tier.Silver] = "ipfs://QmSilverTierDefault";
        tierURIs[Tier.Gold] = "ipfs://QmGoldTierDefault";
    }

    /// @notice Creates a new user profile and mints soulbound NFT
    /// @param name User's display name
    /// @param ipfsHash IPFS hash (bytes32) containing bio, profile picture, and metadata
    /// @dev Gas optimized: stores only IPFS hash instead of full bio/metadata strings
    function createProfile(
        string calldata name,
        bytes32 ipfsHash
    ) external whenNotPaused nonReentrant {
        require(!profiles[msg.sender].exists, "Profile already exists");
        
        // Cache string length to avoid multiple CALLDATALOAD operations
        uint256 nameLen = bytes(name).length;
        
        require(nameLen > 0 && nameLen <= MAX_STRING_LENGTH, "Invalid name length");
        require(ipfsHash != bytes32(0), "Invalid IPFS hash");

        // Cache timestamp to avoid multiple TIMESTAMP opcodes
        uint256 currentTime = block.timestamp;

        // Mint soulbound NFT
        uint256 tokenId = _nextTokenId;
        unchecked {
            ++_nextTokenId;
        }
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tierURIs[Tier.Iron]); // Start with Iron tier

        profiles[msg.sender] = Profile({
            name: name,
            ipfsHash: ipfsHash,
            createdAt: currentTime,
            updatedAt: currentTime,
            exists: true,
            tokenId: tokenId,
            currentTier: Tier.Iron
        });

        unchecked {
            ++totalProfiles;
        }

        emit ProfileCreated(msg.sender, name, currentTime, tokenId);
    }

    /// @notice Updates an existing profile
    /// @param name Updated display name
    /// @param ipfsHash Updated IPFS hash (bytes32) containing bio and metadata
    /// @dev Gas optimized: stores only IPFS hash instead of full bio/metadata strings
    function updateProfile(
        string calldata name,
        bytes32 ipfsHash
    ) external whenNotPaused nonReentrant {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        // Cache string length
        uint256 nameLen = bytes(name).length;
        
        require(nameLen > 0 && nameLen <= MAX_STRING_LENGTH, "Invalid name length");
        require(ipfsHash != bytes32(0), "Invalid IPFS hash");

        Profile storage profile = profiles[msg.sender];
        profile.name = name;
        profile.ipfsHash = ipfsHash;
        
        uint256 currentTime = block.timestamp;
        profile.updatedAt = currentTime;

        emit ProfileUpdated(msg.sender, currentTime);
    }

    /// @notice Adds a skill to user's profile
    /// @param name Skill name
    /// @param proficiencyLevel Proficiency level (1-100)
    /// @param ipfsHash IPFS hash for skill metadata
    function addSkill(
        string calldata name,
        uint8 proficiencyLevel,
        string calldata ipfsHash
    ) external whenNotPaused nonReentrant {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        // Cache array length to avoid multiple SLOAD operations
        uint256 skillsLength = userSkills[msg.sender].length;
        require(skillsLength < MAX_SKILLS_PER_USER, "Maximum skills reached");
        
        // Cache string lengths
        uint256 nameLen = bytes(name).length;
        uint256 ipfsLen = bytes(ipfsHash).length;
        
        require(nameLen > 0 && nameLen <= MAX_STRING_LENGTH, "Invalid skill name length");
        require(proficiencyLevel > 0 && proficiencyLevel <= 100, "Invalid proficiency level");
        require(ipfsLen <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");

        uint256 currentTime = block.timestamp;

        userSkills[msg.sender].push(Skill({
            name: name,
            proficiencyLevel: proficiencyLevel,
            ipfsHash: ipfsHash,
            timestamp: currentTime,
            verified: false
        }));

        emit SkillAdded(msg.sender, name, proficiencyLevel, currentTime);
    }

    /// @notice Verifies a user's skill and updates tier
    /// @param user User address
    /// @param skillIndex Index of the skill to verify
    function verifySkill(address user, uint256 skillIndex) 
        external 
        whenNotPaused 
        onlyRole(VERIFIER_ROLE) 
    {
        require(profiles[user].exists, "Profile does not exist");
        
        // Cache array to avoid multiple SLOAD operations
        Skill[] storage skills = userSkills[user];
        require(skillIndex < skills.length, "Invalid skill index");
        
        Skill storage skill = skills[skillIndex];
        require(!skill.verified, "Skill already verified");

        skill.verified = true;

        emit SkillVerified(user, skillIndex, msg.sender, block.timestamp);

        // Automatically update tier after verification
        updateProfileTier(user);
    }

    /// @notice Updates user's profile tier based on verified skill count
    /// @param user User address
    /// @dev Called automatically after skill verification or can be called manually
    function updateProfileTier(address user) public {
        require(profiles[user].exists, "Profile does not exist");

        // Count verified skills
        uint256 verifiedCount = 0;
        Skill[] storage skills = userSkills[user];
        uint256 skillsLength = skills.length;
        
        unchecked {
            for (uint256 i = 0; i < skillsLength; ++i) {
                if (skills[i].verified) {
                    ++verifiedCount;
                }
            }
        }

        // Determine new tier
        Tier newTier;
        if (verifiedCount >= 10) {
            newTier = Tier.Gold;
        } else if (verifiedCount >= 3) {
            newTier = Tier.Silver;
        } else {
            newTier = Tier.Iron;
        }

        Profile storage profile = profiles[user];
        Tier oldTier = profile.currentTier;

        // Update tier if changed
        if (newTier != oldTier) {
            profile.currentTier = newTier;
            
            // Update NFT metadata URI
            _setTokenURI(profile.tokenId, tierURIs[newTier]);
            
            emit TierUpdated(user, oldTier, newTier, verifiedCount, block.timestamp);
        }
    }

    /// @notice Adds work experience to user's profile
    /// @param company Company name
    /// @param position Job position
    /// @param startDate Start date (Unix timestamp)
    /// @param endDate End date (Unix timestamp, 0 for current)
    /// @param ipfsHash IPFS hash for experience details
    function addExperience(
        string calldata company,
        string calldata position,
        uint256 startDate,
        uint256 endDate,
        string calldata ipfsHash
    ) external whenNotPaused nonReentrant {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        uint256 expLength = userExperience[msg.sender].length;
        require(expLength < MAX_EXPERIENCE_PER_USER, "Maximum experience entries reached");
        
        // Cache string lengths
        uint256 companyLen = bytes(company).length;
        uint256 positionLen = bytes(position).length;
        uint256 ipfsLen = bytes(ipfsHash).length;
        
        require(companyLen > 0 && companyLen <= MAX_STRING_LENGTH, "Invalid company length");
        require(positionLen > 0 && positionLen <= MAX_STRING_LENGTH, "Invalid position length");
        
        uint256 currentTime = block.timestamp;
        require(startDate > 0 && startDate <= currentTime, "Invalid start date");
        require(endDate == 0 || (endDate > startDate && endDate <= currentTime), "Invalid end date");
        require(ipfsLen <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");

        userExperience[msg.sender].push(Experience({
            company: company,
            position: position,
            startDate: startDate,
            endDate: endDate,
            ipfsHash: ipfsHash,
            timestamp: currentTime
        }));

        emit ExperienceAdded(msg.sender, company, position, currentTime);
    }

    /// @notice Adds education to user's profile
    /// @param institution Educational institution name
    /// @param degree Degree obtained
    /// @param fieldOfStudy Field of study
    /// @param graduationDate Graduation date (Unix timestamp)
    /// @param ipfsHash IPFS hash for certificates/transcripts
    function addEducation(
        string calldata institution,
        string calldata degree,
        string calldata fieldOfStudy,
        uint256 graduationDate,
        string calldata ipfsHash
    ) external whenNotPaused nonReentrant {
        require(profiles[msg.sender].exists, "Profile does not exist");
        require(userEducation[msg.sender].length < MAX_EDUCATION_PER_USER, "Maximum education entries reached");
        
        // Validate string lengths in scoped blocks
        {
            uint256 institutionLen = bytes(institution).length;
            require(institutionLen > 0 && institutionLen <= MAX_STRING_LENGTH, "Invalid institution length");
        }
        {
            uint256 degreeLen = bytes(degree).length;
            require(degreeLen > 0 && degreeLen <= MAX_STRING_LENGTH, "Invalid degree length");
        }
        
        require(bytes(fieldOfStudy).length <= MAX_STRING_LENGTH, "Field of study too long");
        require(bytes(ipfsHash).length <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");
        require(graduationDate > 0 && graduationDate <= block.timestamp, "Invalid graduation date");

        uint256 currentTime = block.timestamp;
        userEducation[msg.sender].push(Education({
            institution: institution,
            degree: degree,
            fieldOfStudy: fieldOfStudy,
            graduationDate: graduationDate,
            ipfsHash: ipfsHash,
            timestamp: currentTime
        }));

        emit EducationAdded(msg.sender, institution, degree, currentTime);
    }

    /// @notice Removes a skill from user's profile
    /// @param skillIndex Index of the skill to remove
    function removeSkill(uint256 skillIndex) external whenNotPaused nonReentrant {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        Skill[] storage skills = userSkills[msg.sender];
        uint256 skillsLength = skills.length;
        require(skillIndex < skillsLength, "Invalid skill index");

        // Move last element to deleted position and pop
        unchecked {
            uint256 lastIndex = skillsLength - 1;
            if (skillIndex != lastIndex) {
                skills[skillIndex] = skills[lastIndex];
            }
        }
        skills.pop();

        emit SkillRemoved(msg.sender, skillIndex, block.timestamp);

        // Update tier after skill removal
        updateProfileTier(msg.sender);
    }

    /// @notice Removes experience from user's profile
    /// @param experienceIndex Index of the experience to remove
    function removeExperience(uint256 experienceIndex) external whenNotPaused nonReentrant {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        Experience[] storage experiences = userExperience[msg.sender];
        uint256 expLength = experiences.length;
        require(experienceIndex < expLength, "Invalid experience index");

        unchecked {
            uint256 lastIndex = expLength - 1;
            if (experienceIndex != lastIndex) {
                experiences[experienceIndex] = experiences[lastIndex];
            }
        }
        experiences.pop();

        emit ExperienceRemoved(msg.sender, experienceIndex, block.timestamp);
    }

    /// @notice Removes education from user's profile
    /// @param educationIndex Index of the education to remove
    function removeEducation(uint256 educationIndex) external whenNotPaused nonReentrant {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        Education[] storage educations = userEducation[msg.sender];
        uint256 eduLength = educations.length;
        require(educationIndex < eduLength, "Invalid education index");

        unchecked {
            uint256 lastIndex = eduLength - 1;
            if (educationIndex != lastIndex) {
                educations[educationIndex] = educations[lastIndex];
            }
        }
        educations.pop();

        emit EducationRemoved(msg.sender, educationIndex, block.timestamp);
    }

    /// @notice Gets user's profile
    /// @param user User address
    /// @return Profile data
    function getProfile(address user) external view returns (Profile memory) {
        return profiles[user];
    }

    /// @notice Gets verified skill count for a user
    /// @param user User address
    /// @return Count of verified skills
    function getVerifiedSkillCount(address user) public view returns (uint256) {
        uint256 verifiedCount = 0;
        Skill[] storage skills = userSkills[user];
        uint256 skillsLength = skills.length;
        
        unchecked {
            for (uint256 i = 0; i < skillsLength; ++i) {
                if (skills[i].verified) {
                    ++verifiedCount;
                }
            }
        }
        
        return verifiedCount;
    }

    /// @notice Gets paginated skills for a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return skills Array of skills
    /// @return total Total number of skills for the user
    function getSkills(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (Skill[] memory skills, uint256 total) 
    {
        total = userSkills[user].length;
        
        if (offset >= total) {
            return (new Skill[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            skills = new Skill[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                skills[i] = userSkills[user][offset + i];
            }
        }

        return (skills, total);
    }

    /// @notice Gets paginated experience for a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return experience Array of experience entries
    /// @return total Total number of experience entries for the user
    function getExperience(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (Experience[] memory experience, uint256 total) 
    {
        total = userExperience[user].length;
        
        if (offset >= total) {
            return (new Experience[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            experience = new Experience[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                experience[i] = userExperience[user][offset + i];
            }
        }

        return (experience, total);
    }

    /// @notice Gets paginated education for a user
    /// @param user User address
    /// @param offset Starting index
    /// @param limit Maximum number of items to return
    /// @return education Array of education entries
    /// @return total Total number of education entries for the user
    function getEducation(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (Education[] memory education, uint256 total) 
    {
        total = userEducation[user].length;
        
        if (offset >= total) {
            return (new Education[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        unchecked {
            uint256 resultLength = end - offset;
            education = new Education[](resultLength);

            for (uint256 i = 0; i < resultLength; ++i) {
                education[i] = userEducation[user][offset + i];
            }
        }

        return (education, total);
    }

    /// @notice Gets total count of skills for a user
    /// @param user User address
    /// @return Total number of skills
    function getSkillsCount(address user) external view returns (uint256) {
        return userSkills[user].length;
    }

    /// @notice Gets total count of experience entries for a user
    /// @param user User address
    /// @return Total number of experience entries
    function getExperienceCount(address user) external view returns (uint256) {
        return userExperience[user].length;
    }

    /// @notice Gets total count of education entries for a user
    /// @param user User address
    /// @return Total number of education entries
    function getEducationCount(address user) external view returns (uint256) {
        return userEducation[user].length;
    }

    /// @notice Sets the IPFS URI for a specific tier
    /// @param tier Tier to update
    /// @param uri New IPFS URI for the tier
    function setTierURI(Tier tier, string calldata uri) external onlyRole(ADMIN_ROLE) {
        require(bytes(uri).length > 0, "Invalid URI");
        tierURIs[tier] = uri;
    }

    /// @notice Override transfer functions to make NFTs soulbound (non-transferable)
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but prevent transfers
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: Transfer not allowed");
        }
        
        return super._update(to, tokenId, auth);
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

    /// @notice Required override for supportsInterface
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
