import { Web3Auth } from '@web3auth/modal';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';

let web3auth: Web3Auth | null = null;

export async function getWeb3Auth(): Promise<Web3Auth> {
  if (web3auth) return web3auth;
  const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
  if (!clientId) throw new Error('Missing NEXT_PUBLIC_WEB3AUTH_CLIENT_ID');

  const chainConfig = {
    chainNamespace: 'eip155',
    chainId: '0x507', // 1287 Moonbase Alpha
    rpcTarget: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.api.moonbase.moonbeam.network',
    displayName: 'Moonbase Alpha',
    ticker: 'GLMR',
    tickerName: 'Glimmer',
  } as const;

  const privateKeyProvider = new EthereumPrivateKeyProvider({ config: { chainConfig } });

  web3auth = new Web3Auth({ clientId, web3AuthNetwork: 'sapphire_devnet', privateKeyProvider });
  const openloginAdapter = new OpenloginAdapter({});
  web3auth.configureAdapter(openloginAdapter);
  await web3auth.initModal();
  return web3auth;
}

export function clearWeb3Auth() {
  web3auth = null;
}
