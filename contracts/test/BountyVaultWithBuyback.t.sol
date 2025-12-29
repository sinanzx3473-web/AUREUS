// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/BountyVaultWithBuyback.sol";
import "../src/UniswapIntegration.sol";
import "../src/AureusToken.sol";
import "../src/SkillClaim.sol";
import "../src/SkillProfile.sol";
import "../src/AgentOracle.sol";

// Mock USDC token for testing
contract MockUSDC is Test {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

// Mock Uniswap Router for testing
contract MockUniswapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        // Simple mock: 1 USDC = 100 AUREUS
        uint256 aureusOut = amountIn * 100 * 10 ** 12; // Convert USDC (6 decimals) to AUREUS (18 decimals)
        
        // Transfer USDC from caller
        MockUSDC(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        // Transfer AUREUS to recipient
        AureusToken(path[1]).transfer(to, aureusOut);
        
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = aureusOut;
    }
    
    function getAmountsOut(uint256 amountIn, address[] calldata) 
        external 
        pure 
        returns (uint256[] memory amounts) 
    {
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 100 * 10 ** 12; // 1 USDC = 100 AUREUS
    }
}

contract BountyVaultWithBuybackTest is Test {
    BountyVaultWithBuyback public vault;
    UniswapIntegration public uniswap;
    AureusToken public aureusToken;
    SkillClaim public skillClaim;
    SkillProfile public skillProfile;
    AgentOracle public agentOracle;
    MockUSDC public usdc;
    MockUniswapRouter public router;
    
    address public admin;
    address public employer;
    address public claimant;
    address public verifier;
    address public teamVault;
    address public investorVault;
    address public communityRewards;
    address public treasury;
    address public liquidity;

    uint256 public constant BOUNTY_AMOUNT = 50 * 10 ** 6; // 50 USDC
    uint256 public constant BUYBACK_FEE = 2; // 2%

    // Events to test
    event BountyClaimed(
        address indexed claimant,
        string indexed skillTag,
        bytes32 indexed skillTagHash,
        uint256 claimId,
        uint256 totalAmount,
        uint256 buybackAmount,
        uint256 claimantAmount,
        uint256 timestamp
    );
    event BuybackAndBurn(uint256 usdcAmount, uint256 aureusAmount, uint256 totalBurned, uint256 timestamp);

    function setUp() public {
        admin = makeAddr("admin");
        employer = makeAddr("employer");
        claimant = makeAddr("claimant");
        verifier = makeAddr("verifier");
        teamVault = makeAddr("teamVault");
        investorVault = makeAddr("investorVault");
        communityRewards = makeAddr("communityRewards");
        treasury = makeAddr("treasury");
        liquidity = makeAddr("liquidity");

        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy AUREUS token
        aureusToken = new AureusToken(
            admin,
            teamVault,
            investorVault,
            communityRewards,
            treasury,
            liquidity
        );

        // Deploy mock Uniswap router
        router = new MockUniswapRouter();

        // Fund router with AUREUS for swaps
        vm.prank(liquidity);
        aureusToken.transfer(address(router), 10_000_000 * 10 ** 18);

        // Deploy UniswapIntegration
        uniswap = new UniswapIntegration(
            address(usdc),
            address(aureusToken),
            address(router),
            admin
        );

        // Deploy AgentOracle
        agentOracle = new AgentOracle(admin);

        // Deploy SkillProfile
        skillProfile = new SkillProfile(admin);

        // Deploy SkillClaim
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));

        // Deploy BountyVault
        vault = new BountyVaultWithBuyback(
            address(skillClaim),
            address(usdc),
            address(aureusToken),
            address(uniswap)
        );

        // Setup roles
        vm.startPrank(admin);
        vault.grantRole(vault.EMPLOYER_ROLE(), employer);
        skillClaim.grantVerifierRole(verifier);
        vm.stopPrank();

        // Create profiles for test users
        vm.prank(claimant);
        skillProfile.createProfile("Claimant", bytes32(uint256(1)));
        vm.prank(claimant);
        skillProfile.addSkill("Solidity", 80, "ipfs://skill");

        // Mint USDC to employer
        usdc.mint(employer, 1_000_000 * 10 ** 6); // 1M USDC
    }

    // ============ Deployment Tests ============

    function testDeploymentCorrectSetup() public view {
        assertEq(address(vault.usdc()), address(usdc), "USDC address should be set");
        assertEq(address(vault.aureusToken()), address(aureusToken), "AUREUS address should be set");
        assertEq(address(vault.uniswapIntegration()), address(uniswap), "Uniswap integration should be set");
        assertEq(vault.BOUNTY_AMOUNT(), BOUNTY_AMOUNT, "Bounty amount should be 50 USDC");
        assertEq(vault.BUYBACK_FEE_PERCENTAGE(), BUYBACK_FEE, "Buyback fee should be 2%");
    }

    // ============ Pool Deposit Tests ============

    function testDepositToPoolSuccess() public {
        uint256 depositAmount = 10_000 * 10 ** 6; // 10,000 USDC

        vm.startPrank(employer);
        usdc.approve(address(vault), depositAmount);
        vault.depositToPool("Solidity", depositAmount);
        vm.stopPrank();

        BountyVaultWithBuyback.SkillPool memory pool = vault.getPool("Solidity");
        assertEq(pool.totalDeposited, depositAmount, "Total deposited should match");
        assertEq(pool.availableBalance, depositAmount, "Available balance should match");
        assertTrue(pool.active, "Pool should be active");
    }

    // ============ Buyback & Burn Tests ============

    function testClaimBountyWithBuyback() public {
        // Setup: Deposit to pool
        uint256 depositAmount = 10_000 * 10 ** 6;
        vm.startPrank(employer);
        usdc.approve(address(vault), depositAmount);
        vault.depositToPool("Solidity", depositAmount);
        vm.stopPrank();

        // Create and approve claim
        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);
        
        vm.prank(verifier);
        skillClaim.approveClaim(0, "");

        // Calculate expected amounts
        uint256 buybackAmount = (BOUNTY_AMOUNT * BUYBACK_FEE) / 100; // 1 USDC
        uint256 claimantAmount = BOUNTY_AMOUNT - buybackAmount; // 49 USDC
        uint256 expectedAureus = buybackAmount * 100 * 10 ** 12; // Mock rate: 1 USDC = 100 AUREUS

        uint256 initialSupply = aureusToken.totalSupply();

        // Claim bounty
        vm.prank(claimant);
        vault.claimBounty(0, "Solidity");

        // Verify claimant received 98% of bounty
        assertEq(usdc.balanceOf(claimant), claimantAmount, "Claimant should receive 98% of bounty");

        // Verify buyback statistics
        assertEq(vault.totalBuybackUSDC(), buybackAmount, "Total buyback USDC should be recorded");
        assertEq(vault.totalAureusBurned(), expectedAureus, "Total AUREUS burned should be recorded");

        // Verify AUREUS was burned (supply decreased)
        assertEq(aureusToken.totalSupply(), initialSupply - expectedAureus, "AUREUS supply should decrease");
    }

    function testMultipleClaimsAccumulateBurns() public {
        // Setup: Deposit to pool
        uint256 depositAmount = 10_000 * 10 ** 6;
        vm.startPrank(employer);
        usdc.approve(address(vault), depositAmount);
        vault.depositToPool("Solidity", depositAmount);
        vault.depositToPool("Rust", depositAmount);
        vm.stopPrank();

        // Create claims for two different users
        address claimant2 = makeAddr("claimant2");

        // Create profile for claimant2
        vm.prank(claimant2);
        skillProfile.createProfile("Claimant2", bytes32(uint256(2)));
        vm.prank(claimant2);
        skillProfile.addSkill("Rust", 75, "ipfs://skill2");

        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence1", "ipfs://metadata1", 0);
        
        vm.prank(claimant2);
        skillClaim.createClaim("Rust", "ipfs://evidence2", "ipfs://metadata2", 0);

        vm.startPrank(verifier);
        skillClaim.approveClaim(0, "");
        skillClaim.approveClaim(1, "");
        vm.stopPrank();

        uint256 buybackAmount = (BOUNTY_AMOUNT * BUYBACK_FEE) / 100;
        uint256 expectedAureusPerClaim = buybackAmount * 100 * 10 ** 12;

        // First claim
        vm.prank(claimant);
        vault.claimBounty(0, "Solidity");

        assertEq(vault.totalAureusBurned(), expectedAureusPerClaim, "First claim should burn AUREUS");

        // Second claim
        vm.prank(claimant2);
        vault.claimBounty(1, "Rust");

        assertEq(vault.totalAureusBurned(), expectedAureusPerClaim * 2, "Burns should accumulate");
    }

    function testBuybackEmitsEvents() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 10_000 * 10 ** 6);
        vault.depositToPool("Solidity", 10_000 * 10 ** 6);
        vm.stopPrank();

        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);
        
        vm.prank(verifier);
        skillClaim.approveClaim(0, "");

        uint256 buybackAmount = (BOUNTY_AMOUNT * BUYBACK_FEE) / 100;
        uint256 expectedAureus = buybackAmount * 100 * 10 ** 12;

        vm.expectEmit(true, false, false, true);
        emit BuybackAndBurn(buybackAmount, expectedAureus, expectedAureus, block.timestamp);

        vm.prank(claimant);
        vault.claimBounty(0, "Solidity");
    }

    // ============ Integration Tests ============

    function testEndToEndBountyClaimWithBuyback() public {
        // 1. Employer deposits to pool
        vm.startPrank(employer);
        usdc.approve(address(vault), 10_000 * 10 ** 6);
        vault.depositToPool("Solidity", 10_000 * 10 ** 6);
        vm.stopPrank();

        // 2. User creates claim
        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);

        // 3. Verifier approves claim
        vm.prank(verifier);
        skillClaim.approveClaim(0, "");

        // 4. User claims bounty
        uint256 initialAureusSupply = aureusToken.totalSupply();
        uint256 initialClaimantUSDC = usdc.balanceOf(claimant);

        vm.prank(claimant);
        vault.claimBounty(0, "Solidity");

        // 5. Verify results
        uint256 expectedClaimantUSDC = (BOUNTY_AMOUNT * 98) / 100;
        assertEq(usdc.balanceOf(claimant), initialClaimantUSDC + expectedClaimantUSDC, "Claimant should receive 98%");
        
        assertTrue(aureusToken.totalSupply() < initialAureusSupply, "AUREUS supply should decrease");
        assertTrue(vault.totalAureusBurned() > 0, "AUREUS should be burned");
    }

    // ============ Access Control Tests ============

    function testSetUniswapIntegrationOnlyAdmin() public {
        address newIntegration = makeAddr("newIntegration");

        vm.prank(admin);
        vault.setUniswapIntegration(newIntegration);

        assertEq(address(vault.uniswapIntegration()), newIntegration, "Integration should be updated");
    }

    function testSetUniswapIntegrationRevertsNonAdmin() public {
        address newIntegration = makeAddr("newIntegration");

        vm.prank(claimant);
        vm.expectRevert();
        vault.setUniswapIntegration(newIntegration);
    }

    // ============ View Function Tests ============

    function testGetTotalBurned() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 10_000 * 10 ** 6);
        vault.depositToPool("Solidity", 10_000 * 10 ** 6);
        vm.stopPrank();

        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);
        
        vm.prank(verifier);
        skillClaim.approveClaim(0, "");

        vm.prank(claimant);
        vault.claimBounty(0, "Solidity");

        uint256 totalBurned = vault.getTotalBurned();
        assertTrue(totalBurned > 0, "Total burned should be greater than 0");
    }

    function testGetBuybackStats() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 10_000 * 10 ** 6);
        vault.depositToPool("Solidity", 10_000 * 10 ** 6);
        vm.stopPrank();

        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);
        
        vm.prank(verifier);
        skillClaim.approveClaim(0, "");

        vm.prank(claimant);
        vault.claimBounty(0, "Solidity");

        (uint256 usdcSpent, uint256 aureusBurned) = vault.getBuybackStats();
        
        uint256 expectedUSDC = (BOUNTY_AMOUNT * BUYBACK_FEE) / 100;
        assertEq(usdcSpent, expectedUSDC, "USDC spent should match");
        assertTrue(aureusBurned > 0, "AUREUS burned should be greater than 0");
    }

    // ============ Edge Case Tests ============

    function testClaimBountyRevertsInsufficientPoolBalance() public {
        // Deposit less than bounty amount
        vm.startPrank(employer);
        usdc.approve(address(vault), BOUNTY_AMOUNT - 1);
        vault.depositToPool("Solidity", BOUNTY_AMOUNT - 1);
        vm.stopPrank();

        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);
        
        vm.prank(verifier);
        skillClaim.approveClaim(0, "");

        vm.prank(claimant);
        vm.expectRevert(BountyVaultWithBuyback.InsufficientPoolBalance.selector);
        vault.claimBounty(0, "Solidity");
    }

    function testClaimBountyRevertsAlreadyClaimed() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 10_000 * 10 ** 6);
        vault.depositToPool("Solidity", 10_000 * 10 ** 6);
        vm.stopPrank();

        vm.prank(claimant);
        skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);
        
        vm.prank(verifier);
        skillClaim.approveClaim(0, "");

        vm.prank(claimant);
        vault.claimBounty(0, "Solidity");

        // Try to claim again
        vm.prank(claimant);
        vm.expectRevert(BountyVaultWithBuyback.AlreadyClaimed.selector);
        vault.claimBounty(0, "Solidity");
    }

    // ============ Fuzz Tests ============

    function testFuzzDepositAmount(uint256 amount) public {
        amount = bound(amount, BOUNTY_AMOUNT, 1_000_000 * 10 ** 6);

        usdc.mint(employer, amount);

        vm.startPrank(employer);
        usdc.approve(address(vault), amount);
        vault.depositToPool("Solidity", amount);
        vm.stopPrank();

        BountyVaultWithBuyback.SkillPool memory pool = vault.getPool("Solidity");
        assertEq(pool.totalDeposited, amount, "Deposited amount should match");
    }

    function testFuzzMultipleClaims(uint8 claimCount) public {
        claimCount = uint8(bound(claimCount, 1, 10));

        uint256 depositAmount = uint256(claimCount) * BOUNTY_AMOUNT;
        vm.startPrank(employer);
        usdc.approve(address(vault), depositAmount);
        vault.depositToPool("Solidity", depositAmount);
        vm.stopPrank();

        uint256 expectedTotalBuyback = 0;

        for (uint256 i = 0; i < claimCount; i++) {
            address user = makeAddr(string(abi.encodePacked("user", i)));
            
            // Create profile and skill for each user
            vm.prank(user);
            skillProfile.createProfile(string(abi.encodePacked("User", i)), bytes32(uint256(i + 100)));
            vm.prank(user);
            skillProfile.addSkill("Solidity", 70, "ipfs://skill");
            
            vm.prank(user);
            skillClaim.createClaim("Solidity", "ipfs://evidence", "ipfs://metadata", 0);
            
            vm.prank(verifier);
            skillClaim.approveClaim(i, "");

            vm.prank(user);
            vault.claimBounty(i, "Solidity");

            expectedTotalBuyback += (BOUNTY_AMOUNT * BUYBACK_FEE) / 100;
        }

        assertEq(vault.totalBuybackUSDC(), expectedTotalBuyback, "Total buyback should accumulate");
    }
}
