// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/AureusToken.sol";

contract AureusTokenTest is Test {
    AureusToken public token;
    
    address public admin;
    address public teamVault;
    address public investorVault;
    address public communityRewards;
    address public treasury;
    address public liquidity;
    address public user1;
    address public user2;

    // Events to test
    event TokensDistributed(address indexed recipient, uint256 amount, string allocationType);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        admin = makeAddr("admin");
        teamVault = makeAddr("teamVault");
        investorVault = makeAddr("investorVault");
        communityRewards = makeAddr("communityRewards");
        treasury = makeAddr("treasury");
        liquidity = makeAddr("liquidity");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy token
        token = new AureusToken(
            admin,
            teamVault,
            investorVault,
            communityRewards,
            treasury,
            liquidity
        );
    }

    // ============ Deployment Tests ============

    function testDeploymentCorrectSupply() public view {
        assertEq(token.totalSupply(), 100_000_000 * 10 ** 18, "Total supply should be 100M");
    }

    function testDeploymentCorrectAllocations() public view {
        assertEq(token.balanceOf(teamVault), 20_000_000 * 10 ** 18, "Team allocation should be 20M");
        assertEq(token.balanceOf(investorVault), 15_000_000 * 10 ** 18, "Investor allocation should be 15M");
        assertEq(token.balanceOf(communityRewards), 30_000_000 * 10 ** 18, "Community allocation should be 30M");
        assertEq(token.balanceOf(treasury), 20_000_000 * 10 ** 18, "Treasury allocation should be 20M");
        assertEq(token.balanceOf(liquidity), 15_000_000 * 10 ** 18, "Liquidity allocation should be 15M");
    }

    function testDeploymentCorrectMetadata() public view {
        assertEq(token.name(), "Aureus Token", "Token name should be Aureus Token");
        assertEq(token.symbol(), "AUREUS", "Token symbol should be AUREUS");
        assertEq(token.decimals(), 18, "Token decimals should be 18");
    }

    function testDeploymentAdminRole() public view {
        assertTrue(token.hasRole(token.ADMIN_ROLE(), admin), "Admin should have ADMIN_ROLE");
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin), "Admin should have DEFAULT_ADMIN_ROLE");
    }

    function testDeploymentRevertsWithZeroAddresses() public {
        vm.expectRevert("Invalid admin address");
        new AureusToken(address(0), teamVault, investorVault, communityRewards, treasury, liquidity);

        vm.expectRevert("Invalid team vault address");
        new AureusToken(admin, address(0), investorVault, communityRewards, treasury, liquidity);

        vm.expectRevert("Invalid investor vault address");
        new AureusToken(admin, teamVault, address(0), communityRewards, treasury, liquidity);

        vm.expectRevert("Invalid community address");
        new AureusToken(admin, teamVault, investorVault, address(0), treasury, liquidity);

        vm.expectRevert("Invalid treasury address");
        new AureusToken(admin, teamVault, investorVault, communityRewards, address(0), liquidity);

        vm.expectRevert("Invalid liquidity address");
        new AureusToken(admin, teamVault, investorVault, communityRewards, treasury, address(0));
    }

    // ============ Transfer Tests ============

    function testTransferSuccess() public {
        vm.startPrank(treasury);
        uint256 amount = 1000 * 10 ** 18;
        
        token.transfer(user1, amount);
        
        assertEq(token.balanceOf(user1), amount, "User1 should receive tokens");
        assertEq(token.balanceOf(treasury), 20_000_000 * 10 ** 18 - amount, "Treasury balance should decrease");
        vm.stopPrank();
    }

    function testTransferFromSuccess() public {
        vm.startPrank(treasury);
        uint256 amount = 1000 * 10 ** 18;
        
        token.approve(user1, amount);
        vm.stopPrank();

        vm.prank(user1);
        token.transferFrom(treasury, user2, amount);

        assertEq(token.balanceOf(user2), amount, "User2 should receive tokens");
    }

    function testTransferEmitsEvent() public {
        vm.startPrank(treasury);
        uint256 amount = 1000 * 10 ** 18;

        vm.expectEmit(true, true, false, true);
        emit Transfer(treasury, user1, amount);
        
        token.transfer(user1, amount);
        vm.stopPrank();
    }

    // ============ Burn Tests ============

    function testBurnSuccess() public {
        vm.startPrank(treasury);
        uint256 burnAmount = 1000 * 10 ** 18;
        uint256 initialSupply = token.totalSupply();
        uint256 initialBalance = token.balanceOf(treasury);

        token.burn(burnAmount);

        assertEq(token.totalSupply(), initialSupply - burnAmount, "Total supply should decrease");
        assertEq(token.balanceOf(treasury), initialBalance - burnAmount, "Balance should decrease");
        vm.stopPrank();
    }

    function testBurnFromSuccess() public {
        vm.startPrank(treasury);
        uint256 burnAmount = 1000 * 10 ** 18;
        token.approve(user1, burnAmount);
        vm.stopPrank();

        uint256 initialSupply = token.totalSupply();

        vm.prank(user1);
        token.burnFrom(treasury, burnAmount);

        assertEq(token.totalSupply(), initialSupply - burnAmount, "Total supply should decrease");
    }

    function testBurnRevertsInsufficientBalance() public {
        vm.prank(user1);
        vm.expectRevert();
        token.burn(1000 * 10 ** 18);
    }

    // ============ Pause Tests ============

    function testPauseByAdmin() public {
        vm.prank(admin);
        token.pause();

        assertTrue(token.paused(), "Token should be paused");
    }

    function testPauseRevertsNonAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        token.pause();
    }

    function testUnpauseByAdmin() public {
        vm.startPrank(admin);
        token.pause();
        token.unpause();
        vm.stopPrank();

        assertFalse(token.paused(), "Token should be unpaused");
    }

    function testTransferRevertsWhenPaused() public {
        vm.prank(admin);
        token.pause();

        vm.prank(treasury);
        vm.expectRevert();
        token.transfer(user1, 1000 * 10 ** 18);
    }

    function testTransferSucceedsAfterUnpause() public {
        vm.startPrank(admin);
        token.pause();
        token.unpause();
        vm.stopPrank();

        vm.prank(treasury);
        token.transfer(user1, 1000 * 10 ** 18);

        assertEq(token.balanceOf(user1), 1000 * 10 ** 18, "Transfer should succeed after unpause");
    }

    // ============ Access Control Tests ============

    function testAdminCanGrantAdminRole() public {
        vm.prank(admin);
        token.grantRole(token.ADMIN_ROLE(), user1);

        assertTrue(token.hasRole(token.ADMIN_ROLE(), user1), "User1 should have ADMIN_ROLE");
    }

    function testNonAdminCannotGrantAdminRole() public {
        vm.prank(user1);
        vm.expectRevert();
        token.grantRole(token.ADMIN_ROLE(), user2);
    }

    // ============ Edge Case Tests ============

    function testTransferZeroAmount() public {
        vm.prank(treasury);
        token.transfer(user1, 0);

        assertEq(token.balanceOf(user1), 0, "User1 balance should remain 0");
    }

    function testTransferToSelf() public {
        vm.startPrank(treasury);
        uint256 initialBalance = token.balanceOf(treasury);
        
        token.transfer(treasury, 1000 * 10 ** 18);

        assertEq(token.balanceOf(treasury), initialBalance, "Balance should remain same");
        vm.stopPrank();
    }

    function testApproveAndTransferFrom() public {
        vm.startPrank(treasury);
        uint256 amount = 1000 * 10 ** 18;
        
        token.approve(user1, amount);
        assertEq(token.allowance(treasury, user1), amount, "Allowance should be set");
        vm.stopPrank();

        vm.prank(user1);
        token.transferFrom(treasury, user2, amount);

        assertEq(token.balanceOf(user2), amount, "User2 should receive tokens");
        assertEq(token.allowance(treasury, user1), 0, "Allowance should be consumed");
    }

    // ============ Fuzz Tests ============

    function testFuzzTransfer(uint256 amount) public {
        amount = bound(amount, 0, token.balanceOf(treasury));

        vm.prank(treasury);
        token.transfer(user1, amount);

        assertEq(token.balanceOf(user1), amount, "User1 should receive exact amount");
    }

    function testFuzzBurn(uint256 amount) public {
        amount = bound(amount, 0, token.balanceOf(treasury));

        vm.startPrank(treasury);
        uint256 initialSupply = token.totalSupply();
        
        token.burn(amount);

        assertEq(token.totalSupply(), initialSupply - amount, "Supply should decrease by burn amount");
        vm.stopPrank();
    }
}
