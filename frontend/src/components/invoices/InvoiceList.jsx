import { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { format } from 'date-fns';
import { fetchJson } from '../../lib/api';

export const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    let isMounted = true;

    fetchJson('/api/invoices')
      .then((data) => {
        if (isMounted && data?.success) {
          setInvoices(data.invoices || []);
        }
      })
      .catch((error) => {
        console.error('Failed to load invoices:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-4" data-testid="invoice-list">
      {invoices.length === 0 && (
        <div className="bg-khata-surface border-[3px] border-khata-border p-6 text-khata-muted">
          No invoices found yet. Record a sale in chat to generate one automatically.
        </div>
      )}
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-khata-surface border-[3px] border-khata-border p-6 hover:border-khata-accent hover:-translate-y-1 transition-all duration-300"
          data-testid={`invoice-${invoice.id}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-khata-bg border-[3px] border-khata-accent flex items-center justify-center">
                <FileText className="w-6 h-6 text-khata-accent" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-khata-muted">Invoice</p>
                <p className="text-xl font-heading text-khata-text">{invoice.id}</p>
              </div>
            </div>
            <div
              className={`
                px-3 py-1 border-[2px]
                ${
                  invoice.status === 'PENDING'
                    ? 'border-khata-warning text-khata-warning'
                    : invoice.status === 'SETTLED'
                      ? 'border-khata-muted text-khata-muted'
                      : 'border-khata-accent text-khata-accent'
                }
              `}
            >
              <span className="text-xs font-bold uppercase tracking-wider">{invoice.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Client</p>
              <p className="text-sm font-bold text-khata-text">{invoice.clients?.name || 'Unknown Client'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Amount</p>
              <p className="text-lg font-heading text-khata-accent">{formatCurrency(Number(invoice.amount || 0))}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Date</p>
              <p className="text-sm font-bold text-khata-text">
                {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t-[2px] border-khata-border">
            <h4 className="text-xs uppercase tracking-wider text-khata-muted mb-2 font-bold">Items</h4>
            <div className="space-y-1">
              {(invoice.items || []).map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-khata-text">
                    {item.name} ({item.qty || item.quantity || 0} {item.unit})
                  </span>
                  <span className="text-khata-muted">{formatCurrency(Number(item.price || 0))}</span>
                </div>
              ))}
              {(!invoice.items || invoice.items.length === 0) && (
                <div className="text-sm text-khata-muted">No line items recorded.</div>
              )}
            </div>
          </div>
          {invoice.nft_tx_hash && (
            <a
              href={`https://evm-testnet.flowscan.io/tx/${invoice.nft_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-4 w-full
                flex items-center justify-center gap-2 px-4 py-2
                bg-transparent text-khata-chain
                border-[3px] border-khata-chain
                hover:bg-khata-chain hover:text-white
                font-bold uppercase tracking-wider text-sm
                transition-all duration-300
              "
            >
              View On Explorer
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
};
