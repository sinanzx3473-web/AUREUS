// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";

contract SkillProfileTest is Test {
    SkillProfile public skillProfile;
    
    address admin = address(1);
    address verifier = address(2);
    address user1 = address(3);
    address user2 = address(4);

    // Events for testing
    event ProfileCreated(address indexed user, string name, uint256 timestamp, uint256 tokenId);
    event ProfileUpdated(address indexed user, uint256 timestamp);
    event SkillAdded(address indexed user, string skillName, uint8 proficiencyLevel, uint256 timestamp);
    event SkillVerified(address indexed user, uint256 skillIndex, address indexed verifier, uint256 timestamp);
    event ExperienceAdded(address indexed user, string company, string position, uint256 timestamp);
    event EducationAdded(address indexed user, string institution, string degree, uint256 timestamp);
    event SkillRemoved(address indexed user, uint256 skillIndex, uint256 timestamp);
    event ExperienceRemoved(address indexed user, uint256 experienceIndex, uint256 timestamp);
    event EducationRemoved(address indexed user, uint256 educationIndex, uint256 timestamp);
    event TierUpdated(address indexed user, SkillProfile.Tier oldTier, SkillProfile.Tier newTier, uint256 verifiedSkillCount, uint256 timestamp);

    function setUp() public {
        // Deploy contract - constructor will grant roles to admin
        skillProfile = new SkillProfile(admin);

        // Grant verifier role as admin
        vm.startPrank(admin);
        skillProfile.grantRole(skillProfile.VERIFIER_ROLE(), verifier);
        vm.stopPrank();

        // Fund test addresses
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
    }

    // ============ Happy Path Tests ============

    function testCreateProfileMintsNFT() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit ProfileCreated(user1, "Alice", block.timestamp, 0);
        
        skillProfile.createProfile("Alice", ipfsHash);

        (string memory name, bytes32 storedHash, uint256 createdAt, uint256 updatedAt, bool exists, uint256 tokenId, SkillProfile.Tier tier) = 
            skillProfile.profiles(user1);
        
        assertEq(name, "Alice", "Name mismatch");
        assertEq(storedHash, ipfsHash, "IPFS hash mismatch");
        assertTrue(exists, "Profile should exist");
        assertEq(tokenId, 0, "Token ID should be 0");
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Iron), "Should start with Iron tier");
        assertEq(skillProfile.totalProfiles(), 1, "Total profiles should be 1");
        
        // Verify NFT ownership
        assertEq(skillProfile.ownerOf(0), user1, "User should own NFT");
        assertEq(skillProfile.balanceOf(user1), 1, "User should have 1 NFT");
    }

    function testUpdateProfile() public {
        bytes32 ipfsHash1 = bytes32("QmX1234567890abcdefghijklmnopqr");
        bytes32 ipfsHash2 = bytes32("QmY9876543210zyxwvutsrqponmlkji");
        
        // Create profile first
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash1);

        // Update profile
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit ProfileUpdated(user1, block.timestamp);
        
        skillProfile.updateProfile("Alice Updated", ipfsHash2);

        (string memory name, bytes32 storedHash,,,,,) = 
            skillProfile.profiles(user1);
        
        assertEq(name, "Alice Updated", "Name not updated");
        assertEq(storedHash, ipfsHash2, "IPFS hash not updated");
    }

    function testAddSkill() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        // Create profile first
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);

        // Add skill
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit SkillAdded(user1, "Solidity", 85, block.timestamp);
        
        skillProfile.addSkill("Solidity", 85, "ipfs://skill1");

        (SkillProfile.Skill[] memory skills, uint256 total) = skillProfile.getSkills(user1, 0, 10);
        assertEq(skills.length, 1, "Should have 1 skill");
        assertEq(total, 1, "Total should be 1");
        assertEq(skills[0].name, "Solidity", "Skill name mismatch");
        assertEq(skills[0].proficiencyLevel, 85, "Proficiency level mismatch");
        assertFalse(skills[0].verified, "Skill should not be verified");
    }

    function testVerifySkillUpdatesTierToSilver() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        // Create profile and add 3 skills
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.startPrank(user1);
        skillProfile.addSkill("Solidity", 85, "ipfs://skill1");
        skillProfile.addSkill("Rust", 75, "ipfs://skill2");
        skillProfile.addSkill("JavaScript", 90, "ipfs://skill3");
        vm.stopPrank();

        // Verify 3 skills to reach Silver tier
        vm.startPrank(verifier);
        skillProfile.verifySkill(user1, 0);
        skillProfile.verifySkill(user1, 1);
        
        // Third verification should trigger tier update event
        vm.expectEmit(true, false, false, false);
        emit TierUpdated(user1, SkillProfile.Tier.Iron, SkillProfile.Tier.Silver, 3, block.timestamp);
        skillProfile.verifySkill(user1, 2);
        vm.stopPrank();

        (,,,,,, SkillProfile.Tier tier) = skillProfile.profiles(user1);
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Silver), "Should be Silver tier");
        
        // Verify NFT URI updated
        uint256 tokenId = 0;
        string memory tokenURI = skillProfile.tokenURI(tokenId);
        assertEq(tokenURI, skillProfile.tierURIs(SkillProfile.Tier.Silver), "Token URI should match Silver tier");
    }

    function testVerifySkillUpdatesTierToGold() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        // Create profile and add 10 skills
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.startPrank(user1);
        for (uint8 i = 0; i < 10; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        // Verify 10 skills to reach Gold tier
        vm.startPrank(verifier);
        for (uint256 i = 0; i < 10; i++) {
            skillProfile.verifySkill(user1, i);
        }
        vm.stopPrank();

        (,,,,,, SkillProfile.Tier tier) = skillProfile.profiles(user1);
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Gold), "Should be Gold tier");
        
        // Verify NFT URI updated
        uint256 tokenId = 0;
        string memory tokenURI = skillProfile.tokenURI(tokenId);
        assertEq(tokenURI, skillProfile.tierURIs(SkillProfile.Tier.Gold), "Token URI should match Gold tier");
    }

    function testGetVerifiedSkillCount() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.startPrank(user1);
        skillProfile.addSkill("Solidity", 85, "ipfs://skill1");
        skillProfile.addSkill("Rust", 75, "ipfs://skill2");
        skillProfile.addSkill("JavaScript", 90, "ipfs://skill3");
        vm.stopPrank();

        // Verify 2 skills
        vm.startPrank(verifier);
        skillProfile.verifySkill(user1, 0);
        skillProfile.verifySkill(user1, 2);
        vm.stopPrank();

        uint256 verifiedCount = skillProfile.getVerifiedSkillCount(user1);
        assertEq(verifiedCount, 2, "Should have 2 verified skills");
    }

    function testManualTierUpdate() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.startPrank(user1);
        for (uint8 i = 0; i < 5; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        // Verify skills
        vm.startPrank(verifier);
        for (uint256 i = 0; i < 5; i++) {
            skillProfile.verifySkill(user1, i);
        }
        vm.stopPrank();

        // Manually call updateProfileTier
        skillProfile.updateProfileTier(user1);

        (,,,,,, SkillProfile.Tier tier) = skillProfile.profiles(user1);
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Silver), "Should be Silver tier");
    }

    function testSetTierURI() public {
        string memory newURI = "ipfs://QmNewGoldTierURI";
        
        vm.prank(admin);
        skillProfile.setTierURI(SkillProfile.Tier.Gold, newURI);
        
        assertEq(skillProfile.tierURIs(SkillProfile.Tier.Gold), newURI, "Tier URI should be updated");
    }

    function testNFTIsSoulbound() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);

        // Try to transfer NFT - should fail
        vm.prank(user1);
        vm.expectRevert("Soulbound: Transfer not allowed");
        skillProfile.transferFrom(user1, user2, 0);
    }

    function testNFTCannotBeApprovedForTransfer() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);

        // Approve should work but transfer will still fail
        vm.prank(user1);
        skillProfile.approve(user2, 0);

        vm.prank(user2);
        vm.expectRevert("Soulbound: Transfer not allowed");
        skillProfile.transferFrom(user1, user2, 0);
    }

    function testRemoveSkillUpdatesTier() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.startPrank(user1);
        for (uint8 i = 0; i < 10; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        // Verify 10 skills to reach Gold tier
        vm.startPrank(verifier);
        for (uint256 i = 0; i < 10; i++) {
            skillProfile.verifySkill(user1, i);
        }
        vm.stopPrank();

        (,,,,,, SkillProfile.Tier tier) = skillProfile.profiles(user1);
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Gold), "Should be Gold tier");

        // Remove verified skills to drop to Silver (remove 7 skills, leaving 3 verified)
        vm.startPrank(user1);
        for (uint256 i = 0; i < 7; i++) {
            skillProfile.removeSkill(0); // Always remove first skill
        }
        vm.stopPrank();

        (,,,,,, SkillProfile.Tier newTier) = skillProfile.profiles(user1);
        assertEq(uint256(newTier), uint256(SkillProfile.Tier.Silver), "Should drop to Silver tier with 3 verified skills");
    }

    // ============ Access Control Tests ============

    function testOnlyVerifierCanVerifySkill() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        // Create profile and add skill
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.prank(user1);
        skillProfile.addSkill("Solidity", 85, "ipfs://skill1");

        // Try to verify as non-verifier
        vm.prank(user2);
        vm.expectRevert();
        skillProfile.verifySkill(user1, 0);
    }

    function testOnlyAdminCanSetTierURI() public {
        vm.prank(user1);
        vm.expectRevert();
        skillProfile.setTierURI(SkillProfile.Tier.Gold, "ipfs://newURI");
    }

    function testOnlyAdminCanPause() public {
        // Try to pause as non-admin
        vm.prank(user1);
        vm.expectRevert();
        skillProfile.pause();

        // Pause as admin
        vm.prank(admin);
        skillProfile.pause();
    }

    function testOnlyAdminCanUnpause() public {
        // Pause first
        vm.prank(admin);
        skillProfile.pause();

        // Try to unpause as non-admin
        vm.prank(user1);
        vm.expectRevert();
        skillProfile.unpause();

        // Unpause as admin
        vm.prank(admin);
        skillProfile.unpause();
    }

    // ============ Edge Case Tests ============

    function testCannotCreateProfileTwice() public {
        bytes32 ipfsHash1 = bytes32("QmX1234567890abcdefghijklmnopqr");
        bytes32 ipfsHash2 = bytes32("QmY9876543210zyxwvutsrqponmlkji");
        
        vm.startPrank(user1);
        skillProfile.createProfile("Alice", ipfsHash1);
        
        vm.expectRevert("Profile already exists");
        skillProfile.createProfile("Alice2", ipfsHash2);
        vm.stopPrank();
    }

    function testCannotCreateProfileWithEmptyName() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        vm.expectRevert("Invalid name length");
        skillProfile.createProfile("", ipfsHash);
    }

    function testCannotCreateProfileWithZeroHash() public {
        vm.prank(user1);
        vm.expectRevert("Invalid IPFS hash");
        skillProfile.createProfile("Alice", bytes32(0));
    }

    function testCannotUpdateProfileWithZeroHash() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);

        vm.prank(user1);
        vm.expectRevert("Invalid IPFS hash");
        skillProfile.updateProfile("Alice Updated", bytes32(0));
    }

    function testCannotUpdateNonExistentProfile() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        vm.expectRevert("Profile does not exist");
        skillProfile.updateProfile("Alice", ipfsHash);
    }

    function testCannotAddSkillWithoutProfile() public {
        vm.prank(user1);
        vm.expectRevert("Profile does not exist");
        skillProfile.addSkill("Solidity", 85, "ipfs://skill1");
    }

    function testCannotAddSkillWithInvalidProficiency() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);

        vm.prank(user1);
        vm.expectRevert("Invalid proficiency level");
        skillProfile.addSkill("Solidity", 0, "ipfs://skill1");

        vm.prank(user1);
        vm.expectRevert("Invalid proficiency level");
        skillProfile.addSkill("Solidity", 101, "ipfs://skill1");
    }

    function testCannotVerifyInvalidSkillIndex() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);

        vm.prank(verifier);
        vm.expectRevert("Invalid skill index");
        skillProfile.verifySkill(user1, 0);
    }

    function testCannotVerifyAlreadyVerifiedSkill() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.prank(user1);
        skillProfile.addSkill("Solidity", 85, "ipfs://skill1");

        vm.prank(verifier);
        skillProfile.verifySkill(user1, 0);

        vm.prank(verifier);
        vm.expectRevert("Skill already verified");
        skillProfile.verifySkill(user1, 0);
    }

    function testCannotUpdateTierForNonExistentProfile() public {
        vm.expectRevert("Profile does not exist");
        skillProfile.updateProfileTier(user1);
    }

    function testCannotSetEmptyTierURI() public {
        vm.prank(admin);
        vm.expectRevert("Invalid URI");
        skillProfile.setTierURI(SkillProfile.Tier.Gold, "");
    }

    // ============ State Transition Tests ============

    function testPausePreventsFunctions() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(admin);
        skillProfile.pause();

        vm.prank(user1);
        vm.expectRevert();
        skillProfile.createProfile("Alice", ipfsHash);
    }

    function testUnpauseRestoresFunctions() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(admin);
        skillProfile.pause();

        vm.prank(admin);
        skillProfile.unpause();

        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
    }

    function testTierTransitionIronToSilverToGold() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        // Start with Iron tier
        (,,,,,, SkillProfile.Tier tier) = skillProfile.profiles(user1);
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Iron), "Should start with Iron");

        // Add and verify 3 skills for Silver
        vm.startPrank(user1);
        for (uint8 i = 0; i < 3; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        vm.startPrank(verifier);
        for (uint256 i = 0; i < 3; i++) {
            skillProfile.verifySkill(user1, i);
        }
        vm.stopPrank();

        (,,,,,, tier) = skillProfile.profiles(user1);
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Silver), "Should be Silver");

        // Add and verify 7 more skills for Gold (total 10)
        vm.startPrank(user1);
        for (uint8 i = 3; i < 10; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        vm.startPrank(verifier);
        for (uint256 i = 3; i < 10; i++) {
            skillProfile.verifySkill(user1, i);
        }
        vm.stopPrank();

        (,,,,,, tier) = skillProfile.profiles(user1);
        assertEq(uint256(tier), uint256(SkillProfile.Tier.Gold), "Should be Gold");
    }

    // ============ Event Emission Tests ============

    function testTierUpdatedEventEmission() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.startPrank(user1);
        for (uint8 i = 0; i < 3; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        vm.startPrank(verifier);
        skillProfile.verifySkill(user1, 0);
        skillProfile.verifySkill(user1, 1);
        
        // Third verification should trigger tier update
        vm.expectEmit(true, false, false, true);
        emit TierUpdated(user1, SkillProfile.Tier.Iron, SkillProfile.Tier.Silver, 3, block.timestamp);
        skillProfile.verifySkill(user1, 2);
        vm.stopPrank();
    }

    // ============ Fuzz Tests ============

    function testFuzzAddSkillProficiency(uint8 proficiency) public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        proficiency = uint8(bound(proficiency, 1, 100));
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);

        vm.prank(user1);
        skillProfile.addSkill("Solidity", proficiency, "ipfs://skill1");

        (SkillProfile.Skill[] memory skills, uint256 total) = skillProfile.getSkills(user1, 0, 10);
        assertEq(skills[0].proficiencyLevel, proficiency, "Proficiency mismatch");
        assertEq(total, 1, "Total should be 1");
    }

    function testFuzzMultipleProfiles(uint8 numProfiles) public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        numProfiles = uint8(bound(numProfiles, 1, 50));
        
        for (uint8 i = 0; i < numProfiles; i++) {
            address user = address(uint160(1000 + i));
            vm.prank(user);
            skillProfile.createProfile("User", ipfsHash);
            
            // Verify each user owns their NFT
            assertEq(skillProfile.ownerOf(i), user, "User should own their NFT");
        }

        assertEq(skillProfile.totalProfiles(), numProfiles, "Total profiles mismatch");
    }

    // ============ Integration Tests ============

    function testMultipleUsersWithDifferentTiers() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        // User1: Iron tier (0 verified skills)
        vm.prank(user1);
        skillProfile.createProfile("User1", ipfsHash);
        
        // User2: Silver tier (5 verified skills)
        vm.prank(user2);
        skillProfile.createProfile("User2", ipfsHash);
        
        vm.startPrank(user2);
        for (uint8 i = 0; i < 5; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        vm.startPrank(verifier);
        for (uint256 i = 0; i < 5; i++) {
            skillProfile.verifySkill(user2, i);
        }
        vm.stopPrank();

        // Verify tiers
        (,,,,,, SkillProfile.Tier tier1) = skillProfile.profiles(user1);
        (,,,,,, SkillProfile.Tier tier2) = skillProfile.profiles(user2);
        
        assertEq(uint256(tier1), uint256(SkillProfile.Tier.Iron), "User1 should be Iron");
        assertEq(uint256(tier2), uint256(SkillProfile.Tier.Silver), "User2 should be Silver");
    }

    function testSupportsInterface() public {
        // Test ERC721 interface support
        assertTrue(skillProfile.supportsInterface(0x80ac58cd), "Should support ERC721");
        
        // Test AccessControl interface support
        assertTrue(skillProfile.supportsInterface(0x7965db0b), "Should support AccessControl");
    }

    // ============ Gas Optimization Tests ============

    function testGasCreateProfileWithNFT() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        skillProfile.createProfile("Alice", ipfsHash);
        uint256 gasUsed = gasBefore - gasleft();
        
        // NFT minting adds overhead but should still be reasonable
        assertTrue(gasUsed < 300000, "Profile creation with NFT uses too much gas");
    }

    function testGasVerifySkillWithTierUpdate() public {
        bytes32 ipfsHash = bytes32("QmX1234567890abcdefghijklmnopqr");
        
        vm.prank(user1);
        skillProfile.createProfile("Alice", ipfsHash);
        
        vm.startPrank(user1);
        for (uint8 i = 0; i < 3; i++) {
            skillProfile.addSkill(string(abi.encodePacked("Skill", vm.toString(i))), 80, "ipfs://skill");
        }
        vm.stopPrank();

        vm.startPrank(verifier);
        skillProfile.verifySkill(user1, 0);
        skillProfile.verifySkill(user1, 1);
        
        // Third verification triggers tier update
        uint256 gasBefore = gasleft();
        skillProfile.verifySkill(user1, 2);
        uint256 gasUsed = gasBefore - gasleft();
        vm.stopPrank();
        
        assertTrue(gasUsed < 200000, "Skill verification with tier update uses too much gas");
    }
}
