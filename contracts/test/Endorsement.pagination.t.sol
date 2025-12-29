// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/Endorsement.sol";

/// @title Endorsement Pagination Tests
/// @notice Comprehensive tests for paginated endorsement and reference retrieval
contract EndorsementPaginationTest is Test {
    Endorsement public endorsement;
    address public admin = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    function setUp() public {
        endorsement = new Endorsement(admin);
        
        // No need to create profiles - Endorsement is standalone
    }

    /// @notice Test basic endorsement pagination
    function testBasicEndorsementPagination() public {
        // User2 creates 20 endorsements for user1
        vm.startPrank(user2);
        for (uint256 i = 0; i < 20; i++) {
            endorsement.createEndorsement(
                user1,
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Great work!"
            );
        }
        vm.stopPrank();

        // Get first 10 endorsements
        (uint256[] memory endorsementIds, uint256 total) = endorsement.getReceivedEndorsements(user1, 0, 10);
        assertEq(total, 20, "Total should be 20");
        assertEq(endorsementIds.length, 10, "Should return 10 endorsement IDs");

        // Get next 10 endorsements
        (endorsementIds, total) = endorsement.getReceivedEndorsements(user1, 10, 10);
        assertEq(endorsementIds.length, 10, "Should return next 10 endorsement IDs");
    }

    /// @notice Test reference pagination
    function testReferencePagination() public {
        // User2 gives reference to user1
        vm.prank(user2);
        endorsement.createReference(user1, "Former Manager", "Excellent employee", "ipfs://reference");

        // User3 gives reference to user1
        vm.prank(user3);
        endorsement.createReference(user1, "Colleague", "Great teammate", "ipfs://reference");

        // Get references
        (uint256[] memory referenceIds, uint256 total) = endorsement.getReceivedReferences(user1, 0, 10);
        assertEq(total, 2, "Total should be 2");
        assertEq(referenceIds.length, 2, "Should return 2 reference IDs");
    }

    /// @notice Test active endorsements pagination with revocations
    function testActiveEndorsementsPagination() public {
        // Create 30 endorsements
        vm.startPrank(user2);
        for (uint256 i = 0; i < 30; i++) {
            endorsement.createEndorsement(
                user1,
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Great!"
            );
        }
        vm.stopPrank();

        // Revoke every 3rd endorsement
        vm.startPrank(user2);
        for (uint256 i = 0; i < 30; i += 3) {
            endorsement.revokeEndorsement(i);
        }
        vm.stopPrank();

        // Get active endorsements (should be 20 active, 10 revoked)
        (uint256[] memory activeIds, uint256 activeTotal) = endorsement.getActiveEndorsements(user1, 0, 50);
        assertEq(activeTotal, 20, "Should have 20 active endorsements");
        assertEq(activeIds.length, 20, "Should return 20 active endorsement IDs");

        // Verify pagination works
        (activeIds, activeTotal) = endorsement.getActiveEndorsements(user1, 0, 10);
        assertEq(activeIds.length, 10, "Should return first 10 active endorsements");

        (activeIds, activeTotal) = endorsement.getActiveEndorsements(user1, 10, 10);
        assertEq(activeIds.length, 10, "Should return next 10 active endorsements");
    }

    /// @notice Test active references pagination with revocations
    function testActiveReferencesPagination() public {
        // Create 15 references from different users
        for (uint256 i = 0; i < 15; i++) {
            address referrer = address(uint160(1000 + i));
            vm.prank(referrer);
            endorsement.createReference(
                user1,
                "Colleague",
                string(abi.encodePacked("Reference", vm.toString(i))),
                "ipfs://ref"
            );
        }

        // Revoke every 5th reference
        for (uint256 i = 0; i < 15; i += 5) {
            address referrer = address(uint160(1000 + i));
            vm.prank(referrer);
            endorsement.revokeReference(i);
        }

        // Get active references (should be 12 active, 3 revoked)
        (uint256[] memory activeIds, uint256 activeTotal) = endorsement.getActiveReferences(user1, 0, 50);
        assertEq(activeTotal, 12, "Should have 12 active references");
        assertEq(activeIds.length, 12, "Should return 12 active reference IDs");
    }

    /// @notice Test offset beyond total
    function testOffsetBeyondTotal() public {
        vm.startPrank(user2);
        for (uint256 i = 0; i < 5; i++) {
            endorsement.createEndorsement(user1, string(abi.encodePacked("Skill", vm.toString(i))), "Great!");
        }
        vm.stopPrank();

        // Offset equals total
        (uint256[] memory endorsementIds, uint256 total) = endorsement.getReceivedEndorsements(user1, 5, 10);
        assertEq(endorsementIds.length, 0, "Should return empty array when offset equals total");
        assertEq(total, 5, "Total should still be 5");

        // Offset beyond total
        (endorsementIds, total) = endorsement.getReceivedEndorsements(user1, 100, 10);
        assertEq(endorsementIds.length, 0, "Should return empty array when offset > total");
    }

    /// @notice Test limit exceeds remaining items
    function testLimitExceedsRemaining() public {
        vm.startPrank(user2);
        for (uint256 i = 0; i < 7; i++) {
            endorsement.createEndorsement(user1, string(abi.encodePacked("Skill", vm.toString(i))), "Great!");
        }
        vm.stopPrank();

        // Request more than available
        (uint256[] memory endorsementIds, uint256 total) = endorsement.getReceivedEndorsements(user1, 0, 100);
        assertEq(endorsementIds.length, 7, "Should return all 7 endorsements");
        assertEq(total, 7, "Total should be 7");

        // Partial page at end
        (endorsementIds, total) = endorsement.getReceivedEndorsements(user1, 5, 10);
        assertEq(endorsementIds.length, 2, "Should return remaining 2 endorsements");
    }

    /// @notice Test count helper functions
    function testCountHelpers() public {
        // User2 endorses user1
        vm.startPrank(user2);
        for (uint256 i = 0; i < 10; i++) {
            endorsement.createEndorsement(user1, string(abi.encodePacked("Skill", vm.toString(i))), "Great!");
        }
        vm.stopPrank();

        // User3 endorses user1
        vm.startPrank(user3);
        for (uint256 i = 0; i < 5; i++) {
            endorsement.createEndorsement(user1, string(abi.encodePacked("SkillX", vm.toString(i))), "Awesome!");
        }
        vm.stopPrank();

        // Test count functions
        assertEq(endorsement.getReceivedEndorsementsCount(user1), 15, "User1 should have received 15 endorsements");
        assertEq(endorsement.getGivenEndorsementsCount(user2), 10, "User2 should have given 10 endorsements");
        assertEq(endorsement.getGivenEndorsementsCount(user3), 5, "User3 should have given 5 endorsements");
    }

    /// @notice Test pagination with zero items
    function testPaginationWithZeroItems() public {
        (uint256[] memory endorsementIds, uint256 total) = endorsement.getReceivedEndorsements(user1, 0, 10);
        assertEq(total, 0, "Total should be 0");
        assertEq(endorsementIds.length, 0, "Should return empty array");
    }

    /// @notice Test multiple users pagination isolation
    function testMultipleUsersPaginationIsolation() public {
        // User2 endorses user1 (10 endorsements)
        vm.startPrank(user2);
        for (uint256 i = 0; i < 10; i++) {
            endorsement.createEndorsement(user1, string(abi.encodePacked("Skill", vm.toString(i))), "Great!");
        }
        vm.stopPrank();

        // User2 endorses user3 (5 endorsements)
        vm.startPrank(user2);
        for (uint256 i = 0; i < 5; i++) {
            endorsement.createEndorsement(user3, string(abi.encodePacked("SkillY", vm.toString(i))), "Awesome!");
        }
        vm.stopPrank();

        // Verify user1 data
        (uint256[] memory endorsementIds1, uint256 total1) = endorsement.getReceivedEndorsements(user1, 0, 20);
        assertEq(total1, 10, "User1 should have 10 endorsements");

        // Verify user3 data
        (uint256[] memory endorsementIds3, uint256 total3) = endorsement.getReceivedEndorsements(user3, 0, 20);
        assertEq(total3, 5, "User3 should have 5 endorsements");
    }

    /// @notice Stress test: Maximum endorsements per user
    function testMaxEndorsementsPerUser() public {
        // Create 500 endorsements (max allowed) from different users
        for (uint256 i = 0; i < 500; i++) {
            address endorser = address(uint160(2000 + i));
            vm.prank(endorser);
            endorsement.createEndorsement(user1, string(abi.encodePacked("Skill", vm.toString(i % 50))), "Great!");
        }

        // Test pagination at max capacity
        (uint256[] memory endorsementIds, uint256 total) = endorsement.getReceivedEndorsements(user1, 0, 100);
        assertEq(total, 500, "Total should be 500");
        assertEq(endorsementIds.length, 100, "Should return 100 endorsement IDs");

        // Get second page
        (endorsementIds, total) = endorsement.getReceivedEndorsements(user1, 100, 100);
        assertEq(endorsementIds.length, 100, "Should return next 100 endorsement IDs");
    }

    /// @notice Test given endorsements pagination
    function testGivenEndorsementsPagination() public {
        // User2 gives 25 endorsements to different users
        vm.startPrank(user2);
        for (uint256 i = 0; i < 25; i++) {
            address endorsee = address(uint160(3000 + i));
            endorsement.createEndorsement(endorsee, "Solidity", "Great developer!");
        }
        vm.stopPrank();

        // Get first page
        (uint256[] memory endorsementIds, uint256 total) = endorsement.getGivenEndorsements(user2, 0, 10);
        assertEq(total, 25, "Total should be 25");
        assertEq(endorsementIds.length, 10, "Should return 10 endorsement IDs");

        // Get last page (partial)
        (endorsementIds, total) = endorsement.getGivenEndorsements(user2, 20, 10);
        assertEq(endorsementIds.length, 5, "Should return remaining 5 endorsement IDs");
    }

    /// @notice Test given references pagination
    function testGivenReferencesPagination() public {
        // User2 gives 12 references to different users
        vm.startPrank(user2);
        for (uint256 i = 0; i < 12; i++) {
            address referee = address(uint160(4000 + i));
            endorsement.createReference(referee, "Manager", "Excellent work", "ipfs://ref");
        }
        vm.stopPrank();

        // Get all references
        (uint256[] memory referenceIds, uint256 total) = endorsement.getGivenReferences(user2, 0, 20);
        assertEq(total, 12, "Total should be 12");
        assertEq(referenceIds.length, 12, "Should return all 12 reference IDs");
    }
}
