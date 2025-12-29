// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "../src/TakumiTimelock.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/VerifierRegistry.sol";
import "../src/AgentOracle.sol";

/// @title DeployWithTimelock - Complete deployment with governance
/// @notice Deploys all contracts with TimelockController governance
contract DeployWithTimelock is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gnosisSafe = vm.envAddress("GNOSIS_SAFE_ADDRESS");
        
        require(gnosisSafe != address(0), "GNOSIS_SAFE_ADDRESS not set");
        
        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy TimelockController
        address[] memory proposers = new address[](1);
        proposers[0] = gnosisSafe; // Only Gnosis Safe can propose

        address[] memory executors = new address[](1);
        executors[0] = address(0); // Anyone can execute after delay

        TakumiTimelock timelock = new TakumiTimelock(
            proposers,
            executors,
            msg.sender // Temporary admin for initial setup
        );

        console.log("=== Governance Deployment ===");
        console.log("TakumiTimelock:", address(timelock));
        console.log("Minimum delay:", timelock.getMinDelay(), "seconds (3 days)");
        console.log("Gnosis Safe (proposer):", gnosisSafe);
        console.log("");

        // Step 2: Deploy all contracts with timelock as admin
        SkillProfile skillProfile = new SkillProfile(address(timelock));
        AgentOracle agentOracle = new AgentOracle(address(timelock));
        SkillClaim skillClaim = new SkillClaim(address(timelock), address(agentOracle), address(skillProfile));
        Endorsement endorsement = new Endorsement(address(timelock));
        VerifierRegistry verifierRegistry = new VerifierRegistry(address(timelock));

        console.log("=== Contract Deployment ===");
        console.log("SkillProfile:", address(skillProfile));
        console.log("AgentOracle:", address(agentOracle));
        console.log("SkillClaim:", address(skillClaim));
        console.log("Endorsement:", address(endorsement));
        console.log("VerifierRegistry:", address(verifierRegistry));
        console.log("");

        // Step 3: Renounce timelock admin role
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();
        timelock.renounceRole(adminRole, msg.sender);

        console.log("=== Governance Setup Complete ===");
        console.log("[OK] Deployer admin role renounced");
        console.log("[OK] All admin operations now require Gnosis Safe proposal + 3-day timelock");
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Configure Gnosis Safe with required signers (minimum 3-of-5)");
        console.log("2. Test timelock operations on testnet");
        console.log("3. Document governance procedures in ARCHITECTURE.md");
        console.log("4. Update deployment metadata in contracts/interfaces/metadata.json");

        vm.stopBroadcast();
    }
}
