import { useWalletStore } from '../../store/useWalletStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Wallet, AlertCircle } from 'lucide-react';

export const AppShell = ({ children }) => {
  const { address, connect, isConnecting, error } = useWalletStore();

  // GATE: must connect wallet to use the app
  if (!address) {
    return (
      <div className="min-h-screen bg-khata-bg flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div 
              className="w-24 h-24 mx-auto mb-6 bg-khata-surface border-[3px] border-khata-chain
                flex items-center justify-center"
              style={{ boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}
            >
              <Wallet className="w-12 h-12 text-khata-chain" />
            </div>
            <h1 className="text-4xl font-heading uppercase tracking-wider text-khata-text mb-3">
              KhataFlow
            </h1>
            <p className="text-khata-muted">
              Connect your MetaMask wallet on Flow EVM Testnet to access your business dashboard.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-khata-danger/10 border-[2px] border-khata-danger">
              <AlertCircle className="w-5 h-5 text-khata-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-khata-danger">{error}</p>
            </div>
          )}

          <button
            onClick={() => {
              void connect();
            }}
            disabled={isConnecting}
            className="w-full clip-angled flex items-center justify-center gap-3 px-6 py-5
              bg-gradient-to-r from-khata-chain to-purple-500
              text-white font-bold uppercase tracking-wider text-lg
              border-[3px] border-khata-bg
              hover:scale-[1.02] transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: isConnecting ? 'none' : '0 0 25px rgba(139,92,246,0.6)' }}
          >
            <Wallet className="w-6 h-6" />
            {isConnecting ? 'CONNECTING...' : 'CONNECT METAMASK'}
          </button>

          <div className="text-center">
            <p className="text-xs text-khata-muted">
              Network: Flow EVM Testnet · Chain ID: 545
            </p>
            <p className="text-xs text-khata-muted mt-1">
              Each wallet address = one unique business account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-khata-bg" data-testid="app-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto tech-grid-bg">
          {children}
        </main>
      </div>
    </div>
  );
};
