import { create } from 'zustand';
import { ethers } from 'ethers';

const FLOW_TESTNET = {
  chainId: '0x221',
  chainName: 'Flow EVM Testnet',
  rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
  nativeCurrency: {
    name: 'FLOW',
    symbol: 'FLOW',
    decimals: 18
  },
  blockExplorerUrls: ['https://evm-testnet.flowscan.io']
};

export const useWalletStore = create((set) => ({
  address: null,
  provider: null,
  signer: null,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });
    
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      set({
        provider,
        signer,
        address,
        isConnecting: false
      });
    } catch (error) {
      set({
        error: error.message,
        isConnecting: false
      });
    }
  },

  disconnect: () => {
    set({
      address: null,
      provider: null,
      signer: null,
      error: null
    });
  }
}));