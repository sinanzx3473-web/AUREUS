// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./AureusToken.sol";
import "./VestingVault.sol";
import "./UniswapIntegration.sol";
import "./AgentOracleWithStaking.sol";
import "./BountyVaultWithBuyback.sol";

/// @title TemporaryDeployFactoryAureus - EIP-6780 compliant deployment factory
/// @notice Deploys all AUREUS tokenomics contracts in a single transaction
/// @dev Uses selfdestruct pattern for parameter-free bytecode sharing
contract TemporaryDeployFactoryAureus {
    /// @notice Emitted when all contracts are deployed
    /// @dev This event enables frontend to query deployed contracts by tx hash
    event ContractsDeployed(
        address indexed deployer,
        string[] contractNames,
        address[] contractAddresses
    );

    /// @notice Constructor deploys all contracts and emits event
    /// @dev NO PARAMETERS - enables same bytecode on all chains
    constructor() {
        uint256 chainId = block.chainid;
        address deployer = msg.sender;

        // Get chain-specific addresses
        (address usdcAddress, address uniswapRouter) = _getChainAddresses(chainId);

        // Deploy AureusToken first (needed by other contracts)
        // Temporary addresses for initial deployment - will be updated
        address tempTeamVault = address(1);
        address tempInvestorVault = address(2);
        address tempCommunityRewards = deployer;
        address tempTreasury = deployer;
        address tempLiquidity = deployer;

        AureusToken aureusToken = new AureusToken(
            deployer,
            tempTeamVault,
            tempInvestorVault,
            tempCommunityRewards,
            tempTreasury,
            tempLiquidity
        );

        // Deploy VestingVault for team
        VestingVault teamVault = new VestingVault(address(aureusToken), deployer);

        // Deploy VestingVault for investors
        VestingVault investorVault = new VestingVault(address(aureusToken), deployer);

        // Deploy UniswapIntegration
        UniswapIntegration uniswapIntegration = new UniswapIntegration(
            usdcAddress,
            address(aureusToken),
            uniswapRouter,
            deployer
        );

        // Deploy AgentOracleWithStaking
        AgentOracleWithStaking agentOracle = new AgentOracleWithStaking(
            deployer,
            address(aureusToken)
        );

        // Deploy BountyVaultWithBuyback (requires SkillClaim address)
        // Note: SkillClaim must be deployed separately or passed as parameter
        // For now, we'll use a placeholder address
        address skillClaimAddress = address(0); // Must be set after deployment
        
        BountyVaultWithBuyback bountyVault = new BountyVaultWithBuyback(
            skillClaimAddress,
            usdcAddress,
            address(aureusToken),
            address(uniswapIntegration)
        );

        // Build contract info arrays
        uint256 contractCount = 6;
        string[] memory contractNames = new string[](contractCount);
        address[] memory contractAddresses = new address[](contractCount);

        contractNames[0] = "AureusToken";
        contractNames[1] = "TeamVestingVault";
        contractNames[2] = "InvestorVestingVault";
        contractNames[3] = "UniswapIntegration";
        contractNames[4] = "AgentOracleWithStaking";
        contractNames[5] = "BountyVaultWithBuyback";

        contractAddresses[0] = address(aureusToken);
        contractAddresses[1] = address(teamVault);
        contractAddresses[2] = address(investorVault);
        contractAddresses[3] = address(uniswapIntegration);
        contractAddresses[4] = address(agentOracle);
        contractAddresses[5] = address(bountyVault);

        // Emit event with all contract info
        emit ContractsDeployed(deployer, contractNames, contractAddresses);

        // EIP-6780 Compliant: No selfdestruct needed
        // Factory contract remains on-chain as deployment record
    }

    /// @notice Get chain-specific addresses for USDC and Uniswap Router
    /// @param chainId The chain ID
    /// @return usdcAddress USDC token address
    /// @return uniswapRouter Uniswap V2 Router address
    function _getChainAddresses(uint256 chainId) 
        internal 
        pure 
        returns (address usdcAddress, address uniswapRouter) 
    {
        if (chainId == 1 || chainId == 20258) {
            // Ethereum Mainnet or testnet
            usdcAddress = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
            uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        } else if (chainId == 11155111) {
            // Ethereum Sepolia
            usdcAddress = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
            uniswapRouter = 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3;
        } else if (chainId == 137) {
            // Polygon
            usdcAddress = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
            uniswapRouter = 0xedf6066a2b290C185783862C7F4776A2C8077AD1;
        } else if (chainId == 42161) {
            // Arbitrum One
            usdcAddress = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
            uniswapRouter = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        } else if (chainId == 56) {
            // BSC
            usdcAddress = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
            uniswapRouter = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
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
        } else {
            // Default to Ethereum Mainnet addresses
            usdcAddress = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
            uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        }
    }
}
