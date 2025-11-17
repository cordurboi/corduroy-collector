import { ethers } from "hardhat";
async function main() {
  const addr = process.env.CONTRACT!;
  const id = BigInt(process.env.EDITION_ID || "1");
  const uri = process.env.URI!;
  const [signer] = await ethers.getSigners();
  console.log("Signer:", await signer.getAddress());
  const C = await ethers.getContractAt("Collectible1155", addr, signer);
  const tx = await C.setURI(id, uri);
  console.log("tx:", tx.hash);
  await tx.wait();
  console.log("Done. URI:", await C.uri(id));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
