// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./TalentEquityFactory.sol";

/**
 * @title TemporaryDeployFactory
 * @notice EIP-6780 compliant factory for deploying TalentEquity system
 * @dev Uses EVENT + NO-PARAMETER pattern for multi-chain bytecode compatibility
 */
contract TemporaryDeployFactory {
    /// @notice Emitted when all contracts are deployed
    /// @dev This event enables frontend to query deployed contracts by tx hash
    event ContractsDeployed(
        address indexed deployer,
        string[] contractNames,
        address[] contractAddresses
    );

    /**
     * @notice Deploy all TalentEquity contracts
     * @dev NO PARAMETERS - enables same bytecode on all chains
     *      Uses block.chainid for chain-specific USDC address resolution
     */
    constructor() {
        uint256 chainId = block.chainid;

        // Get chain-specific USDC address
        address usdcAddress = getUSDCAddress(chainId);

        // Deploy TalentEquityFactory
        TalentEquityFactory factory = new TalentEquityFactory(usdcAddress);

        // Build contract info arrays
        string[] memory contractNames = new string[](1);
        contractNames[0] = "TalentEquityFactory";

        address[] memory contractAddresses = new address[](1);
        contractAddresses[0] = address(factory);

        // Emit event with all contract info
        emit ContractsDeployed(msg.sender, contractNames, contractAddresses);

        // EIP-6780 Compliant: No selfdestruct needed
        // Factory contract remains on-chain as deployment record
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
        } else if (chainId == 1270) {
            // IRYS Testnet
            return 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        } else if (chainId == 137) {
            // Polygon
            return 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
        } else if (chainId == 42161) {
            // Arbitrum One
            return 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
        } else if (chainId == 56) {
            // BSC
            return 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
        } else if (chainId == 10) {
            // Optimism
            return 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
        } else if (chainId == 8453) {
            // Base
            return 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        } else if (chainId == 84532) {
            // Base Sepolia
            return 0x036cbD53842874426F5f318061d5f3d6e3C3B50d;
        } else {
            revert("Unsupported chain");
        }
    }
}
