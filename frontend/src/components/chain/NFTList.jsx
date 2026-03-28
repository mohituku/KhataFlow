import { useEffect, useState } from 'react';
import { ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/mockData';
import { format } from 'date-fns';
import { MintModal } from './MintModal';
import { fetchJson } from '../../lib/api';

export const NFTList = () => {
  const [showMintModal, setShowMintModal] = useState(false);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNfts = async () => {
    setLoading(true);

    try {
      const data = await fetchJson('/api/invoices?status=MINTED');
      setNfts(
        (data.invoices || []).map((invoice) => ({
          tokenId: invoice.nft_token_id,
          clientName: invoice.clients?.name || 'Unknown Client',
          amount: Number(invoice.amount || 0),
          status: 'ACTIVE',
          invoiceId: invoice.id,
          txHash: invoice.nft_tx_hash,
          dueDate: invoice.due_date
        }))
      );
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNfts();
  }, []);

  return (
    <>
      <div className="space-y-4" data-testid="nft-list">
        {loading ? (
          <div className="bg-khata-surface border-[3px] border-khata-border p-6 text-khata-muted">
            Loading minted NFTs...
          </div>
        ) : nfts.length === 0 ? (
          <div className="bg-khata-surface border-[3px] border-khata-border p-6 text-khata-muted">
            No minted NFTs found yet.
          </div>
        ) : (
          nfts.map((nft) => (
            <div
              key={nft.invoiceId}
              className="clip-angled bg-khata-surface border-[3px] border-khata-chain p-6 hover:-translate-y-1 hover:comic-shadow-chain transition-all duration-300"
              data-testid={`nft-card-${nft.tokenId || nft.invoiceId}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 bg-gradient-to-br from-khata-chain to-purple-500 flex items-center justify-center border-[3px] border-khata-bg"
                    style={{
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
                    }}
                  >
                    <span className="text-2xl font-heading text-white">#{nft.tokenId || '?'}</span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-khata-muted">Token ID</p>
                    <p className="text-xl font-heading text-khata-text">{nft.tokenId || 'Pending'}</p>
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
                    {nft.dueDate ? format(new Date(nft.dueDate), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t-[2px] border-khata-border">
                <div>
                  <p className="text-xs text-khata-muted">
                    Invoice: <span className="text-khata-text">{nft.invoiceId}</span>
                  </p>
                </div>
                {nft.txHash ? (
                  <a
                    href={`https://evm-testnet.flowscan.io/tx/${nft.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`explorer-link-${nft.tokenId || nft.invoiceId}`}
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
                ) : (
                  <span className="text-xs text-khata-muted">Explorer link pending</span>
                )}
              </div>
            </div>
          ))
        )}
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

      <MintModal
        open={showMintModal}
        onClose={() => setShowMintModal(false)}
        onMinted={loadNfts}
      />
    </>
  );
};
