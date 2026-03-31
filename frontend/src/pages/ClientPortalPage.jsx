import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  QrCode,
  Share2,
  Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { getApiUrl } from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

export default function ClientPortalPage() {
  const { businessId, clientId } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onChainPayments, setOnChainPayments] = useState([]);
  const accessToken = searchParams.get('token') || '';

  const openPaymentGateway = (tokenType) => {
    if (!accessToken) {
      toast.error('This link is missing payment access');
      return;
    }

    window.location.href = `/pay/${clientId}?token=${encodeURIComponent(accessToken)}&tokenType=${encodeURIComponent(tokenType)}`;
  };

  useEffect(() => {
    let isMounted = true;
    const apiPath = businessId
      ? `/api/client/${businessId}/${clientId}?token=${encodeURIComponent(accessToken)}`
      : `/api/client/lookup/${clientId}?token=${encodeURIComponent(accessToken)}`;

    fetch(getApiUrl(apiPath))
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
          // Fetch on-chain payments
          if (payload.success) {
            fetchOnChainPayments(payload.client.id, accessToken);
          }
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
  }, [businessId, clientId, accessToken]);

  const fetchOnChainPayments = async (clientId, token) => {
    try {
      const response = await fetch(getApiUrl(`/api/payment/on-chain/${clientId}?token=${encodeURIComponent(token)}`));
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOnChainPayments(result.payments || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch on-chain payments:', error);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/qr/client/${clientId}?token=${encodeURIComponent(accessToken)}`));
      const result = await response.json();
      if (result.success) {
        setQrData(result);
        setShowQRDialog(true);
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Failed to generate QR:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const copyClientStartCommand = async () => {
    if (!qrData?.startCommand) return;

    try {
      await navigator.clipboard.writeText(qrData.startCommand);
      toast.success('Telegram start command copied');
    } catch (error) {
      toast.error('Failed to copy Telegram start command');
    }
  };

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
    const resolvedBusinessId = data?.businessId || businessId;

    if (!accessToken) {
      toast.error('This link is missing access permission');
      return;
    }

    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(getApiUrl(`/api/client/${resolvedBusinessId}/${clientId}/confirm-payment`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': accessToken
        },
        body: JSON.stringify({
          amount,
          note: paymentNote.trim(),
          token: accessToken
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

  const {
    businessName,
    client,
    purchases = [],
    payments = [],
    invoices = [],
    nft,
    statement
  } = data;

  return (
    <div className="min-h-screen bg-khata-bg tech-grid-bg px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-khata-muted text-sm uppercase tracking-[0.2em] mb-2">{businessName}</p>
          <h1 className="text-4xl font-heading uppercase tracking-wider text-khata-text">
            Namaste, {client.name}
          </h1>
          <p className="text-khata-muted mt-2">
            This page shows your outstanding balance, invoices, payments, and on-chain debt record.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-khata-surface border-[3px] border-khata-warning p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-khata-muted mb-2">Outstanding Balance</p>
            <p className="text-4xl font-heading text-khata-warning">
              {formatCurrency(Number(statement?.totalOutstanding ?? client.total_outstanding ?? 0))}
            </p>
            {nft?.dueDate && (
              <p className="text-sm text-khata-muted mt-3">
                Due by: {format(new Date(nft.dueDate), 'MMM dd, yyyy')}
              </p>
            )}
          </div>
          <div className="bg-khata-surface border-[3px] border-khata-accent p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-khata-muted mb-2">Recovered</p>
            <p className="text-4xl font-heading text-khata-accent">
              {formatCurrency(Number(statement?.totalRecovered || 0))}
            </p>
          </div>
          <div className="bg-khata-surface border-[3px] border-khata-border p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-khata-muted mb-2">Open Invoices</p>
            <p className="text-4xl font-heading text-khata-text">
              {Number(statement?.openInvoices || 0)}
            </p>
          </div>
        </div>

        <div className="bg-khata-surface border-[3px] border-khata-chain p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-khata-chain mb-2 font-bold">
                Payment Gateway
              </p>
              <h2 className="text-2xl font-heading uppercase tracking-wider text-khata-text">
                Pay online or confirm offline payment
              </h2>
              <p className="text-sm text-khata-muted mt-3">
                Use the same payment choices available in Telegram. On-chain payments are recorded automatically.
                Cash or UPI can be reported to the shopkeeper from this page.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:min-w-[28rem]">
              <button
                onClick={() => openPaymentGateway('USDC')}
                className="px-4 py-4 bg-khata-accent text-khata-bg border-[3px] border-khata-bg font-bold uppercase tracking-wider hover:scale-[1.02] transition-all"
                style={{ boxShadow: '0 0 15px rgba(0, 208, 132, 0.35)' }}
              >
                <span className="block text-xs uppercase tracking-[0.2em] opacity-80 mb-1">Stablecoin</span>
                Pay with USDC
              </button>
              <button
                onClick={() => openPaymentGateway('FLOW')}
                className="px-4 py-4 bg-khata-chain text-white border-[3px] border-khata-bg font-bold uppercase tracking-wider hover:scale-[1.02] transition-all"
                style={{ boxShadow: '0 0 15px rgba(79, 70, 229, 0.35)' }}
              >
                <span className="block text-xs uppercase tracking-[0.2em] opacity-80 mb-1">Native Token</span>
                Pay with FLOW
              </button>
              <button
                onClick={() => setShowPaymentDialog(true)}
                className="px-4 py-4 bg-transparent text-khata-text border-[3px] border-khata-border font-bold uppercase tracking-wider hover:border-khata-accent hover:text-khata-accent transition-all"
              >
                <span className="block text-xs uppercase tracking-[0.2em] text-khata-muted mb-1">Cash / UPI</span>
                I Have Paid
              </button>
            </div>
          </div>
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

        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-khata-surface border-[3px] border-khata-border p-1">
            <TabsTrigger value="purchases" className="uppercase tracking-wider text-xs font-bold data-[state=active]:bg-khata-accent data-[state=active]:text-khata-bg">
              Purchases ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="uppercase tracking-wider text-xs font-bold data-[state=active]:bg-khata-accent data-[state=active]:text-khata-bg">
              Payments ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="uppercase tracking-wider text-xs font-bold data-[state=active]:bg-khata-accent data-[state=active]:text-khata-bg">
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="onchain" className="uppercase tracking-wider text-xs font-bold data-[state=active]:bg-khata-chain data-[state=active]:text-white">
              On-Chain ({onChainPayments.length})
            </TabsTrigger>
          </TabsList>

          {/* PURCHASES TAB */}
          <TabsContent value="purchases" className="mt-0">
            <div className="bg-khata-surface border-[3px] border-khata-border border-t-0 overflow-hidden">
              <div className="divide-y divide-khata-border">
                {purchases.length === 0 ? (
                  <div className="p-6 text-khata-muted">No purchases recorded yet.</div>
                ) : (
                  purchases.map((txn) => (
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
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="mt-0">
            <div className="bg-khata-surface border-[3px] border-khata-border border-t-0 overflow-hidden">
              <div className="divide-y divide-khata-border">
                {payments.length === 0 ? (
                  <div className="p-6 text-khata-muted">No payments recorded yet.</div>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="p-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-khata-text">Payment received</p>
                        <p className="text-xs text-khata-muted mt-2">
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-khata-muted mt-1 italic">{payment.notes}</p>
                        )}
                      </div>
                      <p className="text-lg font-heading text-khata-accent">
                        {formatCurrency(Number(payment.amount || 0))}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="mt-0">
            <div className="bg-khata-surface border-[3px] border-khata-border border-t-0 overflow-hidden">
              <div className="divide-y divide-khata-border">
                {invoices.length === 0 ? (
                  <div className="p-6 text-khata-muted">No invoices generated yet.</div>
                ) : (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="p-6 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-khata-text break-all">{invoice.id}</p>
                        <p className="text-xs text-khata-muted mt-2 uppercase tracking-wider">
                          {invoice.status} · Remaining {formatCurrency(Number(invoice.remaining_amount ?? invoice.amount ?? 0))}
                        </p>
                        <p className="text-xs text-khata-muted mt-1">
                          Recovered {formatCurrency(Number(invoice.paid_amount || 0))}
                        </p>
                        {invoice.nft_token_id && (
                          <p className="text-xs text-khata-chain mt-2 font-bold">
                            NFT Token #{invoice.nft_token_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        <p className="text-lg font-heading text-khata-accent">
                          {formatCurrency(Number(invoice.original_amount ?? invoice.amount ?? 0))}
                        </p>
                        {invoice.status === 'PENDING' && Number(invoice.remaining_amount || invoice.amount) > 0 && (
                          <button
                            onClick={() => openPaymentGateway('USDC')}
                            className="px-3 py-1.5 bg-khata-accent text-khata-bg text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* ON-CHAIN PAYMENTS TAB */}
          <TabsContent value="onchain" className="mt-0">
            <div className="bg-khata-surface border-[3px] border-khata-chain border-t-0 overflow-hidden">
              <div className="divide-y divide-khata-border">
                {onChainPayments.length === 0 ? (
                  <div className="p-6 text-khata-muted">
                    <p className="mb-2">No on-chain payments yet.</p>
                    <p className="text-xs">Payments made via USDC or FLOW tokens on Flow EVM will appear here.</p>
                  </div>
                ) : (
                  onChainPayments.map((payment) => (
                    <div key={payment.id} className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="text-sm font-bold text-khata-text flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-khata-chain" />
                            {payment.token_symbol} Payment
                          </p>
                          <p className="text-xs text-khata-muted mt-2">
                            {format(new Date(payment.confirmed_at || payment.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                          <p className="text-xs text-khata-muted mt-1">
                            Status: <span className="text-khata-accent font-bold">{payment.status}</span>
                          </p>
                        </div>
                        <p className="text-lg font-heading text-khata-chain">
                          {formatCurrency(Number(payment.amount_inr || 0))}
                        </p>
                      </div>
                      {payment.tx_hash && (
                        <div className="mt-3 p-3 bg-khata-bg border border-khata-border">
                          <p className="text-xs text-khata-muted mb-1">Transaction Hash:</p>
                          <p className="text-xs font-mono text-khata-text break-all mb-2">{payment.tx_hash}</p>
                          <a
                            href={`https://evm-testnet.flowscan.io/tx/${payment.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-khata-chain hover:underline font-bold uppercase tracking-wider"
                          >
                            View on Explorer
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            onClick={handleGenerateQR}
            className="
              flex items-center justify-center gap-2 px-5 py-4
              bg-transparent text-khata-text
              border-[3px] border-khata-border
              hover:border-khata-chain hover:text-khata-chain
              font-bold uppercase tracking-wider
              transition-all duration-300
            "
          >
            <QrCode className="w-4 h-4" />
            Telegram QR
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

      {/* QR CODE DIALOG */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="bg-khata-surface border-[3px] border-khata-chain max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading uppercase tracking-wider text-khata-text">
              Telegram Bot QR Code
            </DialogTitle>
          </DialogHeader>
          
          {qrData && (
            <div className="space-y-4">
              <div className="p-4 bg-white border-[3px] border-khata-chain flex items-center justify-center">
                <img src={qrData.qrDataUrl} alt="Telegram QR Code" className="w-full max-w-xs" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-khata-muted">
                  Scan this QR code with Telegram to link your account and receive payment notifications.
                </p>
                {qrData.telegramSetupError && (
                  <p className="text-sm text-khata-danger">
                    {qrData.telegramSetupError}
                  </p>
                )}
                <a
                  href={qrData.telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-khata-chain text-white text-sm font-bold uppercase tracking-wider hover:bg-khata-chain/80 transition-colors"
                >
                  Open in Telegram
                </a>
              </div>
              <div className="bg-khata-bg border-[3px] border-khata-border p-4 space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-khata-muted">Manual Fallback</p>
                <p className="text-sm text-khata-muted">
                  If Telegram opens but does not link your account, send this exact command in
                  <span className="text-khata-text font-bold"> @{qrData.botUsername}</span>.
                </p>
                <div className="px-4 py-3 border-[2px] border-khata-border bg-khata-surface text-khata-text font-mono text-sm break-all">
                  {qrData.startCommand}
                </div>
                <button
                  onClick={copyClientStartCommand}
                  className="w-full px-4 py-3 bg-transparent text-khata-text font-bold uppercase tracking-wider text-sm border-[3px] border-khata-border hover:border-khata-accent hover:text-khata-accent transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Start Command
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-khata-surface border-[3px] border-khata-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading uppercase tracking-wider text-khata-text">
              Notify Shopkeeper
            </DialogTitle>
          </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => openPaymentGateway('USDC')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-khata-accent text-khata-bg border-[3px] border-khata-bg font-bold uppercase tracking-wider"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay with USDC
                </button>
                <button
                  onClick={() => openPaymentGateway('FLOW')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-khata-chain text-white border-[3px] border-khata-bg font-bold uppercase tracking-wider"
                >
                  <Wallet className="w-4 h-4" />
                  Pay with FLOW
                </button>
              </div>

              <div className="p-4 bg-khata-bg border-[2px] border-khata-border">
                <p className="text-sm text-khata-text font-bold uppercase tracking-wider mb-1">
                  Already paid offline?
                </p>
                <p className="text-sm text-khata-muted">
                  Fill the details below for cash, UPI, or bank transfer so the shopkeeper gets a confirmation in
                  both the dashboard and Telegram.
                </p>
              </div>

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
