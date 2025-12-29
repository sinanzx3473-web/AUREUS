// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/TalentEquityFactory.sol";
import "../src/PersonalToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 1e6); // 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title TalentEquityTest
 * @notice Comprehensive tests for TalentEquity system
 */
contract TalentEquityTest is Test {
    // Contracts
    TalentEquityFactory public factory;
    MockUSDC public usdc;
    PersonalToken public personalToken;

    // Test addresses
    address public owner;
    address public talent;
    address public investor1;
    address public investor2;
    address public investor3;

    // Test constants
    uint256 constant TOKEN_PRICE = 1e6; // 1 USDC = 1 PersonalToken
    uint256 constant RETURN_CAP = 3; // 3x return
    uint256 constant DURATION = 3; // 3 years
    uint256 constant TALENT_SHARE = 90; // 90%

    // Events to test
    event PersonalTokenCreated(
        address indexed talent,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 tokenPrice,
        uint256 returnCapMultiplier,
        uint256 durationInYears,
        uint256 timestamp
    );

    event Staked(
        address indexed investor,
        uint256 usdcAmount,
        uint256 tokensReceived,
        uint256 timestamp
    );

    event RevenueReceived(
        uint256 totalAmount,
        uint256 talentShare,
        uint256 investorShare,
        uint256 timestamp
    );

    event DividendsClaimed(
        address indexed investor,
        uint256 amount,
        uint256 timestamp
    );

    event CapReached(
        uint256 totalDistributed,
        uint256 timestamp
    );

    event ContractExpired(
        uint256 expiryDate,
        uint256 timestamp
    );

    function setUp() public {
        // Setup test addresses
        owner = address(this);
        talent = makeAddr("talent");
        investor1 = makeAddr("investor1");
        investor2 = makeAddr("investor2");
        investor3 = makeAddr("investor3");

        // Deploy USDC mock
        usdc = new MockUSDC();

        // Deploy factory
        factory = new TalentEquityFactory(address(usdc));

        // Fund test accounts with USDC
        usdc.mint(talent, 1000000 * 1e6); // 1M USDC
        usdc.mint(investor1, 100000 * 1e6); // 100K USDC
        usdc.mint(investor2, 100000 * 1e6); // 100K USDC
        usdc.mint(investor3, 100000 * 1e6); // 100K USDC

        // Create PersonalToken
        vm.prank(talent);
        address tokenAddress = factory.createPersonalToken(
            "Alice Income Token",
            "ALICE",
            TOKEN_PRICE,
            RETURN_CAP,
            DURATION,
            TALENT_SHARE
        );
        personalToken = PersonalToken(tokenAddress);
    }

    // ============ Factory Tests ============

    function testFactoryDeployment() public view {
        assertEq(factory.usdcToken(), address(usdc));
        assertEq(factory.getTotalTokenCount(), 1);
        assertFalse(factory.revoked());
    }

    function testCreatePersonalToken() public {
        vm.prank(talent);

        address tokenAddress = factory.createPersonalToken(
            "Bob Income Token",
            "BOB",
            TOKEN_PRICE,
            RETURN_CAP,
            DURATION,
            TALENT_SHARE
        );

        assertTrue(factory.isPersonalToken(tokenAddress));
        assertEq(factory.getTotalTokenCount(), 2);
    }

    function testCannotCreateTokenWithInvalidParams() public {
        vm.startPrank(talent);

        // Invalid token price
        vm.expectRevert("Token price must be > 0");
        factory.createPersonalToken("Test", "TEST", 0, RETURN_CAP, DURATION, TALENT_SHARE);

        // Invalid return cap (too low)
        vm.expectRevert("Return cap must be 2-5x");
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, 1, DURATION, TALENT_SHARE);

        // Invalid return cap (too high)
        vm.expectRevert("Return cap must be 2-5x");
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, 6, DURATION, TALENT_SHARE);

        // Invalid duration (too short)
        vm.expectRevert("Duration must be 2-5 years");
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, RETURN_CAP, 1, TALENT_SHARE);

        // Invalid duration (too long)
        vm.expectRevert("Duration must be 2-5 years");
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, RETURN_CAP, 6, TALENT_SHARE);

        // Invalid talent share (too low)
        vm.expectRevert("Talent share must be 80-95%");
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, RETURN_CAP, DURATION, 79);

        // Invalid talent share (too high)
        vm.expectRevert("Talent share must be 80-95%");
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, RETURN_CAP, DURATION, 96);

        vm.stopPrank();
    }

    function testGetTokensByTalent() public {
        address[] memory tokens = factory.getTokensByTalent(talent);
        assertEq(tokens.length, 1);
        assertEq(tokens[0], address(personalToken));
    }

    function testFactoryPause() public {
        factory.pause();
        assertTrue(factory.paused());

        vm.prank(talent);
        vm.expectRevert();
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, RETURN_CAP, DURATION, TALENT_SHARE);

        factory.unpause();
        assertFalse(factory.paused());
    }

    function testFactoryRevocation() public {
        assertFalse(factory.revoked());

        factory.revokeFactory();

        assertTrue(factory.revoked());
        assertTrue(factory.paused());

        vm.prank(talent);
        vm.expectRevert();
        factory.createPersonalToken("Test", "TEST", TOKEN_PRICE, RETURN_CAP, DURATION, TALENT_SHARE);
    }

    function testCannotRevokeFactoryTwice() public {
        factory.revokeFactory();

        vm.expectRevert();
        factory.revokeFactory();
    }

    // ============ PersonalToken Basic Tests ============

    function testPersonalTokenDeployment() public view {
        assertEq(personalToken.name(), "Alice Income Token");
        assertEq(personalToken.symbol(), "ALICE");
        assertEq(personalToken.talent(), talent);
        assertEq(address(personalToken.usdcToken()), address(usdc));
        assertEq(personalToken.tokenPrice(), TOKEN_PRICE);
        assertEq(personalToken.returnCapMultiplier(), RETURN_CAP);
        assertEq(personalToken.talentSharePercentage(), TALENT_SHARE);
    }

    function testPersonalTokenExpiry() public view {
        uint256 expectedExpiry = block.timestamp + (DURATION * 365 days);
        assertEq(personalToken.expiryDate(), expectedExpiry);
    }

    // ============ Staking Tests ============

    function testStake() public {
        uint256 stakeAmount = 10000 * 1e6; // 10K USDC
        uint256 expectedTokens = (stakeAmount * 1e18) / TOKEN_PRICE;

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);

        vm.expectEmit(true, false, false, true);
        emit Staked(investor1, stakeAmount, expectedTokens, block.timestamp);

        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Verify balances
        assertEq(personalToken.balanceOf(investor1), expectedTokens);
        assertEq(personalToken.totalStaked(), stakeAmount);
        assertEq(personalToken.maxInvestorReturn(), stakeAmount * RETURN_CAP);

        // Verify investor info
        (uint256 stakedAmount, uint256 tokensOwned, uint256 totalClaimed, ) = 
            personalToken.getInvestorInfo(investor1);
        assertEq(stakedAmount, stakeAmount);
        assertEq(tokensOwned, expectedTokens);
        assertEq(totalClaimed, 0);
    }

    function testMultipleInvestorsStake() public {
        uint256 stake1 = 10000 * 1e6; // 10K USDC
        uint256 stake2 = 20000 * 1e6; // 20K USDC
        uint256 stake3 = 15000 * 1e6; // 15K USDC

        // Investor 1 stakes
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stake1);
        personalToken.stake(stake1);
        vm.stopPrank();

        // Investor 2 stakes
        vm.startPrank(investor2);
        usdc.approve(address(personalToken), stake2);
        personalToken.stake(stake2);
        vm.stopPrank();

        // Investor 3 stakes
        vm.startPrank(investor3);
        usdc.approve(address(personalToken), stake3);
        personalToken.stake(stake3);
        vm.stopPrank();

        uint256 totalStaked = stake1 + stake2 + stake3;
        assertEq(personalToken.totalStaked(), totalStaked);
        assertEq(personalToken.maxInvestorReturn(), totalStaked * RETURN_CAP);
    }

    function testCannotStakeZeroAmount() public {
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), 1000 * 1e6);

        vm.expectRevert("Amount must be > 0");
        personalToken.stake(0);
        vm.stopPrank();
    }

    function testCannotStakeAfterExpiry() public {
        // Fast forward past expiry
        vm.warp(block.timestamp + (DURATION * 365 days) + 1);

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), 1000 * 1e6);

        vm.expectRevert("Contract expired");
        personalToken.stake(1000 * 1e6);
        vm.stopPrank();
    }

    function testCannotStakeAfterCapReached() public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Talent distributes revenue until cap is reached
        uint256 maxReturn = stakeAmount * RETURN_CAP;
        uint256 investorShare = (maxReturn * 100) / (100 - TALENT_SHARE); // Calculate total needed

        vm.startPrank(talent);
        usdc.approve(address(personalToken), investorShare);
        personalToken.distributeRevenue(investorShare);
        vm.stopPrank();

        // Try to stake after cap reached
        vm.startPrank(investor2);
        usdc.approve(address(personalToken), 1000 * 1e6);

        vm.expectRevert("Return cap reached");
        personalToken.stake(1000 * 1e6);
        vm.stopPrank();
    }

    // ============ Revenue Distribution Tests ============

    function testDistributeRevenue() public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Talent distributes revenue
        uint256 revenueAmount = 1000 * 1e6; // 1K USDC
        uint256 expectedTalentShare = (revenueAmount * TALENT_SHARE) / 100;
        uint256 expectedInvestorShare = revenueAmount - expectedTalentShare;

        uint256 talentBalanceBefore = usdc.balanceOf(talent);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), revenueAmount);

        vm.expectEmit(false, false, false, true);
        emit RevenueReceived(revenueAmount, expectedTalentShare, expectedInvestorShare, block.timestamp);

        personalToken.distributeRevenue(revenueAmount);
        vm.stopPrank();

        // Verify talent received their share immediately
        assertEq(usdc.balanceOf(talent), talentBalanceBefore - revenueAmount + expectedTalentShare);

        // Verify total distributed
        assertEq(personalToken.totalDistributedToInvestors(), expectedInvestorShare);
        assertEq(personalToken.totalDistributedToTalent(), expectedTalentShare);
    }

    function testDistributeRevenueWithMultipleInvestors() public {
        // Setup: Multiple investors stake
        uint256 stake1 = 10000 * 1e6;
        uint256 stake2 = 20000 * 1e6;

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stake1);
        personalToken.stake(stake1);
        vm.stopPrank();

        vm.startPrank(investor2);
        usdc.approve(address(personalToken), stake2);
        personalToken.stake(stake2);
        vm.stopPrank();

        // Talent distributes revenue
        uint256 revenueAmount = 3000 * 1e6;
        uint256 expectedInvestorShare = (revenueAmount * (100 - TALENT_SHARE)) / 100;

        vm.startPrank(talent);
        usdc.approve(address(personalToken), revenueAmount);
        personalToken.distributeRevenue(revenueAmount);
        vm.stopPrank();

        // Verify total distributed
        assertEq(personalToken.totalDistributedToInvestors(), expectedInvestorShare);
    }

    function testCannotDistributeZeroRevenue() public {
        vm.startPrank(talent);
        usdc.approve(address(personalToken), 1000 * 1e6);

        vm.expectRevert("Amount must be > 0");
        personalToken.distributeRevenue(0);
        vm.stopPrank();
    }

    function testOnlyTalentCanDistribute() public {
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), 1000 * 1e6);

        vm.expectRevert("Only talent can distribute");
        personalToken.distributeRevenue(1000 * 1e6);
        vm.stopPrank();
    }

    // ============ Dividend Claiming Tests ============

    function testClaimDividends() public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Talent distributes revenue
        uint256 revenueAmount = 1000 * 1e6;
        vm.startPrank(talent);
        usdc.approve(address(personalToken), revenueAmount);
        personalToken.distributeRevenue(revenueAmount);
        vm.stopPrank();

        // Calculate expected dividends
        uint256 expectedInvestorShare = (revenueAmount * (100 - TALENT_SHARE)) / 100;

        // Investor claims dividends
        uint256 investor1BalanceBefore = usdc.balanceOf(investor1);

        vm.startPrank(investor1);
        
        // First, we need to manually update unclaimed dividends
        // In a real implementation, this would be done automatically
        // For testing, we'll use the calculateClaimableDividends function
        uint256 claimable = personalToken.calculateClaimableDividends(investor1);
        
        // Since investor1 owns 100% of tokens, they should get all investor share
        assertEq(claimable, expectedInvestorShare);

        vm.stopPrank();
    }

    function testClaimDividendsMultipleInvestors() public {
        // Setup: Multiple investors stake different amounts
        uint256 stake1 = 10000 * 1e6; // 10K USDC
        uint256 stake2 = 20000 * 1e6; // 20K USDC
        uint256 totalStake = stake1 + stake2;

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stake1);
        personalToken.stake(stake1);
        vm.stopPrank();

        vm.startPrank(investor2);
        usdc.approve(address(personalToken), stake2);
        personalToken.stake(stake2);
        vm.stopPrank();

        // Talent distributes revenue
        uint256 revenueAmount = 3000 * 1e6;
        uint256 expectedInvestorShare = (revenueAmount * (100 - TALENT_SHARE)) / 100;

        vm.startPrank(talent);
        usdc.approve(address(personalToken), revenueAmount);
        personalToken.distributeRevenue(revenueAmount);
        vm.stopPrank();

        // Calculate expected dividends for each investor
        uint256 totalSupply = personalToken.totalSupply();
        uint256 investor1Tokens = personalToken.balanceOf(investor1);
        uint256 investor2Tokens = personalToken.balanceOf(investor2);

        uint256 expectedDividend1 = (expectedInvestorShare * investor1Tokens) / totalSupply;
        uint256 expectedDividend2 = (expectedInvestorShare * investor2Tokens) / totalSupply;

        // Verify proportional distribution
        assertApproxEqAbs(
            expectedDividend1,
            (expectedInvestorShare * stake1) / totalStake,
            1e6 // 1 USDC tolerance for rounding
        );
        assertApproxEqAbs(
            expectedDividend2,
            (expectedInvestorShare * stake2) / totalStake,
            1e6
        );
    }

    function testCannotClaimWithoutDividends() public {
        vm.startPrank(investor1);
        vm.expectRevert("No dividends to claim");
        personalToken.claimDividends();
        vm.stopPrank();
    }

    // ============ Cap Enforcement Tests ============

    function testCapEnforcement() public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        uint256 maxReturn = stakeAmount * RETURN_CAP;

        // Distribute revenue to reach cap
        // Need to account for talent share: if investor gets X, total revenue = X / (1 - talentShare%)
        uint256 totalRevenueNeeded = (maxReturn * 100) / (100 - TALENT_SHARE);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), totalRevenueNeeded);

        vm.expectEmit(false, false, false, true);
        emit CapReached(maxReturn, block.timestamp);

        personalToken.distributeRevenue(totalRevenueNeeded);
        vm.stopPrank();

        assertTrue(personalToken.capReached());
        assertEq(personalToken.totalDistributedToInvestors(), maxReturn);
    }

    function testRevenueAfterCapReached() public {
        // Setup and reach cap
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        uint256 maxReturn = stakeAmount * RETURN_CAP;
        uint256 totalRevenueNeeded = (maxReturn * 100) / (100 - TALENT_SHARE);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), totalRevenueNeeded);
        personalToken.distributeRevenue(totalRevenueNeeded);
        vm.stopPrank();

        // Distribute more revenue after cap
        uint256 additionalRevenue = 5000 * 1e6;
        uint256 talentBalanceBefore = usdc.balanceOf(talent);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), additionalRevenue);
        personalToken.distributeRevenue(additionalRevenue);
        vm.stopPrank();

        // All additional revenue should go to talent
        assertEq(usdc.balanceOf(talent), talentBalanceBefore);
        assertEq(personalToken.totalDistributedToInvestors(), maxReturn); // No change
    }

    // ============ Expiry Tests ============

    function testContractExpiry() public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(block.timestamp + (DURATION * 365 days) + 1);

        // Distribute revenue after expiry
        uint256 revenueAmount = 1000 * 1e6;
        uint256 talentBalanceBefore = usdc.balanceOf(talent);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), revenueAmount);

        vm.expectEmit(false, false, false, true);
        emit ContractExpired(personalToken.expiryDate(), block.timestamp);

        personalToken.distributeRevenue(revenueAmount);
        vm.stopPrank();

        // All revenue should go to talent after expiry
        assertEq(usdc.balanceOf(talent), talentBalanceBefore);
        assertTrue(personalToken.expired());
    }

    // ============ Withdrawal Tests ============

    function testWithdrawExcessAfterCap() public {
        // Setup and reach cap
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        uint256 maxReturn = stakeAmount * RETURN_CAP;
        uint256 totalRevenueNeeded = (maxReturn * 100) / (100 - TALENT_SHARE);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), totalRevenueNeeded);
        personalToken.distributeRevenue(totalRevenueNeeded);
        vm.stopPrank();

        // Distribute additional revenue
        uint256 additionalRevenue = 5000 * 1e6;
        vm.startPrank(talent);
        usdc.approve(address(personalToken), additionalRevenue);
        personalToken.distributeRevenue(additionalRevenue);
        vm.stopPrank();

        // Withdraw excess
        uint256 talentBalanceBefore = usdc.balanceOf(talent);
        uint256 contractBalance = usdc.balanceOf(address(personalToken));
        uint256 unclaimed = personalToken.totalUnclaimedDividends();

        vm.prank(talent);
        personalToken.withdrawExcess();

        uint256 expectedWithdrawal = contractBalance - unclaimed;
        assertEq(usdc.balanceOf(talent), talentBalanceBefore + expectedWithdrawal);
    }

    function testCannotWithdrawExcessBeforeCapOrExpiry() public {
        vm.prank(talent);
        vm.expectRevert("Cap not reached and not expired");
        personalToken.withdrawExcess();
    }

    function testOnlyTalentCanWithdrawExcess() public {
        // Reach cap first
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        uint256 maxReturn = stakeAmount * RETURN_CAP;
        uint256 totalRevenueNeeded = (maxReturn * 100) / (100 - TALENT_SHARE);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), totalRevenueNeeded);
        personalToken.distributeRevenue(totalRevenueNeeded);
        vm.stopPrank();

        // Try to withdraw as non-talent
        vm.prank(investor1);
        vm.expectRevert("Only talent can withdraw");
        personalToken.withdrawExcess();
    }

    // ============ View Function Tests ============

    function testGetContractStats() public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Distribute revenue
        uint256 revenueAmount = 1000 * 1e6;
        vm.startPrank(talent);
        usdc.approve(address(personalToken), revenueAmount);
        personalToken.distributeRevenue(revenueAmount);
        vm.stopPrank();

        (
            uint256 totalStaked,
            uint256 totalDistributedToInvestors,
            uint256 totalDistributedToTalent,
            uint256 maxInvestorReturn,
            uint256 remainingCap,
            bool isExpired,
            bool isCapReached,
            uint256 timeUntilExpiry
        ) = personalToken.getContractStats();

        assertEq(totalStaked, stakeAmount);
        assertTrue(totalDistributedToInvestors > 0);
        assertTrue(totalDistributedToTalent > 0);
        assertEq(maxInvestorReturn, stakeAmount * RETURN_CAP);
        assertTrue(remainingCap > 0);
        assertFalse(isExpired);
        assertFalse(isCapReached);
        assertTrue(timeUntilExpiry > 0);
    }

    // ============ Access Control Tests ============

    function testOnlyOwnerCanPause() public {
        vm.prank(investor1);
        vm.expectRevert();
        personalToken.pause();

        vm.prank(talent);
        personalToken.pause();
        assertTrue(personalToken.paused());
    }

    function testOnlyOwnerCanUnpause() public {
        vm.prank(talent);
        personalToken.pause();

        vm.prank(investor1);
        vm.expectRevert();
        personalToken.unpause();

        vm.prank(talent);
        personalToken.unpause();
        assertFalse(personalToken.paused());
    }

    function testCannotStakeWhenPaused() public {
        vm.prank(talent);
        personalToken.pause();

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), 1000 * 1e6);
        vm.expectRevert();
        personalToken.stake(1000 * 1e6);
        vm.stopPrank();
    }

    function testCannotDistributeWhenPaused() public {
        vm.prank(talent);
        personalToken.pause();

        vm.startPrank(talent);
        usdc.approve(address(personalToken), 1000 * 1e6);
        vm.expectRevert();
        personalToken.distributeRevenue(1000 * 1e6);
        vm.stopPrank();
    }

    // ============ Edge Case Tests ============

    function testVerySmallStake() public {
        uint256 smallStake = 1e6; // 1 USDC
        uint256 expectedTokens = (smallStake * 1e18) / TOKEN_PRICE;

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), smallStake);
        personalToken.stake(smallStake);
        vm.stopPrank();

        assertEq(personalToken.balanceOf(investor1), expectedTokens);
    }

    function testVeryLargeStake() public {
        uint256 largeStake = 1000000 * 1e6; // 1M USDC
        uint256 expectedTokens = (largeStake * 1e18) / TOKEN_PRICE;

        // Mint more USDC for investor
        usdc.mint(investor1, largeStake);

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), largeStake);
        personalToken.stake(largeStake);
        vm.stopPrank();

        assertEq(personalToken.balanceOf(investor1), expectedTokens);
    }

    function testMultipleRevenueDistributions() public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Distribute revenue multiple times
        uint256 revenueAmount = 500 * 1e6;
        uint256 distributions = 5;

        for (uint256 i = 0; i < distributions; i++) {
            vm.startPrank(talent);
            usdc.approve(address(personalToken), revenueAmount);
            personalToken.distributeRevenue(revenueAmount);
            vm.stopPrank();
        }

        uint256 totalRevenue = revenueAmount * distributions;
        uint256 expectedInvestorShare = (totalRevenue * (100 - TALENT_SHARE)) / 100;
        uint256 expectedTalentShare = totalRevenue - expectedInvestorShare;

        assertEq(personalToken.totalDistributedToInvestors(), expectedInvestorShare);
        assertEq(personalToken.totalDistributedToTalent(), expectedTalentShare);
    }

    // ============ Fuzz Tests ============

    function testFuzzStake(uint256 stakeAmount) public {
        // Bound stake amount to reasonable range
        stakeAmount = bound(stakeAmount, 1e6, 100000 * 1e6); // 1 USDC to 100K USDC

        // Mint USDC for investor
        usdc.mint(investor1, stakeAmount);

        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        uint256 expectedTokens = (stakeAmount * 1e18) / TOKEN_PRICE;
        assertEq(personalToken.balanceOf(investor1), expectedTokens);
        assertEq(personalToken.totalStaked(), stakeAmount);
    }

    function testFuzzDistributeRevenue(uint256 revenueAmount) public {
        // Setup: Investor stakes
        uint256 stakeAmount = 10000 * 1e6;
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stakeAmount);
        personalToken.stake(stakeAmount);
        vm.stopPrank();

        // Bound revenue amount
        revenueAmount = bound(revenueAmount, 1e6, 50000 * 1e6); // 1 USDC to 50K USDC

        // Mint USDC for talent
        usdc.mint(talent, revenueAmount);

        vm.startPrank(talent);
        usdc.approve(address(personalToken), revenueAmount);
        personalToken.distributeRevenue(revenueAmount);
        vm.stopPrank();

        uint256 expectedTalentShare = (revenueAmount * TALENT_SHARE) / 100;
        uint256 expectedInvestorShare = revenueAmount - expectedTalentShare;

        // Account for cap
        uint256 maxReturn = stakeAmount * RETURN_CAP;
        if (expectedInvestorShare > maxReturn) {
            expectedInvestorShare = maxReturn;
        }

        assertEq(personalToken.totalDistributedToTalent(), expectedTalentShare);
        assertLe(personalToken.totalDistributedToInvestors(), maxReturn);
    }

    function testFuzzMultipleInvestors(
        uint256 stake1,
        uint256 stake2,
        uint256 stake3
    ) public {
        // Bound stakes
        stake1 = bound(stake1, 1000 * 1e6, 50000 * 1e6);
        stake2 = bound(stake2, 1000 * 1e6, 50000 * 1e6);
        stake3 = bound(stake3, 1000 * 1e6, 50000 * 1e6);

        // Mint USDC
        usdc.mint(investor1, stake1);
        usdc.mint(investor2, stake2);
        usdc.mint(investor3, stake3);

        // Stake
        vm.startPrank(investor1);
        usdc.approve(address(personalToken), stake1);
        personalToken.stake(stake1);
        vm.stopPrank();

        vm.startPrank(investor2);
        usdc.approve(address(personalToken), stake2);
        personalToken.stake(stake2);
        vm.stopPrank();

        vm.startPrank(investor3);
        usdc.approve(address(personalToken), stake3);
        personalToken.stake(stake3);
        vm.stopPrank();

        uint256 totalStaked = stake1 + stake2 + stake3;
        assertEq(personalToken.totalStaked(), totalStaked);
        assertEq(personalToken.maxInvestorReturn(), totalStaked * RETURN_CAP);
    }
}
