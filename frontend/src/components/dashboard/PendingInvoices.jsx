import { Coins } from 'lucide-react';
import { formatCurrency, mockInvoices } from '../../lib/mockData';
import { toast } from 'sonner';

export const PendingInvoices = () => {
  const pendingInvoices = mockInvoices.filter((inv) => inv.status === 'pending');

  const handleMintNFT = (invoice) => {
    toast.success('Redirecting to Chain page...', {
      description: `Minting NFT for ${invoice.clientName}`
    });
  };

  return (
    <div className="bg-khata-surface border-[3px] border-khata-border" data-testid="pending-invoices">
      <div className="p-6 border-b-[3px] border-khata-border">
        <h3 className="text-xl font-heading uppercase tracking-wider">Pending Invoices</h3>
        <p className="text-sm text-khata-muted mt-1">Ready to mint on blockchain</p>
      </div>
      <div className="p-6 space-y-4">
        {pendingInvoices.length === 0 ? (
          <div className="text-center py-8" data-testid="no-pending-invoices">
            <p className="text-khata-muted">No pending invoices</p>
          </div>
        ) : (
          pendingInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="border-[3px] border-khata-border bg-khata-bg p-4 hover:border-khata-chain transition-colors duration-200"
              data-testid={`pending-invoice-${invoice.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-khata-muted uppercase tracking-wider">{invoice.id}</p>
                  <p className="text-lg font-bold text-khata-text">{invoice.clientName}</p>
                </div>
                <p className="text-2xl font-heading text-khata-accent">
                  {formatCurrency(invoice.amount)}
                </p>
              </div>
              <button
                onClick={() => handleMintNFT(invoice)}
                data-testid={`mint-nft-btn-${invoice.id}`}
                className="
                  w-full clip-angled-sm
                  flex items-center justify-center gap-2 px-4 py-2
                  bg-gradient-to-r from-khata-chain to-purple-500
                  text-white font-bold uppercase tracking-wider text-sm
                  border-[3px] border-khata-bg
                  hover:scale-[1.02] transition-all duration-300
                "
                style={{
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.6)'
                }}
              >
                <Coins className="w-4 h-4" />
                Mint to Chain
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};