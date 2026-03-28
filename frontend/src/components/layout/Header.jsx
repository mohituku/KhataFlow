import { Wallet } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore';
import { Button } from '../ui/button';

export const Header = () => {
  const { address, connect, disconnect, isConnecting } = useWalletStore();

  const shortenAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="bg-khata-surface border-b-[3px] border-khata-border px-8 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-khata-muted uppercase tracking-[0.15em]">Control Panel</h2>
        </div>

        <div className="flex items-center gap-4">
          {address ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-khata-bg border-[3px] border-khata-chain">
                <div className="w-2 h-2 bg-khata-chain rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-khata-chain" data-testid="wallet-address">
                  {shortenAddress(address)}
                </span>
              </div>
              <Button
                onClick={disconnect}
                variant="outline"
                size="sm"
                className="uppercase font-bold tracking-wider border-[3px] border-khata-border hover:border-khata-danger hover:text-khata-danger"
                data-testid="disconnect-wallet-btn"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              data-testid="connect-wallet-btn"
              className="
                clip-angled-sm
                flex items-center gap-2 px-6 py-3
                bg-gradient-to-r from-khata-chain to-purple-500
                text-white font-bold uppercase tracking-wider text-sm
                border-[3px] border-khata-bg
                hover:scale-[1.02] transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              style={{
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.6)'
              }}
            >
              <Wallet className="w-5 h-5" />
              {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};