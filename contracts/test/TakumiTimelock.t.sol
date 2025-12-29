// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/TakumiTimelock.sol";
import "../src/SkillProfile.sol";

contract TakumiTimelockTest is Test {
    TakumiTimelock public timelock;
    SkillProfile public skillProfile;
    
    address public gnosisSafe;
    address public executor;
    address public user;
    
    uint256 public constant MIN_DELAY = 3 days;
    
    event CallScheduled(
        bytes32 indexed id,
        uint256 indexed index,
        address target,
        uint256 value,
        bytes data,
        bytes32 predecessor,
        uint256 delay
    );
    
    event CallExecuted(
        bytes32 indexed id,
        uint256 indexed index,
        address target,
        uint256 value,
        bytes data
    );

    function setUp() public {
        gnosisSafe = makeAddr("gnosisSafe");
        executor = makeAddr("executor");
        user = makeAddr("user");
        
        // Deploy timelock with Gnosis Safe as proposer
        address[] memory proposers = new address[](1);
        proposers[0] = gnosisSafe;
        
        address[] memory executors = new address[](1);
        executors[0] = address(0); // Anyone can execute
        
        timelock = new TakumiTimelock(proposers, executors, address(this));
        
        // Deploy SkillProfile with timelock as admin
        skillProfile = new SkillProfile(address(timelock));
        
        // Renounce timelock admin role (production setup)
        timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), address(this));
    }

    function testTimelockDeployment() public view {
        assertEq(timelock.getMinDelay(), MIN_DELAY);
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), gnosisSafe));
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), address(0)));
        assertFalse(timelock.hasRole(timelock.DEFAULT_ADMIN_ROLE(), address(this)));
    }

    function testScheduleAndExecutePause() public {
        // Prepare pause call
        bytes memory data = abi.encodeWithSelector(SkillProfile.pause.selector);
        bytes32 predecessor = bytes32(0);
        bytes32 salt = keccak256("pause-operation");
        
        // Calculate operation ID
        bytes32 id = timelock.hashOperation(
            address(skillProfile),
            0,
            data,
            predecessor,
            salt
        );
        
        // Schedule operation (as Gnosis Safe)
        vm.prank(gnosisSafe);
        vm.expectEmit(true, true, false, true);
        emit CallScheduled(id, 0, address(skillProfile), 0, data, predecessor, MIN_DELAY);
        timelock.schedule(
            address(skillProfile),
            0,
            data,
            predecessor,
            salt,
            MIN_DELAY
        );
        
        // Verify operation is pending
        assertTrue(timelock.isOperationPending(id));
        assertFalse(timelock.isOperationReady(id));
        
        // Try to execute before delay (should fail)
        vm.expectRevert();
        timelock.execute(address(skillProfile), 0, data, predecessor, salt);
        
        // Fast forward past delay
        vm.warp(block.timestamp + MIN_DELAY);
        
        // Verify operation is ready
        assertTrue(timelock.isOperationReady(id));
        
        // Execute operation (anyone can execute)
        vm.prank(executor);
        vm.expectEmit(true, true, false, true);
        emit CallExecuted(id, 0, address(skillProfile), 0, data);
        timelock.execute(address(skillProfile), 0, data, predecessor, salt);
        
        // Verify contract is paused
        assertTrue(skillProfile.paused());
        assertTrue(timelock.isOperationDone(id));
    }

    function testScheduleAndExecuteRoleGrant() public {
        address newAdmin = makeAddr("newAdmin");
        
        // Prepare role grant call
        bytes memory data = abi.encodeWithSelector(
            SkillProfile.grantAdminRole.selector,
            newAdmin
        );
        bytes32 predecessor = bytes32(0);
        bytes32 salt = keccak256("grant-admin-role");
        
        // Schedule operation
        vm.prank(gnosisSafe);
        timelock.schedule(
            address(skillProfile),
            0,
            data,
            predecessor,
            salt,
            MIN_DELAY
        );
        
        // Fast forward and execute
        vm.warp(block.timestamp + MIN_DELAY);
        timelock.execute(address(skillProfile), 0, data, predecessor, salt);
        
        // Verify role granted
        assertTrue(skillProfile.hasRole(skillProfile.ADMIN_ROLE(), newAdmin));
    }

    function testCannotScheduleWithoutProposerRole() public {
        bytes memory data = abi.encodeWithSelector(SkillProfile.pause.selector);
        
        vm.prank(user);
        vm.expectRevert();
        timelock.schedule(
            address(skillProfile),
            0,
            data,
            bytes32(0),
            keccak256("test"),
            MIN_DELAY
        );
    }

    function testCannotExecuteBeforeDelay() public {
        bytes memory data = abi.encodeWithSelector(SkillProfile.pause.selector);
        bytes32 salt = keccak256("test");
        
        vm.prank(gnosisSafe);
        timelock.schedule(
            address(skillProfile),
            0,
            data,
            bytes32(0),
            salt,
            MIN_DELAY
        );
        
        // Try to execute immediately - expect TimelockUnexpectedOperationState error
        vm.expectRevert();
        timelock.execute(address(skillProfile), 0, data, bytes32(0), salt);
        
        // Try to execute 1 second before delay
        vm.warp(block.timestamp + MIN_DELAY - 1);
        vm.expectRevert();
        timelock.execute(address(skillProfile), 0, data, bytes32(0), salt);
    }

    function testBatchOperations() public {
        // Prepare batch: pause + grant role
        address newAdmin = makeAddr("newAdmin");
        
        address[] memory targets = new address[](2);
        targets[0] = address(skillProfile);
        targets[1] = address(skillProfile);
        
        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0;
        
        bytes[] memory payloads = new bytes[](2);
        payloads[0] = abi.encodeWithSelector(SkillProfile.pause.selector);
        payloads[1] = abi.encodeWithSelector(SkillProfile.grantAdminRole.selector, newAdmin);
        
        bytes32 predecessor = bytes32(0);
        bytes32 salt = keccak256("batch-operation");
        
        // Schedule batch
        vm.prank(gnosisSafe);
        timelock.scheduleBatch(
            targets,
            values,
            payloads,
            predecessor,
            salt,
            MIN_DELAY
        );
        
        // Fast forward and execute
        vm.warp(block.timestamp + MIN_DELAY);
        timelock.executeBatch(targets, values, payloads, predecessor, salt);
        
        // Verify both operations executed
        assertTrue(skillProfile.paused());
        assertTrue(skillProfile.hasRole(skillProfile.ADMIN_ROLE(), newAdmin));
    }

    function testCancelOperation() public {
        bytes memory data = abi.encodeWithSelector(SkillProfile.pause.selector);
        bytes32 salt = keccak256("cancel-test");
        
        bytes32 id = timelock.hashOperation(
            address(skillProfile),
            0,
            data,
            bytes32(0),
            salt
        );
        
        // Schedule operation (as Gnosis Safe)
        vm.prank(gnosisSafe);
        timelock.schedule(
            address(skillProfile),
            0,
            data,
            bytes32(0),
            salt,
            MIN_DELAY
        );
        
        assertTrue(timelock.isOperationPending(id));
        
        // Cancel operation (as Gnosis Safe - must have CANCELLER_ROLE or be proposer)
        vm.prank(gnosisSafe);
        timelock.cancel(id);
        
        assertFalse(timelock.isOperationPending(id));
        
        // Try to execute cancelled operation
        vm.warp(block.timestamp + MIN_DELAY);
        vm.expectRevert();
        timelock.execute(address(skillProfile), 0, data, bytes32(0), salt);
    }

    function testMinDelayEnforcement() public view {
        assertEq(timelock.getMinDelay(), 3 days);
    }

    function testMultiSigWorkflow() public {
        // Simulate Gnosis Safe multi-sig workflow
        // In production, Gnosis Safe owners would approve transaction off-chain
        // Then one owner submits the schedule transaction
        
        address newVerifier = makeAddr("newVerifier");
        bytes memory data = abi.encodeWithSelector(
            SkillProfile.grantVerifierRole.selector,
            newVerifier
        );
        bytes32 salt = keccak256("multisig-test");
        
        // Step 1: Gnosis Safe (after 3-of-5 approval) schedules operation
        vm.prank(gnosisSafe);
        timelock.schedule(
            address(skillProfile),
            0,
            data,
            bytes32(0),
            salt,
            MIN_DELAY
        );
        
        // Step 2: Community has 3 days to review
        // (In production, this allows stakeholders to react)
        
        // Step 3: After delay, anyone can execute
        vm.warp(block.timestamp + MIN_DELAY);
        vm.prank(executor); // Could be any address
        timelock.execute(address(skillProfile), 0, data, bytes32(0), salt);
        
        // Verify role granted
        assertTrue(skillProfile.hasRole(skillProfile.VERIFIER_ROLE(), newVerifier));
    }
}
