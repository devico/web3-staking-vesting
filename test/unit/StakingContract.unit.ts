import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { StakingContract } from "../../typechain";
import ERC20 from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

describe("StakingContract", function () {
  let StakingContract: StakingContract;
  let depositToken: ERC20;
  let rewardToken: ERC20;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const token = await ethers.getContractFactory("ERC20");
    depositToken = await token.deploy("Deposit Token", "DT");
    rewardToken = await token.deploy("Reward Token", "RT");

    StakingContract = await ethers.getContractFactory("StakingContract");
    StakingContract = await StakingContract.deploy(
      depositToken.address,
      rewardToken.address,
      60, // lockPeriod
      10 // rewardPercentage
    );
  });

  describe("deposit", function () {
    it("should deposit tokens", async function () {
      await depositToken.transfer(StakingContract.address, ethers.utils.parseEther("100"));
      await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"));

      const userDeposit = await StakingContract.deposits(user.address);
      expect(userDeposit).to.equal(ethers.utils.parseEther("100"));

      const lastDepositTime = await StakingContract.lastDepositTime(user.address);
      expect(lastDepositTime).to.be.gt(0);
    });
  });
});