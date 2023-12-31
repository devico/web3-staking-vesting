// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VestingContract
 * @dev A smart contract for token vesting with multiple unlock stages.
 * The contract allows the owner to distribute rights during the distribution phase,
 * and users can withdraw their available tokens after the distribution phase is over.
 */
contract VestingContract is Ownable {
    IERC20 public token;
    uint256 public startTime;
    uint256 public endTime;
    uint256[] public unlockStages = [10, 30, 50, 100];

    mapping(address => uint256) public rights;
    mapping(address => uint256) public lastUnlockedStage;

    event DistributedRights(address indexed account, uint256 amount);
    event TokensWithdrawn(address indexed account, uint256 amount);

    error ZeroAddress();
    error InvalidAmount(uint256 amount);
    error DistributionNotOver();
    error InvalidAvailableAmount(uint256 availableAmount);
    error InvalidRemainingAmount(uint256 remainingAmount);

    /**
     * @dev Constructor to initialize the VestingContract.
     * @param _token Address of the ERC20 token contract.
     * @param _startTime Start time of the distribution phase.
     * @param _endTime End time of the distribution phase.
     */
    constructor(address _token, uint256 _startTime, uint256 _endTime) {
        token = IERC20(_token);
        startTime = _startTime;
        endTime = _endTime;
    }

    /**
     * @dev Modifier to check if the current timestamp is within the distribution phase.
     */
    modifier duringDistributionPhase() {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Distribution phase is over"
        );
        _;
    }

    /**
     * @dev Function to distribute rights to an account during the distribution phase.
     * @param account The address to receive the rights.
     * @param amount The amount of rights to be distributed.
     */
    function distributeRights(
        address account,
        uint256 amount
    ) external onlyOwner duringDistributionPhase {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        rights[account] += amount;
        emit DistributedRights(account, amount);
    }

    /**
     * @dev Function to calculate the available amount of tokens for withdrawal by an account.
     * @param _address The address of the account.
     * @return The amount of tokens available for withdrawal.
     */
    function getAvailableAmount(address _address) public view returns (uint256) {
        if (_address == address(0)) {
            revert ZeroAddress();
        }

        uint256 unlockedPercentage = 0;

        for (uint256 i = 0; i < unlockStages.length; i++) {
            if (block.timestamp >= startTime + (i + 1) * 30 days) {
                unlockedPercentage = unlockStages[i];
            } else {
                break;
            }
        }

        uint256 unlockableAmount = (rights[_address] * unlockedPercentage) / 100;

        return unlockableAmount;
    }

    /**
     * @dev Function to withdraw available tokens by an account after the distribution phase.
     */
    function withdrawTokens() external {
        if (block.timestamp < endTime) {
            revert DistributionNotOver();
        }

        uint256 availableAmount = getAvailableAmount(msg.sender);

        if (availableAmount == 0) {
            revert InvalidAvailableAmount(availableAmount);
        }

        uint256 remainingAmount = availableAmount - lastUnlockedStage[msg.sender];

        lastUnlockedStage[msg.sender] = availableAmount;

        rights[msg.sender] -= remainingAmount;
        token.transfer(msg.sender, remainingAmount);

        emit TokensWithdrawn(msg.sender, remainingAmount);
    }
}
