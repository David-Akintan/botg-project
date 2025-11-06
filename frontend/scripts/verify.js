// scripts/verify.js
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x89B939b84FE393e565D3803FcA4d84963bbA32ED";
  const candidateNames = ["Alice", "Bob", "John", "Doe"];
  const duration = 60;

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [candidateNames, duration],
    contract: "contracts/Voting.sol:Voting", // specify path and contract name
  });

  console.log("✅ Verification request sent to Etherscan.");
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
