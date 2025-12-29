// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/Endorsement.sol";

contract EndorsementTest is Test {
    Endorsement public endorsement;
    
    address admin = address(1);
    address user1 = address(2);
    address user2 = address(3);
    address user3 = address(4);

    // Events for testing
    event EndorsementCreated(
        uint256 indexed endorsementId,
        address indexed endorser,
        address indexed endorsee,
        string skillName,
        uint256 timestamp
    );
    event EndorsementRevoked(uint256 indexed endorsementId, address indexed endorser, uint256 timestamp);
    event ReferenceCreated(
        uint256 indexed referenceId,
        address indexed referrer,
        address indexed referee,
        uint256 timestamp
    );
    event ReferenceRevoked(uint256 indexed referenceId, address indexed referrer, uint256 timestamp);

    function setUp() public {
        // Deploy contract
        endorsement = new Endorsement(admin);

        // Fund test addresses
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
        vm.deal(user3, 1 ether);
    }

    // ============ Happy Path Tests - Endorsements ============

    function testCreateEndorsement() public {
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit EndorsementCreated(0, user1, user2, "Solidity", block.timestamp);
        
        uint256 endorsementId = endorsement.createEndorsement(user2, "Solidity", "Great developer");

        assertEq(endorsementId, 0, "Endorsement ID should be 0");
        assertEq(endorsement.totalEndorsements(), 1, "Total endorsements should be 1");

        Endorsement.SkillEndorsement memory e = endorsement.getEndorsement(0);
        assertEq(e.endorser, user1, "Endorser mismatch");
        assertEq(e.endorsee, user2, "Endorsee mismatch");
        assertEq(e.skillName, "Solidity", "Skill name mismatch");
        assertFalse(e.revoked, "Should not be revoked");
    }

    function testMaxEndorsementsPerUser() public {
        // Add maximum allowed endorsements to user2
        vm.startPrank(user1);
        for (uint256 i = 0; i < endorsement.MAX_ENDORSEMENTS_PER_USER(); i++) {
            endorsement.createEndorsement(user2, string(abi.encodePacked("Skill", vm.toString(i))), "Great");
        }
        vm.stopPrank();

        // Try to add one more endorsement - should fail
        vm.prank(user3);
        vm.expectRevert("Maximum endorsements reached");
        endorsement.createEndorsement(user2, "ExtraSkill", "Great");
    }

    function testMaxReferencesPerUser() public {
        // Add maximum allowed references to user2
        address[] memory referrers = new address[](endorsement.MAX_REFERENCES_PER_USER());
        for (uint256 i = 0; i < endorsement.MAX_REFERENCES_PER_USER(); i++) {
            referrers[i] = address(uint160(1000 + i));
            vm.prank(referrers[i]);
            endorsement.createReference(user2, "Colleague", "Great to work with", "ipfs://ref");
        }

        // Try to add one more reference - should fail
        vm.prank(user1);
        vm.expectRevert("Maximum references reached");
        endorsement.createReference(user2, "Colleague", "Great", "ipfs://ref");
    }

    function testStringLengthValidation() public {
        string memory longString = new string(501);
        
        // Test skill name too long
        vm.prank(user1);
        vm.expectRevert("Invalid skill name length");
        endorsement.createEndorsement(user2, longString, "Message");

        // Test message too long
        vm.prank(user1);
        vm.expectRevert("Message too long");
        endorsement.createEndorsement(user2, "Skill", longString);

        // Test reference relationship too long
        vm.prank(user1);
        vm.expectRevert("Invalid relationship length");
        endorsement.createReference(user2, longString, "Message", "ipfs://ref");
    }

    function testRevokeEndorsement() public {
        // Create endorsement
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great developer");

        // Revoke endorsement
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit EndorsementRevoked(0, user1, block.timestamp);
        
        endorsement.revokeEndorsement(0);

        Endorsement.SkillEndorsement memory e = endorsement.getEndorsement(0);
        assertTrue(e.revoked, "Should be revoked");
    }

    function testGetReceivedEndorsements() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");
        
        vm.prank(user3);
        endorsement.createEndorsement(user2, "Rust", "Excellent");

        (uint256[] memory received, uint256 total) = endorsement.getReceivedEndorsements(user2, 0, 10);
        assertEq(received.length, 2, "Should have 2 received endorsements");
        assertEq(total, 2, "Total should be 2");
    }

    function testGetGivenEndorsements() public {
        vm.startPrank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");
        endorsement.createEndorsement(user3, "Rust", "Excellent");
        vm.stopPrank();

        (uint256[] memory given, uint256 total) = endorsement.getGivenEndorsements(user1, 0, 10);
        assertEq(given.length, 2, "Should have 2 given endorsements");
        assertEq(total, 2, "Total should be 2");
    }

    function testGetActiveEndorsements() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");
        
        vm.prank(user3);
        endorsement.createEndorsement(user2, "Rust", "Excellent");

        // Revoke one
        vm.prank(user1);
        endorsement.revokeEndorsement(0);

        (uint256[] memory active, uint256 total) = endorsement.getActiveEndorsements(user2, 0, 10);
        assertEq(active.length, 1, "Should have 1 active endorsement");
        assertEq(total, 1, "Total should be 1");
    }

    // ============ Happy Path Tests - References ============

    function testCreateReference() public {
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit ReferenceCreated(0, user1, user2, block.timestamp);
        
        uint256 referenceId = endorsement.createReference(
            user2,
            "Former Manager",
            "Excellent team player",
            "ipfs://reference1"
        );

        assertEq(referenceId, 0, "Reference ID should be 0");
        assertEq(endorsement.totalReferences(), 1, "Total references should be 1");

        Endorsement.Reference memory r = endorsement.getReference(0);
        assertEq(r.referrer, user1, "Referrer mismatch");
        assertEq(r.referee, user2, "Referee mismatch");
        assertEq(r.relationship, "Former Manager", "Relationship mismatch");
        assertFalse(r.revoked, "Should not be revoked");
    }

    function testRevokeReference() public {
        // Create reference
        vm.prank(user1);
        endorsement.createReference(user2, "Former Manager", "Excellent", "ipfs://ref1");

        // Revoke reference
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit ReferenceRevoked(0, user1, block.timestamp);
        
        endorsement.revokeReference(0);

        Endorsement.Reference memory r = endorsement.getReference(0);
        assertTrue(r.revoked, "Should be revoked");
    }

    function testGetReceivedReferences() public {
        vm.prank(user1);
        endorsement.createReference(user2, "Manager", "Great", "ipfs://1");
        
        vm.prank(user3);
        endorsement.createReference(user2, "Colleague", "Excellent", "ipfs://2");

        (uint256[] memory received, uint256 total) = endorsement.getReceivedReferences(user2, 0, 10);
        assertEq(received.length, 2, "Should have 2 received references");
        assertEq(total, 2, "Total should be 2");
    }

    function testGetActiveReferences() public {
        vm.prank(user1);
        endorsement.createReference(user2, "Manager", "Great", "ipfs://1");
        
        vm.prank(user3);
        endorsement.createReference(user2, "Colleague", "Excellent", "ipfs://2");

        // Revoke one
        vm.prank(user1);
        endorsement.revokeReference(0);

        (uint256[] memory active, uint256 total) = endorsement.getActiveReferences(user2, 0, 10);
        assertEq(active.length, 1, "Should have 1 active reference");
        assertEq(total, 1, "Total should be 1");
    }

    // ============ Edge Case Tests ============

    function testCannotEndorseSelf() public {
        vm.prank(user1);
        vm.expectRevert("Cannot endorse yourself");
        endorsement.createEndorsement(user1, "Solidity", "Great");
    }

    function testCannotEndorseSameSkillTwice() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");

        vm.prank(user1);
        vm.expectRevert("Already endorsed this skill");
        endorsement.createEndorsement(user2, "Solidity", "Excellent");
    }

    function testCannotRevokeOthersEndorsement() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");

        vm.prank(user2);
        vm.expectRevert("Not the endorser");
        endorsement.revokeEndorsement(0);
    }

    function testCannotRevokeAlreadyRevokedEndorsement() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");

        vm.prank(user1);
        endorsement.revokeEndorsement(0);

        vm.prank(user1);
        vm.expectRevert("Already revoked");
        endorsement.revokeEndorsement(0);
    }

    function testCannotReferenceSelf() public {
        vm.prank(user1);
        vm.expectRevert("Cannot reference yourself");
        endorsement.createReference(user1, "Manager", "Great", "ipfs://1");
    }

    function testCannotGiveReferenceToSamePersonTwice() public {
        vm.prank(user1);
        endorsement.createReference(user2, "Manager", "Great", "ipfs://1");

        vm.prank(user1);
        vm.expectRevert("Already gave reference");
        endorsement.createReference(user2, "Colleague", "Excellent", "ipfs://2");
    }

    function testCannotRevokeOthersReference() public {
        vm.prank(user1);
        endorsement.createReference(user2, "Manager", "Great", "ipfs://1");

        vm.prank(user2);
        vm.expectRevert("Not the referrer");
        endorsement.revokeReference(0);
    }

    function testCannotRevokeAlreadyRevokedReference() public {
        vm.prank(user1);
        endorsement.createReference(user2, "Manager", "Great", "ipfs://1");

        vm.prank(user1);
        endorsement.revokeReference(0);

        vm.prank(user1);
        vm.expectRevert("Already revoked");
        endorsement.revokeReference(0);
    }

    // ============ Access Control Tests ============

    function testOnlyAdminCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        endorsement.pause();

        vm.prank(admin);
        endorsement.pause();
    }

    // ============ State Transition Tests ============

    function testPausePreventsFunctions() public {
        vm.prank(admin);
        endorsement.pause();

        vm.prank(user1);
        vm.expectRevert();
        endorsement.createEndorsement(user2, "Solidity", "Great");
    }

    // ============ Fuzz Tests ============

    function testFuzzMultipleEndorsements(uint8 numEndorsements) public {
        numEndorsements = uint8(bound(numEndorsements, 1, 50));
        
        for (uint8 i = 0; i < numEndorsements; i++) {
            address endorser = address(uint160(1000 + i));
            vm.prank(endorser);
            endorsement.createEndorsement(user2, "Solidity", "Great");
        }

        assertEq(endorsement.totalEndorsements(), numEndorsements, "Total endorsements mismatch");
    }

    // ============ Security Tests ============

    function testReentrancyProtection() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great developer");
        
        // Sequential calls should work
        vm.prank(user1);
        endorsement.createReference(user2, "Manager", "Excellent", "ipfs://1");
    }

    function testAccessControlForPause() public {
        // Non-admin cannot pause
        vm.prank(user1);
        vm.expectRevert();
        endorsement.pause();

        // Admin can pause
        vm.prank(admin);
        endorsement.pause();
        assertTrue(endorsement.paused());

        // Non-admin cannot unpause
        vm.prank(user1);
        vm.expectRevert();
        endorsement.unpause();

        // Admin can unpause
        vm.prank(admin);
        endorsement.unpause();
        assertFalse(endorsement.paused());
    }

    // ============ Gas Optimization Tests ============

    function testGasCreateEndorsement() public {
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        endorsement.createEndorsement(user2, "Solidity", "Excellent developer");
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 250000, "Create endorsement uses too much gas");
    }

    function testGasCreateReference() public {
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        endorsement.createReference(user2, "Former Manager", "Great team player", "ipfs://ref1");
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 260000, "Create reference uses too much gas");
    }

    function testGasRevokeEndorsement() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");

        vm.prank(user1);
        uint256 gasBefore = gasleft();
        endorsement.revokeEndorsement(0);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 100000, "Revoke endorsement uses too much gas");
    }

    function testGasBatchEndorsements() public {
        vm.startPrank(user1);
        uint256 gasBefore = gasleft();
        for (uint8 i = 0; i < 5; i++) {
            endorsement.createEndorsement(user2, string(abi.encodePacked("Skill", i)), "Great");
        }
        uint256 gasUsed = gasBefore - gasleft();
        vm.stopPrank();
        
        assertTrue(gasUsed < 1000000, "Batch endorsements inefficient");
    }

    // ============ Additional Edge Cases ============

    function testCannotEndorseWithEmptySkillName() public {
        vm.prank(user1);
        vm.expectRevert("Invalid skill name length");
        endorsement.createEndorsement(user2, "", "Great");
    }

    function testCannotReferenceWithEmptyRelationship() public {
        vm.prank(user1);
        vm.expectRevert("Invalid relationship length");
        endorsement.createReference(user2, "", "Great", "ipfs://1");
    }

    function testMultipleSkillEndorsements() public {
        // User1 endorses user2 for multiple skills
        vm.startPrank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Expert");
        endorsement.createEndorsement(user2, "Rust", "Advanced");
        endorsement.createEndorsement(user2, "JavaScript", "Proficient");
        vm.stopPrank();

        (uint256[] memory received, uint256 total1) = endorsement.getReceivedEndorsements(user2, 0, 10);
        assertEq(received.length, 3, "Should have 3 endorsements");
        assertEq(total1, 3, "Total should be 3");

        (uint256[] memory given, uint256 total2) = endorsement.getGivenEndorsements(user1, 0, 10);
        assertEq(given.length, 3, "Should have given 3 endorsements");
        assertEq(total2, 3, "Total should be 3");
    }

    function testEndorsementFromMultipleUsers() public {
        // Multiple users endorse user2 for same skill
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");
        
        vm.prank(user3);
        endorsement.createEndorsement(user2, "Solidity", "Excellent");

        (uint256[] memory received, uint256 total) = endorsement.getReceivedEndorsements(user2, 0, 10);
        assertEq(received.length, 2, "Should have 2 endorsements");
        assertEq(total, 2, "Total should be 2");
    }

    function testRevokeAndCheckActive() public {
        vm.prank(user1);
        endorsement.createEndorsement(user2, "Solidity", "Great");
        
        vm.prank(user3);
        endorsement.createEndorsement(user2, "Rust", "Excellent");

        (uint256[] memory activeBefore, uint256 total1) = endorsement.getActiveEndorsements(user2, 0, 10);
        assertEq(activeBefore.length, 2);
        assertEq(total1, 2, "Total should be 2");

        vm.prank(user1);
        endorsement.revokeEndorsement(0);

        (uint256[] memory activeAfter, uint256 total2) = endorsement.getActiveEndorsements(user2, 0, 10);
        assertEq(activeAfter.length, 1);
        assertEq(total2, 1, "Total should be 1");
    }

    function testCompleteReferenceLifecycle() public {
        // Create reference
        vm.prank(user1);
        uint256 refId = endorsement.createReference(
            user2,
            "Former Manager",
            "Outstanding performance",
            "ipfs://reference1"
        );

        Endorsement.Reference memory ref = endorsement.getReference(refId);
        assertEq(ref.referrer, user1);
        assertEq(ref.referee, user2);
        assertFalse(ref.revoked);

        // Revoke reference
        vm.prank(user1);
        endorsement.revokeReference(refId);

        ref = endorsement.getReference(refId);
        assertTrue(ref.revoked);
    }

    function testGetActiveReferencesFiltering() public {
        vm.prank(user1);
        endorsement.createReference(user2, "Manager", "Great", "ipfs://1");
        
        vm.prank(user3);
        endorsement.createReference(user2, "Colleague", "Excellent", "ipfs://2");

        (uint256[] memory allRefs, uint256 total1) = endorsement.getReceivedReferences(user2, 0, 10);
        assertEq(allRefs.length, 2);
        assertEq(total1, 2, "Total should be 2");

        vm.prank(user1);
        endorsement.revokeReference(0);

        (uint256[] memory activeRefs, uint256 total2) = endorsement.getActiveReferences(user2, 0, 10);
        assertEq(activeRefs.length, 1);
        assertEq(total2, 1, "Total should be 1");
        assertEq(activeRefs[0], 1);
    }

    function testCannotEndorseZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert("Invalid endorsee address");
        endorsement.createEndorsement(address(0), "Solidity", "Great");
    }

    function testCannotReferenceZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert("Invalid referee address");
        endorsement.createReference(address(0), "Manager", "Great", "ipfs://1");
    }
}
