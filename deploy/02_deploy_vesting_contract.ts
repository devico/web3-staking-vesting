import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify } from "../scripts/helpers/verify"

const deployVestingContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const tokenAddress = "0x4458AcB1185aD869F982D51b5b0b87e23767A3A9";

  const startTime = (await ethers.provider.getBlock('latest')).timestamp + 3600;
  const endTime = startTime + 86400 * 30;

  const vestingContract = await deploy("VestingContract", {
    from: deployer,
    args: [tokenAddress, startTime, endTime],
    log: true,
    waitConfirmations: 6,
  });

  await verify(vestingContract.address, [tokenAddress, startTime, endTime]);
};

export default deployVestingContract;
deployVestingContract.tags = ["VestingContract"];
