// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingContract
 * @dev A smart contract for staking and earning rewards.
 */
contract StakingContract is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public depositToken;
    IERC20 public rewardToken;

    uint256 public lockPeriod;
    uint256 public rewardPercentage;

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public lastDepositTime;

    event Deposit(address indexed user, uint256 amount, uint256 depositTime);
    event ClaimRewards(address indexed user, uint256 reward);
    event Withdraw(address indexed user, uint256 amount);

    error InvalidAmount(uint256 amount);
    error InvalidReward(uint256 reward);

    /**
     * @dev Constructor to initialize the staking contract.
     * @param _depositToken Address of the token used for deposits.
     * @param _rewardToken Address of the token used for rewards.
     * @param _lockPeriod Lock period for staked tokens.
     * @param _rewardPercentage Percentage of rewards based on the staked amount.
     */
    constructor(
        address _depositToken,
        address _rewardToken,
        uint256 _lockPeriod,
        uint256 _rewardPercentage
    ) {
        depositToken = IERC20(_depositToken);
        rewardToken = IERC20(_rewardToken);
        lockPeriod = _lockPeriod;
        rewardPercentage = _rewardPercentage;
    }

    /**
     * @dev Modifier to check if the lock period has elapsed for a user.
     */
    modifier checkLockPeriod() {
        require(
            block.timestamp.sub(lastDepositTime[msg.sender]) >= lockPeriod,
            "Lock period not elapsed"
        );
        _;
    }

    /**
     * @dev Function to allow users to deposit tokens into the staking contract.
     * @param amount The amount of tokens to be deposited.
     */
    function deposit(uint256 amount) external {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        depositToken.safeTransferFrom(msg.sender, address(this), amount);

        deposits[msg.sender] = deposits[msg.sender].add(amount);

        lastDepositTime[msg.sender] = block.timestamp;

        emit Deposit(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Function to allow users to claim rewards earned from staking.
     */
    function claimRewards() external checkLockPeriod {
        uint256 reward = deposits[msg.sender].mul(rewardPercentage).div(100);

        if (reward == 0) {
            revert InvalidReward(reward);
        }

        rewardToken.safeTransfer(msg.sender, reward);

        emit ClaimRewards(msg.sender, reward);
    }

    /**
     * @dev Function to allow users to withdraw their deposited tokens after the lock period has elapsed.
     */
    function withdraw() external checkLockPeriod {
        uint256 amount = deposits[msg.sender];

        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        deposits[msg.sender] = 0;
        depositToken.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }
}
