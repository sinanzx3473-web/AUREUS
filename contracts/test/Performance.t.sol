// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/VerifierRegistry.sol";
import "../src/AgentOracle.sol";

/**
 * @title Performance and Stress Testing Suite
 * @notice Tests contract performance under high-volume transaction loads
 * @dev Measures gas costs, throughput, and identifies bottlenecks
 */
contract PerformanceTest is Test {
    SkillProfile public skillProfile;
    SkillClaim public skillClaim;
    Endorsement public endorsement;
    VerifierRegistry public verifierRegistry;
    AgentOracle public agentOracle;

    address public admin = address(0x1);
    address public verifier = address(0x2);
    address[] public users;
    
    uint256 constant NUM_USERS = 100;
    uint256 constant NUM_SKILLS_PER_USER = 10;
    uint256 constant NUM_CLAIMS_PER_USER = 5;
    uint256 constant NUM_ENDORSEMENTS_PER_USER = 3;

    struct GasMetrics {
        uint256 min;
        uint256 max;
        uint256 avg;
        uint256 total;
        uint256 count;
    }

    mapping(string => GasMetrics) public gasMetrics;

    event PerformanceMetric(string operation, uint256 gasUsed, uint256 iteration);

    function setUp() public {
        // Deploy contracts - constructor grants roles to admin
        skillProfile = new SkillProfile(admin);
        agentOracle = new AgentOracle(admin);
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        endorsement = new Endorsement(admin);
        verifierRegistry = new VerifierRegistry(admin);

        // Grant roles as admin
        vm.startPrank(admin);
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), address(skillClaim));
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier);
        
        // Register verifier
        string[] memory specializations = new string[](2);
        specializations[0] = "Solidity";
        specializations[1] = "Security";
        verifierRegistry.registerVerifier(verifier, "Test Verifier", "Test Org", specializations, "ipfs://verifier");
        vm.stopPrank();

        // Create test users
        for (uint256 i = 0; i < NUM_USERS; i++) {
            users.push(address(uint160(1000 + i)));
        }
    }

    function testProfileCreationPerformance() public {
        console.log("\n=== Profile Creation Performance ===");
        
        for (uint256 i = 0; i < NUM_USERS; i++) {
            address user = users[i];
            vm.startPrank(user);
            
            uint256 gasBefore = gasleft();
            skillProfile.createProfile(
                string(abi.encodePacked("User", vm.toString(i))),
                bytes32("ipfs://metadata")
            );
            uint256 gasUsed = gasBefore - gasleft();
            
            recordGasMetric("createProfile", gasUsed);
            emit PerformanceMetric("createProfile", gasUsed, i);
            
            vm.stopPrank();
        }
        
        printGasMetrics("createProfile");
    }

    function testBulkSkillAdditionPerformance() public {
        console.log("\n=== Bulk Skill Addition Performance ===");
        
        // First create profiles
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.prank(users[i]);
            skillProfile.createProfile("User", bytes32("ipfs://metadata"));
        }

        // Add multiple skills per user
        for (uint256 i = 0; i < NUM_USERS; i++) {
            address user = users[i];
            vm.startPrank(user);
            
            for (uint256 j = 0; j < NUM_SKILLS_PER_USER; j++) {
                uint256 gasBefore = gasleft();
                skillProfile.addSkill(
                    string(abi.encodePacked("Skill", vm.toString(j))),
                    uint8((j % 5) + 1), // Proficiency 1-5
                    "ipfs://skill"
                );
                uint256 gasUsed = gasBefore - gasleft();
                
                recordGasMetric("addSkill", gasUsed);
                
                if (j == 0 || j == NUM_SKILLS_PER_USER - 1) {
                    emit PerformanceMetric("addSkill", gasUsed, i * NUM_SKILLS_PER_USER + j);
                }
            }
            
            vm.stopPrank();
        }
        
        printGasMetrics("addSkill");
    }

    function testClaimCreationPerformance() public {
        console.log("\n=== Claim Creation Performance ===");
        
        // Setup: Create profiles and skills
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.startPrank(users[i]);
            skillProfile.createProfile("User", bytes32("ipfs://metadata"));
            skillProfile.addSkill("Solidity", 5, "ipfs://skill");
            vm.stopPrank();
        }

        // Create claims
        for (uint256 i = 0; i < NUM_USERS; i++) {
            address user = users[i];
            
            for (uint256 j = 0; j < NUM_CLAIMS_PER_USER; j++) {
                vm.startPrank(user);
                
                uint256 gasBefore = gasleft();
                skillClaim.createClaim(
                    "Solidity",
                    string(abi.encodePacked("Evidence", vm.toString(j))),
                    "ipfs://evidence",
                    0
                );
                uint256 gasUsed = gasBefore - gasleft();
                
                recordGasMetric("createClaim", gasUsed);
                emit PerformanceMetric("createClaim", gasUsed, i * NUM_CLAIMS_PER_USER + j);
                
                vm.stopPrank();
            }
        }
        
        printGasMetrics("createClaim");
    }

    function testClaimVerificationPerformance() public {
        console.log("\n=== Claim Verification Performance ===");
        
        // Setup: Create profiles, skills, and claims
        uint256[] memory claimIds = new uint256[](NUM_USERS * NUM_CLAIMS_PER_USER);
        uint256 claimIndex = 0;
        
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.startPrank(users[i]);
            skillProfile.createProfile("User", bytes32("ipfs://metadata"));
            // Add multiple skills for each user to support multiple claims
            for (uint256 k = 0; k < NUM_CLAIMS_PER_USER; k++) {
                skillProfile.addSkill(string(abi.encodePacked("Solidity", vm.toString(k))), 5, "ipfs://skill");
            }
            
            for (uint256 j = 0; j < NUM_CLAIMS_PER_USER; j++) {
                claimIds[claimIndex] = skillClaim.createClaim(string(abi.encodePacked("Solidity", vm.toString(j))), "Evidence", "ipfs://evidence", j);
                claimIndex++;
            }
            vm.stopPrank();
        }

        // Assign and verify claims
        vm.startPrank(admin);
        for (uint256 i = 0; i < claimIds.length; i++) {
            skillClaim.assignClaim(claimIds[i], verifier);
        }
        vm.stopPrank();
        
        vm.startPrank(verifier);
        for (uint256 i = 0; i < claimIds.length; i++) {
            uint256 gasBefore = gasleft();
            skillClaim.approveClaim(claimIds[i], "Verified");
            uint256 gasUsed = gasBefore - gasleft();
            
            recordGasMetric("verifyClaim", gasUsed);
            
            if (i % 50 == 0) {
                emit PerformanceMetric("verifyClaim", gasUsed, i);
            }
        }
        vm.stopPrank();
        
        printGasMetrics("verifyClaim");
    }

    function testEndorsementPerformance() public {
        console.log("\n=== Endorsement Performance ===");
        
        // Setup: Create profiles and skills
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.startPrank(users[i]);
            skillProfile.createProfile("User", bytes32("ipfs://metadata"));
            skillProfile.addSkill("Solidity", 5, "ipfs://skill");
            vm.stopPrank();
        }

        // Create endorsements (each user endorses different skills on the next user)
        for (uint256 i = 0; i < NUM_USERS - 1; i++) {
            address endorser = users[i];
            address endorsed = users[i + 1];
            
            // Add multiple skills to endorsed user
            vm.startPrank(endorsed);
            for (uint256 j = 0; j < NUM_ENDORSEMENTS_PER_USER; j++) {
                skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(j))), 5, "ipfs://skill");
            }
            vm.stopPrank();
            
            vm.startPrank(endorser);
            for (uint256 j = 0; j < NUM_ENDORSEMENTS_PER_USER; j++) {
                uint256 gasBefore = gasleft();
                endorsement.createEndorsement(endorsed, string(abi.encodePacked("Skill", vm.toString(j))), "Great developer!");
                uint256 gasUsed = gasBefore - gasleft();
                
                recordGasMetric("endorseSkill", gasUsed);
                emit PerformanceMetric("endorseSkill", gasUsed, i * NUM_ENDORSEMENTS_PER_USER + j);
            }
            vm.stopPrank();
        }
        
        printGasMetrics("endorseSkill");
    }

    function testPaginationPerformance() public {
        console.log("\n=== Pagination Performance ===");
        
        // Setup: Create a user with many skills
        address user = users[0];
        vm.startPrank(user);
        skillProfile.createProfile("User", bytes32("ipfs://metadata"));
        
        for (uint256 i = 0; i < 50; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 5, "ipfs://skill");
        }
        vm.stopPrank();

        // Test pagination with different page sizes
        uint256[] memory pageSizes = new uint256[](4);
        pageSizes[0] = 5;
        pageSizes[1] = 10;
        pageSizes[2] = 20;
        pageSizes[3] = 50;

        for (uint256 i = 0; i < pageSizes.length; i++) {
            uint256 pageSize = pageSizes[i];
            
            uint256 gasBefore = gasleft();
            skillProfile.getSkills(user, 0, pageSize);
            uint256 gasUsed = gasBefore - gasleft();
            
            string memory metricName = string(abi.encodePacked("pagination_", vm.toString(pageSize)));
            recordGasMetric(metricName, gasUsed);
            console.log("Page size %d: %d gas", pageSize, gasUsed);
        }
    }

    function testBatchOperationsPerformance() public {
        console.log("\n=== Batch Operations Performance ===");
        
        // Test batch profile creation
        uint256 gasBefore = gasleft();
        
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(users[i]);
            skillProfile.createProfile("User", bytes32("ipfs://metadata"));
        }
        
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Batch profile creation (10 users): %d gas", gasUsed);
        console.log("Average per profile: %d gas", gasUsed / 10);
    }

    function testWorstCaseScenarios() public {
        console.log("\n=== Worst Case Scenarios ===");
        
        address user = users[0];
        vm.startPrank(user);
        skillProfile.createProfile("User", bytes32("ipfs://metadata"));
        
        // Add maximum skills
        for (uint256 i = 0; i < 100; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 5, "ipfs://skill");
        }
        
        // Test retrieval with large dataset
        uint256 gasBefore = gasleft();
        skillProfile.getSkills(user, 0, 100);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Get all skills (100 skills): %d gas", gasUsed);
        
        // Test pagination on large dataset
        gasBefore = gasleft();
        skillProfile.getSkills(user, 0, 20);
        gasUsed = gasBefore - gasleft();
        console.log("Paginated retrieval (20 of 100): %d gas", gasUsed);
        
        vm.stopPrank();
    }

    // Helper functions
    function recordGasMetric(string memory operation, uint256 gasUsed) internal {
        GasMetrics storage metrics = gasMetrics[operation];
        
        if (metrics.count == 0) {
            metrics.min = gasUsed;
            metrics.max = gasUsed;
        } else {
            if (gasUsed < metrics.min) metrics.min = gasUsed;
            if (gasUsed > metrics.max) metrics.max = gasUsed;
        }
        
        metrics.total += gasUsed;
        metrics.count++;
        metrics.avg = metrics.total / metrics.count;
    }

    function printGasMetrics(string memory operation) internal view {
        GasMetrics memory metrics = gasMetrics[operation];
        
        console.log("\nGas Metrics for %s:", operation);
        console.log("  Count:   %d", metrics.count);
        console.log("  Min:     %d", metrics.min);
        console.log("  Max:     %d", metrics.max);
        console.log("  Average: %d", metrics.avg);
        console.log("  Total:   %d", metrics.total);
        
        if (metrics.max > 0 && metrics.min > 0) {
            uint256 variance = ((metrics.max - metrics.min) * 100) / metrics.avg;
            console.log("  Variance: %d%%", variance);
        }
    }
}
