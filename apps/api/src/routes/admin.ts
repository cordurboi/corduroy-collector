import { Router } from 'express';
import type { Router as ExpressRouter, Request } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { config } from '../env';

export const router: ExpressRouter = Router();

function requireAdmin(req: Request): boolean {
  const auth = req.header('authorization') || req.header('Authorization');
  if (!auth) return false;
  const parts = auth.split(' ');
  if (parts.length !== 2) return false;
  const [type, token] = parts;
  const isBearer = (type || '').toLowerCase() === 'bearer';
  if (!isBearer || !token || !config.adminToken) return false;
  
  // Use timing-safe comparison to prevent timing attacks
  if (token.length !== config.adminToken.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ config.adminToken.charCodeAt(i);
  }
  return mismatch === 0;
}

const BodySetUri = z.object({ id: z.number().int().nonnegative(), uri: z.string().min(1) });

router.post('/edition', async (req, res) => {
  if (!requireAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const parsed = BodySetUri.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });

  const { id, uri } = parsed.data;
  try {
    const provider = new ethers.JsonRpcProvider(config.moonbaseRpcUrl);
    const signer = new ethers.Wallet(config.relayerPrivateKey, provider);

    const repoRoot = path.resolve(__dirname, '../../../..');
    const artifactsRoot = path.join(repoRoot, 'packages', 'contracts');
    const abiPath = path.join(
      artifactsRoot,
      'artifacts/contracts/Collectible1155.sol/Collectible1155.json'
    );
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8')).abi;
    const C = new ethers.Contract(config.nftContractAddress, abi, signer);

    const tx = await C.setURI(BigInt(id), uri);
    const receipt = await tx.wait();
    const current = await C.uri(BigInt(id));
    return res.json({ success: true, txHash: receipt.hash, id, uri: current });
  } catch (e: any) {
    return res.status(500).json({ error: 'set_uri_failed', message: e?.message || String(e) });
  }
});

export default router;
