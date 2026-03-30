import { useCallback, useEffect, useState } from 'react';
import { Coins, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/formatters';
import { fetchJson } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';

export const PendingInvoices = () => {
  const navigate = useNavigate();
  const dashboardRefreshKey = useAppStore((state) => state.dashboardRefreshKey);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPendingInvoices = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const data = await fetchJson('/api/invoices?status=PENDING');
      if (data?.success) {
        setPendingInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to load pending invoices:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsRefreshing(true);

    fetchJson('/api/invoices?status=PENDING')
      .then((data) => {
        if (isMounted && data?.success) {
          setPendingInvoices(data.invoices || []);
        }
      })
      .catch((error) => {
        console.error('Failed to load pending invoices:', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dashboardRefreshKey]);

  const handleMintNFT = (invoice) => {
    toast.success('Open the Chain page to mint this invoice.', {
      description: `Selected invoice ${invoice.id}`
    });
    navigate('/chain');
  };

  return (
    <div className="bg-khata-surface border-[3px] border-khata-border" data-testid="pending-invoices">
      <div className="p-6 border-b-[3px] border-khata-border flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-heading uppercase tracking-wider">Pending Invoices</h3>
          <p className="text-sm text-khata-muted mt-1">Ready to mint on blockchain</p>
        </div>
        <button
          onClick={loadPendingInvoices}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-[2px] border-khata-border text-khata-muted hover:border-khata-chain hover:text-khata-chain transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <div className="p-6 space-y-4">
        {pendingInvoices.length === 0 ? (
          <div className="text-center py-8" data-testid="no-pending-invoices">
            <p className="text-khata-muted">No pending invoices</p>
          </div>
        ) : (
          pendingInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="border-[3px] border-khata-border bg-khata-bg p-4 hover:border-khata-chain transition-colors duration-200"
              data-testid={`pending-invoice-${invoice.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-khata-muted uppercase tracking-wider">{invoice.id}</p>
                  <p className="text-lg font-bold text-khata-text">{invoice.clients?.name || 'Unknown Client'}</p>
                </div>
                <p className="text-2xl font-heading text-khata-accent">
                  {formatCurrency(Number(invoice.amount || 0))}
                </p>
              </div>
              <button
                onClick={() => handleMintNFT(invoice)}
                data-testid={`mint-nft-btn-${invoice.id}`}
                className="
                  w-full clip-angled-sm
                  flex items-center justify-center gap-2 px-4 py-2
                  bg-gradient-to-r from-khata-chain to-purple-500
                  text-white font-bold uppercase tracking-wider text-sm
                  border-[3px] border-khata-bg
                  hover:scale-[1.02] transition-all duration-300
                "
                style={{
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.6)'
                }}
              >
                <Coins className="w-4 h-4" />
                Mint to Chain
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
