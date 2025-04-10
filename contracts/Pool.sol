// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPToken.sol";

contract Pool is LPToken, ReentrancyGuard {

    IERC20 immutable i_token0;
    IERC20 immutable i_token1;

    address immutable i_token0_address;
    address immutable i_token1_address;

    uint256 constant INITIAL_RATIO = 2; //token0:token1 = 1:2

    mapping(address => uint256) tokenBalances;
    event AddedLiquidity(
        uint256 indexed lpToken,
        address token0,
        uint256 indexed amount0,
        address token1,
        uint256 indexed amount1
    );

    event Swapped(
        address tokenIn,
        uint256 indexed amountIn,
        address tokenOut,
        uint256 indexed amountOut
    );

    constructor(address token0, address token1) LPToken("LPToken", "LPT") {

        i_token0 = IERC20(token0);
        i_token1 = IERC20(token1);

        i_token0_address = token0;
        i_token1_address = token1;

    }

    function getAmountOut(address tokenIn, uint256 amountIn, address tokenOut) public view returns (uint256) {

        uint256 balanceOut = tokenBalances[tokenOut];
        uint256 balanceIn = tokenBalances[tokenIn];
        uint256 amountOut = (balanceOut * amountIn) / (balanceIn + amountIn);
        
        return amountOut;

    }

    function swap(address tokenIn, uint256 amountIn, address tokenOut) public nonReentrant {
        
        // input validity checks
        require(tokenIn != tokenOut, "Same tokens");
        require(tokenIn == i_token0_address || tokenIn == i_token1_address, "Invalid token");
        require(tokenOut == i_token0_address || tokenOut == i_token1_address, "Invalid token");
        require(amountIn > 0, "Zero amount");

        uint256 amountOut = getAmountOut(tokenIn, amountIn, tokenOut);

        // swapping tokens
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Swap Failed");
        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "Swap Failed");
        
        // update pool balances
        tokenBalances[tokenIn] += amountIn;
        tokenBalances[tokenOut] -= amountOut;

        emit Swapped(tokenIn, amountIn, tokenOut, amountOut);

    }

function addLiquidity(uint256 amount0) public nonReentrant {
    
    // input validity check
    require(amount0 > 0, "Amount must be greater than 0");
    
    // calculate and mint liquidity tokens
    uint256 amount1 = getRequiredAmount1(amount0);
    uint256 amountLP;
    if (totalSupply() > 0) {
        amountLP = (amount0 * totalSupply()) / tokenBalances[i_token0_address];
    } else {
        amountLP = amount0;
    }
    _mint(msg.sender, amountLP);

    // deposit token0
    require(i_token0.transferFrom(msg.sender, address(this), amount0), "Transfer Alpha failed");
    tokenBalances[i_token0_address] += amount0;
    
    // deposit token1
    require(i_token1.transferFrom(msg.sender, address(this), amount1), "Transfer Beta failed");
    tokenBalances[i_token1_address] += amount1;
    
    emit AddedLiquidity(amountLP, i_token0_address, amount0, i_token1_address, amount1);

}

    function getRequiredAmount1(uint256 amount0) public view returns(uint256) {

        uint256 balance0 = tokenBalances[i_token0_address];
        uint256 balance1 = tokenBalances[i_token1_address];
        
        if (balance0 == 0 || balance1 == 0) {
            return amount0 * INITIAL_RATIO;
        }
        return (amount0 * balance1) / balance0;

    }

    function getReserves() public view returns (uint256, uint256) {
        return (tokenBalances[i_token0_address], tokenBalances[i_token1_address]);
    }

    function removeLiquidity(uint256 lpAmount) public nonReentrant {
        require(lpAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= lpAmount, "Insufficient LP balance");

        // Calculate token amounts to return
        uint256 totalLP = totalSupply();
        uint256 amount0 = (lpAmount * tokenBalances[i_token0_address]) / totalLP;
        uint256 amount1 = (lpAmount * tokenBalances[i_token1_address]) / totalLP;

        // Burn LP tokens
        _burn(msg.sender, lpAmount);

        // Update pool balances
        tokenBalances[i_token0_address] -= amount0;
        tokenBalances[i_token1_address] -= amount1;

        // Transfer tokens back to user
        require(i_token0.transfer(msg.sender, amount0), "Transfer token0 failed");
        require(i_token1.transfer(msg.sender, amount1), "Transfer token1 failed");

        emit RemovedLiquidity(lpAmount, i_token0_address, amount0, i_token1_address, amount1);
    }

    event RemovedLiquidity(
        uint256 indexed lpToken,
        address token0,
        uint256 indexed amount0,
        address token1,
        uint256 indexed amount1
    );

    // Add reward rate calculation based on time period
    function calculateRewardRate(uint256 timePeriod) public pure returns (uint256) {
        if (timePeriod == 14 days) {
            return 5; // 5% for 14 days
        } else if (timePeriod == 31 days) {
            return 12; // 12% for 31 days
        } else if (timePeriod == 90 days) {
            return 40; // 40% for 3 months
        } else if (timePeriod == 180 days) {
            return 85; // 85% for 6 months
        } else if (timePeriod == 365 days) {
            return 180; // 180% for 1 year
        }
        return 3; // Default 3% for less than 14 days
    }

    // Add function to calculate rewards based on time period
    function calculateRewards(address user, uint256 timePeriod) public view returns (uint256) {
        uint256 userBalance = balanceOf(user);
        uint256 totalSupply = totalSupply();
        if (totalSupply == 0) return 0;

        uint256 rewardRate = calculateRewardRate(timePeriod);
        uint256 userShare = (userBalance * 100) / totalSupply;
        
        // Calculate rewards based on user's share and reward rate
        uint256 rewards = (userBalance * rewardRate) / 100;
        return rewards;
    }
}