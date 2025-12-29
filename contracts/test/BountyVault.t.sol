// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/BountyVault.sol";
import "../src/SkillClaim.sol";
import "../src/SkillProfile.sol";
import "../src/AgentOracle.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract BountyVaultTest is Test {
    BountyVault public vault;
    SkillClaim public skillClaim;
    SkillProfile public skillProfile;
    AgentOracle public agentOracle;
    MockUSDC public usdc;

    address public admin = address(1);
    address public employer = address(2);
    address public user = address(3);
    address public agent = address(4);

    uint256 public constant BOUNTY_AMOUNT = 50 * 10 ** 6; // 50 USDC
    string public constant SKILL_TAG = "Solidity";

    event PoolCreated(string indexed skillTag, bytes32 indexed skillTagHash);
    event PoolDeposit(
        address indexed employer,
        string indexed skillTag,
        bytes32 indexed skillTagHash,
        uint256 amount,
        uint256 newBalance
    );
    event BountyClaimed(
        address indexed claimant,
        string indexed skillTag,
        bytes32 indexed skillTagHash,
        uint256 claimId,
        uint256 amount,
        uint256 timestamp
    );

    function setUp() public {
        vm.startPrank(admin);

        // Deploy contracts
        usdc = new MockUSDC();
        skillProfile = new SkillProfile(admin);
        agentOracle = new AgentOracle(admin);
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        vault = new BountyVault(address(skillClaim), address(usdc));

        // Grant roles
        vault.grantRole(vault.EMPLOYER_ROLE(), employer);
        agentOracle.grantRole(agentOracle.AGENT_ROLE(), agent);
        skillClaim.grantVerifierRole(admin);

        // Mint USDC to employer
        usdc.mint(employer, 10000 * 10 ** 6); // 10,000 USDC

        vm.stopPrank();
    }

    function testDepositToPool() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);

        vm.expectEmit(true, true, true, true);
        emit PoolCreated(SKILL_TAG, keccak256(abi.encodePacked(SKILL_TAG)));

        vm.expectEmit(true, true, true, true);
        emit PoolDeposit(employer, SKILL_TAG, keccak256(abi.encodePacked(SKILL_TAG)), 1000 * 10 ** 6, 1000 * 10 ** 6);

        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);

        BountyVault.SkillPool memory pool = vault.getPool(SKILL_TAG);
        assertEq(pool.totalDeposited, 1000 * 10 ** 6);
        assertEq(pool.availableBalance, 1000 * 10 ** 6);
        assertEq(pool.totalClaimed, 0);
        assertTrue(pool.active);

        vm.stopPrank();
    }

    function testDepositToPoolRevertsIfNotEmployer() public {
        vm.startPrank(user);
        usdc.approve(address(vault), 1000 * 10 ** 6);

        vm.expectRevert();
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);

        vm.stopPrank();
    }

    function testDepositToPoolRevertsIfZeroAmount() public {
        vm.startPrank(employer);

        vm.expectRevert(BountyVault.ZeroDepositAmount.selector);
        vault.depositToPool(SKILL_TAG, 0);

        vm.stopPrank();
    }

    function testDepositToPoolRevertsIfInvalidSkillTag() public {
        vm.startPrank(employer);

        vm.expectRevert(BountyVault.InvalidSkillTag.selector);
        vault.depositToPool("", 1000 * 10 ** 6);

        vm.stopPrank();
    }

    function testClaimBounty() public {
        // Setup: Create pool
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        // Setup: Create profile and claim
        vm.startPrank(user);
        skillProfile.createProfile("Alice", bytes32(0));
        skillProfile.addSkill(SKILL_TAG, 80, "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX");
        uint256 claimId = skillClaim.createClaim(SKILL_TAG, "https://github.com/alice/solidity-project", "", 0);
        vm.stopPrank();

        // Setup: Agent verifies claim
        vm.startPrank(agent);
        bytes32 messageHash = keccak256(abi.encodePacked(claimId, true));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(4, ethSignedMessageHash); // agent private key = 4
        bytes memory signature = abi.encodePacked(r, s, v);

        agentOracle.verifyClaim(claimId, true, signature);
        vm.stopPrank();

        // Approve claim
        vm.startPrank(admin);
        skillClaim.approveClaim(claimId, "Verified");
        vm.stopPrank();

        // Claim bounty
        uint256 userBalanceBefore = usdc.balanceOf(user);

        vm.startPrank(user);
        vm.expectEmit(true, true, true, true);
        emit BountyClaimed(user, SKILL_TAG, keccak256(abi.encodePacked(SKILL_TAG)), claimId, BOUNTY_AMOUNT, block.timestamp);

        vault.claimBounty(claimId, SKILL_TAG);
        vm.stopPrank();

        uint256 userBalanceAfter = usdc.balanceOf(user);
        assertEq(userBalanceAfter - userBalanceBefore, BOUNTY_AMOUNT);

        BountyVault.SkillPool memory pool = vault.getPool(SKILL_TAG);
        assertEq(pool.totalClaimed, BOUNTY_AMOUNT);
        assertEq(pool.availableBalance, 1000 * 10 ** 6 - BOUNTY_AMOUNT);

        assertTrue(vault.hasClaimed(user, keccak256(abi.encodePacked(SKILL_TAG))));
    }

    function testClaimBountyRevertsIfAlreadyClaimed() public {
        // Setup pool and claim
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        vm.startPrank(user);
        skillProfile.createProfile("Alice", bytes32(0));
        skillProfile.addSkill(SKILL_TAG, 80, "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX");
        uint256 claimId = skillClaim.createClaim(SKILL_TAG, "https://github.com/alice/solidity-project", "", 0);
        vm.stopPrank();

        // Verify and approve
        vm.startPrank(agent);
        bytes32 messageHash = keccak256(abi.encodePacked(claimId, true));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(4, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        agentOracle.verifyClaim(claimId, true, signature);
        vm.stopPrank();

        vm.startPrank(admin);
        skillClaim.approveClaim(claimId, "Verified");
        vm.stopPrank();

        // First claim succeeds
        vm.startPrank(user);
        vault.claimBounty(claimId, SKILL_TAG);

        // Second claim fails
        vm.expectRevert(BountyVault.AlreadyClaimed.selector);
        vault.claimBounty(claimId, SKILL_TAG);
        vm.stopPrank();
    }

    function testClaimBountyRevertsIfClaimNotVerified() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        vm.startPrank(user);
        skillProfile.createProfile("Alice", bytes32(0));
        skillProfile.addSkill(SKILL_TAG, 80, "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX");
        uint256 claimId = skillClaim.createClaim(SKILL_TAG, "https://github.com/alice/solidity-project", "", 0);

        vm.expectRevert(BountyVault.ClaimNotVerified.selector);
        vault.claimBounty(claimId, SKILL_TAG);
        vm.stopPrank();
    }

    function testClaimBountyRevertsIfInsufficientBalance() public {
        // Create pool with insufficient balance
        vm.startPrank(employer);
        usdc.approve(address(vault), 10 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 10 * 10 ** 6); // Only 10 USDC, need 50
        vm.stopPrank();

        vm.startPrank(user);
        skillProfile.createProfile("Alice", bytes32(0));
        skillProfile.addSkill(SKILL_TAG, 80, "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX");
        uint256 claimId = skillClaim.createClaim(SKILL_TAG, "https://github.com/alice/solidity-project", "", 0);
        vm.stopPrank();

        // Verify and approve
        vm.startPrank(agent);
        bytes32 messageHash = keccak256(abi.encodePacked(claimId, true));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(4, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        agentOracle.verifyClaim(claimId, true, signature);
        vm.stopPrank();

        vm.startPrank(admin);
        skillClaim.approveClaim(claimId, "Verified");
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert(BountyVault.InsufficientPoolBalance.selector);
        vault.claimBounty(claimId, SKILL_TAG);
        vm.stopPrank();
    }

    function testClaimBountyRevertsIfSkillMismatch() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool("JavaScript", 1000 * 10 ** 6);
        vm.stopPrank();

        vm.startPrank(user);
        skillProfile.createProfile("Alice", bytes32(0));
        skillProfile.addSkill(SKILL_TAG, 80, "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX");
        uint256 claimId = skillClaim.createClaim(SKILL_TAG, "https://github.com/alice/solidity-project", "", 0);
        vm.stopPrank();

        // Verify and approve
        vm.startPrank(agent);
        bytes32 messageHash = keccak256(abi.encodePacked(claimId, true));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(4, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        agentOracle.verifyClaim(claimId, true, signature);
        vm.stopPrank();

        vm.startPrank(admin);
        skillClaim.approveClaim(claimId, "Verified");
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert(BountyVault.SkillMismatch.selector);
        vault.claimBounty(claimId, "JavaScript");
        vm.stopPrank();
    }

    function testWithdrawFromPool() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        uint256 adminBalanceBefore = usdc.balanceOf(admin);

        vm.startPrank(admin);
        vault.withdrawFromPool(SKILL_TAG, 500 * 10 ** 6);
        vm.stopPrank();

        uint256 adminBalanceAfter = usdc.balanceOf(admin);
        assertEq(adminBalanceAfter - adminBalanceBefore, 500 * 10 ** 6);

        BountyVault.SkillPool memory pool = vault.getPool(SKILL_TAG);
        assertEq(pool.availableBalance, 500 * 10 ** 6);
    }

    function testDeactivatePool() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        vm.startPrank(admin);
        vault.deactivatePool(SKILL_TAG);
        vm.stopPrank();

        BountyVault.SkillPool memory pool = vault.getPool(SKILL_TAG);
        assertFalse(pool.active);
    }

    function testCanClaimBounty() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        (bool canClaim, string memory reason) = vault.canClaimBounty(user, SKILL_TAG);
        assertTrue(canClaim);
        assertEq(reason, "");
    }

    function testCanClaimBountyReturnsFalseIfAlreadyClaimed() public {
        // Setup and claim
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        vm.startPrank(user);
        skillProfile.createProfile("Alice", bytes32(0));
        skillProfile.addSkill(SKILL_TAG, 80, "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX");
        uint256 claimId = skillClaim.createClaim(SKILL_TAG, "https://github.com/alice/solidity-project", "", 0);
        vm.stopPrank();

        vm.startPrank(agent);
        bytes32 messageHash = keccak256(abi.encodePacked(claimId, true));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(4, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        agentOracle.verifyClaim(claimId, true, signature);
        vm.stopPrank();

        vm.startPrank(admin);
        skillClaim.approveClaim(claimId, "Verified");
        vm.stopPrank();

        vm.startPrank(user);
        vault.claimBounty(claimId, SKILL_TAG);
        vm.stopPrank();

        (bool canClaim, string memory reason) = vault.canClaimBounty(user, SKILL_TAG);
        assertFalse(canClaim);
        assertEq(reason, "Already claimed");
    }

    function testEmergencyWithdraw() public {
        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        address recipient = address(5);
        uint256 recipientBalanceBefore = usdc.balanceOf(recipient);

        vm.startPrank(admin);
        vault.emergencyWithdraw(recipient);
        vm.stopPrank();

        uint256 recipientBalanceAfter = usdc.balanceOf(recipient);
        assertEq(recipientBalanceAfter - recipientBalanceBefore, 1000 * 10 ** 6);
    }

    function testPauseAndUnpause() public {
        vm.startPrank(admin);
        vault.pause();

        vm.stopPrank();

        vm.startPrank(employer);
        usdc.approve(address(vault), 1000 * 10 ** 6);
        vm.expectRevert();
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();

        vm.startPrank(admin);
        vault.unpause();
        vm.stopPrank();

        vm.startPrank(employer);
        vault.depositToPool(SKILL_TAG, 1000 * 10 ** 6);
        vm.stopPrank();
    }

    function testGetPoolCount() public {
        assertEq(vault.getPoolCount(), 0);

        vm.startPrank(employer);
        usdc.approve(address(vault), 2000 * 10 ** 6);
        vault.depositToPool("Solidity", 1000 * 10 ** 6);
        vault.depositToPool("JavaScript", 1000 * 10 ** 6);
        vm.stopPrank();

        assertEq(vault.getPoolCount(), 2);
    }
}
