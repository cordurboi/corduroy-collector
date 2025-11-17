import 'dotenv/config';

export const config = {
  web3authClientId: process.env.WEB3AUTH_CLIENT_ID || '',
  pinataJwt: process.env.PINATA_JWT || '',
  pinataGatewayUrl: process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs',
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '',
  moonbaseRpcUrl: process.env.MOONBASE_RPC_URL || 'https://rpc.api.moonbase.moonbeam.network',
  chainId: Number(process.env.CHAIN_ID || 1287),
  nftContractAddress: process.env.NFT_CONTRACT_ADDRESS || '',
  adminToken: process.env.ADMIN_TOKEN || '',
  editionPinMapRaw: process.env.EDITION_PIN_MAP || '',
  editionLabelMapRaw: process.env.EDITION_LABEL_MAP || '',
};

export function assertRequiredEnv() {
  const missing: string[] = [];
  if (!config.relayerPrivateKey) missing.push('RELAYER_PRIVATE_KEY');
  if (!config.moonbaseRpcUrl) missing.push('MOONBASE_RPC_URL');
  if (!config.nftContractAddress) missing.push('NFT_CONTRACT_ADDRESS');
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

function parseMap(raw: string): Record<string, string> {
  if (!raw) return {};
  try {
    // Accept JSON: {"PIN123":"1","PIN456":"2"}
    if (raw.trim().startsWith('{')) return JSON.parse(raw);
  } catch {}
  // Accept CSV pairs: PIN123:1,PIN456:2
  const out: Record<string, string> = {};
  for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [k, v] = part.split(':').map((s) => s.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

export const editionPinMap: Record<string, string> = parseMap(config.editionPinMapRaw);
export const editionLabelMap: Record<string, string> = parseMap(config.editionLabelMapRaw);
