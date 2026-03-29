import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ExternalLink, Loader2, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { getApiUrl } from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export default function ClientPortalPage() {
  const { businessId, clientId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch(getApiUrl(`/api/client/${businessId}/${clientId}`))
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load client account');
        }
        return payload;
      })
      .then((payload) => {
        if (isMounted) {
          setData(payload);
        }
      })
      .catch((error) => {
        console.error('Failed to load client portal:', error);
        if (isMounted) {
          setData({ success: false, error: error.message });
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [businessId, clientId]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = data?.businessName ? `My account at ${data.businessName}` : 'KhataFlow Client Portal';

    try {
      if (navigator.share) {
        await navigator.share({ url, title });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      } else {
        throw new Error('Share is not supported on this device');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        toast.error('Unable to share this page', {
          description: error.message
        });
      }
    }
  };

  const handleNotifyPayment = async () => {
    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(getApiUrl(`/api/client/${businessId}/${clientId}/confirm-payment`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          note: paymentNote.trim()
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to send payment confirmation');
      }

      toast.success('Payment confirmation sent', {
        description: payload.message
      });
      setPaymentAmount('');
      setPaymentNote('');
      setShowPaymentDialog(false);
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      toast.error('Failed to send payment confirmation', {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-khata-bg flex items-center justify-center px-6">
        <div className="bg-khata-surface border-[3px] border-khata-border p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-khata-accent mx-auto mb-4" />
          <p className="text-khata-muted uppercase tracking-wider text-sm">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div className="min-h-screen bg-khata-bg flex items-center justify-center px-6">
        <div className="bg-khata-surface border-[3px] border-khata-danger p-8 max-w-lg text-center">
          <h1 className="text-3xl font-heading uppercase tracking-wider text-khata-danger mb-3">
            Account Not Found
          </h1>
          <p className="text-khata-muted">{data?.error || 'This client portal link is not available.'}</p>
        </div>
      </div>
    );
  }

  const { businessName, client, transactions, nft } = data;

  return (
    <div className="min-h-screen bg-khata-bg tech-grid-bg px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-khata-muted text-sm uppercase tracking-[0.2em] mb-2">{businessName}</p>
          <h1 className="text-4xl font-heading uppercase tracking-wider text-khata-text">
            Namaste, {client.name}
          </h1>
          <p className="text-khata-muted mt-2">
            This page shows your current balance, recent purchases, and on-chain debt record.
          </p>
        </div>

        <div className="bg-khata-surface border-[3px] border-khata-warning p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-khata-muted mb-2">Outstanding Balance</p>
          <p className="text-5xl font-heading text-khata-warning">
            {formatCurrency(Number(client.total_outstanding || 0))}
          </p>
          {nft?.dueDate && (
            <p className="text-sm text-khata-muted mt-3">
              Due by: {format(new Date(nft.dueDate), 'MMM dd, yyyy')}
            </p>
          )}
        </div>

        {nft?.tokenId && (
          <div className="bg-khata-surface border-[3px] border-khata-chain p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-khata-chain mb-2 font-bold">
              On-Chain Debt Record
            </p>
            <p className="text-lg font-heading text-khata-text mb-2">Token #{nft.tokenId}</p>
            <p className="text-sm text-khata-muted">
              Status: <span className="text-khata-text font-bold">{nft.status}</span>
            </p>
            {nft.txHash && (
              <a
                href={`https://evm-testnet.flowscan.io/tx/${nft.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm font-bold uppercase tracking-wider text-khata-chain hover:underline"
              >
                View On Explorer
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        <div className="bg-khata-surface border-[3px] border-khata-border overflow-hidden">
          <div className="p-6 border-b-[3px] border-khata-border">
            <h2 className="text-2xl font-heading uppercase tracking-wider text-khata-text">Your Purchases</h2>
          </div>
          <div className="divide-y divide-khata-border">
            {transactions.length === 0 ? (
              <div className="p-6 text-khata-muted">No purchases recorded yet.</div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="p-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-khata-text">
                      {Array.isArray(txn.items) && txn.items.length > 0
                        ? txn.items
                            .map((item) => `${item.name} (${item.qty || item.quantity || 0} ${item.unit || ''})`)
                            .join(', ')
                        : 'Purchase'}
                    </p>
                    <p className="text-xs text-khata-muted mt-2">
                      {format(new Date(txn.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <p className="text-lg font-heading text-khata-accent">
                    {formatCurrency(Number(txn.amount || 0))}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleShare}
            className="
              flex items-center justify-center gap-2 px-5 py-4
              bg-transparent text-khata-text
              border-[3px] border-khata-border
              hover:border-khata-accent hover:text-khata-accent
              font-bold uppercase tracking-wider
              transition-all duration-300
            "
          >
            <Share2 className="w-4 h-4" />
            Share This Page
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            className="
              clip-angled-sm
              flex items-center justify-center gap-2 px-5 py-4
              bg-khata-accent text-khata-bg
              border-[3px] border-khata-bg
              font-bold uppercase tracking-wider
              hover:scale-[1.02] transition-all duration-300
            "
            style={{
              boxShadow: '0 0 15px rgba(0, 208, 132, 0.4)'
            }}
          >
            <CheckCircle className="w-4 h-4" />
            I Have Paid
          </button>
        </div>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-khata-surface border-[3px] border-khata-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading uppercase tracking-wider text-khata-text">
              Notify Shopkeeper
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-khata-muted block mb-2 font-bold">
                Amount Paid
              </label>
              <input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="500"
                className="w-full px-4 py-3 bg-khata-bg text-khata-text border-[3px] border-khata-border focus:border-khata-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-khata-muted block mb-2 font-bold">
                Note
              </label>
              <Textarea
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="UPI reference, cash handed to owner, or any useful note"
                className="bg-khata-bg text-khata-text border-[3px] border-khata-border rounded-none focus-visible:ring-0 focus-visible:border-khata-accent"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleNotifyPayment}
                disabled={isSubmitting}
                className="
                  flex-1 clip-angled-sm
                  flex items-center justify-center gap-2 px-4 py-3
                  bg-khata-accent text-khata-bg
                  font-bold uppercase tracking-wider
                  border-[3px] border-khata-bg
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isSubmitting ? 'Sending...' : 'Send Confirmation'}
              </button>
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={isSubmitting}
                className="
                  px-5 py-3
                  bg-transparent text-khata-text
                  border-[3px] border-khata-border
                  hover:border-khata-danger hover:text-khata-danger
                  font-bold uppercase tracking-wider
                "
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
