import axios from 'axios';
import { config } from '../env';

export type Metadata = {
  name: string;
  description?: string;
  image?: string; // ipfs://CID or https URL
  attributes?: Array<{ trait_type: string; value: string | number }>;
};

export async function uploadJSON(metadata: Metadata): Promise<{ cid: string; ipfsUri: string; gatewayUrl: string }> {
  if (!config.pinataJwt) throw new Error('PINATA_JWT missing');

  const res = await axios.post(
    'https://api.pinata.cloud/pinning/pinJSONToIPFS',
    {
      pinataContent: metadata,
      pinataOptions: { cidVersion: 1 },
    },
    {
      headers: {
        Authorization: `Bearer ${config.pinataJwt}`,
        'Content-Type': 'application/json',
      },
      timeout: 60_000,
    }
  );

  const cid = res.data?.IpfsHash as string;
  if (!cid) throw new Error('Pinata response missing IpfsHash');
  const ipfsUri = `ipfs://${cid}`;
  const gatewayUrl = `${config.pinataGatewayUrl.replace(/\/$/, '')}/${cid}`;
  return { cid, ipfsUri, gatewayUrl };
}
