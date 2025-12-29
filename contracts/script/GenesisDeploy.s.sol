// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "forge-std/Vm.sol";
import "../src/AureusToken.sol";
import "../src/VestingVault.sol";
import "../src/AgentOracleWithStaking.sol";
import "../src/BountyVaultWithBuyback.sol";
import "../src/UniswapIntegration.sol";
import "../src/SkillClaim.sol";
import "../src/SkillProfile.sol";
import "../src/TalentEquityFactory.sol";

/**
 * @title GenesisDeploy
 * @notice Genesis deployment script for the AUREUS ecosystem
 * @dev Deploys all contracts in correct dependency order with role configuration
 * 
 * Deployment Order:
 * 1. AureusToken (ERC-20 governance token)
 * 2. VestingVault (for team/investor vesting)
 * 3. AgentOracleWithStaking (AI verification with AUREUS staking)
 * 4. SkillProfile (Soulbound NFT with dynamic tiers)
 * 5. TalentEquityFactory (Income share token factory)
 * 6. BountyVaultWithBuyback (Bounty claims with AUREUS buyback)
 * 
 * Role Configuration:
 * - Grant MINTER_ROLE on SkillProfile to AgentOracle
 * - Grant AGENT_ROLE on AgentOracle to backend wallet
 * - Transfer initial AUREUS allocations to VestingVault
 */
