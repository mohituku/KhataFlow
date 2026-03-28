import { ClientTable } from '../components/ledger/ClientTable';
import { Users } from 'lucide-react';

export default function LedgerPage() {
  return (
    <div className="p-6" data-testid="ledger-page">
      <div className="mb-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-khata-surface border-[3px] border-khata-accent flex items-center justify-center">
          <Users className="w-8 h-8 text-khata-accent" />
        </div>
        <div>
          <h2 className="text-4xl font-heading uppercase tracking-wider text-khata-text">
            Client Ledger
          </h2>
          <p className="text-khata-muted mt-1">Manage your client accounts and outstanding payments</p>
        </div>
      </div>
      <ClientTable />
    </div>
  );
}