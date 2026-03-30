import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { supabase } from '../services/supabase';
import { confirmOnChainPayment } from '../services/commandExecution';
import { getBusinessId } from '../middleware/walletAuth';
import { getClientAccessUrls, verifyClientAccessToken } from '../services/signedLinks';

const router = Router();

function getConversionRates() {
  const inrPerUsd = Number(process.env.INR_PER_USD || 83);
  const flowUsdPrice = Number(process.env.FLOW_USD_PRICE || 3.5);

  if (inrPerUsd <= 0 || flowUsdPrice <= 0) {
    throw new Error('INR_PER_USD and FLOW_USD_PRICE must be positive numbers');
  }

  return { inrPerUsd, flowUsdPrice };
}

function extractClientAccessToken(req: Request) {
  const headerToken = req.headers['x-client-access-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  const bodyToken = req.body?.token;
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return bodyToken.trim();
  }

  return null;
}

async function loadClientForPublicAccess(clientId: string) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, business_id, total_outstanding')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    throw clientError || new Error('Client not found');
  }

  return client;
}

function assertClientAccess(req: Request, businessId: string, clientId: string) {
  const token = extractClientAccessToken(req);
  if (!token) {
    const error: any = new Error('Signed client access token is required');
    error.statusCode = 401;
    throw error;
  }

  verifyClientAccessToken(token, businessId, clientId);
}

router.post('/x402/initiate/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const client = await loadClientForPublicAccess(clientId);
    assertClientAccess(req, client.business_id, client.id);

    const { data: business } = await supabase
      .from('businesses')
      .select('name, wallet_address')
      .eq('id', client.business_id)
      .single();

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    const amountINR = Number(client.total_outstanding);
    if (amountINR <= 0) {
      return res.json({
        success: true,
        message: 'No outstanding balance',
        amount: 0
      });
    }

    const { inrPerUsd, flowUsdPrice } = getConversionRates();
    const amountUSD = amountINR / inrPerUsd;
    const shopkeeperWallet = business.wallet_address;

    if (!shopkeeperWallet) {
      return res.status(400).json({
        success: false,
        error: 'Shopkeeper wallet not configured'
      });
    }

    const accessToken = extractClientAccessToken(req);
    const tokenQuery = `token=${encodeURIComponent(accessToken || '')}`;
    const resourceBase = `${process.env.BACKEND_URL || 'http://localhost:8001'}/api/payment/x402/confirm/${clientId}`;

    res.status(402).json({
      x402Version: 1,
      accepts: [
        {
          scheme: 'exact',
          network: 'flow-evm-testnet',
          maxAmountRequired: ethers.parseUnits(amountUSD.toFixed(6), 6).toString(),
          resource: `${resourceBase}?${tokenQuery}`,
          description: `Pay outstanding balance to ${business.name || 'shop'}`,
          mimeType: 'application/json',
          payTo: shopkeeperWallet,
          tokenAddress: process.env.USDC_CONTRACT_ADDRESS || '0x',
          currencySymbol: 'USDC',
          decimals: 6
        },
        {
          scheme: 'exact',
          network: 'flow-evm-testnet',
          maxAmountRequired: ethers.parseEther((amountUSD / flowUsdPrice).toFixed(18)).toString(),
          resource: `${resourceBase}?${tokenQuery}`,
          description: `Pay outstanding balance to ${business.name || 'shop'}`,
          mimeType: 'application/json',
          payTo: shopkeeperWallet,
          tokenAddress: 'native',
          currencySymbol: 'FLOW',
          decimals: 18
        }
      ]
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/x402/confirm/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const { txHash, amountPaid, tokenSymbol } = req.body;

    if (!txHash || !amountPaid || !tokenSymbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: txHash, amountPaid, tokenSymbol'
      });
    }

    const client = await loadClientForPublicAccess(clientId);
    assertClientAccess(req, client.business_id, client.id);

    const result = await confirmOnChainPayment(clientId, txHash, amountPaid, tokenSymbol);

    res.json({
      ...result,
      message: result.duplicate
        ? 'Payment already confirmed earlier'
        : 'Payment confirmed and balance updated'
    });
  } catch (error: any) {
    console.error('x402 confirm error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.get('/link/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const businessId = getBusinessId(req);

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, business_id')
      .eq('business_id', businessId)
      .eq('id', clientId)
      .single();

    if (error || !client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const access = getClientAccessUrls(client.business_id, client.id);
    res.json({ success: true, clientId, ...access });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/on-chain/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const client = await loadClientForPublicAccess(clientId);
    assertClientAccess(req, client.business_id, client.id);

    const { data: payments, error } = await supabase
      .from('on_chain_payments')
      .select('*')
      .eq('client_id', clientId)
      .order('confirmed_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      payments: payments || []
    });
  } catch (error: any) {
    console.error('Fetch on-chain payments error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

export default router;
