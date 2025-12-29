// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/VerifierRegistry.sol";
import "../src/TakumiTimelock.sol";

/// @title TransferToTimelock - Transfer contract admin to TimelockController
/// @notice Transfers DEFAULT_ADMIN_ROLE from deployer to TakumiTimelock
/// @dev Run this after deploying timelock to enable multi-sig governance
contract TransferToTimelock is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address timelockAddress = vm.envAddress("TIMELOCK_ADDRESS");
        address skillProfileAddress = vm.envAddress("SKILL_PROFILE_ADDRESS");
        address skillClaimAddress = vm.envAddress("SKILL_CLAIM_ADDRESS");
        address endorsementAddress = vm.envAddress("ENDORSEMENT_ADDRESS");
        address verifierRegistryAddress = vm.envAddress("VERIFIER_REGISTRY_ADDRESS");
        
        require(timelockAddress != address(0), "TIMELOCK_ADDRESS not set");
        require(skillProfileAddress != address(0), "SKILL_PROFILE_ADDRESS not set");
        require(skillClaimAddress != address(0), "SKILL_CLAIM_ADDRESS not set");
        require(endorsementAddress != address(0), "ENDORSEMENT_ADDRESS not set");
        require(verifierRegistryAddress != address(0), "VERIFIER_REGISTRY_ADDRESS not set");
        
        vm.startBroadcast(deployerPrivateKey);

        SkillProfile skillProfile = SkillProfile(skillProfileAddress);
        SkillClaim skillClaim = SkillClaim(skillClaimAddress);
        Endorsement endorsement = Endorsement(endorsementAddress);
        VerifierRegistry verifierRegistry = VerifierRegistry(verifierRegistryAddress);
        TakumiTimelock timelock = TakumiTimelock(payable(timelockAddress));

        bytes32 defaultAdminRole = skillProfile.DEFAULT_ADMIN_ROLE();
        bytes32 adminRole = skillProfile.ADMIN_ROLE();
        bytes32 verifierRole = skillProfile.VERIFIER_ROLE();

        console.log("=== Transferring Admin Roles to Timelock ===");
        console.log("Timelock address:", timelockAddress);
        console.log("Minimum delay:", timelock.getMinDelay());
        console.log("");

        // Grant timelock all roles on SkillProfile
        console.log("SkillProfile: Granting roles to timelock...");
        skillProfile.grantRole(defaultAdminRole, timelockAddress);
        skillProfile.grantRole(adminRole, timelockAddress);
        skillProfile.grantRole(verifierRole, timelockAddress);
        
        // Grant timelock all roles on SkillClaim
        console.log("SkillClaim: Granting roles to timelock...");
        skillClaim.grantRole(defaultAdminRole, timelockAddress);
        skillClaim.grantRole(adminRole, timelockAddress);
        skillClaim.grantRole(verifierRole, timelockAddress);
        
        // Grant timelock all roles on Endorsement
        console.log("Endorsement: Granting roles to timelock...");
        endorsement.grantRole(defaultAdminRole, timelockAddress);
        endorsement.grantRole(adminRole, timelockAddress);
        
        // Grant timelock all roles on VerifierRegistry
        console.log("VerifierRegistry: Granting roles to timelock...");
        verifierRegistry.grantRole(defaultAdminRole, timelockAddress);
        verifierRegistry.grantRole(adminRole, timelockAddress);
        verifierRegistry.grantRole(verifierRole, timelockAddress);

        console.log("");
        console.log("=== Renouncing Deployer Roles ===");
        
        // Renounce deployer roles on SkillProfile
        console.log("SkillProfile: Renouncing deployer roles...");
        skillProfile.renounceRole(verifierRole, msg.sender);
        skillProfile.renounceRole(adminRole, msg.sender);
        skillProfile.renounceRole(defaultAdminRole, msg.sender);
        
        // Renounce deployer roles on SkillClaim
        console.log("SkillClaim: Renouncing deployer roles...");
        skillClaim.renounceRole(verifierRole, msg.sender);
        skillClaim.renounceRole(adminRole, msg.sender);
        skillClaim.renounceRole(defaultAdminRole, msg.sender);
        
        // Renounce deployer roles on Endorsement
        console.log("Endorsement: Renouncing deployer roles...");
        endorsement.renounceRole(adminRole, msg.sender);
        endorsement.renounceRole(defaultAdminRole, msg.sender);
        
        // Renounce deployer roles on VerifierRegistry
        console.log("VerifierRegistry: Renouncing deployer roles...");
        verifierRegistry.renounceRole(verifierRole, msg.sender);
        verifierRegistry.renounceRole(adminRole, msg.sender);
        verifierRegistry.renounceRole(defaultAdminRole, msg.sender);

        // Renounce timelock admin role
        console.log("TakumiTimelock: Renouncing deployer admin role...");
        timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), msg.sender);

        console.log("");
        console.log("=== Transfer Complete ===");
        console.log("All contracts now controlled by TimelockController");
        console.log("All admin operations require Gnosis Safe proposal + 3-day delay");
        console.log("");
        console.log("CRITICAL: Verify Gnosis Safe owners before proceeding!");

        vm.stopBroadcast();
    }
}
