// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/VestingVault.sol";
import "../src/AureusToken.sol";

contract VestingVaultTest is Test {
    VestingVault public vault;
    AureusToken public token;
    
    address public admin;
    address public beneficiary1;
    address public beneficiary2;
    address public teamVault;
    address public investorVault;
    address public communityRewards;
    address public treasury;
    address public liquidity;

    uint256 public constant TEAM_VESTING_DURATION = 4 * 365 days; // 4 years
    uint256 public constant TEAM_CLIFF = 365 days; // 1 year
    uint256 public constant INVESTOR_VESTING_DURATION = 2 * 365 days; // 2 years
    uint256 public constant INVESTOR_CLIFF = 180 days; // 6 months

    // Events to test
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    );
    event TokensReleased(address indexed beneficiary, uint256 amount, uint256 timestamp);
    event VestingRevoked(address indexed beneficiary, uint256 vestedAmount, uint256 revokedAmount, uint256 timestamp);

    function setUp() public {
        admin = makeAddr("admin");
        beneficiary1 = makeAddr("beneficiary1");
        beneficiary2 = makeAddr("beneficiary2");
        teamVault = makeAddr("teamVault");
        investorVault = makeAddr("investorVault");
        communityRewards = makeAddr("communityRewards");
        treasury = makeAddr("treasury");
        liquidity = makeAddr("liquidity");

        // Deploy token
        token = new AureusToken(
            admin,
            teamVault,
            investorVault,
            communityRewards,
            treasury,
            liquidity
        );

        // Deploy vesting vault
        vault = new VestingVault(address(token), admin);

        // Transfer tokens to admin for vesting
        vm.prank(treasury);
        token.transfer(admin, 10_000_000 * 10 ** 18);
    }

    // ============ Deployment Tests ============

    function testDeploymentCorrectSetup() public view {
        assertEq(address(vault.aureusToken()), address(token), "Token address should be set");
        assertTrue(vault.hasRole(vault.ADMIN_ROLE(), admin), "Admin should have ADMIN_ROLE");
    }

    function testDeploymentRevertsZeroAddresses() public {
        vm.expectRevert("Invalid token address");
        new VestingVault(address(0), admin);

        vm.expectRevert("Invalid admin address");
        new VestingVault(address(token), address(0));
    }

    // ============ Create Vesting Schedule Tests ============

    function testCreateVestingScheduleTeam() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);

        vm.expectEmit(true, false, false, true);
        emit VestingScheduleCreated(beneficiary1, amount, block.timestamp, TEAM_CLIFF, TEAM_VESTING_DURATION, true);

        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        assertTrue(vault.isBeneficiary(beneficiary1), "Beneficiary1 should be registered");
        assertEq(vault.totalAllocated(), amount, "Total allocated should match");
    }

    function testCreateVestingScheduleInvestor() public {
        uint256 amount = 500_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, INVESTOR_CLIFF, INVESTOR_VESTING_DURATION, false);
        vm.stopPrank();

        (uint256 totalAmount, , uint256 cliffDuration, uint256 vestingDuration, , bool revocable, ) = 
            vault.vestingSchedules(beneficiary1);

        assertEq(totalAmount, amount, "Total amount should match");
        assertEq(cliffDuration, INVESTOR_CLIFF, "Cliff duration should match");
        assertEq(vestingDuration, INVESTOR_VESTING_DURATION, "Vesting duration should match");
        assertFalse(revocable, "Should not be revocable");
    }

    function testCreateVestingScheduleRevertsZeroAmount() public {
        vm.prank(admin);
        vm.expectRevert("Amount must be greater than 0");
        vault.createVestingSchedule(beneficiary1, 0, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
    }

    function testCreateVestingScheduleRevertsZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("Invalid beneficiary address");
        vault.createVestingSchedule(address(0), 1000 * 10 ** 18, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
    }

    function testCreateVestingScheduleRevertsCliffExceedsDuration() public {
        vm.prank(admin);
        vm.expectRevert("Cliff duration exceeds vesting duration");
        vault.createVestingSchedule(beneficiary1, 1000 * 10 ** 18, TEAM_VESTING_DURATION + 1, TEAM_VESTING_DURATION, true);
    }

    function testCreateVestingScheduleRevertsDuplicateBeneficiary() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount * 2);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);

        vm.expectRevert("Beneficiary already has vesting schedule");
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();
    }

    function testCreateVestingScheduleRevertsNonAdmin() public {
        vm.prank(beneficiary1);
        vm.expectRevert();
        vault.createVestingSchedule(beneficiary2, 1000 * 10 ** 18, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
    }

    // ============ Cliff Enforcement Tests ============

    function testReleaseRevertsBeforeCliff() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Try to release before cliff
        vm.warp(block.timestamp + TEAM_CLIFF - 1);

        vm.prank(beneficiary1);
        vm.expectRevert("No tokens available for release");
        vault.release(beneficiary1);
    }

    function testGetVestedAmountBeforeCliff() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Check vested amount before cliff
        vm.warp(block.timestamp + TEAM_CLIFF - 1);
        uint256 vested = vault.getVestedAmount(beneficiary1);

        assertEq(vested, 0, "No tokens should be vested before cliff");
    }

    // ============ Linear Vesting Tests ============

    function testLinearVestingAfterCliff() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Warp to after cliff (1 year)
        vm.warp(block.timestamp + TEAM_CLIFF);

        uint256 vested = vault.getVestedAmount(beneficiary1);
        uint256 expected = (amount * TEAM_CLIFF) / TEAM_VESTING_DURATION;

        assertEq(vested, expected, "Vested amount should be linear");
    }

    function testLinearVestingMidway() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Warp to midway (2 years)
        vm.warp(block.timestamp + TEAM_VESTING_DURATION / 2);

        uint256 vested = vault.getVestedAmount(beneficiary1);
        uint256 expected = amount / 2;

        assertEq(vested, expected, "Half should be vested at midway");
    }

    function testLinearVestingFullyVested() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Warp to end of vesting
        vm.warp(block.timestamp + TEAM_VESTING_DURATION);

        uint256 vested = vault.getVestedAmount(beneficiary1);

        assertEq(vested, amount, "All tokens should be vested at end");
    }

    // ============ Release Tests ============

    function testReleaseVestedTokens() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Warp to after cliff
        vm.warp(block.timestamp + TEAM_CLIFF);

        uint256 releasable = vault.getReleaseableAmount(beneficiary1);
        assertTrue(releasable > 0, "Should have releasable tokens");

        vm.expectEmit(true, false, false, true);
        emit TokensReleased(beneficiary1, releasable, block.timestamp);

        vm.prank(beneficiary1);
        vault.release(beneficiary1);

        assertEq(token.balanceOf(beneficiary1), releasable, "Beneficiary should receive tokens");
    }

    function testReleaseMultipleTimes() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // First release after cliff
        vm.warp(block.timestamp + TEAM_CLIFF);
        vm.prank(beneficiary1);
        vault.release(beneficiary1);
        uint256 firstRelease = token.balanceOf(beneficiary1);

        // Second release after more time
        vm.warp(block.timestamp + 365 days);
        vm.prank(beneficiary1);
        vault.release(beneficiary1);
        uint256 secondRelease = token.balanceOf(beneficiary1);

        assertTrue(secondRelease > firstRelease, "Second release should be greater");
    }

    function testReleaseRevertsNoBeneficiary() public {
        vm.prank(beneficiary1);
        vm.expectRevert("No vesting schedule for beneficiary");
        vault.release(beneficiary1);
    }

    function testReleaseRevertsNoTokensAvailable() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Try to release immediately (before cliff)
        vm.prank(beneficiary1);
        vm.expectRevert("No tokens available for release");
        vault.release(beneficiary1);
    }

    // ============ Revoke Tests ============

    function testRevokeVesting() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        // Warp to midway
        vm.warp(block.timestamp + TEAM_VESTING_DURATION / 2);

        uint256 vestedAmount = vault.getVestedAmount(beneficiary1);
        uint256 revokedAmount = amount - vestedAmount;

        vm.expectEmit(true, false, false, true);
        emit VestingRevoked(beneficiary1, vestedAmount, revokedAmount, block.timestamp);

        vm.prank(admin);
        vault.revoke(beneficiary1);

        assertEq(token.balanceOf(beneficiary1), vestedAmount, "Beneficiary should receive vested amount");
        assertEq(token.balanceOf(admin), revokedAmount, "Admin should receive revoked amount");
    }

    function testRevokeRevertsNotRevocable() public {
        uint256 amount = 500_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, INVESTOR_CLIFF, INVESTOR_VESTING_DURATION, false);
        vm.stopPrank();

        vm.prank(admin);
        vm.expectRevert("Vesting is not revocable");
        vault.revoke(beneficiary1);
    }

    function testRevokeRevertsNonAdmin() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        vm.prank(beneficiary1);
        vm.expectRevert();
        vault.revoke(beneficiary1);
    }

    function testRevokeRevertsAlreadyRevoked() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        vm.warp(block.timestamp + TEAM_CLIFF);

        vm.startPrank(admin);
        vault.revoke(beneficiary1);

        vm.expectRevert("Vesting already revoked");
        vault.revoke(beneficiary1);
        vm.stopPrank();
    }

    function testReleaseRevertsAfterRevoke() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        vm.warp(block.timestamp + TEAM_CLIFF);

        vm.prank(admin);
        vault.revoke(beneficiary1);

        vm.prank(beneficiary1);
        vm.expectRevert("Vesting has been revoked");
        vault.release(beneficiary1);
    }

    // ============ Multiple Beneficiaries Tests ============

    function testMultipleBeneficiaries() public {
        uint256 amount1 = 1_000_000 * 10 ** 18;
        uint256 amount2 = 500_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount1 + amount2);
        vault.createVestingSchedule(beneficiary1, amount1, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vault.createVestingSchedule(beneficiary2, amount2, INVESTOR_CLIFF, INVESTOR_VESTING_DURATION, false);
        vm.stopPrank();

        assertEq(vault.getBeneficiaryCount(), 2, "Should have 2 beneficiaries");
        assertEq(vault.totalAllocated(), amount1 + amount2, "Total allocated should match");
    }

    function testGetBeneficiaryByIndex() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount * 2);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vault.createVestingSchedule(beneficiary2, amount, INVESTOR_CLIFF, INVESTOR_VESTING_DURATION, false);
        vm.stopPrank();

        assertEq(vault.getBeneficiaryByIndex(0), beneficiary1, "First beneficiary should be beneficiary1");
        assertEq(vault.getBeneficiaryByIndex(1), beneficiary2, "Second beneficiary should be beneficiary2");
    }

    // ============ View Function Tests ============

    function testGetVestingSchedule() public {
        uint256 amount = 1_000_000 * 10 ** 18;

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        VestingVault.VestingSchedule memory schedule = vault.getVestingSchedule(beneficiary1);

        assertEq(schedule.totalAmount, amount, "Total amount should match");
        assertEq(schedule.cliffDuration, TEAM_CLIFF, "Cliff duration should match");
        assertEq(schedule.vestingDuration, TEAM_VESTING_DURATION, "Vesting duration should match");
        assertTrue(schedule.revocable, "Should be revocable");
        assertFalse(schedule.revoked, "Should not be revoked");
    }

    // ============ Fuzz Tests ============

    function testFuzzVestingAmount(uint256 amount) public {
        amount = bound(amount, 1 * 10 ** 18, 10_000_000 * 10 ** 18);

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        vm.warp(block.timestamp + TEAM_VESTING_DURATION);
        uint256 vested = vault.getVestedAmount(beneficiary1);

        assertEq(vested, amount, "All tokens should be vested");
    }

    function testFuzzVestingTime(uint256 timeElapsed) public {
        uint256 amount = 1_000_000 * 10 ** 18;
        timeElapsed = bound(timeElapsed, TEAM_CLIFF, TEAM_VESTING_DURATION);

        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.createVestingSchedule(beneficiary1, amount, TEAM_CLIFF, TEAM_VESTING_DURATION, true);
        vm.stopPrank();

        vm.warp(block.timestamp + timeElapsed);
        uint256 vested = vault.getVestedAmount(beneficiary1);
        uint256 expected = (amount * timeElapsed) / TEAM_VESTING_DURATION;

        assertEq(vested, expected, "Vested amount should be proportional to time");
    }
}
