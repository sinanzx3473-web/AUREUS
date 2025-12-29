// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "forge-std/Vm.sol";
import "../src/TemporaryDeployFactory.sol";
import "../src/AureusToken.sol";
import "../src/AgentOracleWithStaking.sol";
import "../src/BountyVaultWithBuyback.sol";
import "../src/UniswapIntegration.sol";

/**
 * @title DeployScript
 * @notice Deployment script for TalentEquity system using TemporaryDeployFactory
 */
contract DeployScript is Script {
    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();

        // Record logs before deployment
        vm.recordLogs();

        // Deploy TemporaryDeployFactory (which deploys TalentEquityFactory)
        TemporaryDeployFactory factory = new TemporaryDeployFactory();

        // Get chain-specific addresses for economic layer
        address usdcAddress = getUSDCAddress(block.chainid);
        address uniswapRouter = getUniswapRouter(block.chainid);

        // Deploy AUREUS Economic Layer
        console.log("\n=== Deploying AUREUS Economic Layer ===");
        
        // 1. Deploy AUREUS Governance Token
        AureusToken aureus = new AureusToken(
            msg.sender,  // admin
            msg.sender,  // teamVault
            msg.sender,  // investorVault
            msg.sender,  // communityRewards
            msg.sender,  // treasury
            msg.sender   // liquidity
        );
        console.log("AureusToken:", address(aureus));

        // 2. Deploy Uniswap Integration
        UniswapIntegration uniswap = new UniswapIntegration(
            usdcAddress,
            address(aureus),
            uniswapRouter,
            msg.sender
        );
        console.log("UniswapIntegration:", address(uniswap));

        // 3. Deploy Agent Oracle with Staking
        AgentOracleWithStaking agentOracle = new AgentOracleWithStaking(
            address(aureus),
            msg.sender
        );
        console.log("AgentOracleWithStaking:", address(agentOracle));

        // 4. Deploy Bounty Vault with Buyback
        BountyVaultWithBuyback bountyVault = new BountyVaultWithBuyback(
            usdcAddress,
            address(aureus),
            address(0), // SkillClaim address - to be set later
            msg.sender
        );
        console.log("BountyVaultWithBuyback:", address(bountyVault));

        // 5. Configure Uniswap Integration in Bounty Vault
        bountyVault.setUniswapIntegration(address(uniswap));
        console.log("Uniswap integration configured");
        console.log("==================================\n");

        // Parse ContractsDeployed event
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");

        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSignature && logs[i].emitter == address(factory)) {
                // Extract deployer from indexed parameter
                address deployer = address(uint160(uint256(logs[i].topics[1])));

                // Decode dynamic arrays from event data
                (string[] memory contractNames, address[] memory contractAddresses) =
                    abi.decode(logs[i].data, (string[], address[]));

                console.log("==============================================");
                console.log("TalentEquity Deployment Successful!");
                console.log("==============================================");
                console.log("Deployer:", deployer);
                console.log("Chain ID:", block.chainid);
                console.log("Contracts deployed:", contractNames.length);
                console.log("");

                // Log all deployed contracts
                for (uint256 j = 0; j < contractNames.length; j++) {
                    console.log("Contract:", contractNames[j]);
                    console.log("Address:", contractAddresses[j]);
                    console.log("");
                }

                console.log("==============================================");
                console.log("Economic Layer Contracts:");
                console.log("AureusToken:", address(aureus));
                console.log("UniswapIntegration:", address(uniswap));
                console.log("AgentOracleWithStaking:", address(agentOracle));
                console.log("BountyVaultWithBuyback:", address(bountyVault));
                console.log("");
                console.log("Next Steps:");
                console.log("1. Verify contracts on block explorer");
                console.log("2. Set SkillClaim address in BountyVault");
                console.log("3. Grant VERIFIER_ROLE to AgentOracle in SkillClaim");
                console.log("4. Create PersonalTokens using TalentEquityFactory");
                console.log("5. Investors can stake USDC to receive PersonalTokens");
                console.log("6. Talent distributes revenue to investors");
                console.log("==============================================");
                
                break;
            }
        }

        vm.stopBroadcast();
    }

    /**
     * @notice Get USDC address for specific chain
     */
    function getUSDCAddress(uint256 chainId) internal pure returns (address) {
        if (chainId == 1 || chainId == 20258) {
            return 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // Ethereum mainnet / devnet
        } else if (chainId == 11155111) {
            return 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // Sepolia
        } else if (chainId == 196) {
            return 0x74b7F16337b8972524Bc5fB888D0B62F6C1e2E30; // X Layer
        } else if (chainId == 195) {
            return 0x74b7F16337b8972524Bc5fB888D0B62F6C1e2E30; // X Layer Testnet
        } else if (chainId == 84532) {
            return 0x036cbD53842874426F5f318061d5f3d6e3C3B50d; // Base Sepolia
        } else if (chainId == 8453) {
            return 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base
        } else {
            revert("Unsupported chain");
        }
    }

    /**
     * @notice Get Uniswap V2 Router address for specific chain
     */
    function getUniswapRouter(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) {
            return 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // Ethereum mainnet
        } else if (chainId == 11155111) {
            return 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // Sepolia
        } else if (chainId == 8453) {
            return 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24; // Base
        } else if (chainId == 84532) {
            return 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24; // Base Sepolia
        } else {
            return 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // Default
        }
    }
}
