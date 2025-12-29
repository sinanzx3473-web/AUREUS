// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/VerifierRegistry.sol";
import "../src/AgentOracle.sol";

/**
 * @title Upgrade
 * @notice Script to deploy new contract versions (contracts are not upgradeable)
 * @dev Contracts use AccessControl pattern, not UUPS upgradeable pattern
 */
contract Upgrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        string memory network = vm.envOr("NETWORK", string("localhost"));

        console.log("Deploying new contract versions on network:", network);
        console.log("Deployer account:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new SkillProfile
        SkillProfile newSkillProfile = new SkillProfile(deployer);
        console.log("New SkillProfile deployed to:", address(newSkillProfile));

        // Deploy new AgentOracle
        AgentOracle newAgentOracle = new AgentOracle(deployer);
        console.log("New AgentOracle deployed to:", address(newAgentOracle));

        // Deploy new SkillClaim
        SkillClaim newSkillClaim = new SkillClaim(deployer, address(newAgentOracle), address(newSkillProfile));
        console.log("New SkillClaim deployed to:", address(newSkillClaim));

        // Deploy new Endorsement
        Endorsement newEndorsement = new Endorsement(deployer);
        console.log("New Endorsement deployed to:", address(newEndorsement));

        // Deploy new VerifierRegistry
        VerifierRegistry newVerifierRegistry = new VerifierRegistry(deployer);
        console.log("New VerifierRegistry deployed to:", address(newVerifierRegistry));

        vm.stopBroadcast();

        // Update deployment file
        _updateDeployment(
            network,
            address(newSkillProfile),
            address(newSkillClaim),
            address(newEndorsement),
            address(newVerifierRegistry)
        );
    }

    function _updateDeployment(
        string memory network,
        address skillProfile,
        address skillClaim,
        address endorsement,
        address verifierRegistry
    ) internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "SkillProfile", skillProfile);
        vm.serializeAddress(json, "SkillClaim", skillClaim);
        vm.serializeAddress(json, "Endorsement", endorsement);
        string memory finalJson = vm.serializeAddress(json, "VerifierRegistry", verifierRegistry);

        string memory filename = string.concat("./deployments/", network, ".json");
        vm.writeJson(finalJson, filename);
        console.log("Deployment updated:", filename);
    }
}
