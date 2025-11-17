import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

export type MintArgs = {
  to: string;
  tokenURI: string;
  artId: string; // string; will be converted to bytes32 (keccak of provided string if not 32 bytes)
};

export class Relayer {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(params: { rpcUrl: string; privateKey: string; contractAddress: string; artifactsRoot?: string }) {
    const { rpcUrl, privateKey, contractAddress, artifactsRoot } = params;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);

    const abiPath = path.resolve(
      artifactsRoot || path.join(process.cwd(), 'packages', 'contracts'),
      'artifacts/contracts/Collectible.sol/Collectible.json'
    );
    const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
    this.contract = new ethers.Contract(contractAddress, abiJson.abi, this.signer);
  }

  async mintNft(args: MintArgs): Promise<{ txHash: string; tokenId: string }> {
    const { to, tokenURI } = args;
    const artIdBytes32 = toBytes32(args.artId);
    const tx = await this.contract.mintTo(to, artIdBytes32, tokenURI);
    const receipt = await tx.wait();
    const iface = this.contract.interface;
    let tokenId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'Collected') {
          tokenId = (parsed.args?.tokenId as bigint).toString();
          break;
        }
      } catch (_) {
        // skip non-matching logs
      }
    }
    return { txHash: receipt.hash, tokenId: tokenId ?? '0' };
  }

  computeTokenId(to: string, artId: string): string {
    const artIdBytes32 = toBytes32(artId);
    // Solidity uses keccak256(abi.encodePacked(address, bytes32))
    const hash = ethers.solidityPackedKeccak256(['address', 'bytes32'], [to, artIdBytes32]);
    // Return as decimal string for consistency with tokenId event parsing
    return BigInt(hash).toString();
  }

  async getOwnerOf(tokenId: string): Promise<string | null> {
    try {
      const owner: string = await this.contract.ownerOf(BigInt(tokenId));
      return owner;
    } catch (e: any) {
      // If token does not exist, OZ ownerOf reverts; treat as no owner
      return null;
    }
  }
}

export function toBytes32(input: string): string {
  // If it's already a 0x-prefixed 32-byte hex string
  if (/^0x[0-9a-fA-F]{64}$/.test(input)) return input;
  // Otherwise, hash the utf8 string
  return ethers.keccak256(ethers.toUtf8Bytes(input));
}

// ---------------- ERC-1155 Relayer (Editions) ----------------
export class Relayer1155 {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(params: { rpcUrl: string; privateKey: string; contractAddress: string; artifactsRoot?: string }) {
    const { rpcUrl, privateKey, contractAddress, artifactsRoot } = params;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);

    const abiPath = path.resolve(
      artifactsRoot || path.join(process.cwd(), 'packages', 'contracts'),
      'artifacts/contracts/Collectible1155.sol/Collectible1155.json'
    );
    const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
    this.contract = new ethers.Contract(contractAddress, abiJson.abi, this.signer);
  }

  async mintEdition(args: { to: string; id: bigint | number | string }): Promise<{ txHash: string }> {
    const { to, id } = args;
    const tx = await this.contract.mintTo(to, BigInt(id));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async balanceOf(to: string, id: bigint | number | string): Promise<bigint> {
    const bal: bigint = await this.contract.balanceOf(to, BigInt(id));
    return bal;
  }
}
