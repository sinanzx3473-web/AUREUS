// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PersonalToken
 * @notice ERC-20 token representing income share agreement backed by real-world earnings
 * @dev Implements ethical safeguards: return cap and expiry date to prevent indefinite servitude
 */
contract PersonalToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice USDC token contract
    IERC20 public immutable usdcToken;

    /// @notice Address of the talent (token creator)
    address public immutable talent;

    /// @notice Price of 1 PersonalToken in USDC (scaled by 1e6 for USDC decimals)
    uint256 public immutable tokenPrice;

    /// @notice Maximum return multiplier (e.g., 2 = 2x, 3 = 3x)
    uint256 public immutable returnCapMultiplier;

    /// @notice Contract expiry timestamp
    uint256 public immutable expiryDate;

    /// @notice Revenue split percentage for talent (e.g., 90 = 90%)
    uint256 public immutable talentSharePercentage;

    /// @notice Total USDC staked by all investors
    uint256 public totalStaked;

    /// @notice Total USDC distributed to investors
    uint256 public totalDistributedToInvestors;

    /// @notice Total USDC distributed to talent
    uint256 public totalDistributedToTalent;

    /// @notice Maximum amount that can be distributed to investors (totalStaked * returnCapMultiplier)
    uint256 public maxInvestorReturn;

    /// @notice Whether the return cap has been reached
    bool public capReached;

    /// @notice Whether the contract has expired
    bool public expired;

    /// @notice Mapping of investor address to their stake info
    mapping(address => InvestorInfo) public investors;

    /// @notice Mapping of investor address to their unclaimed dividends
    mapping(address => uint256) public unclaimedDividends;

    /// @notice Total unclaimed dividends across all investors
    uint256 public totalUnclaimedDividends;

    /// @notice Dividends per token (scaled by 1e18 for precision)
    uint256 public dividendsPerToken;

    /// @notice Last dividends per token value when investor claimed
    mapping(address => uint256) public lastDividendsPerToken;

    // ============ Structs ============

    struct InvestorInfo {
        uint256 stakedAmount;      // Total USDC staked
        uint256 tokensOwned;       // PersonalTokens received
        uint256 totalClaimed;      // Total dividends claimed
        uint256 lastClaimTime;     // Last dividend claim timestamp
    }

    // ============ Events ============

    event Staked(
        address indexed investor,
        uint256 usdcAmount,
        uint256 tokensReceived,
        uint256 timestamp
    );

    event RevenueReceived(
        uint256 totalAmount,
        uint256 talentShare,
        uint256 investorShare,
        uint256 timestamp
    );

    event DividendsClaimed(
        address indexed investor,
        uint256 amount,
        uint256 timestamp
    );

    event CapReached(
        uint256 totalDistributed,
        uint256 timestamp
    );

    event ContractExpired(
        uint256 expiryDate,
        uint256 timestamp
    );

    event ExcessWithdrawn(
        address indexed talent,
        uint256 amount,
        uint256 timestamp
    );

    // ============ Constructor ============

    /**
     * @notice Initialize PersonalToken contract
     * @param _talent Address of the talent (token creator)
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _usdcToken USDC token address
     * @param _tokenPrice Price of 1 PersonalToken in USDC (scaled by 1e6)
     * @param _returnCapMultiplier Maximum return multiplier (2-3x recommended)
     * @param _durationInYears Contract duration in years (2-5 recommended)
     * @param _talentSharePercentage Talent's revenue share percentage (90 recommended)
     */
    constructor(
        address _talent,
        string memory _name,
        string memory _symbol,
        address _usdcToken,
        uint256 _tokenPrice,
        uint256 _returnCapMultiplier,
        uint256 _durationInYears,
        uint256 _talentSharePercentage
    ) ERC20(_name, _symbol) Ownable(_talent) {
        require(_talent != address(0), "Invalid talent address");
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_tokenPrice > 0, "Token price must be > 0");
        require(_returnCapMultiplier >= 2 && _returnCapMultiplier <= 5, "Return cap must be 2-5x");
        require(_durationInYears >= 2 && _durationInYears <= 5, "Duration must be 2-5 years");
        require(_talentSharePercentage >= 80 && _talentSharePercentage <= 95, "Talent share must be 80-95%");

        talent = _talent;
        usdcToken = IERC20(_usdcToken);
        tokenPrice = _tokenPrice;
        returnCapMultiplier = _returnCapMultiplier;
        expiryDate = block.timestamp + (_durationInYears * 365 days);
        talentSharePercentage = _talentSharePercentage;
    }

    // ============ Investor Functions ============

    /**
     * @notice Stake USDC to receive PersonalTokens
     * @param usdcAmount Amount of USDC to stake (scaled by 1e6)
     */
    function stake(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(usdcAmount > 0, "Amount must be > 0");
        require(block.timestamp < expiryDate, "Contract expired");
        require(!capReached, "Return cap reached");

        // Calculate tokens to mint (PersonalToken has 18 decimals, USDC has 6)
        // tokensToMint = (usdcAmount * 1e18) / tokenPrice
        uint256 tokensToMint = (usdcAmount * 1e18) / tokenPrice;
        require(tokensToMint > 0, "Token amount too small");

        // Transfer USDC from investor to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Mint PersonalTokens to investor
        _mint(msg.sender, tokensToMint);

        // Update investor info
        InvestorInfo storage investor = investors[msg.sender];
        investor.stakedAmount += usdcAmount;
        investor.tokensOwned += tokensToMint;
        if (investor.lastClaimTime == 0) {
            investor.lastClaimTime = block.timestamp;
        }

        // Update total staked and max return
        totalStaked += usdcAmount;
        maxInvestorReturn = totalStaked * returnCapMultiplier;

        emit Staked(msg.sender, usdcAmount, tokensToMint, block.timestamp);
    }

    /**
     * @notice Claim accumulated dividends
     */
    function claimDividends() external nonReentrant {
        // Update dividends before claiming
        _updateDividends(msg.sender);
        
        uint256 claimable = unclaimedDividends[msg.sender];
        require(claimable > 0, "No dividends to claim");

        // Reset unclaimed dividends
        unclaimedDividends[msg.sender] = 0;
        totalUnclaimedDividends -= claimable;

        // Update investor info
        InvestorInfo storage investor = investors[msg.sender];
        investor.totalClaimed += claimable;
        investor.lastClaimTime = block.timestamp;

        // Transfer USDC to investor
        usdcToken.safeTransfer(msg.sender, claimable);

        emit DividendsClaimed(msg.sender, claimable, block.timestamp);
    }

    // ============ Talent Functions ============

    /**
     * @notice Distribute revenue from talent's income (salary, bounties, etc.)
     * @param amount Amount of USDC to distribute
     */
    function distributeRevenue(uint256 amount) external nonReentrant whenNotPaused {
        require(msg.sender == talent, "Only talent can distribute");
        require(amount > 0, "Amount must be > 0");

        // Transfer USDC from talent to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 talentShare;
        uint256 investorShare;

        // Check if contract expired
        if (block.timestamp >= expiryDate && !expired) {
            expired = true;
            emit ContractExpired(expiryDate, block.timestamp);
        }

        // Check if cap reached or expired
        if (capReached || expired) {
            // All revenue goes to talent
            talentShare = amount;
            investorShare = 0;
        } else {
            // Calculate shares
            talentShare = (amount * talentSharePercentage) / 100;
            investorShare = amount - talentShare;

            // Check if this distribution would exceed cap
            uint256 potentialTotal = totalDistributedToInvestors + investorShare;
            if (potentialTotal >= maxInvestorReturn) {
                // Cap reached - adjust shares
                uint256 remainingCap = maxInvestorReturn - totalDistributedToInvestors;
                investorShare = remainingCap;
                talentShare = amount - investorShare;
                capReached = true;
                emit CapReached(maxInvestorReturn, block.timestamp);
            }

            // Distribute to investors proportionally
            if (investorShare > 0 && totalSupply() > 0) {
                _distributeToInvestors(investorShare);
                totalDistributedToInvestors += investorShare;
            }
        }

        // Transfer talent's share immediately
        if (talentShare > 0) {
            usdcToken.safeTransfer(talent, talentShare);
            totalDistributedToTalent += talentShare;
        }

        emit RevenueReceived(amount, talentShare, investorShare, block.timestamp);
    }

    /**
     * @notice Withdraw excess funds after cap reached or contract expired
     */
    function withdrawExcess() external nonReentrant {
        require(msg.sender == talent, "Only talent can withdraw");
        require(capReached || expired, "Cap not reached and not expired");

        uint256 contractBalance = usdcToken.balanceOf(address(this));
        uint256 reservedForDividends = totalUnclaimedDividends;
        
        require(contractBalance > reservedForDividends, "No excess to withdraw");

        uint256 excessAmount = contractBalance - reservedForDividends;
        usdcToken.safeTransfer(talent, excessAmount);

        emit ExcessWithdrawn(talent, excessAmount, block.timestamp);
    }

    // ============ Internal Functions ============

    /**
     * @notice Distribute investor share proportionally to all token holders
     * @param amount Amount to distribute
     */
    function _distributeToInvestors(uint256 amount) internal {
        uint256 supply = totalSupply();
        require(supply > 0, "No tokens minted");

        // Update global dividends per token
        dividendsPerToken += (amount * 1e18) / supply;
        totalUnclaimedDividends += amount;
    }

    /**
     * @notice Calculate claimable dividends for an investor
     * @param investor Address of the investor
     * @return Claimable dividend amount
     */
    function calculateClaimableDividends(address investor) public view returns (uint256) {
        uint256 tokenBalance = balanceOf(investor);
        if (tokenBalance == 0) {
            return unclaimedDividends[investor];
        }

        // Calculate new dividends since last claim
        uint256 newDividends = (tokenBalance * (dividendsPerToken - lastDividendsPerToken[investor])) / 1e18;
        
        return unclaimedDividends[investor] + newDividends;
    }

    /**
     * @notice Update investor's dividend tracking
     * @param investor Address of the investor
     */
    function _updateDividends(address investor) internal {
        if (balanceOf(investor) > 0) {
            uint256 newDividends = calculateClaimableDividends(investor);
            unclaimedDividends[investor] = newDividends;
        }
        lastDividendsPerToken[investor] = dividendsPerToken;
    }

    // ============ View Functions ============

    /**
     * @notice Get investor information
     * @param investor Address of the investor
     * @return stakedAmount Total USDC staked
     * @return tokensOwned PersonalTokens owned
     * @return totalClaimed Total dividends claimed
     * @return unclaimedAmount Unclaimed dividends
     */
    function getInvestorInfo(address investor) external view returns (
        uint256 stakedAmount,
        uint256 tokensOwned,
        uint256 totalClaimed,
        uint256 unclaimedAmount
    ) {
        InvestorInfo memory info = investors[investor];
        return (
            info.stakedAmount,
            info.tokensOwned,
            info.totalClaimed,
            calculateClaimableDividends(investor)
        );
    }

    /**
     * @notice Get contract statistics
     * @return _totalStaked Total USDC staked
     * @return _totalDistributedToInvestors Total distributed to investors
     * @return _totalDistributedToTalent Total distributed to talent
     * @return _maxInvestorReturn Maximum investor return
     * @return _remainingCap Remaining cap before limit
     * @return _isExpired Whether contract is expired
     * @return _isCapReached Whether cap is reached
     * @return _timeUntilExpiry Time until expiry (0 if expired)
     */
    function getContractStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalDistributedToInvestors,
        uint256 _totalDistributedToTalent,
        uint256 _maxInvestorReturn,
        uint256 _remainingCap,
        bool _isExpired,
        bool _isCapReached,
        uint256 _timeUntilExpiry
    ) {
        uint256 remainingCap = 0;
        if (!capReached && maxInvestorReturn > totalDistributedToInvestors) {
            remainingCap = maxInvestorReturn - totalDistributedToInvestors;
        }

        uint256 timeUntilExpiry = 0;
        if (block.timestamp < expiryDate) {
            timeUntilExpiry = expiryDate - block.timestamp;
        }

        return (
            totalStaked,
            totalDistributedToInvestors,
            totalDistributedToTalent,
            maxInvestorReturn,
            remainingCap,
            expired || block.timestamp >= expiryDate,
            capReached,
            timeUntilExpiry
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Pause contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Override transfer to update dividend tracking
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        // Update dividends before transfer
        if (from != address(0)) {
            _updateDividends(from);
        }
        if (to != address(0)) {
            _updateDividends(to);
        }
        
        super._update(from, to, value);
    }
}