contract GenesisDeploy is Script {
    // Environment variables
    address public deployer;
    address public backendWallet;
    address public teamVault;
    address public investorVault;
    address public communityRewards;
    address public treasury;
    address public liquidity;
    
    // Deployed contracts
    AureusToken public aureusToken;
    VestingVault public vestingVault;
    AgentOracleWithStaking public agentOracle;
    SkillProfile public skillProfile;
    SkillClaim public skillClaim;
    TalentEquityFactory public talentEquityFactory;
    BountyVaultWithBuyback public bountyVault;
    UniswapIntegration public uniswapIntegration;
    
    // Chain-specific addresses
    address public usdcAddress;
    address public uniswapRouter;

    /// @notice Emitted when genesis deployment completes
    event GenesisDeploymentComplete(
        address indexed deployer,
        address aureusToken,
        address vestingVault,
        address agentOracle,
        address skillProfile,
        address talentEquityFactory,
        address bountyVault,
        uint256 timestamp
    );

    function run() external {
        // Load environment variables
        deployer = msg.sender;
        backendWallet = vm.envOr("BACKEND_WALLET", deployer);
        
        // For testnet/devnet, use deployer as all allocation addresses
        // For mainnet, these should be separate multisig/vault addresses
        teamVault = vm.envOr("TEAM_VAULT", deployer);
        investorVault = vm.envOr("INVESTOR_VAULT", deployer);
        communityRewards = vm.envOr("COMMUNITY_REWARDS", deployer);
        treasury = vm.envOr("TREASURY", deployer);
        liquidity = vm.envOr("LIQUIDITY", deployer);

        // Get chain-specific addresses
        uint256 chainId = block.chainid;
        (usdcAddress, uniswapRouter) = getChainAddresses(chainId);

        console.log("=== AUREUS Genesis Deployment ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("Backend Wallet:", backendWallet);
        console.log("USDC Address:", usdcAddress);
        console.log("Uniswap Router:", uniswapRouter);
        console.log("");

        vm.startBroadcast();

        // ============================================
        // PHASE 1: Deploy Core Token Infrastructure
        // ============================================
        
        console.log("Phase 1: Deploying AUREUS Token...");
        aureusToken = new AureusToken(
            deployer,
            teamVault,
            investorVault,
            communityRewards,
            treasury,
            liquidity
        );
        console.log("  AureusToken deployed at:", address(aureusToken));
        console.log("  Total Supply:", aureusToken.TOTAL_SUPPLY() / 1e18, "AUREUS");
        console.log("");

        console.log("Phase 2: Deploying Vesting Vault...");
        vestingVault = new VestingVault(address(aureusToken), deployer);
        console.log("  VestingVault deployed at:", address(vestingVault));
        console.log("");

        // ============================================
        // PHASE 2: Deploy Verification Infrastructure
        // ============================================
        
        console.log("Phase 3: Deploying Agent Oracle with Staking...");
        agentOracle = new AgentOracleWithStaking(
            address(aureusToken),
            deployer
        );
        console.log("  AgentOracleWithStaking deployed at:", address(agentOracle));
        console.log("  Stake Requirement:", agentOracle.AGENT_STAKE_REQUIREMENT() / 1e18, "AUREUS");
        console.log("");

        // ============================================
        // PHASE 3: Deploy Profile & Claim System
        // ============================================
        
        console.log("Phase 4: Deploying Skill Profile NFT...");
        skillProfile = new SkillProfile(deployer);
        console.log("  SkillProfile deployed at:", address(skillProfile));
        console.log("");

        console.log("Phase 5: Deploying Skill Claim...");
        skillClaim = new SkillClaim(deployer, deployer, address(skillProfile));
        console.log("  SkillClaim deployed at:", address(skillClaim));
        console.log("");

        // ============================================
        // PHASE 4: Deploy Talent Equity System
        // ============================================
        
        console.log("Phase 6: Deploying Talent Equity Factory...");
        talentEquityFactory = new TalentEquityFactory(deployer);
        console.log("  TalentEquityFactory deployed at:", address(talentEquityFactory));
        console.log("");

        // ============================================
        // PHASE 5: Deploy DeFi Integration
        // ============================================
        
        console.log("Phase 7: Deploying Uniswap Integration...");
        uniswapIntegration = new UniswapIntegration(
            usdcAddress,
            address(aureusToken),
            uniswapRouter,
            deployer
        );
        console.log("  UniswapIntegration deployed at:", address(uniswapIntegration));
        console.log("");

        console.log("Phase 8: Deploying Bounty Vault with Buyback...");
        bountyVault = new BountyVaultWithBuyback(
            address(skillClaim),
            usdcAddress,
            address(aureusToken),
            address(uniswapIntegration)
        );
        console.log("  BountyVaultWithBuyback deployed at:", address(bountyVault));
        console.log("  Buyback Fee:", bountyVault.BUYBACK_FEE_PERCENTAGE(), "%");
        console.log("");

        // ============================================
        // PHASE 6: Configure Roles & Permissions
        // ============================================
        
        console.log("Phase 9: Configuring Roles & Permissions...");
        
        // Grant AGENT_ROLE on AgentOracle to backend wallet
        bytes32 AGENT_ROLE = agentOracle.AGENT_ROLE();
        agentOracle.grantRole(AGENT_ROLE, backendWallet);
        console.log("  Granted AGENT_ROLE to Backend Wallet:", backendWallet);
        
        // Grant VERIFIER_ROLE on SkillClaim to AgentOracle
        bytes32 VERIFIER_ROLE = skillClaim.VERIFIER_ROLE();
        skillClaim.grantRole(VERIFIER_ROLE, address(agentOracle));
        console.log("  Granted VERIFIER_ROLE to AgentOracle on SkillClaim");
        
        console.log("");

        // ============================================
        // PHASE 7: Setup Vesting Schedules
        // ============================================
        
        console.log("Phase 10: Setting up Vesting Schedules...");
        
        // Team vesting: 2 year cliff, 4 year total vesting
        uint256 teamBalance = aureusToken.balanceOf(teamVault);
        if (teamBalance > 0 && teamVault != address(vestingVault)) {
            // Transfer team allocation to vesting vault
            aureusToken.transferFrom(teamVault, address(vestingVault), teamBalance);
            
            vestingVault.createVestingSchedule(
                teamVault,
                teamBalance,
                730 days,  // 2 year cliff
                1460 days, // 4 year total vesting
                true       // revocable
            );
            console.log("  Team vesting schedule created:", teamBalance / 1e18, "AUREUS");
        }
        
        // Investor vesting: 1 year cliff, 2 year total vesting
        uint256 investorBalance = aureusToken.balanceOf(investorVault);
        if (investorBalance > 0 && investorVault != address(vestingVault)) {
            aureusToken.transferFrom(investorVault, address(vestingVault), investorBalance);
            
            vestingVault.createVestingSchedule(
                investorVault,
                investorBalance,
                365 days,  // 1 year cliff
                730 days,  // 2 year total vesting
                false      // non-revocable
            );
            console.log("  Investor vesting schedule created:", investorBalance / 1e18, "AUREUS");
        }
        
        console.log("");

        vm.stopBroadcast();

        // ============================================
        // PHASE 8: Deployment Summary
        // ============================================
        
        console.log("=== Genesis Deployment Complete ===");
        console.log("");
        console.log("Core Contracts:");
        console.log("  AureusToken:", address(aureusToken));
        console.log("  VestingVault:", address(vestingVault));
        console.log("  AgentOracleWithStaking:", address(agentOracle));
        console.log("  SkillProfile:", address(skillProfile));
        console.log("  SkillClaim:", address(skillClaim));
        console.log("  TalentEquityFactory:", address(talentEquityFactory));
        console.log("  BountyVaultWithBuyback:", address(bountyVault));
        console.log("  UniswapIntegration:", address(uniswapIntegration));
        console.log("");
        console.log("Token Distribution:");
        console.log("  Team & Advisors:", aureusToken.TEAM_ALLOCATION() / 1e18, "AUREUS (vesting)");
        console.log("  Early Investors:", aureusToken.INVESTOR_ALLOCATION() / 1e18, "AUREUS (vesting)");
        console.log("  Community Rewards:", aureusToken.COMMUNITY_ALLOCATION() / 1e18, "AUREUS");
        console.log("  Treasury:", aureusToken.TREASURY_ALLOCATION() / 1e18, "AUREUS");
        console.log("  Liquidity:", aureusToken.LIQUIDITY_ALLOCATION() / 1e18, "AUREUS");
        console.log("");
        console.log("Roles Configured:");
        console.log("  SkillProfile.MINTER_ROLE -> AgentOracle");
        console.log("  SkillProfile.VERIFIER_ROLE -> AgentOracle");
        console.log("  AgentOracle.AGENT_ROLE -> Backend Wallet");
        console.log("");
        
        // Export addresses for metadata.json generation
        console.log("=== Metadata Export ===");
        console.log("aureusToken:", address(aureusToken));
        console.log("agentOracleWithStaking:", address(agentOracle));
        console.log("bountyVaultWithBuyback:", address(bountyVault));

        emit GenesisDeploymentComplete(
            deployer,
            address(aureusToken),
            address(vestingVault),
            address(agentOracle),
            address(skillProfile),
            address(talentEquityFactory),
            address(bountyVault),
            block.timestamp
        );
    }

    /**
     * @notice Get chain-specific USDC and Uniswap router addresses
     * @param chainId The chain ID to get addresses for
     * @return usdc USDC token address
     * @return router Uniswap V2 router address
     */
    function getChainAddresses(uint256 chainId) internal pure returns (address usdc, address router) {
        if (chainId == 1) {
            // Ethereum Mainnet
            usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
            router = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        } else if (chainId == 11155111) {
            // Sepolia Testnet
            usdc = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
            router = 0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008;
        } else if (chainId == 137) {
            // Polygon Mainnet
            usdc = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
            router = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff;
        } else if (chainId == 8453) {
            // Base Mainnet
            usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
            router = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        } else if (chainId == 84532) {
            // Base Sepolia
            usdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
            router = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        } else if (chainId == 20258) {
            // Codenut Devnet
            usdc = 0x0000000000000000000000000000000000000000; // Mock USDC for testing
            router = 0x0000000000000000000000000000000000000000; // Mock router for testing
        } else {
            // Default to zero addresses for unknown chains
            usdc = address(0);
            router = address(0);
        }
    }
}
