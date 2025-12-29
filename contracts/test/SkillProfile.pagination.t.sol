// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";

/// @title SkillProfile Pagination Tests
/// @notice Comprehensive tests for paginated array-returning functions
contract SkillProfilePaginationTest is Test {
    SkillProfile public profile;
    address public admin = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    event ProfileCreated(address indexed user, string name, uint256 timestamp);
    event SkillAdded(address indexed user, string skillName, uint8 proficiencyLevel, uint256 timestamp);

    function setUp() public {
        profile = new SkillProfile(admin);
        
        // Create profiles
        vm.prank(user1);
        profile.createProfile("User One", bytes32("ipfs://hash1"));
        
        vm.prank(user2);
        profile.createProfile("User Two", bytes32("ipfs://hash2"));
    }

    /// @notice Test basic pagination with small dataset
    function testBasicSkillsPagination() public {
        // Add 10 skills
        vm.startPrank(user1);
        for (uint256 i = 0; i < 10; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                uint8(50 + i),
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Get first 5 skills
        (SkillProfile.Skill[] memory skills, uint256 total) = profile.getSkills(user1, 0, 5);
        
        assertEq(total, 10, "Total should be 10");
        assertEq(skills.length, 5, "Should return 5 skills");
        assertEq(skills[0].name, "Skill0", "First skill name incorrect");
        assertEq(skills[0].proficiencyLevel, 50, "First skill proficiency incorrect");

        // Get next 5 skills
        (skills, total) = profile.getSkills(user1, 5, 5);
        assertEq(skills.length, 5, "Should return next 5 skills");
        assertEq(skills[0].name, "Skill5", "Sixth skill name incorrect");
    }

    /// @notice Test pagination with large dataset (100 skills - max allowed)
    function testLargeDatasetPagination() public {
        // Add max allowed skills (100)
        vm.startPrank(user1);
        for (uint256 i = 0; i < 100; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Test first page
        (SkillProfile.Skill[] memory skills, uint256 total) = profile.getSkills(user1, 0, 50);
        assertEq(total, 100, "Total should be 100");
        assertEq(skills.length, 50, "Should return 50 skills");
        
        // Test second page
        (skills, total) = profile.getSkills(user1, 50, 50);
        assertEq(skills.length, 50, "Should return remaining 50 skills");
        assertEq(skills[0].name, "Skill50", "Second page first skill incorrect");
        assertEq(skills[49].name, "Skill99", "Last skill incorrect");
    }

    /// @notice Test edge cases: offset beyond total
    function testOffsetBeyondTotal() public {
        vm.startPrank(user1);
        for (uint256 i = 0; i < 5; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Offset equals total
        (SkillProfile.Skill[] memory skills, uint256 total) = profile.getSkills(user1, 5, 10);
        assertEq(skills.length, 0, "Should return empty array when offset equals total");
        assertEq(total, 5, "Total should still be 5");

        // Offset beyond total
        (skills, total) = profile.getSkills(user1, 100, 10);
        assertEq(skills.length, 0, "Should return empty array when offset > total");
    }

    /// @notice Test edge cases: limit exceeds remaining items
    function testLimitExceedsRemaining() public {
        vm.startPrank(user1);
        for (uint256 i = 0; i < 5; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Request more than available
        (SkillProfile.Skill[] memory skills, uint256 total) = profile.getSkills(user1, 0, 100);
        assertEq(skills.length, 5, "Should return all 5 skills");
        assertEq(total, 5, "Total should be 5");

        // Partial page at end
        (skills, total) = profile.getSkills(user1, 3, 10);
        assertEq(skills.length, 2, "Should return remaining 2 skills");
    }

    /// @notice Test experience pagination
    function testExperiencePagination() public {
        vm.startPrank(user1);
        for (uint256 i = 0; i < 20; i++) {
            profile.addExperience(
                string(abi.encodePacked("Company", vm.toString(i))),
                string(abi.encodePacked("Position", vm.toString(i))),
                block.timestamp - 365 days,
                block.timestamp,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Get first page
        (SkillProfile.Experience[] memory exp, uint256 total) = profile.getExperience(user1, 0, 10);
        assertEq(total, 20, "Total should be 20");
        assertEq(exp.length, 10, "Should return 10 experience entries");
        assertEq(exp[0].company, "Company0", "First company incorrect");

        // Get second page
        (exp, total) = profile.getExperience(user1, 10, 10);
        assertEq(exp.length, 10, "Should return next 10 experience entries");
        assertEq(exp[0].company, "Company10", "Second page first company incorrect");
    }

    /// @notice Test education pagination
    function testEducationPagination() public {
        vm.startPrank(user1);
        for (uint256 i = 0; i < 15; i++) {
            profile.addEducation(
                string(abi.encodePacked("Institution", vm.toString(i))),
                string(abi.encodePacked("Degree", vm.toString(i))),
                "Computer Science",
                block.timestamp,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Get first page
        (SkillProfile.Education[] memory edu, uint256 total) = profile.getEducation(user1, 0, 5);
        assertEq(total, 15, "Total should be 15");
        assertEq(edu.length, 5, "Should return 5 education entries");

        // Get last page (partial)
        (edu, total) = profile.getEducation(user1, 10, 10);
        assertEq(edu.length, 5, "Should return remaining 5 education entries");
    }

    /// @notice Test count helper functions
    function testCountHelpers() public {
        vm.startPrank(user1);
        
        // Add skills
        for (uint256 i = 0; i < 10; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }

        // Add experience
        for (uint256 i = 0; i < 5; i++) {
            profile.addExperience(
                string(abi.encodePacked("Company", vm.toString(i))),
                "Position",
                block.timestamp - 365 days,
                block.timestamp,
                "ipfs://hash"
            );
        }

        // Add education
        for (uint256 i = 0; i < 3; i++) {
            profile.addEducation(
                "Institution",
                "Degree",
                "Field",
                block.timestamp,
                "ipfs://hash"
            );
        }
        
        vm.stopPrank();

        // Test count functions
        assertEq(profile.getSkillsCount(user1), 10, "Skills count incorrect");
        assertEq(profile.getExperienceCount(user1), 5, "Experience count incorrect");
        assertEq(profile.getEducationCount(user1), 3, "Education count incorrect");
    }

    /// @notice Test pagination with zero items
    function testPaginationWithZeroItems() public {
        (SkillProfile.Skill[] memory skills, uint256 total) = profile.getSkills(user1, 0, 10);
        assertEq(total, 0, "Total should be 0");
        assertEq(skills.length, 0, "Should return empty array");
    }

    /// @notice Test pagination consistency after removals
    function testPaginationAfterRemovals() public {
        vm.startPrank(user1);
        
        // Add 10 skills
        for (uint256 i = 0; i < 10; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }

        // Remove skill at index 5
        profile.removeSkill(5);
        
        vm.stopPrank();

        // Verify count
        assertEq(profile.getSkillsCount(user1), 9, "Count should be 9 after removal");

        // Get all remaining skills
        (SkillProfile.Skill[] memory skills, uint256 total) = profile.getSkills(user1, 0, 20);
        assertEq(total, 9, "Total should be 9");
        assertEq(skills.length, 9, "Should return 9 skills");
    }

    /// @notice Test multiple users pagination isolation
    function testMultipleUsersPaginationIsolation() public {
        // User 1 adds 10 skills
        vm.startPrank(user1);
        for (uint256 i = 0; i < 10; i++) {
            profile.addSkill(
                string(abi.encodePacked("User1Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // User 2 adds 5 skills
        vm.startPrank(user2);
        for (uint256 i = 0; i < 5; i++) {
            profile.addSkill(
                string(abi.encodePacked("User2Skill", vm.toString(i))),
                60,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Verify user 1 data
        (SkillProfile.Skill[] memory skills1, uint256 total1) = profile.getSkills(user1, 0, 20);
        assertEq(total1, 10, "User 1 should have 10 skills");
        assertEq(skills1[0].name, "User1Skill0", "User 1 first skill incorrect");

        // Verify user 2 data
        (SkillProfile.Skill[] memory skills2, uint256 total2) = profile.getSkills(user2, 0, 20);
        assertEq(total2, 5, "User 2 should have 5 skills");
        assertEq(skills2[0].name, "User2Skill0", "User 2 first skill incorrect");
    }

    /// @notice Stress test: Maximum allowed skills per user
    function testMaxSkillsPerUser() public {
        vm.startPrank(user1);
        
        // Add maximum allowed skills (100)
        for (uint256 i = 0; i < 100; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        
        vm.stopPrank();

        // Test pagination at max capacity
        (SkillProfile.Skill[] memory skills, uint256 total) = profile.getSkills(user1, 0, 50);
        assertEq(total, 100, "Total should be 100");
        assertEq(skills.length, 50, "Should return 50 skills");

        // Get second half
        (skills, total) = profile.getSkills(user1, 50, 50);
        assertEq(skills.length, 50, "Should return remaining 50 skills");
    }
}
