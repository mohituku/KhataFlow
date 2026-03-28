import { useState } from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore';

export const WalletConnect = () => {
  const { address, connect, disconnect, isConnecting, error } = useWalletStore();

  const shortenAddress = (addr) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  if (address) {
    return (
      <div className="bg-khata-surface border-[3px] border-khata-chain p-6" data-testid="wallet-connected">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-khata-muted mb-2">Connected Wallet</p>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-khata-chain rounded-full animate-pulse"></div>
              <p className="text-xl font-heading text-khata-chain" data-testid="connected-address">
                {shortenAddress(address)}
              </p>
            </div>
            <p className="text-xs text-khata-muted mt-2">Flow EVM Testnet</p>
          </div>
          <button
            onClick={disconnect}
            data-testid="disconnect-wallet-button"
            className="
              px-4 py-2
              bg-transparent text-khata-text
              border-[3px] border-khata-border
              hover:border-khata-danger hover:text-khata-danger
              font-bold uppercase tracking-wider text-sm
              transition-all duration-300
            "
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-khata-surface border-[3px] border-khata-border p-8" data-testid="wallet-disconnected">
      <div className="max-w-md mx-auto text-center">
        <div
          className="w-20 h-20 mx-auto mb-6 bg-khata-bg border-[3px] border-khata-chain flex items-center justify-center"
          style={{
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
          }}
        >
          <Wallet className="w-10 h-10 text-khata-chain" />
        </div>
        <h3 className="text-2xl font-heading uppercase tracking-wider text-khata-text mb-3">
          Connect Your Wallet
        </h3>
        <p className="text-khata-muted mb-6">
          Connect MetaMask to mint NFTs and interact with the Flow EVM Testnet blockchain.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-khata-danger/10 border-[2px] border-khata-danger flex items-start gap-2" data-testid="wallet-error">
            <AlertCircle className="w-5 h-5 text-khata-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-khata-danger text-left">{error}</p>
          </div>
        )}

        <button
          onClick={connect}
          disabled={isConnecting}
          data-testid="connect-wallet-button"
          className="
            clip-angled
            w-full flex items-center justify-center gap-2 px-6 py-4
            bg-gradient-to-r from-khata-chain to-purple-500
            text-white font-bold uppercase tracking-wider text-lg
            border-[3px] border-khata-bg
            hover:scale-[1.02] transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          style={{
            boxShadow: isConnecting ? 'none' : '0 0 20px rgba(139, 92, 246, 0.6)'
          }}
        >
          <Wallet className="w-6 h-6" />
          {isConnecting ? 'CONNECTING...' : 'CONNECT METAMASK'}
        </button>
      </div>
    </div>
  );
};