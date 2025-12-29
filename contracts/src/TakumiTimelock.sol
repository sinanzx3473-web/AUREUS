// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title TakumiTimelock - Timelock controller for Takumi platform governance
/// @notice Enforces time delays on critical operations for transparency and security
/// @dev Extends OpenZeppelin TimelockController with Takumi-specific configuration
contract TakumiTimelock is TimelockController {
    /// @notice Minimum delay for timelock operations (3 days in production)
    uint256 public constant MIN_DELAY = 3 days;
    
    /// @notice Event emitted when timelock is deployed
    event TimelockDeployed(
        uint256 minDelay,
        address[] proposers,
        address[] executors,
        address admin
    );

    /// @notice Deploy timelock with Gnosis Safe as proposer
    /// @param proposers Array of addresses that can propose operations (typically Gnosis Safe)
    /// @param executors Array of addresses that can execute operations (address(0) = anyone after delay)
    /// @param admin Address that can perform admin operations (should be address(0) after setup)
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(MIN_DELAY, proposers, executors, admin) {
        emit TimelockDeployed(MIN_DELAY, proposers, executors, admin);
    }

    /// @notice Get the minimum delay for operations
    /// @return Minimum delay in seconds
    function getMinDelay() public pure override returns (uint256) {
        return MIN_DELAY;
    }
}
