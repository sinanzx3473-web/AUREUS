// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";
import "../src/SkillClaim.sol";
import "../src/Endorsement.sol";
import "../src/AgentOracle.sol";

/**
 * @title DoS Attack Resistance Tests
 * @notice Tests contract resistance to Denial of Service attacks via unbounded iterations
 * @dev Simulates adversarial scenarios with maximum data to prove gas safety
 */
contract DoSTest is Test {
    SkillProfile public skillProfile;
    SkillClaim public skillClaim;
    Endorsement public endorsement;
    AgentOracle public agentOracle;

    address public admin = address(this);
    address public attacker = address(0xBAD);
    address public victim = address(0x1);
    address public verifier = address(0x2);

    // Gas limit for Ethereum blocks (30M gas)
    uint256 constant BLOCK_GAS_LIMIT = 30_000_000;
    
    // Conservative safe limit for view functions (10M gas)
    uint256 constant SAFE_VIEW_GAS_LIMIT = 10_000_000;

    function setUp() public {
        skillProfile = new SkillProfile(admin);
        agentOracle = new AgentOracle(admin);
        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));
        endorsement = new Endorsement(admin);

        // Grant verifier role
        skillClaim.grantRole(skillClaim.VERIFIER_ROLE(), verifier);
        // Grant SkillClaim contract VERIFIER_ROLE in SkillProfile so it can verify skills
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), address(skillClaim));
    }

    /// @notice Test SkillProfile.getSkills with maximum items (100)
    function testSkillProfileMaxItemsGasSafety() public {
        console.log("\n=== SkillProfile Max Items Gas Safety ===");
        
        vm.startPrank(victim);
        skillProfile.createProfile("Victim", bytes32("ipfs://hash"));
        
        // Add maximum allowed skills (100)
        for (uint256 i = 0; i < 100; i++) {
            skillProfile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Test pagination with different page sizes
        uint256[] memory pageSizes = new uint256[](5);
        pageSizes[0] = 10;
        pageSizes[1] = 20;
        pageSizes[2] = 50;
        pageSizes[3] = 100;
        pageSizes[4] = 200; // Request more than exists

        for (uint256 i = 0; i < pageSizes.length; i++) {
            uint256 pageSize = pageSizes[i];
            uint256 gasBefore = gasleft();
            
            (SkillProfile.Skill[] memory skills, uint256 total) = skillProfile.getSkills(victim, 0, pageSize);
            
            uint256 gasUsed = gasBefore - gasleft();
            
            console.log("Page size %d: %d gas (returned %d items)", pageSize, gasUsed, skills.length);
            assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
            assertEq(total, 100, "Total should always be 100");
        }
    }

    /// @notice Test SkillClaim.getUserClaims with maximum items (200)
    function testSkillClaimMaxItemsGasSafety() public {
        console.log("\n=== SkillClaim Max Items Gas Safety ===");
        
        // Create maximum allowed claims (200)
        vm.startPrank(victim);
        for (uint256 i = 0; i < 200; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i))),
                "Description",
                "ipfs://evidence",
                0
            );
        }
        vm.stopPrank();

        // Test pagination
        uint256[] memory pageSizes = new uint256[](4);
        pageSizes[0] = 50;
        pageSizes[1] = 100;
        pageSizes[2] = 200;
        pageSizes[3] = 500; // Request more than exists

        for (uint256 i = 0; i < pageSizes.length; i++) {
            uint256 pageSize = pageSizes[i];
            uint256 gasBefore = gasleft();
            
            (uint256[] memory claimIds, uint256 total) = skillClaim.getUserClaims(victim, 0, pageSize);
            
            uint256 gasUsed = gasBefore - gasleft();
            
            console.log("Page size %d: %d gas (returned %d items)", pageSize, gasUsed, claimIds.length);
            assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
            assertEq(total, 200, "Total should always be 200");
        }
    }

    /// @notice Test SkillClaim.getClaimsByStatus with maximum items
    /// @dev This function iterates through ALL claims to filter by status - potential DoS vector
    function testSkillClaimGetClaimsByStatusGasSafety() public {
        console.log("\n=== SkillClaim.getClaimsByStatus Gas Safety ===");
        
        // Setup: Create profile and add 100 skills (max allowed)
        vm.startPrank(victim);
        skillProfile.createProfile("Victim", bytes32("ipfs://profile"));
        for (uint256 i = 0; i < 100; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        // Create 200 claims from victim (reusing skills)
        vm.startPrank(victim);
        for (uint256 i = 0; i < 200; i++) {
            skillClaim.createClaim(
                string(abi.encodePacked("Skill", vm.toString(i % 100))),
                "Description",
                "ipfs://evidence",
                i % 100
            );
        }
        vm.stopPrank();

        // Assign and approve half of them
        for (uint256 i = 0; i < 100; i++) {
            skillClaim.assignClaim(i, verifier);
            vm.prank(verifier);
            skillClaim.approveClaim(i, "Approved");
        }

        // Test filtering by status (worst case: iterates through all 200 claims)
        uint256 gasBefore = gasleft();
        (uint256[] memory claimIds, uint256 total) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Approved,
            0,
            50
        );
        uint256 gasUsed = gasBefore - gasleft();

        console.log("getClaimsByStatus (200 total, 100 approved, page 50): %d gas", gasUsed);
        console.log("Returned %d items, total approved: %d", claimIds.length, total);
        
        assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
        assertEq(total, 100, "Should have 100 approved claims");
        assertEq(claimIds.length, 50, "Should return 50 claim IDs");
    }

    /// @notice Test Endorsement.getReceivedEndorsements with maximum items (500)
    function testEndorsementMaxItemsGasSafety() public {
        console.log("\n=== Endorsement Max Items Gas Safety ===");
        
        // Create 500 endorsements (max allowed) from different users
        for (uint256 i = 0; i < 500; i++) {
            address endorser = address(uint160(1000 + i));
            vm.prank(endorser);
            endorsement.createEndorsement(
                victim,
                string(abi.encodePacked("Skill", vm.toString(i % 50))),
                "Great work!"
            );
        }

        // Test pagination
        uint256[] memory pageSizes = new uint256[](5);
        pageSizes[0] = 50;
        pageSizes[1] = 100;
        pageSizes[2] = 250;
        pageSizes[3] = 500;
        pageSizes[4] = 1000; // Request more than exists

        for (uint256 i = 0; i < pageSizes.length; i++) {
            uint256 pageSize = pageSizes[i];
            uint256 gasBefore = gasleft();
            
            (uint256[] memory endorsementIds, uint256 total) = endorsement.getReceivedEndorsements(victim, 0, pageSize);
            
            uint256 gasUsed = gasBefore - gasleft();
            
            console.log("Page size %d: %d gas (returned %d items)", pageSize, gasUsed, endorsementIds.length);
            assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
            assertEq(total, 500, "Total should always be 500");
        }
    }

    /// @notice Test Endorsement.getActiveEndorsements with maximum items and revocations
    /// @dev This function iterates through ALL endorsements to filter active ones - potential DoS vector
    function testEndorsementGetActiveEndorsementsGasSafety() public {
        console.log("\n=== Endorsement.getActiveEndorsements Gas Safety ===");
        
        // Create 500 endorsements from different users
        for (uint256 i = 0; i < 500; i++) {
            address endorser = address(uint160(2000 + i));
            vm.prank(endorser);
            endorsement.createEndorsement(
                victim,
                string(abi.encodePacked("Skill", vm.toString(i % 50))),
                "Great!"
            );
        }

        // Revoke every 3rd endorsement (worst case for filtering)
        for (uint256 i = 0; i < 500; i += 3) {
            address endorser = address(uint160(2000 + i));
            vm.prank(endorser);
            endorsement.revokeEndorsement(i);
        }

        // Test filtering active endorsements (worst case: iterates through all 500)
        uint256 gasBefore = gasleft();
        (uint256[] memory activeIds, uint256 activeTotal) = endorsement.getActiveEndorsements(victim, 0, 100);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("getActiveEndorsements (500 total, ~333 active, page 100): %d gas", gasUsed);
        console.log("Returned %d items, total active: %d", activeIds.length, activeTotal);
        
        assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
        assertTrue(activeTotal > 300 && activeTotal < 350, "Should have ~333 active endorsements");
        assertEq(activeIds.length, 100, "Should return 100 endorsement IDs");
    }

    /// @notice Test Endorsement.getActiveReferences with maximum items
    function testEndorsementGetActiveReferencesGasSafety() public {
        console.log("\n=== Endorsement.getActiveReferences Gas Safety ===");
        
        // Create 100 references (max allowed) from different users
        for (uint256 i = 0; i < 100; i++) {
            address referrer = address(uint160(3000 + i));
            vm.prank(referrer);
            endorsement.createReference(
                victim,
                "Colleague",
                string(abi.encodePacked("Reference", vm.toString(i))),
                "ipfs://ref"
            );
        }

        // Revoke every 4th reference
        for (uint256 i = 0; i < 100; i += 4) {
            address referrer = address(uint160(3000 + i));
            vm.prank(referrer);
            endorsement.revokeReference(i);
        }

        // Test filtering active references
        uint256 gasBefore = gasleft();
        (uint256[] memory activeIds, uint256 activeTotal) = endorsement.getActiveReferences(victim, 0, 50);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("getActiveReferences (100 total, 75 active, page 50): %d gas", gasUsed);
        console.log("Returned %d items, total active: %d", activeIds.length, activeTotal);
        
        assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
        assertEq(activeTotal, 75, "Should have 75 active references");
        assertEq(activeIds.length, 50, "Should return 50 reference IDs");
    }

    /// @notice Simulate adversarial scenario: Attacker creates maximum data across all contracts
    function testAdversarialMaxDataAllContracts() public {
        console.log("\n=== Adversarial Scenario: Max Data All Contracts ===");
        
        vm.startPrank(attacker);
        
        // SkillProfile: Max skills (100)
        skillProfile.createProfile("Attacker", bytes32("ipfs://hash"));
        for (uint256 i = 0; i < 100; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 50, "ipfs://hash");
        }
        
        // SkillClaim: Max claims (200)
        for (uint256 i = 0; i < 200; i++) {
            skillClaim.createClaim(string(abi.encodePacked("Skill", vm.toString(i))), "Desc", "ipfs://evidence", 0);
        }
        
        vm.stopPrank();

        // Endorsement: Max endorsements (500) from different users
        for (uint256 i = 0; i < 500; i++) {
            address endorser = address(uint160(5000 + i));
            vm.prank(endorser);
            endorsement.createEndorsement(attacker, string(abi.encodePacked("Skill", vm.toString(i % 50))), "Great!");
        }

        // Test all view functions still work within gas limits
        console.log("\nTesting all view functions with max data:");
        
        uint256 gasBefore = gasleft();
        skillProfile.getSkills(attacker, 0, 100);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("  getSkills(100): %d gas", gasUsed);
        assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "getSkills exceeds safe limit");

        gasBefore = gasleft();
        skillClaim.getUserClaims(attacker, 0, 200);
        gasUsed = gasBefore - gasleft();
        console.log("  getUserClaims(200): %d gas", gasUsed);
        assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "getUserClaims exceeds safe limit");

        gasBefore = gasleft();
        endorsement.getReceivedEndorsements(attacker, 0, 500);
        gasUsed = gasBefore - gasleft();
        console.log("  getReceivedEndorsements(500): %d gas", gasUsed);
        assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "getReceivedEndorsements exceeds safe limit");
    }

    /// @notice Test pagination offset at various positions with max data
    function testPaginationOffsetVariationsMaxData() public {
        console.log("\n=== Pagination Offset Variations with Max Data ===");
        
        // Create max endorsements (500)
        for (uint256 i = 0; i < 500; i++) {
            address endorser = address(uint160(6000 + i));
            vm.prank(endorser);
            endorsement.createEndorsement(victim, string(abi.encodePacked("Skill", vm.toString(i % 50))), "Great!");
        }

        // Test different offset positions
        uint256[] memory offsets = new uint256[](5);
        offsets[0] = 0;
        offsets[1] = 100;
        offsets[2] = 250;
        offsets[3] = 400;
        offsets[4] = 490;

        for (uint256 i = 0; i < offsets.length; i++) {
            uint256 offset = offsets[i];
            uint256 gasBefore = gasleft();
            
            (uint256[] memory endorsementIds, uint256 total) = endorsement.getReceivedEndorsements(victim, offset, 50);
            
            uint256 gasUsed = gasBefore - gasleft();
            uint256 expectedLength = (offset + 50 > 500) ? (500 - offset) : 50;
            
            console.log("Offset %d: %d gas (returned %d items)", offset, gasUsed, endorsementIds.length);
            assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
            assertEq(endorsementIds.length, expectedLength, "Incorrect number of items returned");
        }
    }

    /// @notice Test worst-case scenario for getClaimsByStatus with all claims in one status
    function testWorstCaseGetClaimsByStatusAllSameStatus() public {
        console.log("\n=== Worst Case: All Claims Same Status ===");
        
        // Create 200 claims
        vm.startPrank(victim);
        for (uint256 i = 0; i < 200; i++) {
            skillClaim.createClaim(string(abi.encodePacked("Skill", vm.toString(i))), "Desc", "ipfs://evidence", 0);
        }
        vm.stopPrank();

        // All claims are pending - worst case for pagination
        uint256 gasBefore = gasleft();
        (uint256[] memory claimIds, uint256 total) = skillClaim.getClaimsByStatus(
            SkillClaim.ClaimStatus.Pending,
            0,
            200
        );
        uint256 gasUsed = gasBefore - gasleft();

        console.log("All 200 claims pending, request 200: %d gas", gasUsed);
        assertLt(gasUsed, SAFE_VIEW_GAS_LIMIT, "Gas usage exceeds safe limit");
        assertEq(total, 200, "Should have 200 pending claims");
        assertEq(claimIds.length, 200, "Should return all 200 claim IDs");
    }

    /// @notice Test gas cost consistency across multiple pagination calls
    function testGasConsistencyAcrossPaginationCalls() public {
        console.log("\n=== Gas Consistency Across Pagination Calls ===");
        
        // Create 500 endorsements
        for (uint256 i = 0; i < 500; i++) {
            address endorser = address(uint160(7000 + i));
            vm.prank(endorser);
            endorsement.createEndorsement(victim, string(abi.encodePacked("Skill", vm.toString(i % 50))), "Great!");
        }

        // Measure gas for 5 consecutive pages of 100 items each
        uint256[] memory gasUsages = new uint256[](5);
        
        for (uint256 page = 0; page < 5; page++) {
            uint256 offset = page * 100;
            uint256 gasBefore = gasleft();
            
            endorsement.getReceivedEndorsements(victim, offset, 100);
            
            gasUsages[page] = gasBefore - gasleft();
            console.log("Page %d (offset %d): %d gas", page, offset, gasUsages[page]);
        }

        // Verify gas usage is consistent (within 10% variance)
        uint256 avgGas = (gasUsages[0] + gasUsages[1] + gasUsages[2] + gasUsages[3] + gasUsages[4]) / 5;
        
        for (uint256 i = 0; i < 5; i++) {
            uint256 variance = gasUsages[i] > avgGas 
                ? ((gasUsages[i] - avgGas) * 100) / avgGas
                : ((avgGas - gasUsages[i]) * 100) / avgGas;
            
            console.log("Page %d variance from average: %d%%", i, variance);
            assertLt(variance, 10, "Gas variance exceeds 10%");
        }
    }
}
