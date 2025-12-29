// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/VerifierRegistry.sol";
import "../src/AgentOracle.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployUpgradeable
 * @notice Deployment script for upgradeable contracts with proxy pattern
 * @dev Supports multiple networks: Sepolia, Polygon Mumbai, Polygon Mainnet
 */
contract DeployUpgradeable is Script {
    // Deployment addresses
    address public skillProfileProxy;
    address public skillClaimProxy;
    address public endorsementProxy;
    address public verifierRegistryProxy;
    address public agentOracleProxy;

    address public skillProfileImpl;
    address public skillClaimImpl;
    address public endorsementImpl;
    address public verifierRegistryImpl;
    address public agentOracleImpl;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VerifierRegistry implementation
        verifierRegistryImpl = address(new VerifierRegistry(deployer));
        console.log("VerifierRegistry implementation deployed at:", verifierRegistryImpl);

        // 2. Deploy VerifierRegistry proxy
        bytes memory verifierRegistryData = "";
        verifierRegistryProxy = address(new ERC1967Proxy(verifierRegistryImpl, verifierRegistryData));
        console.log("VerifierRegistry proxy deployed at:", verifierRegistryProxy);

        // 3. Deploy SkillProfile implementation
        skillProfileImpl = address(new SkillProfile(deployer));
        console.log("SkillProfile implementation deployed at:", skillProfileImpl);

        // 4. Deploy SkillProfile proxy
        bytes memory skillProfileData = "";
        skillProfileProxy = address(new ERC1967Proxy(skillProfileImpl, skillProfileData));
        console.log("SkillProfile proxy deployed at:", skillProfileProxy);

        // 5. Deploy AgentOracle implementation
        agentOracleImpl = address(new AgentOracle(deployer));
        console.log("AgentOracle implementation deployed at:", agentOracleImpl);

        // 5a. Deploy AgentOracle proxy
        bytes memory agentOracleData = "";
        agentOracleProxy = address(new ERC1967Proxy(agentOracleImpl, agentOracleData));
        console.log("AgentOracle proxy deployed at:", agentOracleProxy);

        // 6. Deploy SkillClaim implementation
        skillClaimImpl = address(new SkillClaim(deployer, agentOracleProxy, skillProfileProxy));
        console.log("SkillClaim implementation deployed at:", skillClaimImpl);

        // 6a. Deploy SkillClaim proxy
        bytes memory skillClaimData = "";
        skillClaimProxy = address(new ERC1967Proxy(skillClaimImpl, skillClaimData));
        console.log("SkillClaim proxy deployed at:", skillClaimProxy);

        // 7. Deploy Endorsement implementation
        endorsementImpl = address(new Endorsement(deployer));
        console.log("Endorsement implementation deployed at:", endorsementImpl);

        // 8. Deploy Endorsement proxy
        bytes memory endorsementData = "";
        endorsementProxy = address(new ERC1967Proxy(endorsementImpl, endorsementData));
        console.log("Endorsement proxy deployed at:", endorsementProxy);

        vm.stopBroadcast();

        // Save deployment addresses
        _saveDeployment();
    }

    function _saveDeployment() internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "SkillProfileProxy", skillProfileProxy);
        vm.serializeAddress(json, "SkillProfileImpl", skillProfileImpl);
        vm.serializeAddress(json, "SkillClaimProxy", skillClaimProxy);
        vm.serializeAddress(json, "SkillClaimImpl", skillClaimImpl);
        vm.serializeAddress(json, "EndorsementProxy", endorsementProxy);
        vm.serializeAddress(json, "EndorsementImpl", endorsementImpl);
        vm.serializeAddress(json, "VerifierRegistryProxy", verifierRegistryProxy);
        string memory finalJson = vm.serializeAddress(json, "VerifierRegistryImpl", verifierRegistryImpl);

        string memory network = vm.envOr("NETWORK", string("localhost"));
        string memory filename = string.concat("./deployments/", network, ".json");
        
        vm.writeJson(finalJson, filename);
        console.log("Deployment saved to:", filename);
    }
}
