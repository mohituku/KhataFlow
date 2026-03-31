import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Package, User, IndianRupee, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

const INTENT_CONFIG = {
  ADD_SALE:        { label: 'Sale Recorded',    color: 'accent',  icon: IndianRupee },
  MARK_PAID:       { label: 'Payment Received', color: 'accent',  icon: Check },
  UPDATE_STOCK:    { label: 'Stock Updated',    color: 'chain',   icon: Package },
  QUERY_LEDGER:    { label: 'Ledger Query',     color: 'muted',   icon: User },
  QUERY_STOCK:     { label: 'Inventory Query',  color: 'muted',   icon: Package },
  GENERATE_REPORT: { label: 'Report',           color: 'chain',   icon: TrendingUp },
  GENERATE_INVOICE:{ label: 'Invoice',          color: 'warning', icon: IndianRupee },
  UNKNOWN:         { label: 'Action',           color: 'border',  icon: Check },
};

const FAILURE_CONFIG = { label: 'Action Failed', color: 'danger', icon: X };

// Single action display
function ActionBlock({ action, result, index, total }) {
  const [expanded, setExpanded] = useState(false);
  const baseCfg = INTENT_CONFIG[action.intent] || INTENT_CONFIG.UNKNOWN;
  const cfg = result?.error
    ? {
        ...FAILURE_CONFIG,
        label: baseCfg.label === 'Action' ? FAILURE_CONFIG.label : `${baseCfg.label} Failed`
      }
    : baseCfg;
  const Icon = cfg.icon;
  const hasItems = Array.isArray(action.items) && action.items.length > 0;
  const hasFilters = action.filters && Object.values(action.filters).some(v => v !== null && v !== undefined);
  const displayAmount = action.paymentAmount ?? action.totalAmount ?? result?.amount ?? result?.recoveredAmount ?? 0;

  return (
    <div className={`border-[2px] border-khata-${cfg.color} bg-khata-bg rounded-none`}>
      <div className="p-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-7 h-7 flex items-center justify-center border-[2px] border-khata-${cfg.color} flex-shrink-0`}>
            <Icon className={`w-3.5 h-3.5 text-khata-${cfg.color}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wider text-khata-${cfg.color}`}>
              {total > 1 ? `Action ${index + 1} — ` : ''}{cfg.label}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {action.clientName && (
                <span className="text-xs text-khata-text">
                  <span className="text-khata-muted">Client:</span> <strong>{action.clientName}</strong>
                </span>
              )}
              {displayAmount > 0 && (
                <span className="text-xs text-khata-accent font-bold">
                  {formatCurrency(displayAmount)}
                </span>
              )}
              {hasItems && (
                <span className="text-xs text-khata-muted">{action.items.length} item{action.items.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {result?.error && (
              <p className="text-xs text-khata-danger mt-1">{result.error}</p>
            )}
          </div>
        </div>
        {(hasItems || hasFilters) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-khata-muted hover:text-khata-text transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && hasItems && (
        <div className="px-3 pb-3 border-t border-khata-border pt-2">
          <p className="text-xs text-khata-muted uppercase tracking-wider mb-1.5">Items</p>
          <div className="space-y-1">
            {action.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-khata-text">
                <span>{item.name}</span>
                <span className="text-khata-muted">{item.qty} {item.unit}{item.price ? ` @ ₹${item.price}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && hasFilters && !hasItems && (
        <div className="px-3 pb-3 border-t border-khata-border pt-2">
          <p className="text-xs text-khata-muted uppercase tracking-wider mb-1.5">Filters Applied</p>
          {action.filters.minOutstanding && (
            <p className="text-xs text-khata-text">Balance > ₹{action.filters.minOutstanding}</p>
          )}
          {action.filters.daysSinceLastPayment && (
            <p className="text-xs text-khata-text">No payment in {action.filters.daysSinceLastPayment} days</p>
          )}
          {action.filters.lowStockOnly && (
            <p className="text-xs text-khata-text">Low stock items only</p>
          )}
          {action.filters.itemName && (
            <p className="text-xs text-khata-text">Item: {action.filters.itemName}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Rich result display for query/report intents
function ResultDisplay({ dbResult, intent }) {
  if (!dbResult || dbResult.error) return null;

  if (intent === 'QUERY_LEDGER' && dbResult.summary?.clients?.length > 0) {
    return (
      <div className="mt-2 border-[2px] border-khata-border bg-khata-bg">
        <div className="p-2 border-b border-khata-border">
          <p className="text-xs font-bold uppercase tracking-wider text-khata-muted">Outstanding Clients</p>
        </div>
        <div className="divide-y divide-khata-border max-h-48 overflow-y-auto">
          {dbResult.summary.clients.map((client) => (
            <div key={client.id} className="px-3 py-2 flex justify-between items-center">
              <span className="text-xs font-bold text-khata-text">{client.name}</span>
              <span className="text-xs font-bold text-khata-warning">{formatCurrency(client.total_outstanding)}</span>
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-khata-border flex justify-between">
          <span className="text-xs text-khata-muted uppercase tracking-wider">Total</span>
          <span className="text-xs font-bold text-khata-accent">{formatCurrency(dbResult.summary.totalOutstanding)}</span>
        </div>
      </div>
    );
  }

  if (intent === 'QUERY_STOCK' && dbResult.items?.length > 0) {
    return (
      <div className="mt-2 border-[2px] border-khata-border bg-khata-bg">
        <div className="divide-y divide-khata-border max-h-48 overflow-y-auto">
          {dbResult.items.map((item) => (
            <div key={item.id} className="px-3 py-2 flex justify-between items-center">
              <span className="text-xs font-bold text-khata-text">{item.item_name}</span>
              <span className={`text-xs font-bold ${Number(item.quantity) <= Number(item.low_stock_threshold || 10) ? 'text-khata-warning' : 'text-khata-accent'}`}>
                {item.quantity} {item.unit}
                {Number(item.quantity) <= Number(item.low_stock_threshold || 10) ? ' ⚠️' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (intent === 'GENERATE_REPORT' && dbResult.period) {
    return (
      <div className="mt-2 border-[2px] border-khata-border bg-khata-bg">
        <div className="grid grid-cols-2 divide-x divide-khata-border">
          <div className="p-3 text-center">
            <p className="text-xs text-khata-muted uppercase tracking-wider">Sales</p>
            <p className="text-lg font-bold text-khata-accent">{formatCurrency(dbResult.totalSales)}</p>
            <p className="text-xs text-khata-muted">{dbResult.transactionCount} transactions</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs text-khata-muted uppercase tracking-wider">Received</p>
            <p className="text-lg font-bold text-khata-chain">{formatCurrency(dbResult.totalPaymentsReceived)}</p>
          </div>
        </div>
        {dbResult.topClients?.length > 0 && (
          <div className="px-3 py-2 border-t border-khata-border">
            <p className="text-xs text-khata-muted mb-1">Top clients</p>
            {dbResult.topClients.slice(0, 3).map((c) => (
              <div key={c.name} className="flex justify-between text-xs py-0.5">
                <span className="text-khata-text">{c.name}</span>
                <span className="text-khata-accent">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Main exported component
export const ActionConfirmCard = ({ action, parsedCommand, dbResult, actionResults }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Support both old (single action) and new (parsedCommand with multiple actions)
  const actions = parsedCommand?.actions || (action ? [action] : []);
  if (actions.length === 0) return null;
  const normalizedActionResults = actions.map((currentAction, index) => ({
    action: currentAction,
    result: actionResults?.[index]?.result ?? (index === 0 ? dbResult : null)
  }));

  // For read-only intents, don't show confirm/dismiss — just show data
  const isReadOnly = normalizedActionResults.every(({ action: currentAction }) =>
    ['QUERY_LEDGER', 'QUERY_STOCK', 'GENERATE_REPORT', 'GENERATE_INVOICE', 'UNKNOWN'].includes(currentAction.intent)
  );

  const requiresConfirmation = parsedCommand?.requiresConfirmation ?? !isReadOnly;

  return (
    <div className="w-full space-y-2 mt-2" data-testid="action-confirm-card">
      {/* Summary line */}
      {parsedCommand?.summary && (
        <p className="text-xs text-khata-muted italic px-1">{parsedCommand.summary}</p>
      )}

      {/* Action blocks */}
      {normalizedActionResults.map(({ action: currentAction, result }, i) => (
        <ActionBlock
          key={i}
          action={currentAction}
          result={result}
          index={i}
          total={actions.length}
        />
      ))}

      {/* Rich result display for queries */}
      {normalizedActionResults.map(({ action: currentAction, result }, i) => (
        <ResultDisplay key={i} dbResult={result} intent={currentAction.intent} />
      ))}

      {/* Only show dismiss button — "Got it" is implicit via the response text */}
      {!isReadOnly && requiresConfirmation && (
        <button
          onClick={() => setDismissed(true)}
          data-testid="dismiss-action-btn"
          className="w-full flex items-center justify-center gap-2 px-4 py-2
            bg-transparent text-khata-muted border-[2px] border-khata-border
            hover:border-khata-danger hover:text-khata-danger
            font-bold uppercase tracking-wider text-xs transition-all duration-200"
        >
          <X className="w-3 h-3" /> Dismiss
        </button>
      )}
    </div>
  );
};
