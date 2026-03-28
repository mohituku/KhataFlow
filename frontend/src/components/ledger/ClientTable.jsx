import { useEffect, useState } from 'react';
import { Eye, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/mockData';
import { format } from 'date-fns';
import { fetchJson } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

function getTransactionDescription(transaction) {
  if (transaction.type === 'PAYMENT') {
    return 'Payment received';
  }

  if (Array.isArray(transaction.items) && transaction.items.length > 0) {
    return transaction.items
      .map((item) => `${item.name} (${item.qty || item.quantity || 0} ${item.unit || ''})`)
      .join(', ');
  }

  return 'Sale recorded';
}

export const ClientTable = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loadingClientId, setLoadingClientId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetchJson('/api/ledger/clients')
      .then((data) => {
        if (isMounted && data?.success) {
          setClients(data.clients || []);
        }
      })
      .catch((error) => {
        console.error('Failed to load clients:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleViewClient = async (client) => {
    setLoadingClientId(client.id);

    try {
      const data = await fetchJson(`/api/ledger/clients/${client.id}`);
      setSelectedClient({
        ...data.client,
        transactions: data.transactions || []
      });
    } catch (error) {
      console.error('Failed to load client details:', error);
    } finally {
      setLoadingClientId(null);
    }
  };

  return (
    <>
      <div className="border-[3px] border-khata-border overflow-hidden bg-khata-surface" data-testid="client-table">
        <div className="bg-khata-bg border-b-[3px] border-khata-border">
          <div className="grid grid-cols-12 gap-4 p-4">
            <div className="col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Client Name</p>
            </div>
            <div className="col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Outstanding</p>
            </div>
            <div className="col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Last Transaction</p>
            </div>
            <div className="col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Actions</p>
            </div>
          </div>
        </div>
        <div>
          {clients.map((client) => (
            <div
              key={client.id}
              className="grid grid-cols-12 gap-4 p-4 border-b border-khata-border hover:bg-khata-bg/50 transition-colors"
              data-testid={`client-row-${client.id}`}
            >
              <div className="col-span-3">
                <p className="text-sm font-bold text-khata-text">{client.name}</p>
              </div>
              <div className="col-span-3">
                <p className="text-sm font-bold text-khata-accent">
                  {formatCurrency(Number(client.total_outstanding || 0))}
                </p>
              </div>
              <div className="col-span-3">
                <p className="text-sm text-khata-muted">
                  {client.lastTransaction
                    ? format(new Date(client.lastTransaction), 'MMM dd, yyyy')
                    : 'No transactions'}
                </p>
              </div>
              <div className="col-span-3 flex gap-2">
                <button
                  onClick={() => handleViewClient(client)}
                  data-testid={`view-client-btn-${client.id}`}
                  className="
                    px-3 py-1 text-xs
                    bg-transparent text-khata-text
                    border-[2px] border-khata-border
                    hover:border-khata-accent hover:text-khata-accent
                    font-bold uppercase tracking-wider
                    transition-all duration-200
                    flex items-center gap-1
                  "
                >
                  <Eye className="w-3 h-3" />
                  {loadingClientId === client.id ? 'Loading...' : 'View'}
                </button>
                <button
                  onClick={() => navigate('/chain')}
                  data-testid={`mint-client-btn-${client.id}`}
                  className="
                    px-3 py-1 text-xs
                    bg-khata-chain text-white
                    border-[2px] border-khata-bg
                    hover:scale-[1.05]
                    font-bold uppercase tracking-wider
                    transition-all duration-200
                    flex items-center gap-1
                  "
                >
                  <Coins className="w-3 h-3" />
                  Mint
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="bg-khata-surface border-[3px] border-khata-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading uppercase tracking-wider text-khata-text">
              {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Outstanding Amount</p>
                  <p className="text-3xl font-heading text-khata-accent">
                    {formatCurrency(Number(selectedClient.total_outstanding || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-khata-muted mb-1">Total Transactions</p>
                  <p className="text-3xl font-heading text-khata-text">
                    {selectedClient.transactions.length}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-khata-muted mb-3">Transaction History</h4>
                <div className="space-y-2">
                  {selectedClient.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-khata-bg border-[2px] border-khata-border p-3"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-khata-text font-bold">
                            {getTransactionDescription(transaction)}
                          </p>
                          <p className="text-xs text-khata-muted mt-1">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <p className="text-lg font-heading text-khata-accent">
                          {formatCurrency(Number(transaction.amount || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
