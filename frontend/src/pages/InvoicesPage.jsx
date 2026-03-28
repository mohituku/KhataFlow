import { InvoiceList } from '../components/invoices/InvoiceList';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const handleCreateInvoice = () => {
    toast.info('Invoice creation coming soon!');
  };

  return (
    <div className="p-6" data-testid="invoices-page">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-khata-surface border-[3px] border-khata-accent flex items-center justify-center">
            <FileText className="w-8 h-8 text-khata-accent" />
          </div>
          <div>
            <h2 className="text-4xl font-heading uppercase tracking-wider text-khata-text">
              Invoices
            </h2>
            <p className="text-khata-muted mt-1">View and manage all invoices</p>
          </div>
        </div>
        <button
          onClick={handleCreateInvoice}
          data-testid="create-invoice-btn"
          className="
            clip-angled-sm
            flex items-center gap-2 px-6 py-3
            bg-khata-accent text-khata-bg
            font-bold uppercase tracking-wider
            border-[3px] border-khata-bg
            hover:scale-[1.02] transition-all duration-300
          "
          style={{
            boxShadow: '0 0 15px rgba(0, 208, 132, 0.5)'
          }}
        >
          <Plus className="w-5 h-5" />
          Create Invoice
        </button>
      </div>
      <InvoiceList />
    </div>
  );
}