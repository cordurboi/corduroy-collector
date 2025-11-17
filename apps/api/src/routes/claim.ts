import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import { Relayer1155 } from '@collectible/relayer';
import { config, editionPinMap, editionLabelMap } from '../env';
import { uploadJSON } from '../services/pinata';
import path from 'path';
import fs from 'fs';

export const router: ExpressRouter = Router();

const ClaimBody = z.object({
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((addr) => {
    // Validate and return checksummed address
    try {
      return ethers.getAddress(addr);
    } catch {
      throw new Error('Invalid Ethereum address');
    }
  }),
  // PIN-based flow: if pin is present, server resolves art and metadata
  pin: z.string().min(1).max(100).optional(),
  // Direct flow (edition id as string, should be numeric)
  artId: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  image: z.string().url().max(500).optional(), // optional external image URL; not uploading files yet
}).refine((d) => !!d.pin || !!d.artId, { message: 'Provide pin or artId' });

router.post('/', async (req, res) => {
  const parsed = ClaimBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }

  const { to, pin, artId: bodyArtId, name: bodyName, description: bodyDescription, image: bodyImage } = parsed.data;

  try {
    // ERC-1155 Relayer setup
    const repoRoot = path.resolve(__dirname, '../../../..');
    const artifactsRoot = path.join(repoRoot, 'packages', 'contracts');
    const relayer = new Relayer1155({
      rpcUrl: config.moonbaseRpcUrl,
      privateKey: config.relayerPrivateKey,
      contractAddress: config.nftContractAddress,
      artifactsRoot,
    });

    // If PIN present, resolve art first to compute tokenId
    let resolvedArtId = bodyArtId as string; // will be used as editionId string, must be numeric
    let resolvedName = bodyName as string | undefined;
    let resolvedDescription = bodyDescription as string | undefined;
    let resolvedImageUrl = bodyImage as string | undefined;

    if (pin) {
      // Check explicit mapping from env
      const mapped = editionPinMap[pin];
      if (mapped) {
        resolvedArtId = mapped;
      } else {
        // PIN not found in mapping
        return res.status(404).json({ error: 'pin_not_found' });
      }
    }

    // If provided artId is a label and a mapping exists, translate it
    if (resolvedArtId && !/^\d+$/.test(resolvedArtId)) {
      const mappedByLabel = editionLabelMap[resolvedArtId];
      if (mappedByLabel) {
        resolvedArtId = mappedByLabel;
      }
    }

    // Parse edition id (numeric only for ERC-1155)
    const editionIdNum = Number(resolvedArtId);
    if (!Number.isFinite(editionIdNum) || editionIdNum < 0) {
      return res.status(400).json({ error: 'invalid_edition_id', message: `artId/editionId must be numeric, got '${resolvedArtId}'` });
    }

    // One-per-wallet check via balanceOf
    const bal = await relayer.balanceOf(to, BigInt(editionIdNum));
    if (bal > 0n) {
      return res.json({ success: true, alreadyOwned: true });
    }

    // Mint one unit of the edition to the user
    const { txHash } = await relayer.mintEdition({ to, id: BigInt(editionIdNum) });

    // Return success with transaction hash (blockchain is the source of truth)
    return res.json({ success: true, txHash });
  } catch (err: any) {
    return res.status(500).json({ error: 'claim_failed', message: err?.message || String(err) });
  }
});
