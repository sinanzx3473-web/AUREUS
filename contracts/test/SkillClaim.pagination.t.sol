// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillClaim.sol";
import "../src/AgentOracle.sol";
import "../src/SkillProfile.sol";

/// @title SkillClaim Pagination Tests
/// @notice Comprehensive tests for paginated claim retrieval functions
contract SkillClaimPaginationTest is Test {
    SkillClaim public skillClaim;
    AgentOracle public agentOracle;
    SkillProfile public skillProfile;
    address public admin = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public verifier1 = address(0x3);
    address public verifier2 = address(0x4);

    function setUp() public {
        agentOracle = new AgentOracle(admin);
        skillProfile = new SkillProfile(admin);
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        
        // Grant verifier roles
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier1);
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier2);
        // Grant SkillClaim contract VERIFIER_ROLE in SkillProfile so it can verify skills
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), address(skillClaim));
    }

    /// @notice Test basic user claims pagination
    function testBasicUserClaimsPagination() public {
        // Create 20 claims for user1
        vm.startPrank(user1);
        for (uint256 i = 0; i < 20; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Get first 10 claims
        (uint256[] memory claimIds, uint256 total) = skillClaim.getUserClaims(user1, 0, 10);
        assertEq(total, 20, "Total should be 20");
        assertEq(claimIds.length, 10, "Should return 10 claim IDs");
        assertEq(claimIds[0], 0, "First claim ID should be 0");

        // Get next 10 claims
        (claimIds, total) = skillClaim.getUserClaims(user1, 10, 10);
        assertEq(claimIds.length, 10, "Should return next 10 claim IDs");
        assertEq(claimIds[0], 10, "First claim ID in second page should be 10");
    }

    /// @notice Test verifier claims pagination
    function testVerifierClaimsPagination() public {
        // Create 30 claims
        vm.startPrank(user1);
        for (uint256 i = 0; i < 30; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Assign 15 claims to verifier1
        for (uint256 i = 0; i < 15; i++) {
            skillClaim.assignClaim(i, verifier1);
        }

        // Assign 15 claims to verifier2
        for (uint256 i = 15; i < 30; i++) {
            skillClaim.assignClaim(i, verifier2);
        }

        // Test verifier1 claims pagination
        (uint256[] memory claimIds, uint256 total) = skillClaim.getVerifierClaims(verifier1, 0, 10);
        assertEq(total, 15, "Verifier1 should have 15 claims");
        assertEq(claimIds.length, 10, "Should return 10 claim IDs");

        // Get remaining claims for verifier1
        (claimIds, total) = skillClaim.getVerifierClaims(verifier1, 10, 10);
        assertEq(claimIds.length, 5, "Should return remaining 5 claim IDs");
    }

    /// @notice Test claims by status pagination with large dataset
    function testClaimsByStatusPaginationLarge() public {
        // Setup: Create profile and add 100 skills (max allowed)
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        for (uint256 i = 0; i < 100; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        // Create max allowed claims (200) by reusing the 100 skills
        vm.startPrank(user1);
        for (uint256 i = 0; i < 200; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i % 100))),
                "Description",
                "ipfs://evidence",
                i % 100
            );
        }
        vm.stopPrank();

        // Assign and approve 100 claims
        for (uint256 i = 0; i < 100; i++) {
            skillClaim.assignClaim(i, verifier1);
            vm.prank(verifier1);
            skillClaim.approveClaim(i, "Approved");
        }

        // Assign and reject 50 claims
        for (uint256 i = 100; i < 150; i++) {
            skillClaim.assignClaim(i, verifier1);
            vm.prank(verifier1);
            skillClaim.rejectClaim(i, "Rejected");
        }

        // Test pending claims pagination (50 pending)
        (uint256[] memory claimIds, uint256 total) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Pending,
            0,
            50
        );
        assertEq(total, 50, "Should have 50 pending claims");
        assertEq(claimIds.length, 50, "Should return 50 claim IDs");

        // Test approved claims pagination
        (claimIds, total) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Approved,
            0,
            50
        );
        assertEq(total, 100, "Should have 100 approved claims");
        assertEq(claimIds.length, 50, "Should return 50 claim IDs");

        // Test rejected claims pagination
        (claimIds, total) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Rejected,
            0,
            50
        );
        assertEq(total, 50, "Should have 50 rejected claims");
        assertEq(claimIds.length, 50, "Should return 50 claim IDs");
    }

    /// @notice Test pagination with offset beyond total
    function testOffsetBeyondTotal() public {
        vm.startPrank(user1);
        for (uint256 i = 0; i < 5; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Offset equals total
        (uint256[] memory claimIds, uint256 total) = skillClaim.getUserClaims(user1, 5, 10);
        assertEq(claimIds.length, 0, "Should return empty array when offset equals total");
        assertEq(total, 5, "Total should still be 5");

        // Offset beyond total
        (claimIds, total) = skillClaim.getUserClaims(user1, 100, 10);
        assertEq(claimIds.length, 0, "Should return empty array when offset > total");
    }

    /// @notice Test limit exceeds remaining items
    function testLimitExceedsRemaining() public {
        vm.startPrank(user1);
        for (uint256 i = 0; i < 7; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Request more than available
        (uint256[] memory claimIds, uint256 total) = skillClaim.getUserClaims(user1, 0, 100);
        assertEq(claimIds.length, 7, "Should return all 7 claims");
        assertEq(total, 7, "Total should be 7");

        // Partial page at end
        (claimIds, total) = skillClaim.getUserClaims(user1, 5, 10);
        assertEq(claimIds.length, 2, "Should return remaining 2 claims");
    }

    /// @notice Test count helper functions
    function testCountHelpers() public {
        // Create claims for user1
        vm.startPrank(user1);
        for (uint256 i = 0; i < 10; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Create claims for user2
        vm.startPrank(user2);
        for (uint256 i = 0; i < 5; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Assign some claims to verifier1
        for (uint256 i = 0; i < 7; i++) {
            skillClaim.assignClaim(i, verifier1);
        }

        // Test count functions
        assertEq(skillClaim.getUserClaimsCount(user1), 10, "User1 claims count incorrect");
        assertEq(skillClaim.getUserClaimsCount(user2), 5, "User2 claims count incorrect");
        assertEq(skillClaim.getVerifierClaimsCount(verifier1), 7, "Verifier1 claims count incorrect");
    }

    /// @notice Test pagination with zero claims
    function testPaginationWithZeroClaims() public {
        (uint256[] memory claimIds, uint256 total) = skillClaim.getUserClaims(user1, 0, 10);
        assertEq(total, 0, "Total should be 0");
        assertEq(claimIds.length, 0, "Should return empty array");
    }

    /// @notice Test multiple users pagination isolation
    function testMultipleUsersPaginationIsolation() public {
        // User1 creates 15 claims
        vm.startPrank(user1);
        for (uint256 i = 0; i < 15; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("User1Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // User2 creates 8 claims
        vm.startPrank(user2);
        for (uint256 i = 0; i < 8; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("User2Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Verify user1 data
        (uint256[] memory claimIds1, uint256 total1) = skillClaim.getUserClaims(user1, 0, 20);
        assertEq(total1, 15, "User1 should have 15 claims");
        assertEq(claimIds1.length, 15, "Should return all 15 claims");

        // Verify user2 data
        (uint256[] memory claimIds2, uint256 total2) = skillClaim.getUserClaims(user2, 0, 20);
        assertEq(total2, 8, "User2 should have 8 claims");
        assertEq(claimIds2.length, 8, "Should return all 8 claims");
    }

    /// @notice Test claims by status with mixed statuses
    function testClaimsByStatusMixed() public {
        // Setup: Create profile and add skills first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        for (uint256 i = 0; i < 50; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        // Create 50 claims
        vm.startPrank(user1);
        for (uint256 i = 0; i < 50; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                i
            );
        }
        vm.stopPrank();

        // Approve every 3rd claim
        for (uint256 i = 0; i < 50; i += 3) {
            skillClaim.assignClaim(i, verifier1);
            vm.prank(verifier1);
            skillClaim.approveClaim(i, "Approved");
        }

        // Reject every 5th claim (that wasn't approved)
        for (uint256 i = 1; i < 50; i += 5) {
            if (i % 3 != 0) {
                skillClaim.assignClaim(i, verifier1);
                vm.prank(verifier1);
                skillClaim.rejectClaim(i, "Rejected");
            }
        }

        // Test approved claims
        (uint256[] memory approvedIds, uint256 approvedTotal) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Approved,
            0,
            20
        );
        assertEq(approvedTotal, 17, "Should have 17 approved claims");

        // Test rejected claims
        (uint256[] memory rejectedIds, uint256 rejectedTotal) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Rejected,
            0,
            20
        );
        assertTrue(rejectedTotal > 0, "Should have some rejected claims");

        // Test pending claims
        (uint256[] memory pendingIds, uint256 pendingTotal) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Pending,
            0,
            20
        );
        assertTrue(pendingTotal > 0, "Should have some pending claims");

        // Verify total adds up
        assertEq(approvedTotal + rejectedTotal + pendingTotal, 50, "All claims should be accounted for");
    }

    /// @notice Stress test: Maximum claims per user
    function testMaxClaimsPerUser() public {
        vm.startPrank(user1);
        
        // Add maximum allowed claims (200)
        for (uint256 i = 0; i < 200; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        
        vm.stopPrank();

        // Test pagination at max capacity
        (uint256[] memory claimIds, uint256 total) = skillClaim.getUserClaims(user1, 0, 100);
        assertEq(total, 200, "Total should be 200");
        assertEq(claimIds.length, 100, "Should return 100 claim IDs");

        // Get second half
        (claimIds, total) = skillClaim.getUserClaims(user1, 100, 100);
        assertEq(claimIds.length, 100, "Should return remaining 100 claim IDs");
    }

    /// @notice Test pagination consistency with status changes
    function testPaginationWithStatusChanges() public {
        // Setup: Create profile and add skills first
        vm.startPrank(user1);
        skillProfile.createProfile("User One", bytes32("ipfs://profile1"));
        for (uint256 i = 0; i < 20; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        // Create 20 claims
        vm.startPrank(user1);
        for (uint256 i = 0; i < 20; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                i
            );
        }
        vm.stopPrank();

        // Initially all pending
        (uint256[] memory pendingIds, uint256 pendingTotal) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Pending,
            0,
            100
        );
        assertEq(pendingTotal, 20, "Should have 20 pending claims");

        // Approve 10 claims
        for (uint256 i = 0; i < 10; i++) {
            skillClaim.assignClaim(i, verifier1);
            vm.prank(verifier1);
            skillClaim.approveClaim(i, "Approved");
        }

        // Verify pending count decreased
        (pendingIds, pendingTotal) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Pending,
            0,
            100
        );
        assertEq(pendingTotal, 10, "Should have 10 pending claims after approvals");

        // Verify approved count
        (uint256[] memory approvedIds, uint256 approvedTotal) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Approved,
            0,
            100
        );
        assertEq(approvedTotal, 10, "Should have 10 approved claims");
    }
}
