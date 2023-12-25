import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ERC20, VestingContract } from "../../typechain"

describe("VestingContract", function () {
    let VestingContract: VestingContract
    let token: ERC20
    let owner: SignerWithAddress
    let user: SignerWithAddress

    const initialSupply = ethers.utils.parseEther("100000")
    let distributionStartTime: number;
    let distributionEndTime: number;
    const unlockStages = [10, 30, 50, 100];

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners()

        const Token = await ethers.getContractFactory("ERC20")
        token = await Token.deploy(initialSupply)

        distributionStartTime = (await ethers.provider.getBlock("latest")).timestamp + 3600;
        distributionEndTime = distributionStartTime + 7200;

        const VestingContractFactory = await ethers.getContractFactory("VestingContract")
        VestingContract = (await VestingContractFactory.deploy(
            token.address,
            distributionStartTime,
            distributionEndTime
        )) as VestingContract

        await token.mint(VestingContract.address, ethers.utils.parseEther("1000"))
    })

    describe("distributeRights with duringDistributionPhase modifier", function () {
        it("should allow distribution during the distribution phase", async function () {
            const timeDuringDistribution = distributionStartTime + 100;
            await ethers.provider.send("evm_setNextBlockTimestamp", [timeDuringDistribution]);
            await ethers.provider.send("evm_mine", []);

            await expect(VestingContract.distributeRights(user.address, 100))
                .to.emit(VestingContract, "DistributedRights")
                .withArgs(user.address, 100);
        });

        it("should revert distribution after the distribution phase is over", async function () {
            const timeAfterDistribution = distributionEndTime + 100;
            await ethers.provider.send("evm_setNextBlockTimestamp", [timeAfterDistribution]);
            await ethers.provider.send("evm_mine", []);

            await expect(VestingContract.distributeRights(user.address, 100))
                .to.be.revertedWith("Distribution phase is over");
        });
    });

    describe("distributeRights", function () {
        it("should correctly distribute rights", async function () {
            await ethers.provider.send("evm_setNextBlockTimestamp", [distributionStartTime + 100]);
            await ethers.provider.send("evm_mine", []);

            await expect(VestingContract.distributeRights(user.address, 100))
                .to.emit(VestingContract, "DistributedRights")
                .withArgs(user.address, 100);
    
            expect(await VestingContract.rights(user.address)).to.equal(100);
        });
    
        it("should fail if called by non-owner", async function () {
            await ethers.provider.send("evm_setNextBlockTimestamp", [distributionStartTime + 100]);
            await ethers.provider.send("evm_mine", []);

            await expect(VestingContract.connect(user).distributeRights(user.address, 100))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should revert when trying to distribute to the zero address", async function () {
            const timeDuringDistribution = distributionStartTime + 100;
            await ethers.provider.send("evm_setNextBlockTimestamp", [timeDuringDistribution]);
            await ethers.provider.send("evm_mine", []);
    
            await expect(VestingContract.distributeRights(ethers.constants.AddressZero, 100))
                .to.be.revertedWithCustomError(VestingContract, "ZeroAddress");
        });

        it("should revert when trying to distribute a zero amount", async function () {
            const timeDuringDistribution = distributionStartTime + 100;
            await ethers.provider.send("evm_setNextBlockTimestamp", [timeDuringDistribution]);
            await ethers.provider.send("evm_mine", []);
    
            await expect(VestingContract.distributeRights(user.address, 0))
                .to.be.revertedWithCustomError(VestingContract, "InvalidAmount");
        });
    });

    describe("getAvailableAmount", function () {
        it("should return 0 if no rights distributed", async function () {
            expect(await VestingContract.getAvailableAmount(user.address)).to.equal(0);
        });
    
        it("should return correct available amount at different unlock stages", async function () {
            const distributeTime = distributionStartTime + 100;
            await ethers.provider.send("evm_setNextBlockTimestamp", [distributeTime]);
            await ethers.provider.send("evm_mine", []);
            await VestingContract.distributeRights(user.address, 100);
        
            for (let i = 0; i < unlockStages.length; i++) {
                const unlockTime = distributionStartTime + (i + 1) * 30 * 86400;
                if (unlockTime > distributionEndTime) {
                    break;
                }
                await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime]);
                await ethers.provider.send("evm_mine", []);
        
                const expectedUnlockPercentage = unlockStages[i];
                const expectedAvailableAmount = (100 * expectedUnlockPercentage) / 100;
                expect(await VestingContract.getAvailableAmount(user.address)).to.equal(expectedAvailableAmount);
            }
        });
        
    
        it("should revert with ZeroAddress for the zero address", async function () {
            await expect(VestingContract.getAvailableAmount(ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(VestingContract, "ZeroAddress");
        });
    });

    describe("withdrawTokens", function () {
        beforeEach(async function () {
            const distributeTime = distributionStartTime + 100;
            await ethers.provider.send("evm_setNextBlockTimestamp", [distributeTime]);
            await ethers.provider.send("evm_mine", []);
    
            await VestingContract.distributeRights(user.address, 100);
        });
    
        it("should revert if distribution phase is not over", async function () {
            const timeBeforeEnd = distributionEndTime - 100;
            await ethers.provider.send("evm_setNextBlockTimestamp", [timeBeforeEnd]);
            await ethers.provider.send("evm_mine", []);
    
            await expect(VestingContract.connect(user).withdrawTokens())
                .to.be.revertedWithCustomError(VestingContract, "DistributionNotOver");
        });
    
        it("should revert with InvalidAvailableAmount if no tokens available", async function () {
            const timeAfterEnd = distributionEndTime + 1;
            await ethers.provider.send("evm_setNextBlockTimestamp", [timeAfterEnd]);
            await ethers.provider.send("evm_mine", []);
    
            await expect(VestingContract.connect(user).withdrawTokens())
                .to.be.revertedWithCustomError(VestingContract, "InvalidAvailableAmount");
        });

        it("should successfully withdraw tokens when available", async function () {
            const unlockTime = distributionStartTime + 30 * 86400;
            await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime]);
            await ethers.provider.send("evm_mine", []);
    
            await expect(() => VestingContract.connect(user).withdrawTokens())
                .to.changeTokenBalances(token, [user, VestingContract], [10, -10]);
        });        
    
        it("should emit TokensWithdrawn event on successful withdrawal", async function () {
            const unlockTime = distributionStartTime + 30 * 86400;
            await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime]);
            await ethers.provider.send("evm_mine", []);
    
            await expect(VestingContract.connect(user).withdrawTokens())
                .to.emit(VestingContract, "TokensWithdrawn")
                .withArgs(user.address, 10);
        });
    });
});
