// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title UpgradeWithTimelock
 * @notice Secure contract upgrade script with timelock delay
 * @dev Implements time-delayed upgrades for production safety
 */
contract UpgradeWithTimelock is Script {
    // Timelock delay: 48 hours for production
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    
    // Minimum delay for emergency upgrades
    uint256 public constant MIN_DELAY = 1 hours;
    
    function run() external {
        // Load configuration
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        address newImplementation = vm.envAddress("NEW_IMPLEMENTATION");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address timelockAddress = vm.envAddress("TIMELOCK_ADDRESS");
        
        require(proxyAddress != address(0), "PROXY_ADDRESS not set");
        require(newImplementation != address(0), "NEW_IMPLEMENTATION not set");
        require(proxyAdmin != address(0), "PROXY_ADMIN not set");
        
        vm.startBroadcast();
        
        // If timelock doesn't exist, deploy it
        TimelockController timelock;
        if (timelockAddress == address(0)) {
            console.log("Deploying new TimelockController...");
            
            address[] memory proposers = new address[](1);
            proposers[0] = msg.sender;
            
            address[] memory executors = new address[](1);
            executors[0] = msg.sender;
            
            timelock = new TimelockController(
                TIMELOCK_DELAY,
                proposers,
                executors,
                msg.sender // admin
            );
            
            console.log("TimelockController deployed at:", address(timelock));
            
            // Transfer ProxyAdmin ownership to Timelock
            ProxyAdmin(proxyAdmin).transferOwnership(address(timelock));
            console.log("ProxyAdmin ownership transferred to Timelock");
        } else {
            timelock = TimelockController(payable(timelockAddress));
            console.log("Using existing TimelockController at:", timelockAddress);
        }
        
        // Prepare upgrade call
        bytes memory data = abi.encodeWithSignature(
            "upgrade(address,address)",
            proxyAddress,
            newImplementation
        );
        
        // Schedule the upgrade
        bytes32 salt = keccak256(abi.encodePacked("upgrade", block.timestamp));
        
        timelock.schedule(
            proxyAdmin,           // target
            0,                    // value
            data,                 // data
            bytes32(0),          // predecessor
            salt,                // salt
            TIMELOCK_DELAY       // delay
        );
        
        bytes32 operationId = timelock.hashOperation(
            proxyAdmin,
            0,
            data,
            bytes32(0),
            salt
        );
        
        console.log("Upgrade scheduled with operation ID:");
        console.logBytes32(operationId);
        console.log("Upgrade will be executable after:", block.timestamp + TIMELOCK_DELAY);
        console.log("To execute, run: forge script script/ExecuteTimelockUpgrade.s.sol");
        
        vm.stopBroadcast();
        
        // Save operation details for execution
        string memory operationFile = string.concat(
            "timelock-operation-",
            vm.toString(block.timestamp),
            ".json"
        );
        
        vm.writeJson(
            string.concat(
                '{"operationId":"', vm.toString(operationId), '",',
                '"proxyAdmin":"', vm.toString(proxyAdmin), '",',
                '"proxyAddress":"', vm.toString(proxyAddress), '",',
                '"newImplementation":"', vm.toString(newImplementation), '",',
                '"executeAfter":', vm.toString(block.timestamp + TIMELOCK_DELAY), ',',
                '"salt":"', vm.toString(salt), '"}'
            ),
            operationFile
        );
        
        console.log("Operation details saved to:", operationFile);
    }
}
