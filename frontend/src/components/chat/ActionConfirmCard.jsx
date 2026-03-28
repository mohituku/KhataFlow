import { Check, X } from 'lucide-react';
import { formatCurrency } from '../../lib/mockData';
import { toast } from 'sonner';

export const ActionConfirmCard = ({ action }) => {
  if (!action) return null;

  const handleConfirm = () => {
    toast.success('Transaction confirmed!', {
      description: `Added ${formatCurrency(action.data.amount)} to ledger`
    });
  };

  const handleReject = () => {
    toast.error('Transaction cancelled');
  };

  return (
    <div
      className="border-[3px] border-khata-warning bg-khata-surface p-4 w-full comic-shadow-warning"
      data-testid="action-confirm-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-khata-warning uppercase tracking-wider mb-2">
            Confirm Transaction
          </h4>
          <div className="space-y-1 text-sm">
            <p className="text-khata-text">
              <span className="text-khata-muted">Client:</span>{' '}
              <span className="font-bold">{action.data.client}</span>
            </p>
            <p className="text-khata-text">
              <span className="text-khata-muted">Amount:</span>{' '}
              <span className="font-bold text-khata-accent">{formatCurrency(action.data.amount)}</span>
            </p>
            {action.data.item && (
              <p className="text-khata-text">
                <span className="text-khata-muted">Item:</span>{' '}
                <span className="font-bold">{action.data.item}</span>
              </p>
            )}
            <p className="text-khata-text">
              <span className="text-khata-muted">Type:</span>{' '}
              <span className="font-bold uppercase">{action.data.type}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          data-testid="confirm-action-btn"
          className="
            flex-1 clip-angled-sm
            flex items-center justify-center gap-2 px-4 py-2
            bg-khata-accent text-khata-bg
            font-bold uppercase tracking-wider text-sm
            border-[3px] border-khata-bg
            hover:scale-[1.02] transition-all duration-300
          "
          style={{
            boxShadow: '0 0 15px rgba(0, 208, 132, 0.5)'
          }}
        >
          <Check className="w-4 h-4" />
          Confirm
        </button>
        <button
          onClick={handleReject}
          data-testid="reject-action-btn"
          className="
            flex-1
            flex items-center justify-center gap-2 px-4 py-2
            bg-transparent text-khata-text
            font-bold uppercase tracking-wider text-sm
            border-[3px] border-khata-border
            hover:border-khata-danger hover:text-khata-danger
            transition-all duration-300
          "
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
};