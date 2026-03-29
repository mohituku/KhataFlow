import { InvoiceList } from '../components/invoices/InvoiceList';
import { FileText } from 'lucide-react';

export default function InvoicesPage() {
  return (
    <div className="p-6" data-testid="invoices-page">
      <div className="mb-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-khata-surface border-[3px] border-khata-accent flex items-center justify-center">
          <FileText className="w-8 h-8 text-khata-accent" />
        </div>
        <div>
          <h2 className="text-4xl font-heading uppercase tracking-wider text-khata-text">
            Invoices
          </h2>
          <p className="text-khata-muted mt-1">Invoices are created automatically when you record credit sales.</p>
        </div>
      </div>
      <InvoiceList />
    </div>
  );
}
