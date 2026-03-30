import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWalletStore } from '../store/useWalletStore';
import { fetchJson, getApiUrl } from '../lib/api';
import { Wallet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PaymentPage() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const preferredToken = searchParams.get('tokenType') || 'USDC';
  const accessToken = searchParams.get('token') || '';
  
  const [clientData, setClientData] = useState(null);
  const [paying, setPaying] = useState(false);
  const [activePaymentToken, setActivePaymentToken] = useState('');
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  
  const { address, connect, isConnecting } = useWalletStore();

  const loadClientData = useCallback(async () => {
    try {
      if (!accessToken) {
        throw new Error('Missing signed payment access token');
      }

      const response = await fetch(getApiUrl(`/api/client/lookup/${clientId}?token=${encodeURIComponent(accessToken)}`));
      const data = await response.json();
      if (data.success) {
        setClientData(data.client);
      }
    } catch (err) {
      console.error('Failed to load client:', err);
    }
  }, [accessToken, clientId]);

  useEffect(() => {
    void loadClientData();
  }, [loadClientData]);

  const initiatePayment = async (tokenType) => {
    setPaying(true);
    setActivePaymentToken(tokenType);
    setError(null);

    try {
      if (!accessToken) {
        throw new Error('Missing signed payment access token');
      }

      // 1. Get x402 payment details
      const resp = await fetch(getApiUrl(`/api/payment/x402/initiate/${clientId}?token=${encodeURIComponent(accessToken)}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': accessToken
        },
        body: JSON.stringify({ token: accessToken })
      });
      
      if (resp.status !== 402) {
        throw new Error('Payment not required or already paid');
      }

      const details = await resp.json();
      const option = details.accepts.find(a => a.currencySymbol === tokenType);
      
      if (!option) {
        throw new Error(`${tokenType} payment option not available`);
      }

      // 2. Connect wallet if not connected
      if (!address) {
        await connect();
      }

      // 3. Send payment via MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      let tx;
      if (tokenType === 'USDC') {
        // ERC-20 transfer for USDC
        const usdcAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
        const usdc = new ethers.Contract(option.tokenAddress, usdcAbi, signer);
        tx = await usdc.transfer(option.payTo, option.maxAmountRequired);
      } else {
        // Native FLOW token transfer
        tx = await signer.sendTransaction({
          to: option.payTo,
          value: option.maxAmountRequired
        });
      }

      const receipt = await tx.wait(1);
      setTxHash(receipt.hash);

      // 4. Confirm with backend
      await fetchJson(`/api/payment/x402/confirm/${clientId}?token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: {
          'x-client-access-token': accessToken
        },
        body: JSON.stringify({ 
          txHash: receipt.hash, 
          amountPaid: option.maxAmountRequired, 
          tokenSymbol: tokenType,
          token: accessToken
        })
      });

      // Reload client data
      await loadClientData();
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err.message);
    } finally {
      setPaying(false);
      setActivePaymentToken('');
    }
  };

  if (!clientData) {
    return (
      <div className="min-h-screen bg-khata-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-khata-chain" />
      </div>
    );
  }

  if (txHash) {
    return (
      <div className="min-h-screen bg-khata-bg flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-khata-accent/20 border-[3px] border-khata-accent
            flex items-center justify-center rounded-full">
            <CheckCircle2 className="w-12 h-12 text-khata-accent" />
          </div>
          <h1 className="text-3xl font-heading uppercase tracking-wider text-khata-text">
            Payment Confirmed!
          </h1>
          <p className="text-khata-muted">
            Your payment has been confirmed on Flow blockchain.
          </p>
          <div className="p-4 bg-khata-surface border-[2px] border-khata-border">
            <p className="text-xs text-khata-muted mb-2">Transaction Hash</p>
            <p className="text-sm text-khata-text font-mono break-all">{txHash}</p>
          </div>
          <a
            href={`https://evm-testnet.flowscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-khata-chain text-white font-bold uppercase tracking-wider
              hover:bg-khata-chain/80 transition-colors"
          >
            View on Explorer
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-khata-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-khata-surface border-[3px] border-khata-chain
            flex items-center justify-center"
            style={{ boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}>
            <Wallet className="w-12 h-12 text-khata-chain" />
          </div>
          <h1 className="text-3xl font-heading uppercase tracking-wider text-khata-text mb-2">
            Pay {clientData.name}
          </h1>
          <p className="text-khata-muted">Outstanding Balance</p>
          <p className="text-4xl font-bold text-khata-accent mt-2">
            ₹{clientData.total_outstanding}
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-khata-muted mt-3">
            Suggested payment: {preferredToken}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-khata-danger/10 border-[2px] border-khata-danger">
            <AlertCircle className="w-5 h-5 text-khata-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-khata-danger">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => initiatePayment('USDC')}
            disabled={paying || isConnecting}
            className={`w-full clip-angled flex items-center justify-center gap-3 px-6 py-5
              ${preferredToken === 'USDC' ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-green-600 to-green-500'}
              text-white font-bold uppercase tracking-wider text-lg
              border-[3px] border-khata-bg
              hover:scale-[1.02] transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ boxShadow: paying ? 'none' : '0 0 25px rgba(34,197,94,0.6)' }}
          >
            {paying && activePaymentToken === 'USDC' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>💰 Pay with USDC</>
            )}
          </button>

          <button
            onClick={() => initiatePayment('FLOW')}
            disabled={paying || isConnecting}
            className={`w-full clip-angled flex items-center justify-center gap-3 px-6 py-5
              ${preferredToken === 'FLOW' ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-blue-600 to-blue-500'}
              text-white font-bold uppercase tracking-wider text-lg
              border-[3px] border-khata-bg
              hover:scale-[1.02] transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ boxShadow: paying ? 'none' : '0 0 25px rgba(59,130,246,0.6)' }}
          >
            {paying && activePaymentToken === 'FLOW' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>🔵 Pay with FLOW</>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-khata-muted">
            Network: Flow EVM Testnet · Secure on-chain payment
          </p>
        </div>
      </div>
    </div>
  );
}
