import KhataFlowNFTABI from './contracts/KhataFlowNFT.json';
import KhataFlowPaymentsABI from './contracts/KhataFlowPayments.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const flowChainId = Number(process.env.REACT_APP_FLOW_CHAIN_ID || 545);

export const FLOW_TESTNET = {
  chainId: `0x${flowChainId.toString(16)}`,
  chainName: 'Flow EVM Testnet',
  rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
  nativeCurrency: {
    name: 'FLOW',
    symbol: 'FLOW',
    decimals: 18
  },
  blockExplorerUrls: ['https://evm-testnet.flowscan.io']
};

export const CONTRACTS = {
  NFT: {
    address: process.env.REACT_APP_NFT_CONTRACT_ADDRESS || ZERO_ADDRESS,
    abi: KhataFlowNFTABI
  },
  PAYMENTS: {
    address: process.env.REACT_APP_PAYMENTS_CONTRACT_ADDRESS || ZERO_ADDRESS,
    abi: KhataFlowPaymentsABI
  }
};
