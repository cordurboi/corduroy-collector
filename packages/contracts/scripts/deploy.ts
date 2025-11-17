import { ethers } from "hardhat";

async function main() {
  const name = process.env.NFT_NAME || "Event Collectible";
  const symbol = process.env.NFT_SYMBOL || "EVNT";

  const Collectible = await ethers.getContractFactory("Collectible");
  const contract = await Collectible.deploy(name, symbol);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`[contracts] Collectible deployed at: ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
