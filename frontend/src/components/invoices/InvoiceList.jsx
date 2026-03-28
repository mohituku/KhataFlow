import { FileText, Download } from 'lucide-react';
import { mockInvoices, formatCurrency } from '../../lib/mockData';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const InvoiceList = () => {
  const handleDownload = (invoiceId) => {
    toast.success(`Downloading ${invoiceId}...`);
  };

  return (
    <div className="space-y-4" data-testid="invoice-list">
      {mockInvoices.map((invoice) => (
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
                  invoice.status === 'pending'
                    ? 'border-khata-warning text-khata-warning'
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
              <p className="text-sm font-bold text-khata-text">{invoice.clientName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Amount</p>
              <p className="text-lg font-heading text-khata-accent">{formatCurrency(invoice.amount)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Date</p>
              <p className="text-sm font-bold text-khata-text">
                {format(new Date(invoice.date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t-[2px] border-khata-border">
            <h4 className="text-xs uppercase tracking-wider text-khata-muted mb-2 font-bold">Items</h4>
            <div className="space-y-1">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-khata-text">
                    {item.name} ({item.quantity} {item.unit})
                  </span>
                  <span className="text-khata-muted">{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleDownload(invoice.id)}
            data-testid={`download-invoice-${invoice.id}`}
            className="
              mt-4 w-full
              flex items-center justify-center gap-2 px-4 py-2
              bg-transparent text-khata-text
              border-[3px] border-khata-border
              hover:border-khata-accent hover:text-khata-accent
              font-bold uppercase tracking-wider text-sm
              transition-all duration-300
            "
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      ))}
    </div>
  );
};