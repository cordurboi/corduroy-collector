import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { Relayer } from '@collectible/relayer';
import path from 'path';
import { config } from '../env';

export const router: ExpressRouter = Router();

const BodySchema = z.object({
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  artId: z.string().min(1),
  tokenURI: z.string().url().optional(),
});

router.post('/', async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }

  const { to, artId } = parsed.data;
  const tokenURI = parsed.data.tokenURI ?? 'https://example.com/metadata.json';

  try {
    const repoRoot = path.resolve(__dirname, '../../../..');
    const artifactsRoot = path.join(repoRoot, 'packages', 'contracts');
    const relayer = new Relayer({
      rpcUrl: config.moonbaseRpcUrl,
      privateKey: config.relayerPrivateKey,
      contractAddress: config.nftContractAddress,
      artifactsRoot,
    });

    const { txHash, tokenId } = await relayer.mintNft({ to, artId, tokenURI });
    return res.json({ success: true, txHash, tokenId, to, artId, tokenURI });
  } catch (err: any) {
    return res.status(500).json({ error: 'mint_failed', message: err?.message || String(err) });
  }
});
