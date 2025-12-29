// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/AgentOracleWithStaking.sol";
import "../src/AureusToken.sol";

contract AgentOracleWithStakingTest is Test {
    AgentOracleWithStaking public oracle;
    AureusToken public token;
    
    address public admin;
    address public agent1;
    address public agent2;
    address public user1;
    address public teamVault;
    address public investorVault;
    address public communityRewards;
    address public treasury;
    address public liquidity;

    uint256 public agent1PrivateKey = 0xA11CE;
    uint256 public agent2PrivateKey = 0xB0B;

    uint256 public constant STAKE_REQUIREMENT = 10_000 * 10 ** 18;
    uint256 public constant UNSTAKE_COOLDOWN = 7 days;

    // Events to test
    event AgentStaked(address indexed agent, uint256 amount, uint256 totalStake, uint256 timestamp);
    event AgentUnstaked(address indexed agent, uint256 amount, uint256 timestamp);
    event UnstakeRequested(address indexed agent, uint256 cooldownEnd, uint256 timestamp);
    event ClaimVerified(uint256 indexed claimId, address indexed agent, bool isValid, uint256 timestamp);
    event AgentSlashed(address indexed agent, uint256 slashedAmount, string reason, uint256 timestamp);

    function setUp() public {
        admin = makeAddr("admin");
        agent1 = vm.addr(agent1PrivateKey);
        agent2 = vm.addr(agent2PrivateKey);
        user1 = makeAddr("user1");
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

        // Deploy oracle
        oracle = new AgentOracleWithStaking(admin, address(token));

        // Transfer tokens to agents for staking
        vm.startPrank(treasury);
        token.transfer(agent1, STAKE_REQUIREMENT * 2);
        token.transfer(agent2, STAKE_REQUIREMENT * 2);
        vm.stopPrank();
    }

    // ============ Deployment Tests ============

    function testDeploymentCorrectSetup() public view {
        assertEq(address(oracle.aureusToken()), address(token), "Token address should be set");
        assertTrue(oracle.hasRole(oracle.ADMIN_ROLE(), admin), "Admin should have ADMIN_ROLE");
        assertEq(oracle.AGENT_STAKE_REQUIREMENT(), STAKE_REQUIREMENT, "Stake requirement should be 10,000 AUREUS");
        assertEq(oracle.UNSTAKE_COOLDOWN(), UNSTAKE_COOLDOWN, "Cooldown should be 7 days");
    }

    // ============ Staking Tests ============

    function testStakeAureusSuccess() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);

        vm.expectEmit(true, false, false, true);
        emit AgentStaked(agent1, STAKE_REQUIREMENT, STAKE_REQUIREMENT, block.timestamp);

        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        assertEq(oracle.agentStakes(agent1), STAKE_REQUIREMENT, "Agent stake should be recorded");
        assertTrue(oracle.hasRole(oracle.AGENT_ROLE(), agent1), "Agent should have AGENT_ROLE");
        assertEq(oracle.totalStaked(), STAKE_REQUIREMENT, "Total staked should increase");
    }

    function testStakeAureusRevertsInsufficientAmount() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT - 1);

        vm.expectRevert("Insufficient stake amount");
        oracle.stakeAureus(STAKE_REQUIREMENT - 1);
        vm.stopPrank();
    }

    function testStakeAureusRevertsAlreadyStaked() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT * 2);
        oracle.stakeAureus(STAKE_REQUIREMENT);

        vm.expectRevert("Agent already staked");
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();
    }

    function testStakeAureusMultipleAgents() public {
        // Agent1 stakes
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        // Agent2 stakes
        vm.startPrank(agent2);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        assertEq(oracle.totalStaked(), STAKE_REQUIREMENT * 2, "Total staked should be sum of both stakes");
    }

    // ============ Unstaking Tests ============

    function testRequestUnstakeSuccess() public {
        // Stake first
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);

        vm.expectEmit(true, false, false, true);
        emit UnstakeRequested(agent1, block.timestamp + UNSTAKE_COOLDOWN, block.timestamp);

        oracle.requestUnstake();
        vm.stopPrank();

        assertEq(oracle.unstakeTimestamp(agent1), block.timestamp, "Unstake timestamp should be set");
    }

    function testRequestUnstakeRevertsNoStake() public {
        vm.prank(agent1);
        vm.expectRevert("No stake to unstake");
        oracle.requestUnstake();
    }

    function testRequestUnstakeRevertsAlreadyRequested() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        oracle.requestUnstake();

        vm.expectRevert("Unstake already requested");
        oracle.requestUnstake();
        vm.stopPrank();
    }

    function testUnstakeAureusSuccess() public {
        // Stake and request unstake
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        oracle.requestUnstake();
        vm.stopPrank();

        // Warp past cooldown
        vm.warp(block.timestamp + UNSTAKE_COOLDOWN);

        vm.expectEmit(true, false, false, true);
        emit AgentUnstaked(agent1, STAKE_REQUIREMENT, block.timestamp);

        vm.prank(agent1);
        oracle.unstakeAureus();

        assertEq(oracle.agentStakes(agent1), 0, "Agent stake should be zero");
        assertFalse(oracle.hasRole(oracle.AGENT_ROLE(), agent1), "Agent should lose AGENT_ROLE");
        assertEq(oracle.totalStaked(), 0, "Total staked should decrease");
        assertEq(token.balanceOf(agent1), STAKE_REQUIREMENT * 2, "Agent should receive tokens back");
    }

    function testUnstakeAureusRevertsCooldownNotElapsed() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        oracle.requestUnstake();
        vm.stopPrank();

        // Try to unstake before cooldown
        vm.warp(block.timestamp + UNSTAKE_COOLDOWN - 1);

        vm.prank(agent1);
        vm.expectRevert("Cooldown period not elapsed");
        oracle.unstakeAureus();
    }

    function testCancelUnstake() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        oracle.requestUnstake();

        oracle.cancelUnstake();
        vm.stopPrank();

        assertEq(oracle.unstakeTimestamp(agent1), 0, "Unstake timestamp should be reset");
    }

    // ============ Verification Tests ============

    function testVerifyClaimSuccess() public {
        // Stake agent
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        uint256 claimId = 1;
        bool isValid = true;

        // Create signature
        bytes32 messageHash = keccak256(abi.encodePacked(claimId, isValid, address(oracle), block.chainid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectEmit(true, true, false, true);
        emit ClaimVerified(claimId, agent1, isValid, block.timestamp);

        vm.prank(user1);
        oracle.verifyClaim(claimId, isValid, signature);

        assertTrue(oracle.verifiedClaims(claimId), "Claim should be verified");
        assertEq(oracle.claimVerifiers(claimId), agent1, "Verifier should be agent1");
        assertEq(oracle.totalVerifiedClaims(), 1, "Total verified claims should increase");
    }

    function testVerifyClaimRevertsInsufficientStake() public {
        // Stake less than requirement
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        // Slash agent to below requirement
        vm.prank(admin);
        oracle.slashAgent(agent1, 1 * 10 ** 18, "Test slash");

        uint256 claimId = 1;
        bool isValid = true;

        bytes32 messageHash = keccak256(abi.encodePacked(claimId, isValid, address(oracle), block.chainid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(user1);
        vm.expectRevert("Insufficient agent stake");
        oracle.verifyClaim(claimId, isValid, signature);
    }

    function testVerifyClaimRevertsDuringUnstakeCooldown() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        oracle.requestUnstake();
        vm.stopPrank();

        uint256 claimId = 1;
        bool isValid = true;

        bytes32 messageHash = keccak256(abi.encodePacked(claimId, isValid, address(oracle), block.chainid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(user1);
        vm.expectRevert("Agent in unstake cooldown");
        oracle.verifyClaim(claimId, isValid, signature);
    }

    function testVerifyClaimRevertsDoubleVerification() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        uint256 claimId = 1;
        bool isValid = true;

        bytes32 messageHash = keccak256(abi.encodePacked(claimId, isValid, address(oracle), block.chainid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(user1);
        oracle.verifyClaim(claimId, isValid, signature);

        // Try to verify again
        vm.prank(user1);
        vm.expectRevert("Claim already verified");
        oracle.verifyClaim(claimId, isValid, signature);
    }

    function testVerifyClaimRevertsSignatureReplay() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        uint256 claimId = 1;
        bool isValid = true;

        bytes32 messageHash = keccak256(abi.encodePacked(claimId, isValid, address(oracle), block.chainid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(user1);
        oracle.verifyClaim(claimId, isValid, signature);

        // Try to use same signature for different claim
        vm.prank(user1);
        vm.expectRevert("Signature already used");
        oracle.verifyClaim(2, isValid, signature);
    }

    // ============ Slashing Tests ============

    function testSlashAgentSuccess() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        uint256 slashAmount = 1000 * 10 ** 18;

        vm.expectEmit(true, false, false, true);
        emit AgentSlashed(agent1, slashAmount, "Malicious behavior", block.timestamp);

        vm.prank(admin);
        oracle.slashAgent(agent1, slashAmount, "Malicious behavior");

        assertEq(oracle.agentStakes(agent1), STAKE_REQUIREMENT - slashAmount, "Stake should be reduced");
        assertEq(token.balanceOf(admin), slashAmount, "Admin should receive slashed tokens");
    }

    function testSlashAgentRevokesRoleIfBelowRequirement() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        vm.prank(admin);
        oracle.slashAgent(agent1, STAKE_REQUIREMENT, "Severe violation");

        assertFalse(oracle.hasRole(oracle.AGENT_ROLE(), agent1), "Agent should lose AGENT_ROLE");
    }

    function testSlashAgentRevertsNonAdmin() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert();
        oracle.slashAgent(agent1, 1000 * 10 ** 18, "Test");
    }

    // ============ View Function Tests ============

    function testGetAgentStakeInfo() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        (uint256 stakeAmount, bool isActive, uint256 unstakeTime) = oracle.getAgentStakeInfo(agent1);

        assertEq(stakeAmount, STAKE_REQUIREMENT, "Stake amount should match");
        assertTrue(isActive, "Agent should be active");
        assertEq(unstakeTime, 0, "No unstake request");
    }

    function testGetVerificationStatus() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        uint256 claimId = 1;
        bool isValid = true;

        bytes32 messageHash = keccak256(abi.encodePacked(claimId, isValid, address(oracle), block.chainid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(user1);
        oracle.verifyClaim(claimId, isValid, signature);

        (bool isVerified, bool valid, address agent, uint256 timestamp) = oracle.getVerificationStatus(claimId);

        assertTrue(isVerified, "Claim should be verified");
        assertTrue(valid, "Claim should be valid");
        assertEq(agent, agent1, "Agent should be agent1");
        assertEq(timestamp, block.timestamp, "Timestamp should match");
    }

    // ============ Pause Tests ============

    function testPausePreventStaking() public {
        vm.prank(admin);
        oracle.pause();

        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        vm.expectRevert();
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();
    }

    function testPausePreventVerification() public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        vm.prank(admin);
        oracle.pause();

        uint256 claimId = 1;
        bool isValid = true;

        bytes32 messageHash = keccak256(abi.encodePacked(claimId, isValid, address(oracle), block.chainid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(user1);
        vm.expectRevert();
        oracle.verifyClaim(claimId, isValid, signature);
    }

    // ============ Fuzz Tests ============

    function testFuzzStakeAmount(uint256 amount) public {
        amount = bound(amount, STAKE_REQUIREMENT, STAKE_REQUIREMENT * 10);

        vm.startPrank(treasury);
        token.transfer(user1, amount);
        vm.stopPrank();

        vm.startPrank(user1);
        token.approve(address(oracle), amount);
        oracle.stakeAureus(amount);
        vm.stopPrank();

        assertEq(oracle.agentStakes(user1), amount, "Stake should match fuzzed amount");
    }

    function testFuzzSlashAmount(uint256 slashAmount) public {
        vm.startPrank(agent1);
        token.approve(address(oracle), STAKE_REQUIREMENT);
        oracle.stakeAureus(STAKE_REQUIREMENT);
        vm.stopPrank();

        slashAmount = bound(slashAmount, 1, STAKE_REQUIREMENT);

        vm.prank(admin);
        oracle.slashAgent(agent1, slashAmount, "Test");

        assertEq(oracle.agentStakes(agent1), STAKE_REQUIREMENT - slashAmount, "Stake should be reduced correctly");
    }
}
