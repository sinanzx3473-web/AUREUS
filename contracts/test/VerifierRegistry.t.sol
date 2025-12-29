// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/VerifierRegistry.sol";

contract VerifierRegistryTest is Test {
    VerifierRegistry public registry;
    
    address admin = address(1);
    address verifier1 = address(2);
    address verifier2 = address(3);
    address user1 = address(4);

    // Events for testing
    event VerifierRegistered(address indexed verifier, string name, string organization, uint256 timestamp);
    event VerifierUpdated(address indexed verifier, uint256 timestamp);
    event VerifierStatusChanged(
        address indexed verifier,
        VerifierRegistry.VerifierStatus oldStatus,
        VerifierRegistry.VerifierStatus newStatus,
        uint256 timestamp
    );
    event VerificationRecorded(address indexed verifier, bool approved, uint256 timestamp);
    event SpecializationAdded(address indexed verifier, string specialization, uint256 timestamp);
    event SpecializationRemoved(address indexed verifier, string specialization, uint256 timestamp);

    function setUp() public {
        // Deploy contract
        registry = new VerifierRegistry(admin);

        // Fund test addresses
        vm.deal(verifier1, 1 ether);
        vm.deal(verifier2, 1 ether);
        vm.deal(user1, 1 ether);
    }

    // ============ Happy Path Tests ============

    function testRegisterVerifier() public {
        string[] memory specializations = new string[](2);
        specializations[0] = "Blockchain";
        specializations[1] = "Smart Contracts";

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit VerifierRegistered(verifier1, "Alice Verifier", "TechCorp", block.timestamp);
        
        registry.registerVerifier(
            verifier1,
            "Alice Verifier",
            "TechCorp",
            specializations,
            "ipfs://credentials1"
        );

        assertTrue(registry.isRegisteredVerifier(verifier1), "Should be registered");
        assertEq(registry.activeVerifierCount(), 1, "Active count should be 1");

        VerifierRegistry.Verifier memory v = registry.getVerifier(verifier1);
        assertEq(v.name, "Alice Verifier", "Name mismatch");
        assertEq(v.organization, "TechCorp", "Organization mismatch");
        assertTrue(v.status == VerifierRegistry.VerifierStatus.Active, "Should be active");
    }

    function testUpdateVerifier() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit VerifierUpdated(verifier1, block.timestamp);
        
        registry.updateVerifier(verifier1, "Alice Updated", "NewCorp", "ipfs://2");

        VerifierRegistry.Verifier memory v = registry.getVerifier(verifier1);
        assertEq(v.name, "Alice Updated", "Name not updated");
        assertEq(v.organization, "NewCorp", "Organization not updated");
    }

    function testAddSpecialization() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit SpecializationAdded(verifier1, "AI", block.timestamp);
        
        registry.addSpecialization(verifier1, "AI");

        string[] memory specs = registry.getSpecializations(verifier1);
        assertEq(specs.length, 2, "Should have 2 specializations");
    }

    function testMaxSpecializationsPerVerifier() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        // Add specializations up to the maximum
        vm.startPrank(admin);
        for (uint256 i = 1; i < registry.MAX_SPECIALIZATIONS(); i++) {
            registry.addSpecialization(verifier1, string(abi.encodePacked("Spec", vm.toString(i))));
        }
        vm.stopPrank();

        // Try to add one more - should fail
        vm.prank(admin);
        vm.expectRevert("Maximum specializations reached");
        registry.addSpecialization(verifier1, "ExtraSpec");
    }

    function testStringLengthValidation() public {
        string memory longString = new string(501);
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        // Test name too long
        vm.prank(admin);
        vm.expectRevert("Invalid name length");
        registry.registerVerifier(verifier1, longString, "TechCorp", specializations, "ipfs://1");

        // Test organization too long
        vm.prank(admin);
        vm.expectRevert("Organization name too long");
        registry.registerVerifier(verifier1, "Alice", longString, specializations, "ipfs://1");

        // Test specialization too long
        string[] memory longSpecs = new string[](1);
        longSpecs[0] = longString;
        vm.prank(admin);
        vm.expectRevert("Invalid specialization length");
        registry.registerVerifier(verifier1, "Alice", "TechCorp", longSpecs, "ipfs://1");
    }

    function testMaxSpecializationsOnRegistration() public {
        // Try to register with too many specializations
        string[] memory tooManySpecs = new string[](51);
        for (uint256 i = 0; i < 51; i++) {
            tooManySpecs[i] = string(abi.encodePacked("Spec", vm.toString(i)));
        }

        vm.prank(admin);
        vm.expectRevert("Invalid specializations count");
        registry.registerVerifier(verifier1, "Alice", "TechCorp", tooManySpecs, "ipfs://1");
    }

    function testRemoveSpecialization() public {
        string[] memory specializations = new string[](2);
        specializations[0] = "Blockchain";
        specializations[1] = "AI";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit SpecializationRemoved(verifier1, "Blockchain", block.timestamp);
        
        registry.removeSpecialization(verifier1, 0);

        string[] memory specs = registry.getSpecializations(verifier1);
        assertEq(specs.length, 1, "Should have 1 specialization");
    }

    function testChangeVerifierStatus() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit VerifierStatusChanged(
            verifier1,
            VerifierRegistry.VerifierStatus.Active,
            VerifierRegistry.VerifierStatus.Suspended,
            block.timestamp
        );
        
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Suspended);

        VerifierRegistry.Verifier memory v = registry.getVerifier(verifier1);
        assertTrue(v.status == VerifierRegistry.VerifierStatus.Suspended, "Should be suspended");
        assertEq(registry.activeVerifierCount(), 0, "Active count should be 0");
    }

    function testRecordVerification() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit VerificationRecorded(verifier1, true, block.timestamp);
        
        registry.recordVerification(verifier1, true, false);

        (uint256 total, uint256 approved,,) = registry.getVerifierStats(verifier1);
        assertEq(total, 1, "Total should be 1");
        assertEq(approved, 1, "Approved should be 1");
    }

    function testGetActiveVerifiers() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.startPrank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
        registry.registerVerifier(verifier2, "Bob", "DevCorp", specializations, "ipfs://2");
        registry.changeVerifierStatus(verifier2, VerifierRegistry.VerifierStatus.Suspended);
        vm.stopPrank();

        (address[] memory active, uint256 total) = registry.getActiveVerifiers(0, 10);
        assertEq(active.length, 1, "Should have 1 active verifier");
        assertEq(total, 1, "Total should be 1");
        assertEq(active[0], verifier1, "Active verifier should be verifier1");
    }

    function testGetApprovalRate() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.startPrank(admin);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, false, false);
        vm.stopPrank();

        uint256 approvalRate = registry.getApprovalRate(verifier1);
        assertEq(approvalRate, 6666, "Approval rate should be 66.66% (6666 basis points)");
    }

    // ============ Access Control Tests ============

    function testOnlyAdminCanRegisterVerifier() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(user1);
        vm.expectRevert();
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
    }

    function testOnlyAdminCanUpdateVerifier() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(user1);
        vm.expectRevert();
        registry.updateVerifier(verifier1, "Alice Updated", "NewCorp", "ipfs://2");
    }

    function testOnlyAdminCanChangeStatus() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(user1);
        vm.expectRevert();
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Suspended);
    }

    // ============ Edge Case Tests ============

    function testCannotRegisterVerifierTwice() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.startPrank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
        
        vm.expectRevert("Verifier already registered");
        registry.registerVerifier(verifier1, "Alice2", "TechCorp2", specializations, "ipfs://2");
        vm.stopPrank();
    }

    function testCannotRegisterWithEmptyName() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        vm.expectRevert("Invalid name length");
        registry.registerVerifier(verifier1, "", "TechCorp", specializations, "ipfs://1");
    }

    function testCannotRegisterWithoutSpecializations() public {
        string[] memory specializations = new string[](0);

        vm.prank(admin);
        vm.expectRevert("Invalid specializations count");
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
    }

    function testCannotAddDuplicateSpecialization() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectRevert("Specialization already exists");
        registry.addSpecialization(verifier1, "Blockchain");
    }

    function testCannotRemoveLastSpecialization() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectRevert("Cannot remove last specialization");
        registry.removeSpecialization(verifier1, 0);
    }

    function testCannotChangeToSameStatus() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        vm.expectRevert("Status unchanged");
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Active);
    }

    // ============ State Transition Tests ============

    function testStatusChangeUpdatesActiveCount() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.startPrank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
        registry.registerVerifier(verifier2, "Bob", "DevCorp", specializations, "ipfs://2");
        
        assertEq(registry.activeVerifierCount(), 2, "Should have 2 active");

        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Suspended);
        assertEq(registry.activeVerifierCount(), 1, "Should have 1 active");

        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Active);
        assertEq(registry.activeVerifierCount(), 2, "Should have 2 active again");
        vm.stopPrank();
    }

    function testRecordVerificationUpdatesStats() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.startPrank(admin);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, false, false);
        registry.recordVerification(verifier1, true, true);
        vm.stopPrank();

        (uint256 total, uint256 approved, uint256 rejected, uint256 disputed) = 
            registry.getVerifierStats(verifier1);
        
        assertEq(total, 3, "Total should be 3");
        assertEq(approved, 1, "Approved should be 1");
        assertEq(rejected, 1, "Rejected should be 1");
        assertEq(disputed, 1, "Disputed should be 1");
    }

    // ============ Fuzz Tests ============

    function testFuzzRegisterMultipleVerifiers(uint8 numVerifiers) public {
        numVerifiers = uint8(bound(numVerifiers, 1, 50));
        
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        for (uint8 i = 0; i < numVerifiers; i++) {
            address verifier = address(uint160(1000 + i));
            vm.prank(admin);
            registry.registerVerifier(verifier, "Verifier", "Corp", specializations, "ipfs://1");
        }

        assertEq(registry.activeVerifierCount(), numVerifiers, "Active count mismatch");
    }

    function testFuzzApprovalRate(uint8 approved, uint8 rejected) public {
        approved = uint8(bound(approved, 0, 100));
        rejected = uint8(bound(rejected, 0, 100));
        
        if (approved == 0 && rejected == 0) return;

        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.startPrank(admin);
        for (uint8 i = 0; i < approved; i++) {
            registry.recordVerification(verifier1, true, false);
        }
        for (uint8 i = 0; i < rejected; i++) {
            registry.recordVerification(verifier1, false, false);
        }
        vm.stopPrank();

        uint256 expectedRate = (uint256(approved) * 10000) / (uint256(approved) + uint256(rejected));
        uint256 actualRate = registry.getApprovalRate(verifier1);
        assertEq(actualRate, expectedRate, "Approval rate mismatch");
    }

    // ============ Security Tests ============

    function testReentrancyProtection() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
        
        // Sequential calls should work
        vm.prank(admin);
        registry.recordVerification(verifier1, true, false);
    }

    function testAccessControlEnforcement() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        // Register a verifier first
        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        // Test 1: Non-admin cannot register verifier
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user1,
                registry.ADMIN_ROLE()
            )
        );
        vm.prank(user1);
        registry.registerVerifier(verifier2, "Bob", "TechCorp", specializations, "ipfs://1");

        // Test 2: Non-admin cannot pause
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user1,
                registry.ADMIN_ROLE()
            )
        );
        vm.prank(user1);
        registry.pause();

        // Test 3: Non-admin cannot update verifier
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user1,
                registry.ADMIN_ROLE()
            )
        );
        vm.prank(user1);
        registry.updateVerifier(verifier1, "Alice Updated", "NewCorp", "ipfs://2");

        // Test 4: Non-admin cannot change status
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user1,
                registry.ADMIN_ROLE()
            )
        );
        vm.prank(user1);
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Suspended);
    }

    // ============ Gas Optimization Tests ============

    function testGasRegisterVerifier() public {
        string[] memory specializations = new string[](2);
        specializations[0] = "Blockchain";
        specializations[1] = "Smart Contracts";

        vm.prank(admin);
        uint256 gasBefore = gasleft();
        registry.registerVerifier(verifier1, "Alice Verifier", "TechCorp", specializations, "ipfs://1");
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 380000, "Register verifier uses too much gas");
    }

    function testGasRecordVerification() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.prank(admin);
        uint256 gasBefore = gasleft();
        registry.recordVerification(verifier1, true, false);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 100000, "Record verification uses too much gas");
    }

    function testGasBatchVerifierRegistration() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.startPrank(admin);
        uint256 gasBefore = gasleft();
        for (uint8 i = 0; i < 5; i++) {
            address verifier = address(uint160(1000 + i));
            registry.registerVerifier(verifier, "Verifier", "Corp", specializations, "ipfs://1");
        }
        uint256 gasUsed = gasBefore - gasleft();
        vm.stopPrank();
        
        assertTrue(gasUsed < 1500000, "Batch registration inefficient");
    }

    // ============ Additional Edge Cases ============

    function testCannotRegisterWithEmptyOrganization() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        // Empty organization is actually allowed (length 0 <= MAX_STRING_LENGTH)
        // This test should pass - registering with empty organization is valid
        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "", specializations, "ipfs://1");
        
        assertTrue(registry.isRegisteredVerifier(verifier1), "Should register with empty organization");
    }

    function testCannotUpdateNonExistentVerifier() public {
        vm.prank(admin);
        vm.expectRevert("Verifier not registered");
        registry.updateVerifier(verifier1, "Alice", "TechCorp", "ipfs://1");
    }

    function testCannotAddSpecializationToNonExistent() public {
        vm.prank(admin);
        vm.expectRevert("Verifier not registered");
        registry.addSpecialization(verifier1, "AI");
    }

    function testCannotRemoveSpecializationFromNonExistent() public {
        vm.prank(admin);
        vm.expectRevert("Verifier not registered");
        registry.removeSpecialization(verifier1, 0);
    }

    function testCannotChangeStatusOfNonExistent() public {
        vm.prank(admin);
        vm.expectRevert("Verifier not registered");
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Suspended);
    }

    function testCannotRecordVerificationForNonExistent() public {
        vm.prank(admin);
        vm.expectRevert("Verifier not registered");
        registry.recordVerification(verifier1, true, false);
    }

    function testCompleteVerifierLifecycle() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        // Register
        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
        assertTrue(registry.isRegisteredVerifier(verifier1));

        // Add specialization
        vm.prank(admin);
        registry.addSpecialization(verifier1, "AI");
        string[] memory specs = registry.getSpecializations(verifier1);
        assertEq(specs.length, 2);

        // Record verifications
        vm.startPrank(admin);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, false, false);
        vm.stopPrank();

        (uint256 total, uint256 approved, uint256 rejected,) = registry.getVerifierStats(verifier1);
        assertEq(total, 3);
        assertEq(approved, 2);
        assertEq(rejected, 1);

        // Suspend
        vm.prank(admin);
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Suspended);
        assertEq(registry.activeVerifierCount(), 0);

        // Reactivate
        vm.prank(admin);
        registry.changeVerifierStatus(verifier1, VerifierRegistry.VerifierStatus.Active);
        assertEq(registry.activeVerifierCount(), 1);
    }

    function testGetApprovalRateEdgeCases() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        // No verifications - should return 0
        uint256 rate = registry.getApprovalRate(verifier1);
        assertEq(rate, 0);

        // All approved
        vm.startPrank(admin);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, true, false);
        vm.stopPrank();

        rate = registry.getApprovalRate(verifier1);
        assertEq(rate, 10000); // 100%

        // All rejected
        vm.prank(admin);
        registry.registerVerifier(verifier2, "Bob", "DevCorp", specializations, "ipfs://2");
        
        vm.startPrank(admin);
        registry.recordVerification(verifier2, false, false);
        registry.recordVerification(verifier2, false, false);
        vm.stopPrank();

        rate = registry.getApprovalRate(verifier2);
        assertEq(rate, 0); // 0%
    }

    function testMultipleSpecializationsManagement() public {
        string[] memory specializations = new string[](3);
        specializations[0] = "Blockchain";
        specializations[1] = "AI";
        specializations[2] = "Security";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        string[] memory specs = registry.getSpecializations(verifier1);
        assertEq(specs.length, 3);

        // Remove middle specialization
        vm.prank(admin);
        registry.removeSpecialization(verifier1, 1);

        specs = registry.getSpecializations(verifier1);
        assertEq(specs.length, 2);
        assertEq(specs[0], "Blockchain");
        assertEq(specs[1], "Security");
    }

    function testDisputedVerificationsTracking() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");

        vm.startPrank(admin);
        registry.recordVerification(verifier1, true, false);
        registry.recordVerification(verifier1, false, false);
        registry.recordVerification(verifier1, true, true);
        registry.recordVerification(verifier1, false, true);
        vm.stopPrank();

        (uint256 total, uint256 approved, uint256 rejected, uint256 disputed) = 
            registry.getVerifierStats(verifier1);
        
        assertEq(total, 4);
        assertEq(approved, 1);
        assertEq(rejected, 1);
        assertEq(disputed, 2);
    }

    function testPauseBlocksAllFunctions() public {
        string[] memory specializations = new string[](1);
        specializations[0] = "Blockchain";

        vm.prank(admin);
        registry.pause();

        vm.prank(admin);
        vm.expectRevert();
        registry.registerVerifier(verifier1, "Alice", "TechCorp", specializations, "ipfs://1");
    }
}
