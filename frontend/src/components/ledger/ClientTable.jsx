import { useEffect, useState } from 'react';
import { Eye, Coins, Share2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/formatters';
import { format } from 'date-fns';
import { fetchJson } from '../../lib/api';
import { toast } from 'sonner';
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
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;

    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';

    fetchJson(`/api/ledger/clients${query}`)
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
  }, [search]);

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

  const shareClientPortal = async (client) => {
    const url = `${window.location.origin}/client/${client.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${client.name}'s KhataFlow account`,
          url
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Client portal link copied', {
          description: `Share it with ${client.name}`
        });
      } else {
        throw new Error('Share is not supported on this device');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        toast.error('Failed to share client portal', {
          description: error.message
        });
      }
    }
  };

  return (
    <>
      <div className="border-[3px] border-khata-border overflow-hidden bg-khata-surface" data-testid="client-table">
        <div className="p-4 border-b-[3px] border-khata-border bg-khata-surface">
          <div className="relative">
            <Search className="w-4 h-4 text-khata-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by client name, ID, or phone"
              className="w-full bg-khata-bg border-[3px] border-khata-border pl-11 pr-4 py-3 text-khata-text focus:border-khata-accent focus:outline-none"
            />
          </div>
        </div>
        <div className="bg-khata-bg border-b-[3px] border-khata-border">
          <div className="grid grid-cols-12 gap-4 p-4">
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Client ID</p>
            </div>
            <div className="col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Client Name</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Outstanding</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Last Transaction</p>
            </div>
            <div className="col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-muted font-bold">Actions</p>
            </div>
          </div>
        </div>
        <div>
          {clients.length === 0 && (
            <div className="p-6 text-sm text-khata-muted">
              No clients found for the current search.
            </div>
          )}
          {clients.map((client) => (
            <div
              key={client.id}
              className="grid grid-cols-12 gap-4 p-4 border-b border-khata-border hover:bg-khata-bg/50 transition-colors"
              data-testid={`client-row-${client.id}`}
            >
              <div className="col-span-2">
                <p className="text-xs text-khata-muted break-all">{client.id}</p>
              </div>
              <div className="col-span-3">
                <p className="text-sm font-bold text-khata-text">{client.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-bold text-khata-accent">
                  {formatCurrency(Number(client.total_outstanding || 0))}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-khata-muted">
                  {client.lastTransaction
                    ? format(new Date(client.lastTransaction), 'MMM dd, yyyy')
                    : 'No transactions'}
                </p>
              </div>
              <div className="col-span-3 flex gap-2 flex-wrap">
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
                <button
                  onClick={() => shareClientPortal(client)}
                  data-testid={`share-client-portal-${client.id}`}
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
                  <Share2 className="w-3 h-3" />
                  Share
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
