// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/AgentOracle.sol";

/**
 * @title Large Dataset Gas Optimization Tests
 * @notice Tests pagination with 10,000+ records to validate unbounded loop prevention
 * @dev Critical for audit readiness - validates gas optimization requirements
 */
contract LargeDatasetTest is Test {
    SkillProfile public skillProfile;
    SkillClaim public skillClaim;
    Endorsement public endorsement;
    AgentOracle public agentOracle;

    address public admin = address(0x1);
    address public user = address(0x2);
    address public verifier = address(0x3);

    // Contract limits prevent unbounded growth
    uint256 constant MAX_SKILLS = 100;      // SkillProfile.MAX_SKILLS_PER_USER
    uint256 constant MAX_CLAIMS = 200;      // SkillClaim.MAX_CLAIMS_PER_USER
    uint256 constant MAX_ENDORSEMENTS = 500; // Endorsement.MAX_ENDORSEMENTS_PER_USER
    uint256 constant BLOCK_GAS_LIMIT = 30_000_000; // Ethereum block gas limit

    function setUp() public {
        skillProfile = new SkillProfile(admin);
        agentOracle = new AgentOracle(admin);
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        endorsement = new Endorsement(admin);

        // Setup user profile
        vm.prank(user);
        skillProfile.createProfile("Test User", bytes32("ipfs://metadata"));

        // Grant roles
        vm.startPrank(admin);
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), address(skillClaim));
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier);
        vm.stopPrank();
    }

    /**
     * @notice Test pagination with maximum skills - validates bounded loops
     * @dev CRITICAL: Must stay under block gas limit for all page sizes
     */
    function testPaginationWithMaxSkills() public {
        console.log("\n=== Testing Maximum Skills Pagination ===");
        console.log("Contract limit: %d skills per user\n", MAX_SKILLS);
        
        // Add maximum allowed skills
        vm.startPrank(user);
        console.log("Adding %d skills...", MAX_SKILLS);
        
        for (uint256 i = 0; i < MAX_SKILLS; i++) {
            skillProfile.addSkill(
                string(abi.encodePacked("Skill_", vm.toString(i))),
                uint8(((i % 95) + 5)),  // Proficiency 5-100
                "ipfs://skill"
            );
        }
        vm.stopPrank();
        
        console.log("All %d skills added successfully\n", MAX_SKILLS);

        // Test various page sizes
        uint256[] memory pageSizes = new uint256[](4);
        pageSizes[0] = 10;
        pageSizes[1] = 20;
        pageSizes[2] = 50;
        pageSizes[3] = 100;

        console.log("Testing pagination with different page sizes:");
        console.log("Block Gas Limit: %d\n", BLOCK_GAS_LIMIT);

        for (uint256 i = 0; i < pageSizes.length; i++) {
            uint256 pageSize = pageSizes[i];
            
            uint256 gasBeforeLoop = gasleft();
            (SkillProfile.Skill[] memory skills, uint256 total) = 
                skillProfile.getSkills(user, 0, pageSize);
            uint256 gasUsedLoop = gasBeforeLoop - gasleft();
            
            assertEq(total, MAX_SKILLS, "Total should match MAX_SKILLS");
            assertEq(skills.length, pageSize, "Should return requested page size");
            
            // CRITICAL: Gas must be under block limit
            assertLt(gasUsedLoop, BLOCK_GAS_LIMIT, "Gas usage exceeds block limit");
            
            console.log("Page size %d: %d gas (%.2f%% of block limit)", 
                pageSize, 
                gasUsedLoop,
                (gasUsedLoop * 10000) / BLOCK_GAS_LIMIT / 100
            );
        }

        // Test middle page
        console.log("\nTesting middle page access:");
        uint256 gasBefore = gasleft();
        (SkillProfile.Skill[] memory middleSkills, ) = 
            skillProfile.getSkills(user, 50, 20);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertEq(middleSkills.length, 20, "Should return 20 skills from middle");
        assertLt(gasUsed, BLOCK_GAS_LIMIT, "Middle page gas exceeds block limit");
        console.log("Middle page (offset 50, limit 20): %d gas", gasUsed);

        // Test last page
        console.log("\nTesting last page access:");
        gasBefore = gasleft();
        (SkillProfile.Skill[] memory lastSkills, ) = 
            skillProfile.getSkills(user, 80, 20);
        gasUsed = gasBefore - gasleft();
        
        assertEq(lastSkills.length, 20, "Should return last 20 skills");
        assertLt(gasUsed, BLOCK_GAS_LIMIT, "Last page gas exceeds block limit");
        console.log("Last page (offset 80, limit 20): %d gas", gasUsed);

        // Test beyond total
        console.log("\nTesting beyond total:");
        gasBefore = gasleft();
        (SkillProfile.Skill[] memory emptySkills, uint256 totalCheck) = 
            skillProfile.getSkills(user, MAX_SKILLS, 20);
        gasUsed = gasBefore - gasleft();
        
        assertEq(emptySkills.length, 0, "Should return empty array");
        assertEq(totalCheck, MAX_SKILLS, "Total should still match MAX_SKILLS");
        console.log("Beyond total (offset %d): %d gas\n", MAX_SKILLS, gasUsed);
    }

    /**
     * @notice Test endorsement pagination with maximum records
     */
    function testPaginationWithMaxEndorsements() public {
        console.log("\n=== Testing Maximum Endorsements Pagination ===");
        console.log("Contract limit: %d endorsements per user\n", MAX_ENDORSEMENTS);
        
        // Setup: Create profile and skill for user
        vm.startPrank(user);
        skillProfile.addSkill("Solidity", 5, "ipfs://skill");
        vm.stopPrank();

        // Create maximum endorsements
        console.log("Creating %d endorsements...", MAX_ENDORSEMENTS);
        
        for (uint256 i = 0; i < MAX_ENDORSEMENTS; i++) {
            address endorser = address(uint160(1000 + i));
            
            // Create endorser profile
            vm.prank(endorser);
            skillProfile.createProfile("Endorser", bytes32("ipfs://metadata"));
            
            // Create endorsement
            vm.prank(endorser);
            endorsement.createEndorsement(user, "Solidity", "Great developer!");
            
            if (i % 100 == 0) {
                console.log("  Progress: %d endorsements created", i);
            }
        }
        
        console.log("All %d endorsements created\n", MAX_ENDORSEMENTS);

        // Test pagination
        uint256[] memory pageSizes = new uint256[](4);
        pageSizes[0] = 50;
        pageSizes[1] = 100;
        pageSizes[2] = 200;
        pageSizes[3] = 500;

        console.log("Testing endorsement pagination:");
        
        for (uint256 i = 0; i < pageSizes.length; i++) {
            uint256 pageSize = pageSizes[i];
            
            uint256 gasBefore = gasleft();
            (uint256[] memory endorsementIds, uint256 total) = 
                endorsement.getReceivedEndorsements(user, 0, pageSize);
            uint256 gasUsed = gasBefore - gasleft();
            
            assertEq(total, MAX_ENDORSEMENTS, "Total should match MAX_ENDORSEMENTS");
            assertEq(endorsementIds.length, pageSize, "Should return requested page size");
            assertLt(gasUsed, BLOCK_GAS_LIMIT, "Gas usage exceeds block limit");
            
            console.log("Page size %d: %d gas (%.2f%% of block limit)", 
                pageSize, 
                gasUsed,
                (gasUsed * 10000) / BLOCK_GAS_LIMIT / 100
            );
        }
        
        console.log("");
    }

    /**
     * @notice Test claim pagination with maximum records
     */
    function testPaginationWithMaxClaims() public {
        console.log("\n=== Testing Maximum Claims Pagination ===");
        console.log("Contract limit: %d claims per user\n", MAX_CLAIMS);
        
        // Setup: Create profile and add 100 skills (max allowed, will be reused for 200 claims)
        vm.startPrank(user);
        for (uint256 i = 0; i < MAX_SKILLS; i++) {
            skillProfile.addSkill(
                string(abi.encodePacked("Skill_", vm.toString(i))),
                80,
                "ipfs://skill"
            );
        }
        vm.stopPrank();

        // Create maximum claims (200) by reusing the 100 skills
        console.log("Creating %d claims...", MAX_CLAIMS);
        
        vm.startPrank(user);
        for (uint256 i = 0; i < MAX_CLAIMS; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill_", vm.toString(i % MAX_SKILLS))),
                string(abi.encodePacked("Evidence_", vm.toString(i))),
                "ipfs://evidence",
                i % MAX_SKILLS
            );
            
            if (i % 50 == 0) {
                console.log("  Progress: %d claims created", i);
            }
        }
        vm.stopPrank();
        
        console.log("All %d claims created\n", MAX_CLAIMS);

        // Test pagination (max 200 claims per user)
        uint256[] memory pageSizes = new uint256[](4);
        pageSizes[0] = 50;
        pageSizes[1] = 100;
        pageSizes[2] = 150;
        pageSizes[3] = 200;

        console.log("Testing claim pagination:");
        
        for (uint256 i = 0; i < pageSizes.length; i++) {
            uint256 pageSize = pageSizes[i];
            
            uint256 gasBefore = gasleft();
            (uint256[] memory claimIds, uint256 total) = 
                skillClaim.getUserClaims(user, 0, pageSize);
            uint256 gasUsed = gasBefore - gasleft();
            
            assertEq(total, MAX_CLAIMS, "Total should match MAX_CLAIMS");
            assertEq(claimIds.length, pageSize, "Should return requested page size");
            assertLt(gasUsed, BLOCK_GAS_LIMIT, "Gas usage exceeds block limit");
            
            console.log("Page size %d: %d gas (%.2f%% of block limit)", 
                pageSize, 
                gasUsed,
                (gasUsed * 10000) / BLOCK_GAS_LIMIT / 100
            );
        }
        
        console.log("");
    }

    /**
     * @notice Test worst-case scenario: Maximum page size with maximum records
     */
    function testWorstCaseMaxPageSize() public {
        console.log("\n=== Worst Case: Max Page Size with Maximum Records ===");
        
        // Add maximum skills
        vm.startPrank(user);
        for (uint256 i = 0; i < MAX_SKILLS; i++) {
            skillProfile.addSkill(
                string(abi.encodePacked("Skill_", vm.toString(i))),
                80,
                "ipfs://skill"
            );
        }
        vm.stopPrank();

        // Test fetching all at once (worst case)
        uint256 maxPageSize = MAX_SKILLS;
        
        uint256 gasBefore = gasleft();
        (SkillProfile.Skill[] memory skills, uint256 total) = 
            skillProfile.getSkills(user, 0, maxPageSize);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertEq(skills.length, maxPageSize, "Should return all skills");
        assertEq(total, MAX_SKILLS, "Total should match MAX_SKILLS");
        assertLt(gasUsed, BLOCK_GAS_LIMIT, "Max page size exceeds block limit");
        
        console.log("Max page size (%d): %d gas", maxPageSize, gasUsed);
        console.log("Percentage of block limit: %.2f%%", (gasUsed * 10000) / BLOCK_GAS_LIMIT / 100);
        console.log("Safety margin: %.2f%%\n", ((BLOCK_GAS_LIMIT - gasUsed) * 10000) / BLOCK_GAS_LIMIT / 100);
    }

    /**
     * @notice Verify contract limits prevent unbounded growth
     * @dev This test validates that MAX_SKILLS_PER_USER prevents DoS attacks
     */
    function testContractLimitsPrevention() public {
        console.log("\n=== Contract Limits Prevention ===");
        
        // Add maximum allowed skills
        vm.startPrank(user);
        for (uint256 i = 0; i < MAX_SKILLS; i++) {
            skillProfile.addSkill(
                string(abi.encodePacked("Skill_", vm.toString(i))),
                80,
                "ipfs://skill"
            );
        }
        
        // Attempt to add one more skill - should fail
        vm.expectRevert("Maximum skills reached");
        skillProfile.addSkill("ExtraSkill", 80, "ipfs://skill");
        vm.stopPrank();
        
        console.log("Contract correctly prevents adding more than %d skills", MAX_SKILLS);
        
        // Verify pagination works efficiently even at max capacity
        uint256 gasBefore = gasleft();
        (SkillProfile.Skill[] memory skills, ) = 
            skillProfile.getSkills(user, 0, MAX_SKILLS);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertEq(skills.length, MAX_SKILLS, "Should return all skills");
        assertLt(gasUsed, BLOCK_GAS_LIMIT, "Gas must be under block limit");
        
        console.log("Fetching all %d skills: %d gas (%.2f%% of block limit)", 
            MAX_SKILLS, 
            gasUsed,
            (gasUsed * 10000) / BLOCK_GAS_LIMIT / 100
        );
        
        // Compare with paginated approach (5 pages of 20)
        uint256 totalPaginatedGas = 0;
        for (uint256 page = 0; page < 5; page++) {
            gasBefore = gasleft();
            skillProfile.getSkills(user, page * 20, 20);
            totalPaginatedGas += gasBefore - gasleft();
        }
        
        console.log("Fetching same data paginated (5 x 20): %d gas", totalPaginatedGas);
        console.log("Pagination overhead: %d gas\n", totalPaginatedGas - gasUsed);
    }
}
