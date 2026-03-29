import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { toast } from 'sonner';

function getActionTitle(action) {
  switch (action.intent) {
    case 'ADD_SALE':
      return 'Sale Recorded';
    case 'MARK_PAID':
      return 'Payment Recorded';
    case 'UPDATE_STOCK':
      return 'Stock Updated';
    case 'QUERY_LEDGER':
      return 'Ledger Lookup';
    default:
      return 'Action Summary';
  }
}

export const ActionConfirmCard = ({ action }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!action || dismissed) {
    return null;
  }

  const amount = action.paymentAmount ?? action.totalAmount ?? 0;
  const firstItem = Array.isArray(action.items) && action.items.length > 0 ? action.items[0] : null;

  const handleAcknowledge = () => {
    toast.success('Action acknowledged');
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      className="border-[3px] border-khata-warning bg-khata-surface p-4 w-full comic-shadow-warning"
      data-testid="action-confirm-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-khata-warning uppercase tracking-wider mb-2">
            {getActionTitle(action)}
          </h4>
          <div className="space-y-1 text-sm">
            {action.clientName && (
              <p className="text-khata-text">
                <span className="text-khata-muted">Client:</span>{' '}
                <span className="font-bold">{action.clientName}</span>
              </p>
            )}
            {amount > 0 && (
              <p className="text-khata-text">
                <span className="text-khata-muted">Amount:</span>{' '}
                <span className="font-bold text-khata-accent">{formatCurrency(Number(amount))}</span>
              </p>
            )}
            {firstItem && (
              <p className="text-khata-text">
                <span className="text-khata-muted">Item:</span>{' '}
                <span className="font-bold">
                  {firstItem.name} ({firstItem.qty || firstItem.quantity || 0} {firstItem.unit})
                </span>
              </p>
            )}
            <p className="text-khata-text">
              <span className="text-khata-muted">Intent:</span>{' '}
              <span className="font-bold uppercase">{action.intent}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAcknowledge}
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
          Got it
        </button>
        <button
          onClick={handleDismiss}
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
          Dismiss
        </button>
      </div>
    </div>
  );
};
