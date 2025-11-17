import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const MOONBASE_RPC_URL = process.env.MOONBASE_RPC_URL || 'https://rpc.api.moonbase.moonbeam.network';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '0x' + '0'.repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    moonbase: {
      url: MOONBASE_RPC_URL,
      accounts: RELAYER_PRIVATE_KEY && RELAYER_PRIVATE_KEY !== '0x' + '0'.repeat(64) ? [RELAYER_PRIVATE_KEY] : [],
      chainId: 1287,
    },
  },
};

export default config;
