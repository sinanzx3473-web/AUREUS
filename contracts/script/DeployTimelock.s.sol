// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "../src/TakumiTimelock.sol";

/// @title DeployTimelock - Deployment script for TakumiTimelock
/// @notice Deploys TimelockController with Gnosis Safe as proposer
contract DeployTimelock is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gnosisSafe = vm.envAddress("GNOSIS_SAFE_ADDRESS");
        
        require(gnosisSafe != address(0), "GNOSIS_SAFE_ADDRESS not set");
        
        vm.startBroadcast(deployerPrivateKey);

        // Setup roles
        address[] memory proposers = new address[](1);
        proposers[0] = gnosisSafe; // Only Gnosis Safe can propose

        address[] memory executors = new address[](1);
        executors[0] = address(0); // Anyone can execute after delay

        // Deploy timelock with deployer as temporary admin
        // Admin will renounce role after setup
        TakumiTimelock timelock = new TakumiTimelock(
            proposers,
            executors,
            msg.sender // Temporary admin for initial setup
        );

        console.log("TakumiTimelock deployed at:", address(timelock));
        console.log("Minimum delay:", timelock.getMinDelay());
        console.log("Gnosis Safe (proposer):", gnosisSafe);
        console.log("Executors: address(0) (anyone after delay)");
        console.log("");
        console.log("IMPORTANT: After transferring contract ownership to timelock:");
        console.log("1. Renounce timelock admin role by calling:");
        console.log("   timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), deployer)");
        console.log("2. This ensures only Gnosis Safe can propose operations");

        vm.stopBroadcast();
    }
}
