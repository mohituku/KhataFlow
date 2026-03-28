import { useState } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { mockInvoices, formatCurrency } from '../../lib/mockData';
import { useMintNFT } from '../../hooks/useMintNFT';
import { toast } from 'sonner';

export const MintModal = ({ open, onClose }) => {
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [dueDate, setDueDate] = useState('');
  const { mintNFT, isMinting } = useMintNFT();

  const pendingInvoices = mockInvoices.filter((inv) => inv.status === 'pending');

  const handleMint = async () => {
    if (!selectedInvoice || !dueDate) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const invoice = mockInvoices.find((inv) => inv.id === selectedInvoice);
      const result = await mintNFT({
        businessId: 'BUSINESS_001',
        clientName: invoice.clientName,
        amountInr: invoice.amount,
        dueDateUnix: new Date(dueDate).getTime() / 1000,
        invoiceId: invoice.id
      });

      toast.success('NFT Minted Successfully!', {
        description: `Token ID: ${result.tokenId}`
      });
      onClose();
    } catch (error) {
      toast.error('Failed to mint NFT', {
        description: error.message
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-khata-surface border-[3px] border-khata-chain max-w-lg" data-testid="mint-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading uppercase tracking-wider text-khata-text">
            Mint NFT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-khata-muted block mb-2 font-bold">
              Select Invoice
            </label>
            <select
              value={selectedInvoice}
              onChange={(e) => setSelectedInvoice(e.target.value)}
              data-testid="invoice-select"
              className="
                w-full px-4 py-3
                bg-khata-bg text-khata-text
                border-[3px] border-khata-border
                focus:border-khata-chain focus:outline-none
                font-body
              "
            >
              <option value="">Choose an invoice...</option>
              {pendingInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.id} - {invoice.clientName} - {formatCurrency(invoice.amount)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-khata-muted block mb-2 font-bold">
              Due Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="due-date-input"
                className="
                  w-full px-4 py-3
                  bg-khata-bg text-khata-text
                  border-[3px] border-khata-border
                  focus:border-khata-chain focus:outline-none
                  font-body
                "
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={handleMint}
              disabled={isMinting || !selectedInvoice || !dueDate}
              data-testid="confirm-mint-btn"
              className="
                flex-1 clip-angled-sm
                flex items-center justify-center gap-2 px-4 py-3
                bg-gradient-to-r from-khata-chain to-purple-500
                text-white font-bold uppercase tracking-wider
                border-[3px] border-khata-bg
                hover:scale-[1.02] transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              style={{
                boxShadow: isMinting || !selectedInvoice || !dueDate ? 'none' : '0 0 15px rgba(139, 92, 246, 0.6)'
              }}
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Minting...
                </>
              ) : (
                'Mint NFT'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isMinting}
              data-testid="cancel-mint-btn"
              className="
                px-6 py-3
                bg-transparent text-khata-text
                border-[3px] border-khata-border
                hover:border-khata-danger hover:text-khata-danger
                font-bold uppercase tracking-wider
                transition-all duration-300
                disabled:opacity-50
              "
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};