import { useState } from 'react';
import { ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { mockNFTs, formatCurrency } from '../../lib/mockData';
import { format } from 'date-fns';
import { MintModal } from './MintModal';

export const NFTList = () => {
  const [showMintModal, setShowMintModal] = useState(false);

  return (
    <>
      <div className="space-y-4" data-testid="nft-list">
        {mockNFTs.map((nft) => (
          <div
            key={nft.tokenId}
            className="clip-angled bg-khata-surface border-[3px] border-khata-chain p-6 hover:-translate-y-1 hover:comic-shadow-chain transition-all duration-300"
            data-testid={`nft-card-${nft.tokenId}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 bg-gradient-to-br from-khata-chain to-purple-500 flex items-center justify-center border-[3px] border-khata-bg"
                  style={{
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
                  }}
                >
                  <span className="text-2xl font-heading text-white">#{nft.tokenId}</span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-khata-muted">Token ID</p>
                  <p className="text-xl font-heading text-khata-text">{nft.tokenId}</p>
                </div>
              </div>
              <div
                className={`
                  px-3 py-1 border-[2px]
                  ${
                    nft.status === 'ACTIVE'
                      ? 'border-khata-accent text-khata-accent'
                      : 'border-khata-muted text-khata-muted'
                  }
                  flex items-center gap-2
                `}
              >
                {nft.status === 'ACTIVE' ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">{nft.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Client</p>
                <p className="text-sm font-bold text-khata-text">{nft.clientName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Amount</p>
                <p className="text-lg font-heading text-khata-accent">{formatCurrency(nft.amount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Due Date</p>
                <p className="text-sm font-bold text-khata-text">
                  {format(new Date(nft.dueDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t-[2px] border-khata-border">
              <div>
                <p className="text-xs text-khata-muted">Invoice: <span className="text-khata-text">{nft.invoiceId}</span></p>
              </div>
              <a
                href={`https://evm-testnet.flowscan.io/tx/${nft.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`explorer-link-${nft.tokenId}`}
                className="
                  flex items-center gap-2 px-3 py-1
                  text-xs font-bold uppercase tracking-wider
                  text-khata-chain border-[2px] border-khata-chain
                  hover:bg-khata-chain hover:text-white
                  transition-all duration-200
                "
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowMintModal(true)}
        data-testid="open-mint-modal-btn"
        className="
          mt-6 w-full clip-angled
          flex items-center justify-center gap-2 px-6 py-4
          bg-gradient-to-r from-khata-chain to-purple-500
          text-white font-bold uppercase tracking-wider text-lg
          border-[3px] border-khata-bg
          hover:scale-[1.02] transition-all duration-300
        "
        style={{
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)'
        }}
      >
        Mint New NFT
      </button>

      <MintModal open={showMintModal} onClose={() => setShowMintModal(false)} />
    </>
  );
};