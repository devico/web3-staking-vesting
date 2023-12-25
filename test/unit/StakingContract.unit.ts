import { expect } from "chai"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ERC20, StakingContract } from "../../typechain"

describe("StakingContract", function () {
    let StakingContract: StakingContract
    let depositToken: ERC20
    let rewardToken: ERC20
    let owner: SignerWithAddress
    let user: SignerWithAddress

    const initialsupply = ethers.utils.parseEther("100000")

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners()

        const token = await ethers.getContractFactory("ERC20")
        depositToken = await token.deploy(initialsupply)
        rewardToken = await token.deploy(initialsupply)

        const stakingContract = await ethers.getContractFactory("StakingContract")
        const stakingStartTime = (await ethers.provider.getBlock("latest")).timestamp

        StakingContract = await stakingContract.deploy(
            depositToken.address,
            rewardToken.address,
            60,
            10,
            stakingStartTime
        )

        await depositToken.mint(user.address, ethers.utils.parseEther("1000"))
        await depositToken
            .connect(user)
            .approve(StakingContract.address, ethers.utils.parseEther("1000"))

        await rewardToken.mint(StakingContract.address, ethers.utils.parseEther("1000"))
    })

    describe("checkStakingStarted modifier", function () {
        it("should allow execution if staking has started", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            const userDeposit = await StakingContract.users(user.address)
            expect(userDeposit.depositAmount).to.equal(ethers.utils.parseEther("100"))
        })

        it("should revert if staking has not started", async function () {
            const stakingContract = await ethers.getContractFactory("StakingContract")
            StakingContract = await stakingContract.deploy(
                depositToken.address,
                rewardToken.address,
                60,
                10,
                Math.floor(Date.now() / 1000) + 3600
            )

            await expect(
                StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))
            ).to.be.revertedWith("Staking not started")
        })
    })

    describe("deposit", function () {
        it("should revert if amount is 0", async function () {
            await expect(StakingContract.connect(user).deposit(0)).to.be.revertedWithCustomError(
                StakingContract,
                "InvalidAmount"
            )
        })

        it("should allow users to deposit tokens", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            const userDeposit = await StakingContract.users(user.address)
            expect(userDeposit.depositAmount).to.equal(ethers.utils.parseEther("100"))
        })
    })

    describe("claimRewards", function () {
        it("should revert if reward is 0", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            await ethers.provider.send("evm_increaseTime", [61])
            await ethers.provider.send("evm_mine", [])

            await StakingContract.connect(user).claimRewards()

            await StakingContract.connect(user).withdraw()

            await expect(
                StakingContract.connect(user).claimRewards()
            ).to.be.revertedWithCustomError(StakingContract, "RewardsAlreadyClaimed")
        })

        it("should allow users to claim rewards", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            await ethers.provider.send("evm_increaseTime", [61])

            await StakingContract.connect(user).claimRewards()

            const userRewards = await rewardToken.balanceOf(user.address)
            expect(userRewards).to.equal(ethers.utils.parseEther("10"))
        })

        it("should revert if user tries to claim rewards before lock period", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            await expect(StakingContract.connect(user).claimRewards()).to.be.revertedWith(
                "Lock period not elapsed"
            )
        })
    })

    describe("withdraw", function () {
        it("should revert if rewards are not claimed during withdrawal", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            await ethers.provider.send("evm_increaseTime", [61])
            await ethers.provider.send("evm_mine", [])

            await expect(StakingContract.connect(user).withdraw()).to.be.revertedWithCustomError(
                StakingContract,
                "RewardsNotClaimed"
            )
        })

        it("should allow users to withdraw after claiming rewards", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            await ethers.provider.send("evm_increaseTime", [61])

            await StakingContract.connect(user).claimRewards()

            await StakingContract.connect(user).withdraw()

            const userDeposit = await StakingContract.users(user.address)
            expect(userDeposit.depositAmount).to.equal(0)
        })

        it("should revert if user tries to withdraw before claiming rewards", async function () {
            await StakingContract.connect(user).deposit(ethers.utils.parseEther("100"))

            await expect(StakingContract.connect(user).withdraw()).to.be.revertedWith(
                "Lock period not elapsed"
            )
        })
    })
})
