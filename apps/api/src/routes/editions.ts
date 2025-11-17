import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { config } from '../env';

export const router: ExpressRouter = Router();

const Query = z.object({
  wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((addr) => {
    // Validate and return checksummed address
    try {
      return ethers.getAddress(addr);
    } catch {
      throw new Error('Invalid Ethereum address');
    }
  }),
  fromBlock: z.string().optional(), // optional hex block tag or number as string
  meta: z.string().optional(), // '0' to skip metadata resolution for speed
});

function getAbi1155() {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const artifactsRoot = path.join(repoRoot, 'packages', 'contracts');
  const abiPath = path.join(
    artifactsRoot,
    'artifacts/contracts/Collectible1155.sol/Collectible1155.json'
  );
  const json = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
  return json.abi as any[];
}

router.get('/', async (req, res) => {
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_query' });
  const { wallet, meta } = parsed.data;
  const includeMeta = meta !== '0';

  try {
    const provider = new ethers.JsonRpcProvider(config.moonbaseRpcUrl);
    const abi = getAbi1155();
    const contract = new ethers.Contract(config.nftContractAddress, abi, provider);

    // Check balances for known edition IDs (1-4)
    // This is more reliable than scanning event logs with a limited block window
    const KNOWN_EDITION_IDS = ['1', '2', '3', '4'];
    const owned: Array<{ id: string; uri?: string; metadata?: any }> = [];

    for (const id of KNOWN_EDITION_IDS) {
      const bal: bigint = await contract.balanceOf(wallet, BigInt(id));
      if (bal > 0n) {
        let uri: string | undefined;
        try { uri = await contract.uri(BigInt(id)); } catch {}
        let metadata: any = undefined;
        if (includeMeta) {
          if (uri && (uri.startsWith('ipfs://') || uri.startsWith('http'))) {
            try {
              const resolved = uri.startsWith('ipfs://')
                ? (config.pinataGatewayUrl.replace(/\/$/, '') + '/ipfs/' + uri.replace('ipfs://', ''))
                : uri;
              const r = await fetch(resolved);
              if (r.ok) metadata = await r.json();
            } catch {}
          }
        }
        owned.push({ id, uri, metadata });
      }
    }

    return res.json({ items: owned, contract: String(contract.target), includeMeta });
  } catch (e: any) {
    return res.status(500).json({ error: 'onchain_query_failed', message: e?.message || String(e) });
  }
});

export default router;
