// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./PersonalToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TalentEquityFactory
 * @notice Factory contract for creating PersonalToken contracts
 * @dev Allows users to create their own income-backed tokens with ethical safeguards
 */
contract TalentEquityFactory is Ownable, Pausable {
    // ============ State Variables ============

    /// @notice USDC token address (same for all PersonalTokens)
    address public immutable usdcToken;

    /// @notice Array of all deployed PersonalToken contracts
    address[] public deployedTokens;

    /// @notice Mapping of talent address to their PersonalToken contracts
    mapping(address => address[]) public talentToTokens;

    /// @notice Mapping to check if an address is a valid PersonalToken
    mapping(address => bool) public isPersonalToken;

    /// @notice Whether the factory has been revoked
    bool public revoked;

    // ============ Events ============

    event PersonalTokenCreated(
        address indexed talent,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 tokenPrice,
        uint256 returnCapMultiplier,
        uint256 durationInYears,
        uint256 timestamp
    );

    event FactoryRevoked(
        address indexed owner,
        uint256 timestamp
    );

    // ============ Constructor ============

    /**
     * @notice Initialize TalentEquityFactory
     * @param _usdcToken USDC token address
     */
    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = _usdcToken;
    }

    // ============ Factory Functions ============

    /**
     * @notice Create a new PersonalToken contract
     * @param name Token name (e.g., "Alice's Income Token")
     * @param symbol Token symbol (e.g., "ALICE")
     * @param tokenPrice Price of 1 PersonalToken in USDC (scaled by 1e6)
     * @param returnCapMultiplier Maximum return multiplier (2-5x)
     * @param durationInYears Contract duration in years (2-5)
     * @param talentSharePercentage Talent's revenue share percentage (80-95)
     * @return tokenAddress Address of the created PersonalToken
     */
    function createPersonalToken(
        string memory name,
        string memory symbol,
        uint256 tokenPrice,
        uint256 returnCapMultiplier,
        uint256 durationInYears,
        uint256 talentSharePercentage
    ) external whenNotPaused returns (address tokenAddress) {
        require(!revoked, "Factory revoked");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(tokenPrice > 0, "Token price must be > 0");
        require(returnCapMultiplier >= 2 && returnCapMultiplier <= 5, "Return cap must be 2-5x");
        require(durationInYears >= 2 && durationInYears <= 5, "Duration must be 2-5 years");
        require(talentSharePercentage >= 80 && talentSharePercentage <= 95, "Talent share must be 80-95%");

        // Deploy new PersonalToken
        PersonalToken newToken = new PersonalToken(
            msg.sender,
            name,
            symbol,
            usdcToken,
            tokenPrice,
            returnCapMultiplier,
            durationInYears,
            talentSharePercentage
        );

        tokenAddress = address(newToken);

        // Track deployed token
        deployedTokens.push(tokenAddress);
        talentToTokens[msg.sender].push(tokenAddress);
        isPersonalToken[tokenAddress] = true;

        emit PersonalTokenCreated(
            msg.sender,
            tokenAddress,
            name,
            symbol,
            tokenPrice,
            returnCapMultiplier,
            durationInYears,
            block.timestamp
        );

        return tokenAddress;
    }

    // ============ View Functions ============

    /**
     * @notice Get all deployed PersonalToken contracts
     * @return Array of PersonalToken addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    /**
     * @notice Get PersonalToken contracts created by a specific talent
     * @param talent Address of the talent
     * @return Array of PersonalToken addresses
     */
    function getTokensByTalent(address talent) external view returns (address[] memory) {
        return talentToTokens[talent];
    }

    /**
     * @notice Get total number of deployed PersonalTokens
     * @return Total count
     */
    function getTotalTokenCount() external view returns (uint256) {
        return deployedTokens.length;
    }

    /**
     * @notice Get PersonalToken at specific index
     * @param index Index in deployedTokens array
     * @return PersonalToken address
     */
    function getTokenAtIndex(uint256 index) external view returns (address) {
        require(index < deployedTokens.length, "Index out of bounds");
        return deployedTokens[index];
    }

    // ============ Admin Functions ============

    /**
     * @notice Pause factory (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause factory
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Revoke factory permanently (EIP-6780 compliant)
     * @dev This is the EIP-6780 compliant alternative to selfdestruct
     */
    function revokeFactory() external onlyOwner {
        require(!revoked, "Factory already revoked");
        revoked = true;
        _pause();
        renounceOwnership();
        emit FactoryRevoked(msg.sender, block.timestamp);
    }
}
