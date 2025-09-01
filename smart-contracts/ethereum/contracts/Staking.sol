// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct StakeInfo {
        uint256 amount;
        uint256 stakingTime;
        uint256 lastRewardTime;
        uint256 rewardDebt;
    }

    struct PoolInfo {
        IERC20 stakingToken;
        IERC20 rewardToken;
        uint256 rewardPerSecond;
        uint256 totalStaked;
        uint256 accRewardPerShare;
        uint256 lastRewardTime;
        uint256 minStakeDuration;
        uint256 earlyWithdrawPenalty; // Basis points (10000 = 100%)
    }

    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => StakeInfo)) public userInfo;

    uint256 public constant PRECISION = 1e18;

    event Stake(address indexed user, uint256 indexed pid, uint256 amount);
    event Unstake(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(uint256 indexed pid, address stakingToken, address rewardToken, uint256 rewardPerSecond);

    constructor() {}

    function addPool(
        IERC20 _stakingToken,
        IERC20 _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _minStakeDuration,
        uint256 _earlyWithdrawPenalty
    ) external onlyOwner {
        require(_earlyWithdrawPenalty <= 5000, "Staking: Penalty too high"); // Max 50%

        poolInfo.push(PoolInfo({
            stakingToken: _stakingToken,
            rewardToken: _rewardToken,
            rewardPerSecond: _rewardPerSecond,
            totalStaked: 0,
            accRewardPerShare: 0,
            lastRewardTime: block.timestamp,
            minStakeDuration: _minStakeDuration,
            earlyWithdrawPenalty: _earlyWithdrawPenalty
        }));

        emit PoolAdded(poolInfo.length - 1, address(_stakingToken), address(_rewardToken), _rewardPerSecond);
    }

    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];

        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }

        if (pool.totalStaked == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 reward = timeElapsed * pool.rewardPerSecond;
        pool.accRewardPerShare += (reward * PRECISION) / pool.totalStaked;
        pool.lastRewardTime = block.timestamp;
    }

    function stake(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        updatePool(_pid);

        if (user.amount > 0) {
            uint256 pending = ((user.amount * pool.accRewardPerShare) / PRECISION) - user.rewardDebt;
            if (pending > 0) {
                pool.rewardToken.safeTransfer(msg.sender, pending);
                emit RewardClaimed(msg.sender, _pid, pending);
            }
        }

        if (_amount > 0) {
            pool.stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
            user.amount += _amount;
            pool.totalStaked += _amount;

            if (user.stakingTime == 0) {
                user.stakingTime = block.timestamp;
            }
        }

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
        user.lastRewardTime = block.timestamp;

        emit Stake(msg.sender, _pid, _amount);
    }

    function unstake(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        require(user.amount >= _amount, "Staking: Insufficient staked amount");

        updatePool(_pid);

        uint256 pending = ((user.amount * pool.accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pending > 0) {
            pool.rewardToken.safeTransfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, _pid, pending);
        }

        if (_amount > 0) {
            uint256 withdrawAmount = _amount;

            // Apply early withdraw penalty if applicable
            if (block.timestamp < user.stakingTime + pool.minStakeDuration) {
                uint256 penalty = (_amount * pool.earlyWithdrawPenalty) / 10000;
                withdrawAmount = _amount - penalty;

                // Send penalty to owner
                if (penalty > 0) {
                    pool.stakingToken.safeTransfer(owner(), penalty);
                }
            }

            user.amount -= _amount;
            pool.totalStaked -= _amount;
            pool.stakingToken.safeTransfer(msg.sender, withdrawAmount);
        }

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;

        emit Unstake(msg.sender, _pid, _amount);
    }

    function claimRewards(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        updatePool(_pid);

        uint256 pending = ((user.amount * pool.accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pending > 0) {
            pool.rewardToken.safeTransfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, _pid, pending);
        }

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
    }

    function pendingRewards(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][_user];

        uint256 accRewardPerShare = pool.accRewardPerShare;

        if (block.timestamp > pool.lastRewardTime && pool.totalStaked != 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = timeElapsed * pool.rewardPerSecond;
            accRewardPerShare += (reward * PRECISION) / pool.totalStaked;
        }

        return ((user.amount * accRewardPerShare) / PRECISION) - user.rewardDebt;
    }

    function getPoolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function getUserInfo(uint256 _pid, address _user) external view returns (
        uint256 amount,
        uint256 stakingTime,
        uint256 lastRewardTime,
        uint256 rewardDebt,
        uint256 pendingReward
    ) {
        StakeInfo storage user = userInfo[_pid][_user];
        amount = user.amount;
        stakingTime = user.stakingTime;
        lastRewardTime = user.lastRewardTime;
        rewardDebt = user.rewardDebt;
        pendingReward = this.pendingRewards(_pid, _user);
    }

    function updateRewardPerSecond(uint256 _pid, uint256 _rewardPerSecond) external onlyOwner {
        updatePool(_pid);
        poolInfo[_pid].rewardPerSecond = _rewardPerSecond;
    }

    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.totalStaked -= amount;

        pool.stakingToken.safeTransfer(msg.sender, amount);
        emit Unstake(msg.sender, _pid, amount);
    }
}
