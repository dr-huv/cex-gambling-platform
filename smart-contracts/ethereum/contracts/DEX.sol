// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DEX is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        mapping(address => uint256) liquidity;
    }

    mapping(bytes32 => Pool) public pools;
    mapping(address => uint256) public fees;

    uint256 public constant FEE_RATE = 30; // 0.3%
    uint256 public constant FEE_DENOMINATOR = 10000;

    event PoolCreated(address indexed tokenA, address indexed tokenB, bytes32 poolId);
    event LiquidityAdded(address indexed provider, bytes32 poolId, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, bytes32 poolId, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed trader, bytes32 poolId, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor() {}

    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenA < tokenB ? tokenA : tokenB, tokenA < tokenB ? tokenB : tokenA));
    }

    function createPool(address tokenA, address tokenB) external returns (bytes32 poolId) {
        require(tokenA != tokenB, "DEX: Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "DEX: Zero address");

        poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];

        require(pool.tokenA == address(0), "DEX: Pool already exists");

        pool.tokenA = tokenA < tokenB ? tokenA : tokenB;
        pool.tokenB = tokenA < tokenB ? tokenB : tokenA;

        emit PoolCreated(pool.tokenA, pool.tokenB, poolId);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant returns (uint256 liquidity) {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];

        require(pool.tokenA != address(0), "DEX: Pool does not exist");

        // Ensure tokens are in correct order
        if (tokenA != pool.tokenA) {
            (tokenA, tokenB) = (tokenB, tokenA);
            (amountA, amountB) = (amountB, amountA);
        }

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        if (pool.totalLiquidity == 0) {
            liquidity = sqrt(amountA * amountB);
        } else {
            uint256 liquidityA = (amountA * pool.totalLiquidity) / pool.reserveA;
            uint256 liquidityB = (amountB * pool.totalLiquidity) / pool.reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }

        require(liquidity > 0, "DEX: Insufficient liquidity minted");

        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalLiquidity += liquidity;
        pool.liquidity[msg.sender] += liquidity;

        emit LiquidityAdded(msg.sender, poolId, amountA, amountB, liquidity);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];

        require(pool.liquidity[msg.sender] >= liquidity, "DEX: Insufficient liquidity");

        amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;

        pool.liquidity[msg.sender] -= liquidity;
        pool.totalLiquidity -= liquidity;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;

        IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, poolId, amountA, amountB, liquidity);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        Pool storage pool = pools[poolId];

        require(pool.tokenA != address(0), "DEX: Pool does not exist");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 fee = (amountIn * FEE_RATE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        if (tokenIn == pool.tokenA) {
            amountOut = getAmountOut(amountInAfterFee, pool.reserveA, pool.reserveB);
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            amountOut = getAmountOut(amountInAfterFee, pool.reserveB, pool.reserveA);
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }

        require(amountOut >= minAmountOut, "DEX: Insufficient output amount");

        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        fees[tokenIn] += fee;

        emit Swap(msg.sender, poolId, tokenIn, amountIn, tokenOut, amountOut);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        public pure returns (uint256 amountOut) {
        require(amountIn > 0, "DEX: Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "DEX: Insufficient liquidity");

        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        amountOut = numerator / denominator;
    }

    function getReserves(address tokenA, address tokenB) 
        external view returns (uint256 reserveA, uint256 reserveB) {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];

        if (tokenA == pool.tokenA) {
            (reserveA, reserveB) = (pool.reserveA, pool.reserveB);
        } else {
            (reserveA, reserveB) = (pool.reserveB, pool.reserveA);
        }
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function collectFees(address token) external onlyOwner {
        uint256 feeAmount = fees[token];
        fees[token] = 0;
        IERC20(token).safeTransfer(owner(), feeAmount);
    }
}
