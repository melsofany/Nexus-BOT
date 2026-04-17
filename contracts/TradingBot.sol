// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

contract NexusTradingBot {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Execute multi-step arbitrage trade
    // routers: array of DEX router addresses
    // paths: array of token paths for each swap
    // initialAmountIn: starting amount of the first token
    // minFinalAmountOut: minimum required final amount to ensure profit
    function executeArbitrage(
        address[] calldata routers,
        address[][] calldata paths,
        uint256 initialAmountIn,
        uint256 minFinalAmountOut
    ) external onlyOwner {
        require(routers.length == paths.length, "Mismatched input lengths");
        
        uint256 currentAmount = initialAmountIn;
        address firstToken = paths[0][0];
        
        // Ensure we have the initial token (either from contract balance or transferred from owner)
        require(IERC20(firstToken).balanceOf(address(this)) >= initialAmountIn, "Insufficient contract balance");

        for (uint256 i = 0; i < routers.length; i++) {
            address router = routers[i];
            address[] memory path = paths[i];
            address inputToken = path[0];
            
            // Approve router to spend our tokens
            IERC20(inputToken).approve(router, currentAmount);
            
            // Execute the swap
            uint[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
                currentAmount,
                0, // We check total profit at the end of all steps
                path,
                address(this),
                block.timestamp + 60
            );
            
            // Output of this swap becomes input for the next swap
            currentAmount = amounts[amounts.length - 1];
        }
        
        // Final verification: Ensure the final token is the same as the starting token
        address finalToken = paths[paths.length - 1][paths[paths.length - 1].length - 1];
        require(finalToken == firstToken, "Arbitrage must return to initial token");
        
        // Profit check: Final amount must be greater than initial + expected profit
        require(currentAmount >= minFinalAmountOut, "Trade not profitable (Slippage/Fees)");
    }

    // Recover any ERC20 tokens or ETH sent to the contract
    function withdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner).transfer(amount);
        } else {
            IERC20(token).transfer(owner, amount);
        }
    }

    receive() external payable {}
}
