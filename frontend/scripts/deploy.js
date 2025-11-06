import { ethers } from "ethers";
const main = async () => {
  console.log("Deploying contracts...");

  const contract = await ethers.getContractFactory("BattleOfTheGiants");
  const deployedContract = await contract.deploy();
  console.log("Voting contract deployed to:", deployedContract.address);
  console.log("Contracts deployed successfully!");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
