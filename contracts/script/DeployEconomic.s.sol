// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "forge-std/Vm.sol";
import "../src/AureusToken.sol";
import "../src/AgentOracleWithStaking.sol";
import "../src/BountyVaultWithBuyback.sol";
import "../src/UniswapIntegration.sol";
import "../src/SkillClaim.sol";
import "../src/SkillProfile.sol";
import "../src/AgentOracle.sol";

/**
 * @title DeployEconomicScript
 * @notice Deployment script for AUREUS economic layer (governance token, staking, bounties)
 * @dev Deploys AureusToken, AgentOracleWithStaking, BountyVaultWithBuyback, and UniswapIntegration
 */
contract DeployEconomicScript is Script {
    function run() external {
        // Get deployer address
        address deployer = msg.sender;
        
        console.log("==============================================");
        console.log("AUREUS Economic Layer Deployment");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // Start broadcasting transactions
        vm.startBroadcast();

        // 1. Deploy AUREUS Governance Token
        console.log("Deploying AureusToken...");
        AureusToken aureus = new AureusToken(
            deployer,           // admin
            deployer,           // teamVault (temporary - should be vesting contract)
            deployer,           // investorVault (temporary - should be vesting contract)
            deployer,           // communityRewards (temporary - should be rewards contract)
            deployer,           // treasury
            deployer            // liquidity (temporary - should be liquidity pool)
        );
        console.log("AureusToken deployed at:", address(aureus));
        console.log("Total Supply:", aureus.totalSupply() / 10**18, "AUREUS");
        console.log("");

        // 2. Deploy Uniswap Integration (for buyback & burn)
        console.log("Deploying UniswapIntegration...");
        address usdcAddress = getUSDCAddress(block.chainid);
        address uniswapRouter = getUniswapRouter(block.chainid);
        
        UniswapIntegration uniswap = new UniswapIntegration(
            usdcAddress,
            address(aureus),
            uniswapRouter,
            deployer
        );
        console.log("UniswapIntegration deployed at:", address(uniswap));
        console.log("");

        // 3. Deploy Agent Oracle with Staking
        console.log("Deploying AgentOracleWithStaking...");
        AgentOracleWithStaking agentOracle = new AgentOracleWithStaking(
            address(aureus),
            deployer
        );
        console.log("AgentOracleWithStaking deployed at:", address(agentOracle));
        console.log("Stake Requirement:", agentOracle.AGENT_STAKE_REQUIREMENT() / 10**18, "AUREUS");
        console.log("");

        // 4. Get existing SkillProfile and SkillClaim addresses (if deployed)
        // Note: These should be deployed first via Deploy.s.sol
        console.log("NOTE: SkillProfile and SkillClaim must be deployed first");
        console.log("Use Deploy.s.sol to deploy the core TalentEquity system");
        console.log("");

        // 5. Deploy Bounty Vault with Buyback (requires SkillClaim address)
        // Uncomment when SkillClaim is deployed:
        /*
        console.log("Deploying BountyVaultWithBuyback...");
        BountyVaultWithBuyback bountyVault = new BountyVaultWithBuyback(
            usdcAddress,
            address(aureus),
            address(skillClaim), // Replace with actual SkillClaim address
            deployer
        );
        console.log("BountyVaultWithBuyback deployed at:", address(bountyVault));
        console.log("Bounty Amount:", bountyVault.BOUNTY_AMOUNT() / 10**6, "USDC");
        console.log("Buyback Fee:", bountyVault.BUYBACK_FEE_PERCENTAGE(), "%");
        console.log("");

        // 6. Set Uniswap Integration in Bounty Vault
        bountyVault.setUniswapIntegration(address(uniswap));
        console.log("Uniswap integration configured");
        console.log("");

        // 7. Grant Roles
        console.log("Configuring roles...");
        
        // Grant VERIFIER_ROLE to AgentOracleWithStaking in SkillClaim
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), address(agentOracle));
        console.log("Granted VERIFIER_ROLE to AgentOracleWithStaking");
        
        // Grant EMPLOYER_ROLE to deployer in BountyVault (temporary)
        bountyVault.grantRole(bountyVault.EMPLOYER_ROLE(), deployer);
        console.log("Granted EMPLOYER_ROLE to deployer");
        console.log("");
        */

        vm.stopBroadcast();

        console.log("==============================================");
        console.log("Deployment Summary");
        console.log("==============================================");
        console.log("AureusToken:", address(aureus));
        console.log("UniswapIntegration:", address(uniswap));
        console.log("AgentOracleWithStaking:", address(agentOracle));
        console.log("");
        console.log("==============================================");
        console.log("Next Steps:");
        console.log("==============================================");
        console.log("1. Deploy SkillProfile and SkillClaim via Deploy.s.sol");
        console.log("2. Uncomment BountyVault deployment section");
        console.log("3. Update SkillClaim address in this script");
        console.log("4. Re-run deployment to deploy BountyVault");
        console.log("5. Configure role grants and integrations");
        console.log("6. Set up vesting contracts for team/investor allocations");
        console.log("7. Add liquidity to Uniswap AUREUS/USDC pool");
        console.log("8. Verify all contracts on block explorer");
        console.log("==============================================");
    }

    /**
     * @notice Get USDC address for specific chain
     * @param chainId Chain ID to get USDC address for
     * @return USDC contract address
     */
    function getUSDCAddress(uint256 chainId) internal pure returns (address) {
        if (chainId == 1 || chainId == 20258) {
            // Ethereum mainnet or testnet (devnet)
            return 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        } else if (chainId == 11155111) {
            // Ethereum Sepolia
            return 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
        } else if (chainId == 196) {
            // X Layer
            return 0x74b7F16337b8972524Bc5fB888D0B62F6C1e2E30;
        } else if (chainId == 195) {
            // X Layer Testnet
            return 0x74b7F16337b8972524Bc5fB888D0B62F6C1e2E30;
        } else if (chainId == 84532) {
            // Base Sepolia
            return 0x036cbD53842874426F5f318061d5f3d6e3C3B50d;
        } else if (chainId == 8453) {
            // Base
            return 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        } else {
            revert("Unsupported chain");
        }
    }

    /**
     * @notice Get Uniswap V2 Router address for specific chain
     * @param chainId Chain ID to get router address for
     * @return Uniswap V2 Router address
     */
    function getUniswapRouter(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) {
            // Ethereum mainnet
            return 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        } else if (chainId == 11155111) {
            // Ethereum Sepolia (use mainnet router)
            return 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        } else if (chainId == 8453) {
            // Base (Uniswap V2)
            return 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        } else if (chainId == 84532) {
            // Base Sepolia (use Base router)
            return 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        } else {
            // Default to Ethereum router for other chains
            return 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        }
    }
}
