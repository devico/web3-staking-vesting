import { expect } from "chai"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ERC20 } from "../../typechain"
import { BigNumber } from "ethers"

describe("ERC20 Token Contract", function () {
    let token: ERC20
    let owner: SignerWithAddress
    let addr1: SignerWithAddress
    let addr2: SignerWithAddress
    let addr3: SignerWithAddress
    const initialSupply = ethers.utils.parseEther("1000")

    beforeEach(async function () {
        ;[owner, addr1, addr2, addr3] = await ethers.getSigners()
        const TokenFactory = await ethers.getContractFactory("ERC20", owner)
        token = await TokenFactory.deploy(initialSupply)

        await token.deployed()
    })

    describe("Basic Properties", function () {
        it("has correct name", async function () {
            expect(await token.name()).to.equal("DsnToken")
        })

        it("has correct symbol", async function () {
            expect(await token.symbol()).to.equal("DSN")
        })

        it("has correct decimals", async function () {
            expect(await token.decimals()).to.equal(18)
        })
    })

    describe("Initial Supply", function () {
        it("Should set the total supply upon deployment", async function () {
            expect(await token.totalSupply()).to.equal(initialSupply)
        })

        it("Should assign the total supply to the owner", async function () {
            expect(await token.balanceOf(owner.address)).to.equal(initialSupply)
        })
    })

    describe("Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            await token.transfer(addr1.address, 50)
            expect(await token.balanceOf(addr1.address)).to.equal(50)
        })

        it("Should emit Transfer event on token transfer", async function () {
            await expect(token.transfer(addr1.address, 50))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, 50)
        })

        it("Should revert when transferring to the zero address", async function () {
            const amount = ethers.utils.parseEther("10");
            await expect(token.connect(owner).transfer(ethers.constants.AddressZero, amount))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
        });

        it("Should revert when transferring more than the balance", async function () {
            const senderBalance = await token.balanceOf(owner.address);
            const amount = senderBalance.add(1); // Сумма больше, чем на балансе
        
            await expect(
                token.connect(owner).transfer(owner.address, amount)
            ).to.be.revertedWithCustomError(token, "InsufficientFunds");
        });
        
    })

    describe("Approvals", function () {
        let amount: BigNumber;

        beforeEach(async function () {
            amount = ethers.utils.parseEther("100");
        });

        it("Should approve other to spend token", async function () {
            await token.approve(addr1.address, 100)
            expect(await token.allowance(owner.address, addr1.address)).to.equal(100)
        })

        it("Should emit Approval event on token approval", async function () {
            await expect(token.approve(addr1.address, 100))
                .to.emit(token, "Approval")
                .withArgs(owner.address, addr1.address, 100)
        })

        it("Should revert when trying to approve zero address", async function () {
            await expect(token.connect(owner).approve(ethers.constants.AddressZero, amount))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
        });
    })

    describe("Transfers from", function () {
        let amount: BigNumber;

        beforeEach(async function () {
            await token.transfer(addr1.address, 100)
        })

        it("Should transfer tokens from sender to recipient", async () => {
            await token.connect(addr1).approve(addr2.address, 50);

            await token.connect(addr2).transferFrom(addr1.address, addr2.address, 10);

            const senderBalance = await token.balanceOf(addr1.address);
            const recipientBalance = await token.balanceOf(addr2.address);

            expect(senderBalance).to.equal(90);
            expect(recipientBalance).to.equal(10);
        })

        it("Should not transfer tokens without approval", async () => {
            const allowance = await token.allowance(addr1.address, addr2.address)
            expect(allowance).to.equal(0)
        })

        it("Should not transfer more tokens than the sender has", async () => {
            await token.connect(addr1).approve(addr2.address, 101)

            await expect(
                token.connect(addr1).transferFrom(addr1.address, addr2.address, 101)
            ).to.be.revertedWith("Not enough tokens.")
        })

        it("Should revert when transferring to the zero address", async function () {
            amount = ethers.utils.parseEther("10");
            
            await token.connect(owner).transfer(addr1.address, amount);
            await token.connect(addr1).approve(addr2.address, amount);

            await expect(token.connect(addr2).transferFrom(addr1.address, ethers.constants.AddressZero, amount))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
        });

        it("Should revert if the allowance is insufficient", async function () {
            const allowanceAmount = ethers.utils.parseEther("5");
            const transferAmount = ethers.utils.parseEther("10");
            await token.connect(owner).approve(addr1.address, allowanceAmount);
        
            await expect(token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
                .to.be.revertedWithCustomError(token, "InsufficientFundsAllowance");
        });
        
    })

    describe("Increase Allowance", function () {
        let initialAllowance: BigNumber

        beforeEach(async function () {
            initialAllowance = BigNumber.from(100)
            await token.connect(owner).approve(addr1.address, initialAllowance)
        })

        it("Should revert when trying to increase allowance for zero address", async function () {
            const addedValue = BigNumber.from(50)
            await expect(token.connect(owner).increaseAllowance(ethers.constants.AddressZero, addedValue))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
        });

        it("Should correctly increase allowance", async function () {
            const addedValue = BigNumber.from(50)
            await token.connect(owner).increaseAllowance(addr1.address, addedValue)

            expect(await token.allowance(owner.address, addr1.address)).to.equal(
                initialAllowance.add(addedValue)
            )
        })

        it("Should allow multiple increases in allowance", async function () {
            const addedValueFirst = BigNumber.from(50)
            const addedValueSecond = BigNumber.from(30)
            await token.connect(owner).increaseAllowance(addr1.address, addedValueFirst)
            await token.connect(owner).increaseAllowance(addr1.address, addedValueSecond)

            expect(await token.allowance(owner.address, addr1.address)).to.equal(
                initialAllowance.add(addedValueFirst).add(addedValueSecond)
            )
        })
    })

    describe("Decrease Allowance", function () {
        let initialAllowance: BigNumber;
    
        beforeEach(async function () {
            initialAllowance = BigNumber.from(100);
            await token.connect(owner).approve(addr1.address, initialAllowance);
        });

        it("Should revert when trying to decrease allowance for zero address", async function () {
            const subtractedValue = BigNumber.from(50);
            await expect(token.connect(owner).decreaseAllowance(ethers.constants.AddressZero, subtractedValue))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
        });

        it("Should revert if trying to decrease more than the current allowance", async function () {
            const initialAllowance = ethers.utils.parseEther("5");
            await token.connect(owner).approve(addr1.address, initialAllowance);
        
            const subtractedValue = initialAllowance.add(1);
        
            await expect(token.connect(owner).decreaseAllowance(addr1.address, subtractedValue))
                .to.be.revertedWithCustomError(token, "InsufficientFundsAllowance");
        });
    
        it("Should correctly decrease allowance", async function () {
            const subtractedValue = BigNumber.from(50);
            await token.connect(owner).decreaseAllowance(addr1.address, subtractedValue);
    
            expect(await token.allowance(owner.address, addr1.address)).to.equal(initialAllowance.sub(subtractedValue));
        });
    
        it("Should not allow a non-owner to decrease allowance", async function () {
            const subtractedValue = BigNumber.from(50);
            await expect(token.connect(addr1).decreaseAllowance(addr2.address, subtractedValue))
                .to.be.reverted;
        });
    });

    describe("Minting Tokens", function () {
        const mintAmount = BigNumber.from(1000);

        it("Should only allow owner to mint tokens", async function () {
            await expect(token.connect(addr1).mint(addr1.address, mintAmount))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert when trying to mint to the zero address", async function () {
            const mintAmount = BigNumber.from(1000);
            await expect(token.connect(owner).mint(ethers.constants.AddressZero, mintAmount))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
        });

        it("Should mint new tokens", async function () {
            const mintAmount = ethers.utils.parseEther("500");
            await token.connect(owner).mint(owner.address, mintAmount); // Исправлено: Указываем адрес и количество токенов
        
            expect(await token.totalSupply()).to.equal(initialSupply.add(mintAmount));
            expect(await token.balanceOf(owner.address)).to.equal(initialSupply.add(mintAmount));
        })
    })

    describe("Burning Tokens", function () {
        let burnAmount: BigNumber;
        let initialOwnerBalance: BigNumber;

        beforeEach(async function () {
            burnAmount = ethers.utils.parseEther("500");
            initialOwnerBalance = await token.balanceOf(owner.address);
        });

        it("Should only allow owner to burn tokens", async function () {
            await expect(token.connect(addr1).burn(addr1.address, burnAmount))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    
        it("Should burn tokens correctly", async function () {
            await token.connect(owner).burn(owner.address, burnAmount);
    
            const newTotalSupply = await token.totalSupply();
            const newOwnerBalance = await token.balanceOf(owner.address);
    
            expect(newTotalSupply).to.equal(initialSupply.sub(burnAmount));
            expect(newOwnerBalance).to.equal(initialOwnerBalance.sub(burnAmount));
        });
    
        it("Should fail to burn more tokens than the balance", async function () {
            const excessiveAmount = initialOwnerBalance.add(1);
    
            await expect(
                token.connect(owner).burn(owner.address, excessiveAmount)
            ).to.be.revertedWithCustomError(token, "InsufficientFunds");
        });
    
        it("Should revert when trying to burn from zero address", async function () {
            await expect(
                token.connect(owner).burn(ethers.constants.AddressZero, burnAmount)
            ).to.be.revertedWithCustomError(token, "ZeroAddress");
        });
    });
    
})
