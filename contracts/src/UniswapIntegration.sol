// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Uniswap V2 Router interface
interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}

/// @notice Burnable token interface
interface IBurnableToken {
    function burn(uint256 amount) external;
}

/// @title UniswapIntegration - Helper contract for USDC → AUREUS swaps and burns
/// @notice Handles buyback and burn mechanism for AUREUS tokenomics
/// @dev Uses Uniswap V2 for swaps with slippage protection
contract UniswapIntegration is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice AUREUS token contract
    IBurnableToken public immutable aureusToken;

    /// @notice Uniswap V2 Router
    IUniswapV2Router02 public uniswapRouter;

    /// @notice Maximum slippage tolerance (5% = 500 basis points)
    uint256 public constant MAX_SLIPPAGE_BPS = 500;

    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Total AUREUS burned through buybacks
    uint256 public totalAureusBurned;

    /// @notice Total USDC spent on buybacks
    uint256 public totalUsdcSpent;

    /// @notice Number of buyback operations executed
    uint256 public buybackCount;

    /// @notice Emitted when USDC is swapped for AUREUS
    event UsdcSwappedForAureus(
        uint256 usdcAmount,
        uint256 aureusReceived,
        uint256 timestamp
    );

    /// @notice Emitted when AUREUS is burned
    event AureusBurned(
        uint256 amount,
        uint256 totalBurned,
        uint256 timestamp
    );

    /// @notice Emitted when Uniswap router is updated
    event RouterUpdated(
        address indexed oldRouter,
        address indexed newRouter,
        uint256 timestamp
    );

    /// @notice Constructor
    /// @param _usdc Address of USDC token
    /// @param _aureusToken Address of AUREUS token
    /// @param _uniswapRouter Address of Uniswap V2 Router
    /// @param admin Address to be granted admin role
    constructor(
        address _usdc,
        address _aureusToken,
        address _uniswapRouter,
        address admin
    ) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_aureusToken != address(0), "Invalid AUREUS address");
        require(_uniswapRouter != address(0), "Invalid router address");
        require(admin != address(0), "Invalid admin address");

        usdc = IERC20(_usdc);
        aureusToken = IBurnableToken(_aureusToken);
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Swap USDC for AUREUS and burn the received tokens
    /// @param usdcAmount Amount of USDC to swap
    /// @return aureusReceived Amount of AUREUS received and burned
    function buybackAndBurn(uint256 usdcAmount) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
        returns (uint256 aureusReceived) 
    {
        require(usdcAmount > 0, "Amount must be greater than 0");

        // Transfer USDC from caller to this contract
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Swap USDC for AUREUS
        aureusReceived = _swapUSDCForAureus(usdcAmount);

        // Burn the received AUREUS
        _burnAureus(aureusReceived);

        // Update statistics
        totalUsdcSpent += usdcAmount;
        unchecked {
            ++buybackCount;
        }

        return aureusReceived;
    }

    /// @notice Set Uniswap router address (admin only)
    /// @param newRouter Address of new Uniswap router
    function setUniswapRouter(address newRouter) external onlyRole(ADMIN_ROLE) {
        require(newRouter != address(0), "Invalid router address");
        address oldRouter = address(uniswapRouter);
        uniswapRouter = IUniswapV2Router02(newRouter);
        emit RouterUpdated(oldRouter, newRouter, block.timestamp);
    }

    /// @notice Get total AUREUS burned
    /// @return Total amount of AUREUS burned
    function getTotalBurned() external view returns (uint256) {
        return totalAureusBurned;
    }

    /// @notice Get buyback statistics
    /// @return usdcSpent Total USDC spent on buybacks
    /// @return aureusBurned Total AUREUS burned
    /// @return operations Number of buyback operations
    function getBuybackStats() 
        external 
        view 
        returns (
            uint256 usdcSpent,
            uint256 aureusBurned,
            uint256 operations
        ) 
    {
        return (totalUsdcSpent, totalAureusBurned, buybackCount);
    }

    /// @notice Get expected AUREUS output for a given USDC input
    /// @param usdcAmount Amount of USDC to swap
    /// @return expectedAureus Expected amount of AUREUS to receive
    function getExpectedAureusOutput(uint256 usdcAmount) 
        external 
        view 
        returns (uint256 expectedAureus) 
    {
        if (usdcAmount == 0) {
            return 0;
        }

        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(aureusToken);

        try uniswapRouter.getAmountsOut(usdcAmount, path) returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }

    /// @notice Internal function to swap USDC for AUREUS
    /// @param usdcAmount Amount of USDC to swap
    /// @return aureusReceived Amount of AUREUS received
    function _swapUSDCForAureus(uint256 usdcAmount) 
        internal 
        returns (uint256 aureusReceived) 
    {
        // Approve router to spend USDC
        usdc.forceApprove(address(uniswapRouter), usdcAmount);

        // Set up swap path: USDC → AUREUS
        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(aureusToken);

        // Get expected output
        uint256[] memory amountsOut = uniswapRouter.getAmountsOut(usdcAmount, path);
        uint256 expectedAureus = amountsOut[1];

        // Calculate minimum output with slippage protection (5% slippage)
        uint256 minAureusOut = (expectedAureus * (BPS_DENOMINATOR - MAX_SLIPPAGE_BPS)) / BPS_DENOMINATOR;

        // Execute swap
        uint256[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            usdcAmount,
            minAureusOut,
            path,
            address(this),
            block.timestamp + 300 // 5 minute deadline
        );

        aureusReceived = amounts[1];

        emit UsdcSwappedForAureus(usdcAmount, aureusReceived, block.timestamp);

        return aureusReceived;
    }

    /// @notice Internal function to burn AUREUS tokens
    /// @param amount Amount of AUREUS to burn
    function _burnAureus(uint256 amount) internal {
        require(amount > 0, "Cannot burn 0 tokens");

        aureusToken.burn(amount);
        totalAureusBurned += amount;

        emit AureusBurned(amount, totalAureusBurned, block.timestamp);
    }

    /// @notice Emergency withdrawal of tokens (admin only)
    /// @param token Address of token to withdraw
    /// @param recipient Address to receive tokens
    function emergencyWithdraw(address token, address recipient) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(recipient, balance);
        }
    }
}
