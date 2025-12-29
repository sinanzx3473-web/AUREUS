// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TheColosseum - Competitive Coding Duel Arena
/// @notice A game-theoretic contract where developers stake AUREUS and compete in gas optimization challenges
/// @dev AgentOracle judges solutions based on gas efficiency and security
contract TheColosseum is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice AUREUS token contract
    IERC20 public immutable aureusToken;

    /// @notice AgentOracle contract address (the judge)
    address public immutable agentOracle;

    /// @notice DAO treasury address for fee collection
    address public daoTreasury;

    /// @notice Duel status enumeration
    enum DuelStatus {
        Pending,        // Challenge created, waiting for opponent acceptance
        Active,         // Both parties staked, awaiting solutions
        Judging,        // Solutions submitted, awaiting oracle verdict
        Resolved,       // Winner determined, payouts distributed
        Cancelled       // Challenge cancelled before completion
    }

    /// @notice Duel structure
    struct Duel {
        uint256 duelId;
        address challenger;
        address opponent;
        uint256 wagerAmount;
        string skillTag;
        DuelStatus status;
        string challengerSolution;  // GitHub Gist URL
        string opponentSolution;    // GitHub Gist URL
        address winner;
        uint256 createdAt;
        uint256 resolvedAt;
        string judgeReasoning;      // AI analysis from oracle
    }

    /// @notice Counter for duel IDs
    uint256 public nextDuelId;

    /// @notice Mapping from duel ID to Duel struct
    mapping(uint256 => Duel) public duels;

    /// @notice Mapping from user to their active duel IDs
    mapping(address => uint256[]) public userDuels;

    /// @notice Total duels created
    uint256 public totalDuels;

    /// @notice Total duels resolved
    uint256 public totalResolved;

    /// @notice Emitted when a new challenge is created
    event DuelStarted(
        uint256 indexed duelId,
        address indexed challenger,
        address indexed opponent,
        uint256 wagerAmount,
        string skillTag,
        uint256 timestamp
    );

    /// @notice Emitted when a duel is resolved
    event DuelResolved(
        uint256 indexed duelId,
        address indexed winner,
        address indexed loser,
        uint256 winnerPayout,
        uint256 daoFee,
        uint256 burnedAmount,
        string reasoning,
        uint256 timestamp
    );

    /// @notice Emitted when opponent accepts challenge
    event ChallengeAccepted(
        uint256 indexed duelId,
        address indexed opponent,
        uint256 timestamp
    );

    /// @notice Emitted when a solution is submitted
    event SolutionSubmitted(
        uint256 indexed duelId,
        address indexed participant,
        string gistUrl,
        uint256 timestamp
    );

    /// @notice Emitted when a duel is cancelled
    event DuelCancelled(
        uint256 indexed duelId,
        address indexed canceller,
        uint256 timestamp
    );

    /// @notice Emitted when DAO treasury is updated
    event DaoTreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury,
        uint256 timestamp
    );

    /// @notice Constructor
    /// @param _aureusToken AUREUS token contract address
    /// @param _agentOracle AgentOracle contract address
    /// @param _daoTreasury DAO treasury address
    /// @param admin Admin address
    constructor(
        address _aureusToken,
        address _agentOracle,
        address _daoTreasury,
        address admin
    ) {
        require(_aureusToken != address(0), "Invalid token address");
        require(_agentOracle != address(0), "Invalid oracle address");
        require(_daoTreasury != address(0), "Invalid treasury address");
        require(admin != address(0), "Invalid admin address");

        aureusToken = IERC20(_aureusToken);
        agentOracle = _agentOracle;
        daoTreasury = _daoTreasury;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Create a new coding challenge
    /// @param opponent Address of the opponent to challenge
    /// @param wagerAmount Amount of AUREUS to stake
    /// @param skillTag Skill category (e.g., "Gas Optimization", "Security")
    /// @return duelId The ID of the created duel
    function createChallenge(
        address opponent,
        uint256 wagerAmount,
        string calldata skillTag
    ) external whenNotPaused nonReentrant returns (uint256 duelId) {
        require(opponent != address(0), "Invalid opponent");
        require(opponent != msg.sender, "Cannot challenge yourself");
        require(wagerAmount > 0, "Wager must be positive");
        require(bytes(skillTag).length > 0, "Skill tag required");

        // Transfer wager from challenger
        aureusToken.safeTransferFrom(msg.sender, address(this), wagerAmount);

        duelId = nextDuelId++;
        
        Duel storage duel = duels[duelId];
        duel.duelId = duelId;
        duel.challenger = msg.sender;
        duel.opponent = opponent;
        duel.wagerAmount = wagerAmount;
        duel.skillTag = skillTag;
        duel.status = DuelStatus.Pending;
        duel.createdAt = block.timestamp;

        userDuels[msg.sender].push(duelId);
        userDuels[opponent].push(duelId);
        totalDuels++;

        emit DuelStarted(
            duelId,
            msg.sender,
            opponent,
            wagerAmount,
            skillTag,
            block.timestamp
        );
    }

    /// @notice Accept a challenge and stake matching wager
    /// @param duelId ID of the duel to accept
    function acceptChallenge(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        
        require(duel.status == DuelStatus.Pending, "Duel not pending");
        require(msg.sender == duel.opponent, "Not the opponent");

        // Transfer wager from opponent
        aureusToken.safeTransferFrom(msg.sender, address(this), duel.wagerAmount);

        duel.status = DuelStatus.Active;

        emit ChallengeAccepted(duelId, msg.sender, block.timestamp);
    }

    /// @notice Submit solution GitHub Gist URL
    /// @param duelId ID of the duel
    /// @param gistUrl GitHub Gist URL containing the solution
    function submitSolution(
        uint256 duelId,
        string calldata gistUrl
    ) external whenNotPaused {
        Duel storage duel = duels[duelId];
        
        require(duel.status == DuelStatus.Active, "Duel not active");
        require(
            msg.sender == duel.challenger || msg.sender == duel.opponent,
            "Not a participant"
        );
        require(bytes(gistUrl).length > 0, "Invalid gist URL");

        if (msg.sender == duel.challenger) {
            require(bytes(duel.challengerSolution).length == 0, "Already submitted");
            duel.challengerSolution = gistUrl;
        } else {
            require(bytes(duel.opponentSolution).length == 0, "Already submitted");
            duel.opponentSolution = gistUrl;
        }

        emit SolutionSubmitted(duelId, msg.sender, gistUrl, block.timestamp);

        // If both solutions submitted, move to judging
        if (
            bytes(duel.challengerSolution).length > 0 &&
            bytes(duel.opponentSolution).length > 0
        ) {
            duel.status = DuelStatus.Judging;
        }
    }

    /// @notice Resolve duel with oracle verdict (called by AgentOracle or admin)
    /// @param duelId ID of the duel
    /// @param winner Address of the winner
    /// @param reasoning AI analysis explaining the verdict
    function resolveDuel(
        uint256 duelId,
        address winner,
        string calldata reasoning
    ) external whenNotPaused nonReentrant {
        require(
            msg.sender == agentOracle || hasRole(ADMIN_ROLE, msg.sender),
            "Only oracle or admin"
        );

        Duel storage duel = duels[duelId];
        
        require(duel.status == DuelStatus.Judging, "Not in judging phase");
        require(
            winner == duel.challenger || winner == duel.opponent,
            "Invalid winner"
        );

        duel.status = DuelStatus.Resolved;
        duel.winner = winner;
        duel.resolvedAt = block.timestamp;
        duel.judgeReasoning = reasoning;

        // Calculate payouts
        uint256 totalPot = duel.wagerAmount * 2;
        uint256 winnerPayout = (totalPot * 90) / 100;  // 90%
        uint256 daoFee = (totalPot * 5) / 100;         // 5%
        uint256 burnAmount = totalPot - winnerPayout - daoFee; // 5%

        // Distribute payouts
        aureusToken.safeTransfer(winner, winnerPayout);
        aureusToken.safeTransfer(daoTreasury, daoFee);
        
        // Burn tokens (transfer to dead address)
        aureusToken.safeTransfer(address(0xdead), burnAmount);

        totalResolved++;

        address loser = winner == duel.challenger ? duel.opponent : duel.challenger;

        emit DuelResolved(
            duelId,
            winner,
            loser,
            winnerPayout,
            daoFee,
            burnAmount,
            reasoning,
            block.timestamp
        );
    }

    /// @notice Cancel a pending challenge (only challenger can cancel before acceptance)
    /// @param duelId ID of the duel to cancel
    function cancelChallenge(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        
        require(duel.status == DuelStatus.Pending, "Can only cancel pending");
        require(msg.sender == duel.challenger, "Only challenger can cancel");

        duel.status = DuelStatus.Cancelled;

        // Refund challenger's wager
        aureusToken.safeTransfer(duel.challenger, duel.wagerAmount);

        emit DuelCancelled(duelId, msg.sender, block.timestamp);
    }

    /// @notice Get duel details
    /// @param duelId ID of the duel
    /// @return Duel struct
    function getDuel(uint256 duelId) external view returns (Duel memory) {
        return duels[duelId];
    }

    /// @notice Get all duel IDs for a user
    /// @param user Address of the user
    /// @return Array of duel IDs
    function getUserDuels(address user) external view returns (uint256[] memory) {
        return userDuels[user];
    }

    /// @notice Update DAO treasury address
    /// @param newTreasury New treasury address
    function updateDaoTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = daoTreasury;
        daoTreasury = newTreasury;
        emit DaoTreasuryUpdated(oldTreasury, newTreasury, block.timestamp);
    }

    /// @notice Pause contract
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause contract
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Emergency withdraw (only admin, only when paused)
    /// @param token Token address to withdraw
    /// @param amount Amount to withdraw
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) whenPaused {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
