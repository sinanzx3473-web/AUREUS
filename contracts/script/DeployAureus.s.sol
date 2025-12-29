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

/**
 * @title TemporaryDeployFactoryAureus
 * @notice EIP-6780 compliant factory for deploying Aureus tokenomics system
 * @dev Uses parameter-free constructor for universal bytecode compatibility
 */
contract TemporaryDeployFactoryAureus {
    /// @notice Emitted when all Aureus contracts are deployed
    /// @dev Enables frontend to query deployed contracts by tx hash
    event ContractsDeployed(
        address indexed deployer,
        string[] contractNames,
        address[] contractAddresses
    );

    constructor() {
        uint256 chainId = block.chainid;
        address deployer = msg.sender;

        // Define allocation addresses (can be same as deployer for testing)
        address teamVault = deployer;
        address investorVault = deployer;
        address communityRewards = deployer;
        address treasury = deployer;
        address liquidity = deployer;
        address verifier = deployer;

        // 1. Deploy AUREUS Token
        AureusToken aureusToken = new AureusToken(
            deployer,
            teamVault,
            investorVault,
            communityRewards,
            treasury,
            liquidity
        );

        // 2. Deploy Vesting Vault
        VestingVault vestingVault = new VestingVault(address(aureusToken), deployer);

        // 3. Get chain-specific USDC and Uniswap addresses
        (address usdcAddress, address uniswapRouter) = getChainAddresses(chainId);

        // 4. Deploy Uniswap Integration
        UniswapIntegration uniswapIntegration = new UniswapIntegration(
            usdcAddress,
            address(aureusToken),
            uniswapRouter,
            deployer
        );

        // 5. Deploy SkillProfile (required by SkillClaim)
        SkillProfile skillProfile = new SkillProfile(deployer);

        // 6. Deploy SkillClaim (required by BountyVault)
        SkillClaim skillClaim = new SkillClaim(deployer, deployer, address(skillProfile));

        // 7. Deploy Agent Oracle with Staking
        AgentOracleWithStaking agentOracle = new AgentOracleWithStaking(
            deployer,
            address(aureusToken)
        );

        // 8. Deploy Bounty Vault with Buyback
        BountyVaultWithBuyback bountyVault = new BountyVaultWithBuyback(
            address(skillClaim),
            usdcAddress,
            address(aureusToken),
            address(uniswapIntegration)
        );

        // Build contract info arrays
        string[] memory contractNames = new string[](8);
        contractNames[0] = "AureusToken";
        contractNames[1] = "VestingVault";
        contractNames[2] = "UniswapIntegration";
        contractNames[3] = "SkillProfile";
        contractNames[4] = "SkillClaim";
        contractNames[5] = "AgentOracleWithStaking";
        contractNames[6] = "BountyVaultWithBuyback";
        contractNames[7] = "USDC";

        address[] memory contractAddresses = new address[](8);
        contractAddresses[0] = address(aureusToken);
        contractAddresses[1] = address(vestingVault);
        contractAddresses[2] = address(uniswapIntegration);
        contractAddresses[3] = address(skillProfile);
        contractAddresses[4] = address(skillClaim);
        contractAddresses[5] = address(agentOracle);
        contractAddresses[6] = address(bountyVault);
        contractAddresses[7] = usdcAddress;

        // Emit deployment event
        emit ContractsDeployed(deployer, contractNames, contractAddresses);

        // EIP-6780 Compliant: No selfdestruct needed
        // Deployment script contract remains as on-chain record
    }

    /**
     * @notice Get chain-specific USDC and Uniswap router addresses
     * @param chainId The chain ID to get addresses for
     * @return usdcAddress The USDC token address
     * @return uniswapRouter The Uniswap V2 router address
     */
    function getChainAddresses(uint256 chainId) 
        internal 
        pure 
        returns (address usdcAddress, address uniswapRouter) 
    {
        if (chainId == 1 || chainId == 20258) {
            // Ethereum Mainnet or Testnet
            usdcAddress = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
            uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        } else if (chainId == 11155111) {
            // Ethereum Sepolia
            usdcAddress = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
            uniswapRouter = 0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008;
        } else if (chainId == 137) {
            // Polygon
            usdcAddress = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
            uniswapRouter = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff;
        } else if (chainId == 42161) {
            // Arbitrum One
            usdcAddress = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
            uniswapRouter = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
        } else if (chainId == 56) {
            // BSC
            usdcAddress = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
            uniswapRouter = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
        } else if (chainId == 10) {
            // Optimism
            usdcAddress = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
            uniswapRouter = 0x4A7b5Da61326A6379179b40d00F57E5bbDC962c2;
        } else if (chainId == 8453) {
            // Base
            usdcAddress = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
            uniswapRouter = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        } else if (chainId == 84532) {
            // Base Sepolia
            usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
            uniswapRouter = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        } else if (chainId == 196) {
            // X Layer
            usdcAddress = 0x74b7F16337b8972027F6196A17a631aC6dE26d22;
            uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        } else {
            // Default to Ethereum mainnet addresses for unknown chains
            usdcAddress = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
            uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        }
    }
}

/**
 * @title DeployAureus
 * @notice Deployment script for Aureus tokenomics system
 */
contract DeployAureus is Script {
    function run() external {
        // Record logs before deployment
        vm.recordLogs();

        // Deploy factory
        TemporaryDeployFactoryAureus factory = new TemporaryDeployFactoryAureus();

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

                console.log("=== Aureus Tokenomics Deployment Successful ===");
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

                console.log("=== Deployment Complete ===");
                break;
            }
        }
    }
}
