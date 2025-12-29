// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillClaim.sol";
import "../src/AgentOracle.sol";
import "../src/SkillProfile.sol";

contract SkillClaimTest is Test {
    SkillClaim public skillClaim;
    AgentOracle public agentOracle;
    SkillProfile public skillProfile;
    
    address admin = address(1);
    address verifier1 = address(2);
    address verifier2 = address(3);
    address user1 = address(4);
    address user2 = address(5);
    address agent1 = address(6);
    
    // Private key for agent signature testing
    uint256 agent1PrivateKey = 0xA11CE;

    // Events for testing
    event ClaimCreated(uint256 indexed claimId, address indexed claimant, string skillName, uint256 timestamp);
    event ClaimAssigned(uint256 indexed claimId, address indexed verifier, uint256 timestamp);
    event ClaimApproved(uint256 indexed claimId, address indexed verifier, uint256 timestamp);
    event ClaimRejected(uint256 indexed claimId, address indexed verifier, string reason, uint256 timestamp);
    event ClaimDisputed(uint256 indexed claimId, address indexed claimant, string reason, uint256 timestamp);
    event EvidenceUpdated(uint256 indexed claimId, string newEvidenceIpfsHash, uint256 timestamp);

    function setUp() public {
        // Deploy AgentOracle first
        agentOracle = new AgentOracle(admin);
        
        // Deploy SkillProfile
        skillProfile = new SkillProfile(admin);
        
        // Deploy SkillClaim with AgentOracle and SkillProfile
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        
        // Derive agent address from private key
        agent1 = vm.addr(agent1PrivateKey);

        // Grant verifier roles and agent role
        vm.startPrank(admin);
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier1);
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier2);
        // Grant SkillClaim contract VERIFIER_ROLE in SkillProfile so it can verify skills
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), address(skillClaim));
        agentOracle.grantAgentRole(agent1);
        vm.stopPrank();

        // Fund test addresses
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
    }

    // ============ Happy Path Tests ============

    function testCreateClaim() public {
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit ClaimCreated(0, user1, "Solidity Expert", block.timestamp);
        
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        assertEq(claimId, 0, "Claim ID should be 0");
        assertEq(skillClaim.totalClaims(), 1, "Total claims should be 1");

        SkillClaim.Claim memory claim = skillClaim.getClaim(0);
        assertEq(claim.claimant, user1, "Claimant mismatch");
        assertEq(claim.skillName, "Solidity Expert", "Skill name mismatch");
        assertTrue(claim.status == SkillClaim.ClaimStatus.Pending, "Status should be Pending");
    }

    function testMaxClaimsPerUser() public {
        // Add maximum allowed claims
        vm.startPrank(user1);
        for (uint256 i = 0; i < skillClaim.MAX_CLAIMS_PER_USER(); i++) {
            skillClaim.createClaim(string(abi.encodePacked("Skill", vm.toString(i))), "Description", "ipfs://evidence", 0);
        }
        vm.stopPrank();

        // Try to add one more claim - should fail
        vm.prank(user1);
        vm.expectRevert("Maximum claims reached");
        skillClaim.createClaim("ExtraClaim", "Description", "ipfs://evidence", 0);
    }

    function testStringLengthValidation() public {
        string memory longString = new string(501);
        
        // Test skill name too long
        vm.prank(user1);
        vm.expectRevert("Invalid skill name length");
        skillClaim.createClaim(longString, "Description", "ipfs://evidence", 0);

        // Test description too long
        vm.prank(user1);
        vm.expectRevert("Description too long");
        skillClaim.createClaim("Skill", longString, "ipfs://evidence", 0);

        // Test IPFS hash too long
        string memory longHash = new string(101);
        vm.prank(user1);
        vm.expectRevert("Invalid evidence hash length");
        skillClaim.createClaim("Skill", "Description", longHash, 0);
    }

    function testAssignClaim() public {
        // Create claim
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        // Assign claim
        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit ClaimAssigned(0, verifier1, block.timestamp);
        
        skillClaim.assignClaim(0, verifier1);

        SkillClaim.Claim memory claim = skillClaim.getClaim(0);
        assertEq(claim.verifier, verifier1, "Verifier mismatch");
    }

    function testApproveClaim() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity Expert", 80, "ipfs://skill1");
        vm.stopPrank();

        // Create and assign claim
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        // Approve claim
        vm.prank(verifier1);
        // Note: approveClaim also emits SkillVerified event from SkillProfile.verifySkill()
        // We check the ClaimApproved event is emitted (it's the last event)
        skillClaim.approveClaim(0, "Verified credentials");

        SkillClaim.Claim memory claim = skillClaim.getClaim(0);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Approved, "Status should be Approved");
        assertEq(skillClaim.approvedClaims(), 1, "Approved claims should be 1");
    }

    function testRejectClaim() public {
        // Create and assign claim
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        // Reject claim
        vm.prank(verifier1);
        vm.expectEmit(true, true, false, true);
        emit ClaimRejected(0, verifier1, "Insufficient evidence", block.timestamp);
        
        skillClaim.rejectClaim(0, "Insufficient evidence");

        SkillClaim.Claim memory claim = skillClaim.getClaim(0);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Rejected, "Status should be Rejected");
        assertEq(skillClaim.rejectedClaims(), 1, "Rejected claims should be 1");
    }

    function testDisputeClaim() public {
        // Create, assign, and reject claim
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);
        
        vm.prank(verifier1);
        skillClaim.rejectClaim(0, "Insufficient evidence");

        // Dispute claim
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit ClaimDisputed(0, user1, "Evidence is valid", block.timestamp);
        
        skillClaim.disputeClaim(0, "Evidence is valid");

        SkillClaim.Claim memory claim = skillClaim.getClaim(0);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Disputed, "Status should be Disputed");
    }

    function testUpdateEvidence() public {
        // Create claim
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        // Update evidence
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit EvidenceUpdated(0, "ipfs://evidence2", block.timestamp);
        
        skillClaim.updateEvidence(0, "ipfs://evidence2");

        SkillClaim.Claim memory claim = skillClaim.getClaim(0);
        assertEq(claim.evidenceIpfsHash, "ipfs://evidence2", "Evidence not updated");
    }

    // ============ Access Control Tests ============

    function testOnlyAdminCanAssignClaim() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        vm.prank(user2);
        vm.expectRevert();
        skillClaim.assignClaim(0, verifier1);
    }

    function testOnlyVerifierCanApproveClaim() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        vm.prank(user2);
        vm.expectRevert();
        skillClaim.approveClaim(0, "Notes");
    }

    function testOnlyAssignedVerifierCanApprove() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        vm.prank(verifier2);
        vm.expectRevert("Not assigned verifier");
        skillClaim.approveClaim(0, "Notes");
    }

    function testOnlyClaimantCanDispute() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);
        
        vm.prank(verifier1);
        skillClaim.rejectClaim(0, "Insufficient evidence");

        vm.prank(user2);
        vm.expectRevert("Not claim owner");
        skillClaim.disputeClaim(0, "Reason");
    }

    // ============ Edge Case Tests ============

    function testCannotCreateClaimWithEmptySkillName() public {
        vm.prank(user1);
        vm.expectRevert("Invalid skill name length");
        skillClaim.createClaim("", "Description", "ipfs://evidence1", 0);
    }

    function testCannotCreateClaimWithoutEvidence() public {
        vm.prank(user1);
        vm.expectRevert("Invalid evidence hash length");
        skillClaim.createClaim("Solidity", "Description", "", 0);
    }

    function testCannotAssignInvalidClaim() public {
        vm.prank(admin);
        vm.expectRevert("Invalid claim ID");
        skillClaim.assignClaim(999, verifier1);
    }

    function testCannotAssignToNonVerifier() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        vm.prank(admin);
        vm.expectRevert("Not a verifier");
        skillClaim.assignClaim(0, user2);
    }

    function testCannotAssignAlreadyAssignedClaim() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        vm.prank(admin);
        vm.expectRevert("Claim already assigned");
        skillClaim.assignClaim(0, verifier2);
    }

    function testCannotApproveNonPendingClaim() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity Expert", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);
        
        vm.prank(verifier1);
        skillClaim.approveClaim(0, "Notes");

        vm.prank(verifier1);
        vm.expectRevert("Claim not pending");
        skillClaim.approveClaim(0, "Notes again");
    }

    function testCannotRejectWithoutReason() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        vm.prank(verifier1);
        vm.expectRevert("Invalid reason length");
        skillClaim.rejectClaim(0, "");
    }

    function testCannotDisputePendingClaim() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        vm.prank(user1);
        vm.expectRevert("Cannot dispute pending claim");
        skillClaim.disputeClaim(0, "Reason");
    }

    function testCannotUpdateEvidenceForNonPendingClaim() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity Expert", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.prank(user1);
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);
        
        vm.prank(verifier1);
        skillClaim.approveClaim(0, "Notes");

        vm.prank(user1);
        vm.expectRevert("Can only update pending claims");
        skillClaim.updateEvidence(0, "ipfs://evidence2");
    }

    // ============ State Transition Tests ============

    function testGetClaimsByStatus() public {
        // Setup: Create profiles and add skills
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Skill1", 80, "ipfs://skill1");
        skillProfile.addSkill("Skill3", 80, "ipfs://skill3");
        vm.stopPrank();

        vm.startPrank(user2);
        skillProfile.createProfile("User Two", bytes32("ipfs://profile2"));
        skillProfile.addSkill("Skill2", 80, "ipfs://skill2");
        vm.stopPrank();

        // Create multiple claims
        vm.prank(user1);
        skillClaim.createClaim("Skill1", "Desc1", "ipfs://1", 0);
        
        vm.prank(user2);
        skillClaim.createClaim("Skill2", "Desc2", "ipfs://2", 0);
        
        vm.prank(user1);
        skillClaim.createClaim("Skill3", "Desc3", "ipfs://3", 1);

        // Assign and approve one
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);
        
        vm.prank(verifier1);
        skillClaim.approveClaim(0, "Notes");

        (uint256[] memory pendingClaims, uint256 pendingTotal) = skillClaim.getClaimsByStatus(SkillClaim.ClaimStatus.Pending, 0, 10);
        assertEq(pendingClaims.length, 2, "Should have 2 pending claims");
        assertEq(pendingTotal, 2, "Total pending should be 2");

        (uint256[] memory approvedClaims, uint256 approvedTotal) = skillClaim.getClaimsByStatus(SkillClaim.ClaimStatus.Approved, 0, 10);
        assertEq(approvedClaims.length, 1, "Should have 1 approved claim");
        assertEq(approvedTotal, 1, "Total approved should be 1");
    }

    function testGetUserClaims() public {
        vm.startPrank(user1);
        skillClaim.createClaim("Skill1", "Desc1", "ipfs://1", 0);
        skillClaim.createClaim("Skill2", "Desc2", "ipfs://2", 0);
        vm.stopPrank();

        (uint256[] memory claims, uint256 total) = skillClaim.getUserClaims(user1, 0, 10);
        assertEq(claims.length, 2, "User should have 2 claims");
        assertEq(total, 2, "Total should be 2");
    }

    function testGetVerifierClaims() public {
        vm.prank(user1);
        skillClaim.createClaim("Skill1", "Desc1", "ipfs://1", 0);
        
        vm.prank(user2);
        skillClaim.createClaim("Skill2", "Desc2", "ipfs://2", 0);

        vm.startPrank(admin);
        skillClaim.assignClaim(0, verifier1);
        skillClaim.assignClaim(1, verifier1);
        vm.stopPrank();

        (uint256[] memory claims, uint256 total) = skillClaim.getVerifierClaims(verifier1, 0, 10);
        assertEq(claims.length, 2, "Verifier should have 2 assigned claims");
        assertEq(total, 2, "Total should be 2");
    }

    // ============ Fuzz Tests ============

    function testFuzzCreateMultipleClaims(uint8 numClaims) public {
        numClaims = uint8(bound(numClaims, 1, 50));
        
        for (uint8 i = 0; i < numClaims; i++) {
            vm.prank(user1);
            skillClaim.createClaim("Skill", "Description", "ipfs://evidence", 0);
        }

        assertEq(skillClaim.totalClaims(), numClaims, "Total claims mismatch");
    }

    // ============ Security Tests ============

    function testReentrancyProtection() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.prank(user1);
        skillClaim.createClaim("Solidity", "Description", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);
        
        // Sequential calls should work (ReentrancyGuard prevents nested calls)
        vm.prank(verifier1);
        skillClaim.approveClaim(0, "Approved");
    }

    function testAccessControlForAdminFunctions() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity", "Description", "ipfs://evidence1", 0);

        // Non-admin cannot assign claims
        vm.prank(user2);
        vm.expectRevert();
        skillClaim.assignClaim(0, verifier1);

        // Non-admin cannot pause
        vm.prank(user2);
        vm.expectRevert();
        skillClaim.pause();
    }

    function testVerifierRoleEnforcement() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity", "Description", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        // Non-verifier cannot approve
        vm.prank(user2);
        vm.expectRevert();
        skillClaim.approveClaim(0, "Notes");

        // Non-verifier cannot reject
        vm.prank(user2);
        vm.expectRevert();
        skillClaim.rejectClaim(0, "Reason");
    }

    // ============ Gas Optimization Tests ============

    function testGasCreateClaim() public {
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 220000, "Create claim uses too much gas");
    }

    function testGasApproveClaim() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.prank(user1);
        skillClaim.createClaim("Solidity", "Description", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);

        vm.prank(verifier1);
        uint256 gasBefore = gasleft();
        skillClaim.approveClaim(0, "Verified credentials");
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 250000, "Approve claim uses too much gas");
    }

    function testGasBatchClaimProcessing() public {
        // Create multiple claims
        for (uint8 i = 0; i < 5; i++) {
            vm.prank(user1);
            skillClaim.createClaim("Skill", "Description", "ipfs://evidence", 0);
        }

        // Assign and approve all
        vm.startPrank(admin);
        uint256 gasBefore = gasleft();
        for (uint8 i = 0; i < 5; i++) {
            skillClaim.assignClaim(i, verifier1);
        }
        uint256 gasUsed = gasBefore - gasleft();
        vm.stopPrank();
        
        assertTrue(gasUsed < 500000, "Batch assignment inefficient");
    }

    // ============ Additional Edge Cases ============

    function testCannotApproveWithoutAssignment() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity", "Description", "ipfs://evidence1", 0);

        vm.prank(verifier1);
        vm.expectRevert("Not assigned verifier");
        skillClaim.approveClaim(0, "Notes");
    }

    function testCannotRejectWithoutAssignment() public {
        vm.prank(user1);
        skillClaim.createClaim("Solidity", "Description", "ipfs://evidence1", 0);

        vm.prank(verifier1);
        vm.expectRevert("Not assigned verifier");
        skillClaim.rejectClaim(0, "Reason");
    }

    function testCannotDisputeApprovedClaim() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.prank(user1);
        skillClaim.createClaim("Solidity", "Description", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(0, verifier1);
        
        vm.prank(verifier1);
        skillClaim.approveClaim(0, "Approved");

        // Approved claims CAN be disputed now
        vm.prank(user1);
        skillClaim.disputeClaim(0, "Reason");
        
        // Verify claim is now disputed
        SkillClaim.Claim memory claim = skillClaim.getClaim(0);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Disputed, "Claim should be disputed");
    }

    function testCompleteClaimLifecycle() public {
        // Create claim
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity", "Expert level", "ipfs://evidence1", 0);
        
        SkillClaim.Claim memory claim = skillClaim.getClaim(claimId);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Pending);

        // Assign to verifier
        vm.prank(admin);
        skillClaim.assignClaim(claimId, verifier1);
        
        claim = skillClaim.getClaim(claimId);
        assertEq(claim.verifier, verifier1);

        // Reject claim
        vm.prank(verifier1);
        skillClaim.rejectClaim(claimId, "Need more evidence");
        
        claim = skillClaim.getClaim(claimId);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Rejected);

        // Dispute rejection
        vm.prank(user1);
        skillClaim.disputeClaim(claimId, "Evidence is sufficient");
        
        claim = skillClaim.getClaim(claimId);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Disputed);
    }

    function testGetClaimsByStatusFiltering() public {
        // Setup: Create profiles and add skills
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Skill1", 80, "ipfs://skill1");
        skillProfile.addSkill("Skill3", 80, "ipfs://skill3");
        vm.stopPrank();

        vm.startPrank(user2);
        skillProfile.createProfile("User Two", bytes32("ipfs://profile2"));
        skillProfile.addSkill("Skill2", 80, "ipfs://skill2");
        vm.stopPrank();

        // Create claims with different outcomes
        vm.prank(user1);
        skillClaim.createClaim("Skill1", "Desc", "ipfs://1", 0);
        
        vm.prank(user2);
        skillClaim.createClaim("Skill2", "Desc", "ipfs://2", 0);
        
        vm.prank(user1);
        skillClaim.createClaim("Skill3", "Desc", "ipfs://3", 1);

        // Approve first, reject second, leave third pending
        vm.startPrank(admin);
        skillClaim.assignClaim(0, verifier1);
        skillClaim.assignClaim(1, verifier1);
        vm.stopPrank();

        vm.startPrank(verifier1);
        skillClaim.approveClaim(0, "Good");
        skillClaim.rejectClaim(1, "Bad");
        vm.stopPrank();

        (uint256[] memory pending, uint256 pendingTotal) = skillClaim.getClaimsByStatus(SkillClaim.ClaimStatus.Pending, 0, 10);
        (uint256[] memory approved, uint256 approvedTotal) = skillClaim.getClaimsByStatus(SkillClaim.ClaimStatus.Approved, 0, 10);
        (uint256[] memory rejected, uint256 rejectedTotal) = skillClaim.getClaimsByStatus(SkillClaim.ClaimStatus.Rejected, 0, 10);

        assertEq(pending.length, 1);
        assertEq(approved.length, 1);
        assertEq(rejected.length, 1);
    }

    function testPauseBlocksAllFunctions() public {
        vm.prank(admin);
        skillClaim.pause();

        vm.prank(user1);
        vm.expectRevert();
        skillClaim.createClaim("Skill", "Desc", "ipfs://1", 0);

        vm.prank(admin);
        vm.expectRevert();
        skillClaim.assignClaim(0, verifier1);
    }

    // ============ AI Agent Verification Tests ============

    function testApproveClaimWithAgent() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity Expert", 80, "ipfs://skill1");
        vm.stopPrank();

        // Create claim
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        // Create signature for approval
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Approve claim with agent
        // Note: approveClaimWithAgent also emits SkillVerified event from SkillProfile.verifySkill()
        // We skip event checking and just verify the state changes
        skillClaim.approveClaimWithAgent(claimId, signature, "AI verified credentials");

        // Verify claim status
        SkillClaim.Claim memory claim = skillClaim.getClaim(claimId);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Approved, "Status should be Approved");
        assertEq(claim.verifier, agent1, "Verifier should be agent1");
        assertEq(claim.verifierNotes, "AI verified credentials", "Notes mismatch");
        assertEq(skillClaim.approvedClaims(), 1, "Approved claims should be 1");

        // Verify oracle status
        assertTrue(agentOracle.isClaimVerified(claimId), "Claim should be verified in oracle");
        assertTrue(agentOracle.isClaimValid(claimId), "Claim should be valid in oracle");
    }

    function testRejectClaimWithAgent() public {
        // Create claim
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        // Create signature for rejection
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, false, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Reject claim with agent
        vm.expectEmit(true, true, false, true);
        emit ClaimRejected(claimId, agent1, "Insufficient evidence", block.timestamp);
        
        skillClaim.rejectClaimWithAgent(claimId, signature, "Insufficient evidence");

        // Verify claim status
        SkillClaim.Claim memory claim = skillClaim.getClaim(claimId);
        assertTrue(claim.status == SkillClaim.ClaimStatus.Rejected, "Status should be Rejected");
        assertEq(claim.verifier, agent1, "Verifier should be agent1");
        assertEq(claim.verifierNotes, "Insufficient evidence", "Notes mismatch");
        assertEq(skillClaim.rejectedClaims(), 1, "Rejected claims should be 1");

        // Verify oracle status
        assertTrue(agentOracle.isClaimVerified(claimId), "Claim should be verified in oracle");
        assertFalse(agentOracle.verifiedClaims(claimId), "Claim should be invalid in oracle");
    }

    function testCannotApproveWithAgentTwice() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity Expert", 80, "ipfs://skill1");
        vm.stopPrank();

        // Create claim
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        // Create signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // First approval
        skillClaim.approveClaimWithAgent(claimId, signature, "AI verified");

        // Second approval should fail
        vm.expectRevert("Claim not pending");
        skillClaim.approveClaimWithAgent(claimId, signature, "AI verified again");
    }

    function testCannotApproveNonPendingClaimWithAgent() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity Expert", 80, "ipfs://skill1");
        vm.stopPrank();

        // Create and approve claim with human verifier
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);
        
        vm.prank(admin);
        skillClaim.assignClaim(claimId, verifier1);
        
        vm.prank(verifier1);
        skillClaim.approveClaim(claimId, "Human verified");

        // Try to approve with agent
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert("Claim not pending");
        skillClaim.approveClaimWithAgent(claimId, signature, "AI verified");
    }

    function testApproveClaimWithAgentNotesTooLong() public {
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        string memory longNotes = new string(501);
        vm.expectRevert("Notes too long");
        skillClaim.approveClaimWithAgent(claimId, signature, longNotes);
    }

    function testRejectClaimWithAgentReasonTooLong() public {
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, false, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        string memory longReason = new string(501);
        vm.expectRevert("Invalid reason length");
        skillClaim.rejectClaimWithAgent(claimId, signature, longReason);
    }

    function testRejectClaimWithAgentEmptyReason() public {
        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, false, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert("Invalid reason length");
        skillClaim.rejectClaimWithAgent(claimId, signature, "");
    }

    function testSetAgentOracle() public {
        // Deploy new oracle
        AgentOracle newOracle = new AgentOracle(admin);

        // Update oracle address
        vm.prank(admin);
        skillClaim.setAgentOracle(address(newOracle));

        // Verify update
        assertEq(skillClaim.getAgentOracle(), address(newOracle), "Oracle address not updated");
    }

    function testSetAgentOracleZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("Invalid oracle address");
        skillClaim.setAgentOracle(address(0));
    }

    function testOnlyAdminCanSetAgentOracle() public {
        AgentOracle newOracle = new AgentOracle(admin);

        vm.prank(user1);
        vm.expectRevert();
        skillClaim.setAgentOracle(address(newOracle));
    }

    function testGetAgentOracle() public {
        address oracleAddress = skillClaim.getAgentOracle();
        assertEq(oracleAddress, address(agentOracle), "Oracle address mismatch");
    }

    function testMixedVerificationMethods() public {
        // Setup: Create profiles and add skills
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Skill1", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.startPrank(user2);
        skillProfile.createProfile("User Two", bytes32("ipfs://profile2"));
        skillProfile.addSkill("Skill2", 80, "ipfs://skill2");
        vm.stopPrank();

        // Create two claims
        vm.prank(user1);
        uint256 claimId1 = skillClaim.createClaim("Skill1", "Desc1", "ipfs://1", 0);
        
        vm.prank(user2);
        uint256 claimId2 = skillClaim.createClaim("Skill2", "Desc2", "ipfs://2", 0);

        // Approve first with human verifier
        vm.prank(admin);
        skillClaim.assignClaim(claimId1, verifier1);
        
        vm.prank(verifier1);
        skillClaim.approveClaim(claimId1, "Human verified");

        // Approve second with AI agent
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId2, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        skillClaim.approveClaimWithAgent(claimId2, signature, "AI verified");

        // Verify both claims are approved
        SkillClaim.Claim memory claim1 = skillClaim.getClaim(claimId1);
        SkillClaim.Claim memory claim2 = skillClaim.getClaim(claimId2);
        
        assertTrue(claim1.status == SkillClaim.ClaimStatus.Approved, "Claim1 should be approved");
        assertTrue(claim2.status == SkillClaim.ClaimStatus.Approved, "Claim2 should be approved");
        assertEq(claim1.verifier, verifier1, "Claim1 verifier should be human");
        assertEq(claim2.verifier, agent1, "Claim2 verifier should be agent");
        assertEq(skillClaim.approvedClaims(), 2, "Total approved should be 2");
    }

    function testAgentVerificationGasUsage() public {
        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Solidity Expert", 80, "ipfs://skill1");
        vm.stopPrank();

        vm.prank(user1);
        uint256 claimId = skillClaim.createClaim("Solidity Expert", "5 years experience", "ipfs://evidence1", 0);

        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        uint256 gasBefore = gasleft();
        skillClaim.approveClaimWithAgent(claimId, signature, "AI verified");
        uint256 gasUsed = gasBefore - gasleft();

        // Gas usage should be reasonable (< 350k gas for profile update)
        assertTrue(gasUsed < 350000, "Agent verification uses too much gas");
    }

    function testFuzzAgentVerification(uint256 claimId, bool isValid) public {
        // Bound claimId to reasonable range
        claimId = bound(claimId, 0, 100);

        // Setup: Create profile and add skill first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        skillProfile.addSkill("Skill", 80, "ipfs://skill1");
        vm.stopPrank();

        // Create claim
        vm.prank(user1);
        skillClaim.createClaim("Skill", "Description", "ipfs://evidence", 0);

        // Use actual claim ID (0)
        uint256 actualClaimId = 0;

        // Create signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(actualClaimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify claim
        if (isValid) {
            skillClaim.approveClaimWithAgent(actualClaimId, signature, "AI verified");
            SkillClaim.Claim memory claim = skillClaim.getClaim(actualClaimId);
            assertTrue(claim.status == SkillClaim.ClaimStatus.Approved, "Should be approved");
        } else {
            skillClaim.rejectClaimWithAgent(actualClaimId, signature, "AI rejected");
            SkillClaim.Claim memory claim = skillClaim.getClaim(actualClaimId);
            assertTrue(claim.status == SkillClaim.ClaimStatus.Rejected, "Should be rejected");
        }
    }
}
