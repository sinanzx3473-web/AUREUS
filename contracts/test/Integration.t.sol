// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/VerifierRegistry.sol";
import "../src/AgentOracle.sol";

/// @title Integration Tests - Cross-contract interactions
/// @notice Tests complete workflows across multiple contracts
contract IntegrationTest is Test {
    SkillProfile public skillProfile;
    SkillClaim public skillClaim;
    Endorsement public endorsement;
    VerifierRegistry public registry;
    AgentOracle public agentOracle;
    
    address admin = address(1);
    address verifier1 = address(2);
    address verifier2 = address(3);
    address user1 = address(4);
    address user2 = address(5);
    address user3 = address(6);

    function setUp() public {
        // Deploy all contracts
        skillProfile = new SkillProfile(admin);
        agentOracle = new AgentOracle(admin);
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        endorsement = new Endorsement(admin);
        registry = new VerifierRegistry(admin);

        // Setup verifiers
        vm.startPrank(admin);
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), verifier1);
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), verifier2);
        // Grant SkillClaim contract VERIFIER_ROLE in SkillProfile so it can verify skills
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), address(skillClaim));
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier1);
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier2);
        
        // Register verifiers in registry
        string[] memory specializations = new string[](2);
        specializations[0] = "Blockchain";
        specializations[1] = "Smart Contracts";
        
        registry.registerVerifier(verifier1, "Alice Verifier", "TechCorp", specializations, "ipfs://v1");
        registry.registerVerifier(verifier2, "Bob Verifier", "DevCorp", specializations, "ipfs://v2");
        vm.stopPrank();

        // Fund test addresses
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
        vm.deal(user3, 1 ether);
    }

    // ============ Complete User Journey Tests ============

    /// @notice Test complete workflow: Profile → Skill → Claim → Verification → Endorsement
    function testCompleteUserJourney() public {
        // Step 1: User1 creates profile
        vm.prank(user1);
        skillProfile.createProfile("Alice Developer", bytes32("ipfs://profile1"));

        // Step 2: User1 adds skills to profile
        vm.startPrank(user1);
        skillProfile.addSkill("Solidity", 85, "ipfs://skill1");
        skillProfile.addSkill("Rust", 75, "ipfs://skill2");
        skillProfile.addExperience("TechCorp", "Senior Developer", 1640000000, 1672000000, "ipfs://exp1");
        skillProfile.addEducation("MIT", "Computer Science", "BS", 1640000000, "ipfs://edu1");
        vm.stopPrank();

        // Step 3: User1 creates verification claim
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        // Step 4: Admin assigns claim to verifier
        vm.prank(admin);
        skillClaim.assignClaim(claimId, verifier1);

        // Step 5: Verifier approves claim (this also verifies the skill in SkillProfile)
        vm.prank(verifier1);
        skillClaim.approveClaim(claimId, "Verified credentials and experience");

        // Step 6: Record verification in registry
        vm.prank(admin);
        registry.recordVerification(verifier1, true, false);

        // Step 7: Skill is already verified by approveClaim, no need to verify again

        // Step 8: User2 creates profile and endorses User1
        vm.prank(user2);
        skillProfile.createProfile("Bob Developer", bytes32("ipfs://profile2"));

        vm.prank(user2);
        endorsement.createEndorsement(user1, "Solidity", "Excellent Solidity developer");

        vm.prank(user2);
        endorsement.createReference(user1, "Former Colleague", "Great team player", "ipfs://ref1");

        // Verify final state
        (SkillProfile.Skill[] memory skills, uint256 skillTotal) = skillProfile.getSkills(user1, 0, 10);
        assertEq(skills.length, 2, "Should have 2 skills");
        assertEq(skillTotal, 2, "Total should be 2");
        assertTrue(skills[0].verified, "First skill should be verified");

        SkillClaim.Claim memory claim = skillClaim.getClaim(claimId);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Approved, "Claim should be approved");

        (uint256[] memory endorsements, uint256 endorsementTotal) = endorsement.getReceivedEndorsements(user1, 0, 10);
        assertEq(endorsements.length, 1, "Should have 1 endorsement");
        assertEq(endorsementTotal, 1, "Total should be 1");

        (uint256 total, uint256 approved,,) = registry.getVerifierStats(verifier1);
        assertEq(total, 1, "Verifier should have 1 verification");
        assertEq(approved, 1, "Verifier should have 1 approved");
    }

    /// @notice Test multi-user interaction workflow
    function testMultiUserInteraction() public {
        // Create profiles for all users
        vm.prank(user1);
        skillProfile.createProfile("User1", bytes32("ipfs://1"));
        
        vm.prank(user2);
        skillProfile.createProfile("User2", bytes32("ipfs://2"));
        
        vm.prank(user3);
        skillProfile.createProfile("User3", bytes32("ipfs://3"));

        // Users add skills
        vm.prank(user1);
        skillProfile.addSkill("Solidity", 90, "ipfs://skill1");
        
        vm.prank(user2);
        skillProfile.addSkill("Rust", 85, "ipfs://skill2");
        
        vm.prank(user3);
        skillProfile.addSkill("JavaScript", 80, "ipfs://skill3");

        // Cross-endorsements
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Rust", "Great Rust developer");
        
        vm.prank(user2);
        endorsement.createEndorsement(user3, "JavaScript", "Excellent JS skills");
        
        vm.prank(user3);
        endorsement.createEndorsement(user1, "Solidity", "Top Solidity expert");

        // Verify endorsements
        (uint256[] memory received1, uint256 total1) = endorsement.getReceivedEndorsements(user1, 0, 10);
        assertEq(received1.length, 1);
        assertEq(total1, 1);
        
        (uint256[] memory received2, uint256 total2) = endorsement.getReceivedEndorsements(user2, 0, 10);
        assertEq(received2.length, 1);
        assertEq(total2, 1);
        
        (uint256[] memory received3, uint256 total3) = endorsement.getReceivedEndorsements(user3, 0, 10);
        assertEq(received3.length, 1);
        assertEq(total3, 1);
        
        (uint256[] memory given1, uint256 givenTotal1) = endorsement.getGivenEndorsements(user1, 0, 10);
        assertEq(given1.length, 1);
        assertEq(givenTotal1, 1);
        
        (uint256[] memory given2, uint256 givenTotal2) = endorsement.getGivenEndorsements(user2, 0, 10);
        assertEq(given2.length, 1);
        assertEq(givenTotal2, 1);
        
        (uint256[] memory given3, uint256 givenTotal3) = endorsement.getGivenEndorsements(user3, 0, 10);
        assertEq(given3.length, 1);
        assertEq(givenTotal3, 1);
    }

    /// @notice Test claim dispute workflow
    function testClaimDisputeWorkflow() public {
        // User creates profile and claim
        vm.prank(user1);
        skillProfile.createProfile("Alice", bytes32("ipfs://profile1"));

        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Blockchain Expert", "10 years", "ipfs://evidence1", 0);

        // Assign to verifier
        vm.prank(admin);
        skillClaim.assignClaim(claimId, verifier1);

        // Verifier rejects
        vm.prank(verifier1);
        skillClaim.rejectClaim(claimId, "Insufficient evidence");

        // Record rejection in registry
        vm.prank(admin);
        registry.recordVerification(verifier1, false, false);

        // User disputes
        vm.prank(user1);
        skillClaim.disputeClaim(claimId, "Evidence is comprehensive");

        // Record dispute in registry
        vm.prank(admin);
        registry.recordVerification(verifier1, false, true);

        // Verify states
        SkillClaim.Claim memory claim = skillClaim.getClaim(claimId);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Disputed);

        (uint256 total,, uint256 rejected, uint256 disputed) = registry.getVerifierStats(verifier1);
        assertEq(total, 2);
        assertEq(rejected, 1);
        assertEq(disputed, 1);
    }

    /// @notice Test verifier reputation impact
    function testVerifierReputationTracking() public {
        // Create profile and add skills first
        vm.startPrank(user1);
        skillProfile.createProfile("User1", bytes32("ipfs://1"));
        skillProfile.addSkill("Skill1", 80, "ipfs://s1");
        skillProfile.addSkill("Skill2", 80, "ipfs://s2");
        skillProfile.addSkill("Skill3", 80, "ipfs://s3");
        skillProfile.addSkill("Skill4", 80, "ipfs://s4");
        vm.stopPrank();

        // Create multiple claims
        vm.startPrank(user1);
        uint256 claim1 = skillClaim.createClaim("Skill1", "Desc", "ipfs://e1", 0);
        uint256 claim2 = skillClaim.createClaim("Skill2", "Desc", "ipfs://e2", 1);
        uint256 claim3 = skillClaim.createClaim("Skill3", "Desc", "ipfs://e3", 2);
        uint256 claim4 = skillClaim.createClaim("Skill4", "Desc", "ipfs://e4", 3);
        vm.stopPrank();

        // Assign all to verifier1
        vm.startPrank(admin);
        skillClaim.assignClaim(claim1, verifier1);
        skillClaim.assignClaim(claim2, verifier1);
        skillClaim.assignClaim(claim3, verifier1);
        skillClaim.assignClaim(claim4, verifier1);
        vm.stopPrank();

        // Verifier processes claims with different outcomes
        vm.startPrank(verifier1);
        skillClaim.approveClaim(claim1, "Good");
        skillClaim.approveClaim(claim2, "Good");
        skillClaim.rejectClaim(claim3, "Bad");
        skillClaim.approveClaim(claim4, "Good");
        vm.stopPrank();

        // Record in registry
        vm.startPrank(admin);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, false, false);
        registry.recordVerification(verifier1, true, false);
        vm.stopPrank();

        // Check reputation
        (uint256 total, uint256 approved, uint256 rejected,) = registry.getVerifierStats(verifier1);
        assertEq(total, 4);
        assertEq(approved, 3);
        assertEq(rejected, 1);

        uint256 approvalRate = registry.getApprovalRate(verifier1);
        assertEq(approvalRate, 7500); // 75%
    }

    /// @notice Test profile with verified skills and endorsements
    function testProfileWithVerifiedSkillsAndEndorsements() public {
        // User1 creates comprehensive profile
        vm.startPrank(user1);
        skillProfile.createProfile("Alice Expert", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity", 95, "ipfs://skill1");
        skillProfile.addSkill("Rust", 85, "ipfs://skill2");
        skillProfile.addSkill("JavaScript", 90, "ipfs://skill3");
        vm.stopPrank();

        // Verify skills
        vm.startPrank(verifier1);
        skillProfile.verifySkill(user1, 0);
        skillProfile.verifySkill(user1, 1);
        vm.stopPrank();

        // Multiple users endorse
        vm.prank(user2);
        skillProfile.createProfile("User2", bytes32("ipfs://2"));
        
        vm.prank(user3);
        skillProfile.createProfile("User3", bytes32("ipfs://3"));

        vm.prank(user2);
        endorsement.createEndorsement(user1, "Solidity", "Best Solidity dev");
        
        vm.prank(user3);
        endorsement.createEndorsement(user1, "Solidity", "Amazing skills");
        
        vm.prank(user2);
        endorsement.createEndorsement(user1, "Rust", "Great Rust knowledge");

        // Verify final profile state
        (SkillProfile.Skill[] memory skills, uint256 skillTotal) = skillProfile.getSkills(user1, 0, 10);
        assertEq(skills.length, 3);
        assertEq(skillTotal, 3, "Total should be 3");
        assertTrue(skills[0].verified);
        assertTrue(skills[1].verified);
        assertFalse(skills[2].verified);

        (uint256[] memory endorsements, uint256 endorsementTotal) = endorsement.getReceivedEndorsements(user1, 0, 10);
        assertEq(endorsements.length, 3);
        assertEq(endorsementTotal, 3);
    }

    /// @notice Test verifier suspension impact
    function testVerifierSuspensionImpact() public {
        // Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User1", bytes32("ipfs://1"));
        skillProfile.addSkill("Skill", 80, "ipfs://skill1");
        vm.stopPrank();
        
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Skill", "Desc", "ipfs://evidence", 0);

        vm.prank(admin);
        skillClaim.assignClaim(claimId, verifier1);

        // Suspend verifier
        vm.prank(admin);
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Suspended);

        // Verifier can still process assigned claims (business logic decision)
        vm.prank(verifier1);
        skillClaim.approveClaim(claimId, "Approved before suspension");

        // Verify verifier is suspended
        VerifierRegistry.Verifier memory v = registry.getVerifier(verifier1);
        assertTrue(v.status == VerifierRegistry.VerifierStatus.Suspended);
        assertEq(registry.activeVerifierCount(), 1); // Only verifier2 is active
    }

    /// @notice Test batch operations across contracts
    function testBatchOperations() public {
        // Create multiple profiles
        for (uint160 i = 0; i < 5; i++) {
            address user = address(1000 + i);
            vm.prank(user);
            skillProfile.createProfile("User", bytes32("ipfs://profile"));
        }

        assertEq(skillProfile.totalProfiles(), 5);

        // Create multiple claims
        vm.startPrank(user1);
        for (uint8 i = 0; i < 5; i++) {
            skillClaim.createClaim("Skill", "Desc", "ipfs://evidence", 0);
        }
        vm.stopPrank();

        assertEq(skillClaim.totalClaims(), 5);

        // Create multiple endorsements
        vm.startPrank(user2);
        for (uint160 i = 0; i < 5; i++) {
            address endorsee = address(1000 + i);
            endorsement.createEndorsement(endorsee, "Skill", "Great");
        }
        vm.stopPrank();

        assertEq(endorsement.totalEndorsements(), 5);
    }

    /// @notice Test pause functionality across all contracts
    function testSystemWidePause() public {
        vm.startPrank(admin);
        skillProfile.pause();
        skillClaim.pause();
        endorsement.pause();
        registry.pause();
        vm.stopPrank();

        // All operations should be blocked
        vm.prank(user1);
        vm.expectRevert();
        skillProfile.createProfile("User", bytes32("ipfs://1"));

        vm.prank(user1);
        vm.expectRevert();
        skillClaim.createClaim("Skill", "Desc", "ipfs://evidence", 0);

        vm.prank(user1);
        vm.expectRevert();
        endorsement.createEndorsement(user2, "Skill", "Great");

        string[] memory specs = new string[](1);
        specs[0] = "Blockchain";
        
        vm.prank(admin);
        vm.expectRevert();
        registry.registerVerifier(user1, "Name", "Org", specs, "ipfs://1");
    }

    /// @notice Test evidence update and re-verification workflow
    function testEvidenceUpdateWorkflow() public {
        vm.startPrank(user1);
        skillProfile.createProfile("User1", bytes32("ipfs://1"));
        skillProfile.addSkill("Skill", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Skill", "Initial desc", "ipfs://evidence1", 0);

        // Update evidence before assignment
        vm.prank(user1);
        skillClaim.updateEvidence(claimId, "ipfs://evidence2");

        SkillClaim.Claim memory claim = skillClaim.getClaim(claimId);
        assertEq(claim.evidenceIpfsHash, "ipfs://evidence2");

        // Assign and approve
        vm.prank(admin);
        skillClaim.assignClaim(claimId, verifier1);

        vm.prank(verifier1);
        skillClaim.approveClaim(claimId, "Good evidence");

        // Cannot update after approval
        vm.prank(user1);
        vm.expectRevert("Can only update pending claims");
        skillClaim.updateEvidence(claimId, "ipfs://evidence3");
    }

    /// @notice Test reference and endorsement combination
    function testReferenceAndEndorsementCombination() public {
        vm.prank(user1);
        skillProfile.createProfile("User1", bytes32("ipfs://1"));
        
        vm.prank(user2);
        skillProfile.createProfile("User2", bytes32("ipfs://2"));

        // User2 gives both endorsement and reference to User1
        vm.startPrank(user2);
        endorsement.createEndorsement(user1, "Solidity", "Excellent developer");
        endorsement.createReference(user1, "Former Manager", "Outstanding performance", "ipfs://ref1");
        vm.stopPrank();

        (uint256[] memory endorsements, uint256 endorsementTotal) = endorsement.getReceivedEndorsements(user1, 0, 10);
        (uint256[] memory references, uint256 referenceTotal) = endorsement.getReceivedReferences(user1, 0, 10);

        assertEq(endorsements.length, 1);
        assertEq(endorsementTotal, 1);
        assertEq(references.length, 1);
        assertEq(referenceTotal, 1);

        // User2 cannot give another reference to User1
        vm.prank(user2);
        vm.expectRevert("Already gave reference");
        endorsement.createReference(user1, "Colleague", "Great", "ipfs://ref2");

        // But can endorse different skills
        vm.prank(user2);
        endorsement.createEndorsement(user1, "Rust", "Also great at Rust");

        (endorsements, endorsementTotal) = endorsement.getReceivedEndorsements(user1, 0, 10);
        assertEq(endorsements.length, 2);
        assertEq(endorsementTotal, 2);
    }
}
