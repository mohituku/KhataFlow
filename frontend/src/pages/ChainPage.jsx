import { WalletConnect } from '../components/chain/WalletConnect';
import { NFTList } from '../components/chain/NFTList';
import { useWalletStore } from '../store/useWalletStore';
import { Coins } from 'lucide-react';

export default function ChainPage() {
  const { address } = useWalletStore();

  return (
    <div className="p-6" data-testid="chain-page">
      <div className="mb-6 flex items-center gap-4">
        <div
          className="w-16 h-16 bg-khata-surface border-[3px] border-khata-chain flex items-center justify-center"
          style={{
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
          }}
        >
          <Coins className="w-8 h-8 text-khata-chain" />
        </div>
        <div>
          <h2 className="text-4xl font-heading uppercase tracking-wider text-khata-text text-glow-chain">
            Blockchain
          </h2>
          <p className="text-khata-muted mt-1">Mint and manage NFTs on Flow EVM Testnet</p>
        </div>
      </div>

      <div className="space-y-6">
        <WalletConnect />
        {address && <NFTList />}
      </div>
    </div>
  );
}