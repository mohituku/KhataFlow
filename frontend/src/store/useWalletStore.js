import { create } from 'zustand';
import { ethers } from 'ethers';
import { FLOW_TESTNET } from '../lib/contracts';

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
        throw new Error('MetaMask not installed. Please install MetaMask extension.');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: FLOW_TESTNET.chainId }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [FLOW_TESTNET]
          });
        } else {
          throw switchError;
        }
      }

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
