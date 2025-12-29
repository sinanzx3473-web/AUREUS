// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/AgentOracle.sol";
import "../src/BountyVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Mock USDC Token for Testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC with 6 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title Aureus Flow Integration Test
/// @notice Comprehensive test simulating complete user journey:
/// Profile Creation → GitHub Submission → AI Agent Verification → NFT Tier Upgrade → Bounty Claim
contract AureusFlowTest is Test {
    SkillProfile public skillProfile;
    SkillClaim public skillClaim;
    AgentOracle public agentOracle;
    BountyVault public bountyVault;
    MockUSDC public usdc;
    
    address admin = address(1);
    address aiAgent = address(2);
    address employer = address(3);
    address user = address(4);
    
    // AI agent private key for signing (test key only)
    uint256 aiAgentPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    
    event ProfileCreated(address indexed user, string name);
    event ClaimCreated(uint256 indexed claimId, address indexed claimant, string skillName);
    event ClaimApproved(uint256 indexed claimId, address indexed verifier, string feedback);
    event SkillVerified(address indexed user, uint256 indexed skillIndex, address indexed verifier);
    event TierUpgraded(address indexed user, SkillProfile.NFTTier newTier);
    event BountyClaimed(address indexed claimant, string skillName, uint256 amount, uint256 claimId);
    event PoolCreated(string skillName, uint256 monthlyBounty);
    event Deposited(string skillName, uint256 amount);

    function setUp() public {
        // Deploy contracts
        vm.startPrank(admin);
        
        skillProfile = new SkillProfile(admin);
        agentOracle = new AgentOracle(admin);
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        usdc = new MockUSDC();
        bountyVault = new BountyVault(admin, address(skillClaim), address(usdc));
        
        // Grant necessary roles
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), address(skillClaim));
        agentOracle.grantRole(agentOracle.AGENT_ROLE(), aiAgent);
        
        // Setup employer with USDC and bounty pool
        usdc.mint(employer, 100000 * 10**6); // 100k USDC
        
        vm.stopPrank();
        
        // Fund test addresses
        vm.deal(user, 1 ether);
        vm.deal(employer, 1 ether);
    }

    /// @notice Test complete Aureus Flow: Profile → GitHub → AI Verify → Gold NFT → Claim Bounty
    function testCompleteAureusFlow() public {
        // ============ STEP 1: User Creates Profile ============
        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit ProfileCreated(user, "Alice Developer");
        skillProfile.createProfile("Alice Developer", bytes32("ipfs://profile-alice"));
        
        // Verify profile created
        (string memory name, , , , SkillProfile.NFTTier tier, ) = skillProfile.getProfile(user);
        assertEq(name, "Alice Developer");
        assertEq(uint256(tier), uint256(SkillProfile.NFTTier.Bronze));
        
        // ============ STEP 2: User Submits GitHub Skill Claim ============
        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit ClaimCreated(0, user, "Solidity Development");
        uint256 claimId = skillClaim.createClaim(
            "Solidity Development",
            "5 years of smart contract development experience",
            "https://github.com/alice/solidity-projects",
            0 // GitHub evidence type
        );
        
        // Verify claim created
        (
            address claimant,
            string memory skillName,
            string memory description,
            string memory evidenceUrl,
            ,
            SkillClaim.ClaimStatus status,
            ,
            ,
            
        ) = skillClaim.getClaim(claimId);
        
        assertEq(claimant, user);
        assertEq(skillName, "Solidity Development");
        assertEq(description, "5 years of smart contract development experience");
        assertEq(evidenceUrl, "https://github.com/alice/solidity-projects");
        assertEq(uint256(status), uint256(SkillClaim.ClaimStatus.Pending));
        
        // ============ STEP 3: AI Agent Verifies GitHub Submission ============
        // Prepare verification data
        bytes32 claimHash = keccak256(abi.encodePacked(claimId, user, "Solidity Development"));
        
        // Sign with AI agent private key
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", claimHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aiAgentPrivateKey, messageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // AI agent verifies via AgentOracle
        vm.prank(aiAgent);
        agentOracle.verifySkillClaim(claimId, user, "Solidity Development", true, signature);
        
        // Admin approves claim (which triggers skill verification in SkillProfile)
        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit ClaimApproved(claimId, admin, "AI agent verified GitHub contributions");
        skillClaim.approveClaim(claimId, "AI agent verified GitHub contributions");
        
        // Verify claim approved
        (, , , , , status, , , ) = skillClaim.getClaim(claimId);
        assertEq(uint256(status), uint256(SkillClaim.ClaimStatus.Approved));
        
        // Verify skill added to profile
        uint256 skillCount = skillProfile.getSkillCount(user);
        assertEq(skillCount, 1);
        
        // ============ STEP 4: User Upgrades to Gold NFT Tier ============
        // Add more skills and experience to qualify for Gold tier
        vm.startPrank(user);
        skillProfile.addSkill("Rust Programming", 80, "ipfs://skill-rust");
        skillProfile.addSkill("TypeScript", 85, "ipfs://skill-ts");
        skillProfile.addExperience("TechCorp", "Senior Blockchain Developer", 1640000000, 1672000000, "ipfs://exp1");
        skillProfile.addExperience("DevCorp", "Lead Engineer", 1672000000, uint64(block.timestamp), "ipfs://exp2");
        skillProfile.addEducation("MIT", "Computer Science", "MS", 1640000000, "ipfs://edu1");
        vm.stopPrank();
        
        // Upgrade to Gold tier
        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit TierUpgraded(user, SkillProfile.NFTTier.Gold);
        skillProfile.upgradeTier(SkillProfile.NFTTier.Gold);
        
        // Verify tier upgraded
        (, , , , tier, ) = skillProfile.getProfile(user);
        assertEq(uint256(tier), uint256(SkillProfile.NFTTier.Gold));
        
        // ============ STEP 5: Employer Creates Bounty Pool ============
        vm.startPrank(employer);
        
        // Approve USDC for BountyVault
        usdc.approve(address(bountyVault), 50000 * 10**6);
        
        // Create bounty pool for Solidity Development
        vm.expectEmit(false, false, false, true);
        emit PoolCreated("Solidity Development", 1000 * 10**6);
        bountyVault.createPool("Solidity Development", 1000 * 10**6); // 1000 USDC monthly bounty
        
        // Deposit funds into pool
        vm.expectEmit(false, false, false, true);
        emit Deposited("Solidity Development", 12000 * 10**6);
        bountyVault.deposit("Solidity Development", 12000 * 10**6); // 12k USDC (12 months)
        
        vm.stopPrank();
        
        // Verify pool created and funded
        (uint256 monthlyBounty, uint256 totalDeposited, , bool isActive) = bountyVault.pools("Solidity Development");
        assertEq(monthlyBounty, 1000 * 10**6);
        assertEq(totalDeposited, 12000 * 10**6);
        assertTrue(isActive);
        
        // ============ STEP 6: User Claims Bounty ============
        uint256 userBalanceBefore = usdc.balanceOf(user);
        
        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit BountyClaimed(user, "Solidity Development", 1000 * 10**6, claimId);
        bountyVault.claimBounty("Solidity Development", claimId);
        
        // Verify bounty claimed
        uint256 userBalanceAfter = usdc.balanceOf(user);
        assertEq(userBalanceAfter - userBalanceBefore, 1000 * 10**6); // Received 1000 USDC
        
        // Verify pool balance decreased
        (, totalDeposited, , ) = bountyVault.pools("Solidity Development");
        assertEq(totalDeposited, 11000 * 10**6); // 12k - 1k = 11k remaining
        
        // Verify user cannot claim again immediately (30-day cooldown)
        vm.prank(user);
        vm.expectRevert("Cooldown period not elapsed");
        bountyVault.claimBounty("Solidity Development", claimId);
        
        // ============ STEP 7: Verify Cooldown Period ============
        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);
        
        // User can claim again after cooldown
        userBalanceBefore = usdc.balanceOf(user);
        
        vm.prank(user);
        bountyVault.claimBounty("Solidity Development", claimId);
        
        userBalanceAfter = usdc.balanceOf(user);
        assertEq(userBalanceAfter - userBalanceBefore, 1000 * 10**6); // Received another 1000 USDC
        
        // Verify pool balance decreased again
        (, totalDeposited, , ) = bountyVault.pools("Solidity Development");
        assertEq(totalDeposited, 10000 * 10**6); // 11k - 1k = 10k remaining
    }

    /// @notice Test bounty claim fails without verified skill
    function testBountyClaimFailsWithoutVerification() public {
        // Setup pool
        vm.startPrank(employer);
        usdc.approve(address(bountyVault), 10000 * 10**6);
        bountyVault.createPool("Rust Programming", 500 * 10**6);
        bountyVault.deposit("Rust Programming", 5000 * 10**6);
        vm.stopPrank();
        
        // User creates profile but doesn't verify skill
        vm.prank(user);
        skillProfile.createProfile("Bob Developer", bytes32("ipfs://profile-bob"));
        
        // User tries to claim without verification
        vm.prank(user);
        vm.expectRevert("Skill claim not verified");
        bountyVault.claimBounty("Rust Programming", 999); // Non-existent claim ID
    }

    /// @notice Test multiple users claiming from same pool
    function testMultipleUsersBountyClaims() public {
        address user2 = address(5);
        vm.deal(user2, 1 ether);
        
        // Setup pool
        vm.startPrank(employer);
        usdc.approve(address(bountyVault), 20000 * 10**6);
        bountyVault.createPool("TypeScript", 800 * 10**6);
        bountyVault.deposit("TypeScript", 20000 * 10**6);
        vm.stopPrank();
        
        // User 1 creates profile and claim
        vm.prank(user);
        skillProfile.createProfile("Alice", bytes32("ipfs://alice"));
        
        vm.prank(user);
        uint256 claim1 = skillClaim.createClaim("TypeScript", "Expert", "github.com/alice", 0);
        
        vm.prank(admin);
        skillClaim.approveClaim(claim1, "Verified");
        
        // User 2 creates profile and claim
        vm.prank(user2);
        skillProfile.createProfile("Bob", bytes32("ipfs://bob"));
        
        vm.prank(user2);
        uint256 claim2 = skillClaim.createClaim("TypeScript", "Expert", "github.com/bob", 0);
        
        vm.prank(admin);
        skillClaim.approveClaim(claim2, "Verified");
        
        // Both users claim bounty
        vm.prank(user);
        bountyVault.claimBounty("TypeScript", claim1);
        
        vm.prank(user2);
        bountyVault.claimBounty("TypeScript", claim2);
        
        // Verify both received bounty
        assertEq(usdc.balanceOf(user), 800 * 10**6);
        assertEq(usdc.balanceOf(user2), 800 * 10**6);
        
        // Verify pool balance
        (, uint256 totalDeposited, , ) = bountyVault.pools("TypeScript");
        assertEq(totalDeposited, 18400 * 10**6); // 20k - 800 - 800 = 18.4k
    }

    /// @notice Test pool deactivation prevents claims
    function testDeactivatedPoolPreventsClaims() public {
        // Setup pool
        vm.startPrank(employer);
        usdc.approve(address(bountyVault), 5000 * 10**6);
        bountyVault.createPool("Python", 500 * 10**6);
        bountyVault.deposit("Python", 5000 * 10**6);
        vm.stopPrank();
        
        // User creates verified claim
        vm.prank(user);
        skillProfile.createProfile("Charlie", bytes32("ipfs://charlie"));
        
        vm.prank(user);
        uint256 claimId = skillClaim.createClaim("Python", "Expert", "github.com/charlie", 0);
        
        vm.prank(admin);
        skillClaim.approveClaim(claimId, "Verified");
        
        // Admin deactivates pool
        vm.prank(admin);
        bountyVault.deactivatePool("Python");
        
        // User cannot claim from deactivated pool
        vm.prank(user);
        vm.expectRevert("Pool not active");
        bountyVault.claimBounty("Python", claimId);
    }

    /// @notice Test insufficient pool funds prevents claim
    function testInsufficientPoolFunds() public {
        // Setup pool with minimal funds
        vm.startPrank(employer);
        usdc.approve(address(bountyVault), 1000 * 10**6);
        bountyVault.createPool("Java", 1000 * 10**6);
        bountyVault.deposit("Java", 500 * 10**6); // Only 500 USDC, but monthly bounty is 1000
        vm.stopPrank();
        
        // User creates verified claim
        vm.prank(user);
        skillProfile.createProfile("Dave", bytes32("ipfs://dave"));
        
        vm.prank(user);
        uint256 claimId = skillClaim.createClaim("Java", "Expert", "github.com/dave", 0);
        
        vm.prank(admin);
        skillClaim.approveClaim(claimId, "Verified");
        
        // User cannot claim due to insufficient funds
        vm.prank(user);
        vm.expectRevert("Insufficient pool balance");
        bountyVault.claimBounty("Java", claimId);
    }
}
