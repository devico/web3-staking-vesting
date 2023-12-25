import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify } from "../scripts/helpers/verify"

const deployStakingContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const depositTokenAddress = "0x4458AcB1185aD869F982D51b5b0b87e23767A3A9";
  const rewardTokenAddress = "0x8d375dE3D5DDde8d8caAaD6a4c31bD291756180b";
  const lockPeriod = 86400;
  const rewardPercentage = 10;
  const stakingStartTime = (await ethers.provider.getBlock('latest')).timestamp + 3600;

  const stakingContract = await deploy("StakingContract", {
    from: deployer,
    args: [depositTokenAddress, rewardTokenAddress, lockPeriod, rewardPercentage, stakingStartTime],
    log: true,
    waitConfirmations: 6,
  });

  await verify(stakingContract.address, [depositTokenAddress, rewardTokenAddress, lockPeriod, rewardPercentage, stakingStartTime]);
};

export default deployStakingContract;
deployStakingContract.tags = ["StakingContract"];
