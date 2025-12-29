// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title ExecuteTimelockUpgrade
 * @notice Executes a scheduled timelock upgrade operation
 * @dev Must be run after the timelock delay has passed
 */
contract ExecuteTimelockUpgrade is Script {
    function run() external {
        // Load operation details
        address timelockAddress = vm.envAddress("TIMELOCK_ADDRESS");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        address newImplementation = vm.envAddress("NEW_IMPLEMENTATION");
        bytes32 salt = vm.envBytes32("OPERATION_SALT");
        
        require(timelockAddress != address(0), "TIMELOCK_ADDRESS not set");
        require(proxyAdmin != address(0), "PROXY_ADMIN not set");
        require(proxyAddress != address(0), "PROXY_ADDRESS not set");
        require(newImplementation != address(0), "NEW_IMPLEMENTATION not set");
        
        TimelockController timelock = TimelockController(payable(timelockAddress));
        
        // Prepare upgrade call
        bytes memory data = abi.encodeWithSignature(
            "upgrade(address,address)",
            proxyAddress,
            newImplementation
        );
        
        // Verify operation is ready
        bytes32 operationId = timelock.hashOperation(
            proxyAdmin,
            0,
            data,
            bytes32(0),
            salt
        );
        
        require(timelock.isOperationReady(operationId), "Operation not ready yet");
        
        console.log("Executing upgrade operation:");
        console.logBytes32(operationId);
        
        vm.startBroadcast();
        
        // Execute the upgrade
        timelock.execute(
            proxyAdmin,
            0,
            data,
            bytes32(0),
            salt
        );
        
        vm.stopBroadcast();
        
        console.log("Upgrade executed successfully!");
        console.log("New implementation:", newImplementation);
        console.log("Proxy address:", proxyAddress);
    }
}
