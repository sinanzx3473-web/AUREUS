// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "../src/TemporaryDeployFactory.sol";
import "../src/TalentEquityFactory.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract TemporaryDeployFactoryTest is Test, IERC721Receiver {
    // Event declarations for testing
    event ContractsDeployed(
        address indexed deployer,
        string[] contractNames,
        address[] contractAddresses
    );

    address deployer;

    function setUp() public {
        deployer = address(this);
        // Set chain ID to supported chain (Ethereum mainnet)
        vm.chainId(1);
    }

    /// @notice Implement IERC721Receiver to accept NFT mints
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Test successful deployment of TalentEquityFactory
    function testDeploymentSuccess() public {
        // Record logs to capture events
        vm.recordLogs();

        // Deploy factory
        TemporaryDeployFactory factory = new TemporaryDeployFactory();

        // Get recorded logs
        Vm.Log[] memory logs = vm.getRecordedLogs();
        
        // Find ContractsDeployed event
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");
        bool eventFound = false;
        
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSignature && logs[i].emitter == address(factory)) {
                // Extract deployer from indexed parameter
                address emittedDeployer = address(uint160(uint256(logs[i].topics[1])));
                assertEq(emittedDeployer, deployer, "Deployer mismatch");

                // Decode dynamic arrays from event data
                (string[] memory contractNames, address[] memory contractAddresses) =
                    abi.decode(logs[i].data, (string[], address[]));

                // Verify we have 1 contract (TalentEquityFactory)
                assertEq(contractNames.length, 1, "Should deploy 1 contract");
                assertEq(contractAddresses.length, 1, "Should have 1 address");

                // Verify contract name
                assertEq(contractNames[0], "TalentEquityFactory", "Contract name mismatch");

                // Verify address is non-zero
                assertTrue(contractAddresses[0] != address(0), "Contract address is zero");

                // Verify TalentEquityFactory is initialized and functional
                TalentEquityFactory talentFactory = TalentEquityFactory(contractAddresses[0]);
                assertEq(talentFactory.owner(), deployer, "Owner not set correctly");
                assertFalse(talentFactory.paused(), "Factory should not be paused initially");

                eventFound = true;
                break;
            }
        }

        assertTrue(eventFound, "ContractsDeployed event not found");
    }

    /// @notice Test that factory self-destructs after deployment (EIP-6780 compliant)
    function testFactorySelfDestructs() public {
        TemporaryDeployFactory factory = new TemporaryDeployFactory();
        
        // After deployment in same transaction, factory should have no code (selfdestruct)
        // Note: In EIP-6780, selfdestruct only deletes code if called in same transaction as creation
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(factory)
        }
        // Factory should have no code after selfdestruct in constructor
        assertEq(codeSize, 0, "Factory should be destroyed after deployment");
    }

    /// @notice Test event emission with correct parameters
    function testEventEmission() public {
        vm.recordLogs();
        
        // Expect event emission
        vm.expectEmit(true, false, false, false);
        emit ContractsDeployed(deployer, new string[](0), new address[](0));
        
        new TemporaryDeployFactory();
    }

    /// @notice Test deployed TalentEquityFactory is functional
    function testDeployedFactoryFunctional() public {
        vm.recordLogs();
        TemporaryDeployFactory factory = new TemporaryDeployFactory();

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");

        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSignature && logs[i].emitter == address(factory)) {
                (, address[] memory contractAddresses) =
                    abi.decode(logs[i].data, (string[], address[]));

                // Test TalentEquityFactory functionality
                TalentEquityFactory talentFactory = TalentEquityFactory(contractAddresses[0]);
                
                // Verify owner
                assertEq(talentFactory.owner(), deployer, "Owner not set correctly");
                
                // Verify factory is not paused
                assertFalse(talentFactory.paused(), "Factory should not be paused");
                
                // Verify USDC address is set
                assertTrue(talentFactory.usdcToken() != address(0), "USDC address not set");

                break;
            }
        }
    }

    /// @notice Fuzz test: Deploy with different deployer addresses
    function testFuzzDeployerAddress(address fuzzDeployer) public {
        vm.assume(fuzzDeployer != address(0));
        
        vm.startPrank(fuzzDeployer);
        vm.recordLogs();
        
        TemporaryDeployFactory factory = new TemporaryDeployFactory();
        
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");

        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSignature && logs[i].emitter == address(factory)) {
                address emittedDeployer = address(uint160(uint256(logs[i].topics[1])));
                assertEq(emittedDeployer, fuzzDeployer, "Deployer mismatch in fuzz test");
                break;
            }
        }
        
        vm.stopPrank();
    }

    /// @notice Test gas consumption for deployment
    function testDeploymentGas() public {
        uint256 gasBefore = gasleft();
        new TemporaryDeployFactory();
        uint256 gasUsed = gasBefore - gasleft();
        
        // Ensure deployment is reasonably gas-efficient
        // Deploying TalentEquityFactory requires moderate gas
        assertTrue(gasUsed < 5_000_000, "Deployment uses too much gas");
    }

    /// @notice Test USDC address resolution for different chains
    function testChainSpecificUSDCAddress() public {
        // Test Ethereum mainnet
        vm.chainId(1);
        vm.recordLogs();
        TemporaryDeployFactory factory1 = new TemporaryDeployFactory();
        Vm.Log[] memory logs1 = vm.getRecordedLogs();
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");
        
        for (uint256 i = 0; i < logs1.length; i++) {
            if (logs1[i].topics[0] == eventSignature && logs1[i].emitter == address(factory1)) {
                (, address[] memory contractAddresses) = abi.decode(logs1[i].data, (string[], address[]));
                assertTrue(contractAddresses[0] != address(0), "Contract should be deployed on mainnet");
                
                TalentEquityFactory talentFactory = TalentEquityFactory(contractAddresses[0]);
                assertEq(talentFactory.usdcToken(), 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, "Wrong USDC address for mainnet");
                break;
            }
        }

        // Test Base Sepolia
        vm.chainId(84532);
        vm.recordLogs();
        TemporaryDeployFactory factory2 = new TemporaryDeployFactory();
        Vm.Log[] memory logs2 = vm.getRecordedLogs();
        
        for (uint256 i = 0; i < logs2.length; i++) {
            if (logs2[i].topics[0] == eventSignature && logs2[i].emitter == address(factory2)) {
                (, address[] memory contractAddresses) = abi.decode(logs2[i].data, (string[], address[]));
                assertTrue(contractAddresses[0] != address(0), "Contract should be deployed on Base Sepolia");
                
                TalentEquityFactory talentFactory = TalentEquityFactory(contractAddresses[0]);
                assertEq(talentFactory.usdcToken(), 0x036cbD53842874426F5f318061d5f3d6e3C3B50d, "Wrong USDC address for Base Sepolia");
                break;
            }
        }
    }

    /// @notice Test deployment on unsupported chain reverts
    function testUnsupportedChainReverts() public {
        vm.chainId(999999); // Unsupported chain
        
        vm.expectRevert("Unsupported chain");
        new TemporaryDeployFactory();
    }

    /// @notice Test that factory deploys successfully without ETH
    function testFactoryDeploysWithoutETH() public {
        uint256 balanceBefore = deployer.balance;
        
        // Deploy factory without sending ETH
        new TemporaryDeployFactory();
        
        uint256 balanceAfter = deployer.balance;
        
        // Balance should only decrease by gas costs
        assertTrue(balanceAfter < balanceBefore, "Gas should be consumed");
    }

    /// @notice Test multiple deployments create independent factories
    function testMultipleDeployments() public {
        vm.recordLogs();
        
        TemporaryDeployFactory factory1 = new TemporaryDeployFactory();
        TemporaryDeployFactory factory2 = new TemporaryDeployFactory();
        
        // Factories should have different addresses
        assertTrue(address(factory1) != address(factory2), "Factories should have different addresses");
        
        // Both should emit events
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");
        uint256 eventCount = 0;
        
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSignature) {
                eventCount++;
            }
        }
        
        assertEq(eventCount, 2, "Should have 2 ContractsDeployed events");
    }
}
