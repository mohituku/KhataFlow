import { create } from 'zustand';
import { ethers } from 'ethers';
import { FLOW_TESTNET } from '../lib/contracts';

function getInjectedProvider() {
  if (typeof window === 'undefined') {
    return null;
  }

  const ethereum = window.ethereum;
  if (!ethereum) {
    return null;
  }

  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    return ethereum.providers.find((provider) => provider?.isMetaMask) || ethereum.providers[0];
  }

  return ethereum;
}

function normalizeWalletError(error) {
  if (!error) return 'Failed to connect wallet.';

  if (error.code === 4001) {
    return 'Wallet connection was rejected in MetaMask.';
  }

  if (error.code === -32002) {
    return 'A MetaMask request is already pending. Open MetaMask and finish it first.';
  }

  const message = error.message || String(error);

  if (message.includes('Failed to connect to MetaMask')) {
    return 'MetaMask could not complete the connection. Unlock MetaMask, close any pending popup, and try again.';
  }

  return message;
}

export const useWalletStore = create((set) => ({
  address: null,
  provider: null,
  signer: null,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });

    try {
      const injectedProvider = getInjectedProvider();

      if (!injectedProvider) {
        throw new Error('MetaMask not installed. Please install MetaMask extension.');
      }

      await injectedProvider.request({ method: 'eth_requestAccounts' });

      try {
        await injectedProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: FLOW_TESTNET.chainId }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await injectedProvider.request({
            method: 'wallet_addEthereumChain',
            params: [FLOW_TESTNET]
          });
        } else {
          throw switchError;
        }
      }

      const provider = new ethers.BrowserProvider(injectedProvider);
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
        error: normalizeWalletError(error),
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
