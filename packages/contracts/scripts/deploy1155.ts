import { ethers } from "hardhat";

async function main() {
  const baseURI = process.env.BASE_URI || "https://gateway.pinata.cloud/ipfs/{id}.json";
  const [deployer] = await ethers.getSigners();

  const Collectible1155 = await ethers.getContractFactory("Collectible1155");
  const contract = await Collectible1155.deploy(baseURI, await deployer.getAddress());
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`[contracts] Collectible1155 deployed at: ${address}`);

  const relayer = process.env.RELAYER_ADDRESS;
  if (relayer && relayer !== "") {
    const tx = await contract.setRelayer(relayer);
    await tx.wait();
    console.log(`[contracts] Relayer set to: ${relayer}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
