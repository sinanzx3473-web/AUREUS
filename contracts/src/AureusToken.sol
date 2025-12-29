// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AureusToken - ERC-20 Governance Token
/// @notice Fixed supply governance token with burn and pause capabilities
/// @dev Total supply: 100M AUREUS, no additional minting allowed
contract AureusToken is ERC20, ERC20Burnable, AccessControl, Pausable {
    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Total supply: 100 million AUREUS
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10 ** 18;

    /// @notice Team & Advisors allocation: 20M AUREUS (20%)
    uint256 public constant TEAM_ALLOCATION = 20_000_000 * 10 ** 18;

    /// @notice Early Investors allocation: 15M AUREUS (15%)
    uint256 public constant INVESTOR_ALLOCATION = 15_000_000 * 10 ** 18;

    /// @notice Community Rewards allocation: 30M AUREUS (30%)
    uint256 public constant COMMUNITY_ALLOCATION = 30_000_000 * 10 ** 18;

    /// @notice Treasury allocation: 20M AUREUS (20%)
    uint256 public constant TREASURY_ALLOCATION = 20_000_000 * 10 ** 18;

    /// @notice Liquidity allocation: 15M AUREUS (15%)
    uint256 public constant LIQUIDITY_ALLOCATION = 15_000_000 * 10 ** 18;

    /// @notice Emitted when tokens are distributed to an allocation address
    event TokensDistributed(
        address indexed recipient,
        uint256 amount,
        string allocationType
    );

    /// @notice Constructor - mints total supply and distributes to allocation addresses
    /// @param admin Address to be granted admin role
    /// @param teamVault Address for team & advisors vesting vault
    /// @param investorVault Address for investor vesting vault
    /// @param communityRewards Address for community rewards
    /// @param treasury Address for treasury
    /// @param liquidity Address for liquidity
    constructor(
        address admin,
        address teamVault,
        address investorVault,
        address communityRewards,
        address treasury,
        address liquidity
    ) ERC20("Aureus Token", "AUREUS") {
        require(admin != address(0), "Invalid admin address");
        require(teamVault != address(0), "Invalid team vault address");
        require(investorVault != address(0), "Invalid investor vault address");
        require(communityRewards != address(0), "Invalid community address");
        require(treasury != address(0), "Invalid treasury address");
        require(liquidity != address(0), "Invalid liquidity address");

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        // Mint and distribute tokens
        _mint(teamVault, TEAM_ALLOCATION);
        emit TokensDistributed(teamVault, TEAM_ALLOCATION, "Team & Advisors");

        _mint(investorVault, INVESTOR_ALLOCATION);
        emit TokensDistributed(investorVault, INVESTOR_ALLOCATION, "Early Investors");

        _mint(communityRewards, COMMUNITY_ALLOCATION);
        emit TokensDistributed(communityRewards, COMMUNITY_ALLOCATION, "Community Rewards");

        _mint(treasury, TREASURY_ALLOCATION);
        emit TokensDistributed(treasury, TREASURY_ALLOCATION, "Treasury");

        _mint(liquidity, LIQUIDITY_ALLOCATION);
        emit TokensDistributed(liquidity, LIQUIDITY_ALLOCATION, "Liquidity");

        // Verify total supply
        assert(totalSupply() == TOTAL_SUPPLY);
    }

    /// @notice Pause token transfers (admin only)
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause token transfers (admin only)
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Override _update to add pause functionality
    /// @param from Address sending tokens
    /// @param to Address receiving tokens
    /// @param value Amount of tokens
    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, value);
    }
}
