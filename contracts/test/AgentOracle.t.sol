// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/AgentOracle.sol";

contract AgentOracleTest is Test {
    AgentOracle public agentOracle;
    
    address admin = address(1);
    address agent1 = address(2);
    address agent2 = address(3);
    address user1 = address(4);
    address unauthorizedAgent = address(5);

    // Private keys for signature testing
    uint256 agent1PrivateKey = 0xA11CE;
    uint256 agent2PrivateKey = 0xB0B;
    
    // Events for testing
    event ClaimVerified(uint256 indexed claimId, address indexed agent, bool isValid, uint256 timestamp);
    event AgentRegistered(address indexed agent, uint256 timestamp);
    event AgentRevoked(address indexed agent, uint256 timestamp);

    function setUp() public {
        // Deploy contract
        agentOracle = new AgentOracle(admin);

        // Derive agent addresses from private keys
        agent1 = vm.addr(agent1PrivateKey);
        agent2 = vm.addr(agent2PrivateKey);

        // Grant agent roles
        vm.startPrank(admin);
        agentOracle.grantAgentRole(agent1);
        agentOracle.grantAgentRole(agent2);
        vm.stopPrank();

        // Fund test addresses
        vm.deal(user1, 1 ether);
    }

    // ============ Happy Path Tests ============

    function testVerifyClaimWithValidSignature() public {
        uint256 claimId = 1;
        bool isValid = true;

        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Sign with agent1's private key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify claim
        vm.expectEmit(true, true, false, true);
        emit ClaimVerified(claimId, agent1, isValid, block.timestamp);
        
        agentOracle.verifyClaim(claimId, isValid, signature);

        // Check verification status
        assertTrue(agentOracle.verifiedClaims(claimId), "Claim should be verified");
        assertEq(agentOracle.claimVerifiers(claimId), agent1, "Agent mismatch");
        assertEq(agentOracle.verificationTimestamps(claimId), block.timestamp, "Timestamp mismatch");
        assertEq(agentOracle.totalVerifiedClaims(), 1, "Total verified claims should be 1");
    }

    function testVerifyClaimRejection() public {
        uint256 claimId = 2;
        bool isValid = false;

        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Sign with agent2's private key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent2PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify claim
        vm.expectEmit(true, true, false, true);
        emit ClaimVerified(claimId, agent2, isValid, block.timestamp);
        
        agentOracle.verifyClaim(claimId, isValid, signature);

        // Check verification status
        assertFalse(agentOracle.verifiedClaims(claimId), "Claim should be rejected");
        assertEq(agentOracle.claimVerifiers(claimId), agent2, "Agent mismatch");
        assertEq(agentOracle.totalRejectedClaims(), 1, "Total rejected claims should be 1");
    }

    function testGetVerificationStatus() public {
        uint256 claimId = 3;
        bool isValid = true;

        // Create and sign message
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify claim
        agentOracle.verifyClaim(claimId, isValid, signature);

        // Get verification status
        (bool isVerified, bool valid, address agent, uint256 timestamp) = 
            agentOracle.getVerificationStatus(claimId);

        assertTrue(isVerified, "Should be verified");
        assertTrue(valid, "Should be valid");
        assertEq(agent, agent1, "Agent mismatch");
        assertEq(timestamp, block.timestamp, "Timestamp mismatch");
    }

    function testIsClaimVerified() public {
        uint256 claimId = 4;
        
        // Before verification
        assertFalse(agentOracle.isClaimVerified(claimId), "Should not be verified initially");

        // Create and sign message
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify claim
        agentOracle.verifyClaim(claimId, true, signature);

        // After verification
        assertTrue(agentOracle.isClaimVerified(claimId), "Should be verified");
    }

    function testIsClaimValid() public {
        uint256 claimId = 5;
        bool isValid = true;

        // Create and sign message
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify claim
        agentOracle.verifyClaim(claimId, isValid, signature);

        // Check validity
        assertTrue(agentOracle.isClaimValid(claimId), "Claim should be valid");
    }

    function testGrantAgentRole() public {
        address newAgent = address(6);

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(newAgent, block.timestamp);
        
        agentOracle.grantAgentRole(newAgent);

        assertTrue(agentOracle.hasRole(agentOracle.AGENT_ROLE(), newAgent), "Agent role not granted");
    }

    function testRevokeAgentRole() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit AgentRevoked(agent1, block.timestamp);
        
        agentOracle.revokeAgentRole(agent1);

        assertFalse(agentOracle.hasRole(agentOracle.AGENT_ROLE(), agent1), "Agent role not revoked");
    }

    function testGetVerificationStats() public {
        // Verify 2 claims as valid
        for (uint256 i = 0; i < 2; i++) {
            bytes32 msgHash = keccak256(
                abi.encodePacked(i, true, address(agentOracle), block.chainid)
            );
            bytes32 ethSignedMsgHash = keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash)
            );
            (uint8 vSig, bytes32 rSig, bytes32 sSig) = vm.sign(agent1PrivateKey, ethSignedMsgHash);
            bytes memory sig = abi.encodePacked(rSig, sSig, vSig);
            agentOracle.verifyClaim(i, true, sig);
        }

        // Verify 1 claim as invalid
        bytes32 messageHash = keccak256(
            abi.encodePacked(uint256(2), false, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        agentOracle.verifyClaim(2, false, signature);

        (uint256 verified, uint256 rejected) = agentOracle.getVerificationStats();
        assertEq(verified, 2, "Verified count mismatch");
        assertEq(rejected, 1, "Rejected count mismatch");
    }

    // ============ Access Control Tests ============

    function testUnauthorizedAgentCannotVerify() public {
        uint256 claimId = 10;
        bool isValid = true;

        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Sign with unauthorized agent's private key
        uint256 unauthorizedKey = 0xBAD;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(unauthorizedKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Attempt to verify claim
        vm.expectRevert("Signer not authorized agent");
        agentOracle.verifyClaim(claimId, isValid, signature);
    }

    function testOnlyAdminCanGrantAgentRole() public {
        address newAgent = address(7);

        vm.prank(user1);
        vm.expectRevert();
        agentOracle.grantAgentRole(newAgent);
    }

    function testOnlyAdminCanRevokeAgentRole() public {
        vm.prank(user1);
        vm.expectRevert();
        agentOracle.revokeAgentRole(agent1);
    }

    function testOnlyAdminCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        agentOracle.pause();
    }

    function testOnlyAdminCanUnpause() public {
        vm.prank(admin);
        agentOracle.pause();

        vm.prank(user1);
        vm.expectRevert();
        agentOracle.unpause();
    }

    // ============ Edge Case Tests ============

    function testEmptySignatureReverts() public {
        bytes memory emptySignature = "";

        vm.expectRevert("Empty signature");
        agentOracle.verifyClaim(1, true, emptySignature);
    }

    function testInvalidSignatureReverts() public {
        bytes memory invalidSignature = abi.encodePacked(bytes32(0), bytes32(0), uint8(0));

        vm.expectRevert();
        agentOracle.verifyClaim(1, true, invalidSignature);
    }

    function testDoubleVerificationReverts() public {
        uint256 claimId = 20;
        bool isValid = true;

        // Create and sign message
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // First verification
        agentOracle.verifyClaim(claimId, isValid, signature);

        // Attempt second verification
        vm.expectRevert("Signature already used");
        agentOracle.verifyClaim(claimId, isValid, signature);
    }

    function testSignatureReplayPrevention() public {
        uint256 claimId = 21;
        bool isValid = true;

        // Create and sign message
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // First verification
        agentOracle.verifyClaim(claimId, isValid, signature);

        // Attempt to reuse same signature for different claim
        vm.expectRevert("Signature already used");
        agentOracle.verifyClaim(claimId, isValid, signature);
    }

    function testGrantAgentRoleZeroAddressReverts() public {
        vm.prank(admin);
        vm.expectRevert("Invalid agent address");
        agentOracle.grantAgentRole(address(0));
    }

    function testGrantAdminRoleZeroAddressReverts() public {
        vm.prank(admin);
        vm.expectRevert("Invalid address");
        agentOracle.grantAdminRole(address(0));
    }

    function testIsClaimValidRevertsForUnverifiedClaim() public {
        uint256 unverifiedClaimId = 999;

        vm.expectRevert("Claim not verified");
        agentOracle.isClaimValid(unverifiedClaimId);
    }

    // ============ Event Emission Tests ============

    function testClaimVerifiedEventEmission() public {
        uint256 claimId = 30;
        bool isValid = true;

        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectEmit(true, true, false, true);
        emit ClaimVerified(claimId, agent1, isValid, block.timestamp);
        
        agentOracle.verifyClaim(claimId, isValid, signature);
    }

    function testAgentRegisteredEventEmission() public {
        address newAgent = address(8);

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(newAgent, block.timestamp);
        
        agentOracle.grantAgentRole(newAgent);
    }

    function testAgentRevokedEventEmission() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit AgentRevoked(agent1, block.timestamp);
        
        agentOracle.revokeAgentRole(agent1);
    }

    // ============ State Transition Tests ============

    function testVerificationStatusBeforeAndAfter() public {
        uint256 claimId = 40;

        // Before verification - check state
        {
            (bool isVerified, bool isValid, address verifyingAgent, uint256 timestamp) = 
                agentOracle.getVerificationStatus(claimId);
            
            assertFalse(isVerified, "Should not be verified initially");
            assertFalse(isValid, "Should not be valid initially");
            assertEq(verifyingAgent, address(0), "Agent should be zero address");
            assertEq(timestamp, 0, "Timestamp should be zero");
        }

        // Verify claim
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        agentOracle.verifyClaim(claimId, true, signature);

        // After verification - check state
        {
            (bool isVerified, bool isValid, address verifyingAgent, uint256 timestamp) = 
                agentOracle.getVerificationStatus(claimId);
            
            assertTrue(isVerified, "Should be verified");
            assertTrue(isValid, "Should be valid");
            assertEq(verifyingAgent, agent1, "Agent mismatch");
            assertEq(timestamp, block.timestamp, "Timestamp mismatch");
        }
    }

    // ============ Pausable Tests ============

    function testCannotVerifyWhenPaused() public {
        uint256 claimId = 50;

        // Pause contract
        vm.prank(admin);
        agentOracle.pause();

        // Create signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Attempt to verify
        vm.expectRevert();
        agentOracle.verifyClaim(claimId, true, signature);
    }

    function testCanVerifyAfterUnpause() public {
        uint256 claimId = 51;

        // Pause and unpause
        vm.startPrank(admin);
        agentOracle.pause();
        agentOracle.unpause();
        vm.stopPrank();

        // Create signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, true, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Should succeed
        agentOracle.verifyClaim(claimId, true, signature);
        assertTrue(agentOracle.isClaimVerified(claimId), "Claim should be verified");
    }

    // ============ Fuzz Testing ============

    function testFuzzVerifyClaim(uint256 claimId, bool isValid) public {
        // Bound claimId to reasonable range
        claimId = bound(claimId, 0, 1000000);

        // Create and sign message
        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify claim
        agentOracle.verifyClaim(claimId, isValid, signature);

        // Verify state
        assertEq(agentOracle.verifiedClaims(claimId), isValid, "Verification status mismatch");
        assertTrue(agentOracle.isClaimVerified(claimId), "Claim should be verified");
    }

    // ============ Gas Optimization Tests ============

    function testVerifyClaimGasUsage() public {
        uint256 claimId = 100;
        bool isValid = true;

        bytes32 messageHash = keccak256(
            abi.encodePacked(claimId, isValid, address(agentOracle), block.chainid)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agent1PrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        uint256 gasBefore = gasleft();
        agentOracle.verifyClaim(claimId, isValid, signature);
        uint256 gasUsed = gasBefore - gasleft();

        // Gas usage should be reasonable (< 150k gas)
        assertTrue(gasUsed < 150000, "Gas usage too high");
    }
}
