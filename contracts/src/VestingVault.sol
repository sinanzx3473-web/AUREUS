// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VestingVault - Token vesting contract for team and investors
/// @notice Manages linear vesting schedules with cliff periods
/// @dev Supports multiple beneficiaries with different vesting parameters
contract VestingVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice AUREUS token contract
    IERC20 public immutable aureusToken;

    /// @notice Vesting schedule for a beneficiary
    struct VestingSchedule {
        uint256 totalAmount;      // Total tokens to be vested
        uint256 startTime;        // Vesting start timestamp
        uint256 cliffDuration;    // Cliff period in seconds
        uint256 vestingDuration;  // Total vesting duration in seconds
        uint256 releasedAmount;   // Amount already released
        bool revocable;           // Whether vesting can be revoked
        bool revoked;             // Whether vesting has been revoked
    }

    /// @notice Mapping from beneficiary address to vesting schedule
    mapping(address => VestingSchedule) public vestingSchedules;

    /// @notice Array of all beneficiary addresses
    address[] public beneficiaries;

    /// @notice Mapping to check if address is a beneficiary
    mapping(address => bool) public isBeneficiary;

    /// @notice Total tokens allocated to vesting
    uint256 public totalAllocated;

    /// @notice Total tokens released from vesting
    uint256 public totalReleased;

    /// @notice Emitted when a vesting schedule is created
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    );

    /// @notice Emitted when tokens are released to beneficiary
    event TokensReleased(
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when vesting is revoked
    event VestingRevoked(
        address indexed beneficiary,
        uint256 vestedAmount,
        uint256 revokedAmount,
        uint256 timestamp
    );

    /// @notice Constructor
    /// @param _aureusToken Address of AUREUS token contract
    /// @param admin Address to be granted admin role
    constructor(address _aureusToken, address admin) {
        require(_aureusToken != address(0), "Invalid token address");
        require(admin != address(0), "Invalid admin address");

        aureusToken = IERC20(_aureusToken);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Create a vesting schedule for a beneficiary
    /// @param beneficiary Address of the beneficiary
    /// @param amount Total amount of tokens to vest
    /// @param cliffDuration Cliff period in seconds
    /// @param vestingDuration Total vesting duration in seconds
    /// @param revocable Whether the vesting can be revoked
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    ) external onlyRole(ADMIN_ROLE) {
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(amount > 0, "Amount must be greater than 0");
        require(vestingDuration > 0, "Vesting duration must be greater than 0");
        require(cliffDuration <= vestingDuration, "Cliff duration exceeds vesting duration");
        require(!isBeneficiary[beneficiary], "Beneficiary already has vesting schedule");

        // Transfer tokens from sender to this contract
        aureusToken.safeTransferFrom(msg.sender, address(this), amount);

        // Create vesting schedule
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: block.timestamp,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            releasedAmount: 0,
            revocable: revocable,
            revoked: false
        });

        beneficiaries.push(beneficiary);
        isBeneficiary[beneficiary] = true;
        totalAllocated += amount;

        emit VestingScheduleCreated(
            beneficiary,
            amount,
            block.timestamp,
            cliffDuration,
            vestingDuration,
            revocable
        );
    }

    /// @notice Release vested tokens to beneficiary
    /// @param beneficiary Address of the beneficiary
    function release(address beneficiary) external nonReentrant {
        require(isBeneficiary[beneficiary], "No vesting schedule for beneficiary");
        
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(!schedule.revoked, "Vesting has been revoked");

        uint256 releasableAmount = _getReleasableAmount(beneficiary);
        require(releasableAmount > 0, "No tokens available for release");

        schedule.releasedAmount += releasableAmount;
        totalReleased += releasableAmount;

        aureusToken.safeTransfer(beneficiary, releasableAmount);

        emit TokensReleased(beneficiary, releasableAmount, block.timestamp);
    }

    /// @notice Revoke vesting schedule (admin only, only if revocable)
    /// @param beneficiary Address of the beneficiary
    function revoke(address beneficiary) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(isBeneficiary[beneficiary], "No vesting schedule for beneficiary");
        
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.revocable, "Vesting is not revocable");
        require(!schedule.revoked, "Vesting already revoked");

        uint256 vestedAmount = _getVestedAmount(beneficiary);
        uint256 releasableAmount = vestedAmount - schedule.releasedAmount;
        uint256 revokedAmount = schedule.totalAmount - vestedAmount;

        schedule.revoked = true;

        // Release any vested but unreleased tokens to beneficiary
        if (releasableAmount > 0) {
            schedule.releasedAmount += releasableAmount;
            totalReleased += releasableAmount;
            aureusToken.safeTransfer(beneficiary, releasableAmount);
        }

        // Return unvested tokens to admin
        if (revokedAmount > 0) {
            aureusToken.safeTransfer(msg.sender, revokedAmount);
        }

        emit VestingRevoked(beneficiary, vestedAmount, revokedAmount, block.timestamp);
    }

    /// @notice Get vested amount for a beneficiary
    /// @param beneficiary Address of the beneficiary
    /// @return Amount of tokens vested
    function getVestedAmount(address beneficiary) external view returns (uint256) {
        return _getVestedAmount(beneficiary);
    }

    /// @notice Get releasable amount for a beneficiary
    /// @param beneficiary Address of the beneficiary
    /// @return Amount of tokens that can be released
    function getReleaseableAmount(address beneficiary) external view returns (uint256) {
        return _getReleasableAmount(beneficiary);
    }

    /// @notice Get vesting schedule details
    /// @param beneficiary Address of the beneficiary
    /// @return schedule The vesting schedule
    function getVestingSchedule(address beneficiary) 
        external 
        view 
        returns (VestingSchedule memory schedule) 
    {
        require(isBeneficiary[beneficiary], "No vesting schedule for beneficiary");
        return vestingSchedules[beneficiary];
    }

    /// @notice Get total number of beneficiaries
    /// @return Number of beneficiaries
    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    /// @notice Get beneficiary address by index
    /// @param index Index in the beneficiaries array
    /// @return Beneficiary address
    function getBeneficiaryByIndex(uint256 index) external view returns (address) {
        require(index < beneficiaries.length, "Index out of bounds");
        return beneficiaries[index];
    }

    /// @notice Internal function to calculate vested amount
    /// @param beneficiary Address of the beneficiary
    /// @return Amount of tokens vested
    function _getVestedAmount(address beneficiary) internal view returns (uint256) {
        if (!isBeneficiary[beneficiary]) {
            return 0;
        }

        VestingSchedule storage schedule = vestingSchedules[beneficiary];

        if (schedule.revoked) {
            return schedule.releasedAmount;
        }

        uint256 currentTime = block.timestamp;
        uint256 cliffEnd = schedule.startTime + schedule.cliffDuration;

        // Before cliff, nothing is vested
        if (currentTime < cliffEnd) {
            return 0;
        }

        uint256 vestingEnd = schedule.startTime + schedule.vestingDuration;

        // After vesting period, everything is vested
        if (currentTime >= vestingEnd) {
            return schedule.totalAmount;
        }

        // Linear vesting between cliff and end
        uint256 timeVested = currentTime - schedule.startTime;
        uint256 vestedAmount = (schedule.totalAmount * timeVested) / schedule.vestingDuration;

        return vestedAmount;
    }

    /// @notice Internal function to calculate releasable amount
    /// @param beneficiary Address of the beneficiary
    /// @return Amount of tokens that can be released
    function _getReleasableAmount(address beneficiary) internal view returns (uint256) {
        uint256 vestedAmount = _getVestedAmount(beneficiary);
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        return vestedAmount - schedule.releasedAmount;
    }
}
