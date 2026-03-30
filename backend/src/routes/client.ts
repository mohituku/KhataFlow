import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { getBusinessId } from '../middleware/walletAuth';
import { getClientAccessUrls, verifyClientAccessToken } from '../services/signedLinks';

const router = Router();

const confirmPaymentSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(500).optional().default('')
});

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

function assertClientAccess(req: Request, businessId: string, clientId: string) {
  const token = extractClientAccessToken(req);
  if (!token) {
    const error: any = new Error('Signed client access token is required');
    error.statusCode = 401;
    throw error;
  }

  verifyClientAccessToken(token, businessId, clientId);
  return token;
}

function getFallbackBusinessName(businessId: string) {
  if (businessId === 'demo-business-001') {
    return 'KhataFlow Demo Store';
  }

  return 'KhataFlow Merchant';
}

async function buildClientPortalPayload(businessId: string, clientId: string) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, business_id, name, total_outstanding, phone, address')
    .eq('business_id', businessId)
    .eq('id', clientId)
    .single();

  if (clientError) throw clientError;

  const { data: sales, error: salesError } = await supabase
    .from('transactions')
    .select('id, type, amount, items, created_at, status')
    .eq('business_id', businessId)
    .eq('client_id', clientId)
    .eq('type', 'SALE')
    .order('created_at', { ascending: false });

  if (salesError) throw salesError;

  const { data: payments, error: paymentsError } = await supabase
    .from('transactions')
    .select('id, type, amount, items, created_at, status')
    .eq('business_id', businessId)
    .eq('client_id', clientId)
    .eq('type', 'PAYMENT')
    .order('created_at', { ascending: false });

  if (paymentsError) throw paymentsError;

  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, amount, original_amount, paid_amount, remaining_amount, status, nft_token_id, nft_tx_hash, due_date, created_at')
    .eq('business_id', businessId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (invoicesError) throw invoicesError;

  const latestNftInvoice = (invoices || []).find((invoice) => invoice.nft_token_id);

  let businessName = getFallbackBusinessName(businessId);
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .maybeSingle();

  if (business?.name) {
    businessName = business.name;
  }

  return {
    success: true,
    businessId,
    businessName,
    client,
    purchases: sales || [],
    payments: payments || [],
    invoices: invoices || [],
    statement: {
      totalOutstanding: Number(client.total_outstanding || 0),
      totalInvoiced: (invoices || []).reduce(
        (sum, invoice) => sum + Number(invoice.original_amount ?? invoice.amount ?? 0),
        0
      ),
      totalRecovered: (invoices || []).reduce(
        (sum, invoice) => sum + Number(invoice.paid_amount || 0),
        0
      ),
      openInvoices: (invoices || []).filter((invoice) => Number(invoice.remaining_amount ?? invoice.amount ?? 0) > 0).length,
      lastPaymentAt: payments?.[0]?.created_at || null
    },
    nft: latestNftInvoice?.nft_token_id
      ? {
          tokenId: latestNftInvoice.nft_token_id,
          txHash: latestNftInvoice.nft_tx_hash,
          dueDate: latestNftInvoice.due_date,
          status: latestNftInvoice.status,
          invoiceId: latestNftInvoice.id,
          amount: latestNftInvoice.amount
        }
      : null
  };
}

router.get('/share-link/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, business_id')
      .eq('business_id', businessId)
      .eq('id', clientId)
      .single();

    if (error || !client) {
      throw error || new Error('Client not found');
    }

    const access = getClientAccessUrls(client.business_id, client.id);

    res.json({
      success: true,
      clientId: client.id,
      businessId: client.business_id,
      ...access
    });
  } catch (error: any) {
    console.error('Create share link error:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to create client share link'
    });
  }
});

router.get('/lookup/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, business_id')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      throw error || new Error('Client not found');
    }

    assertClientAccess(req, client.business_id, client.id);
    const payload = await buildClientPortalPayload(client.business_id, client.id);
    res.json(payload);
  } catch (error: any) {
    console.error('Lookup client portal error:', error);
    res.status(error.statusCode || 404).json({
      success: false,
      error: error.message || 'Client account not found'
    });
  }
});

router.get('/:businessId/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    assertClientAccess(req, businessId, clientId);
    const payload = await buildClientPortalPayload(businessId, clientId);
    res.json(payload);
  } catch (error: any) {
    console.error('Get client portal error:', error);
    res.status(error.statusCode || 404).json({
      success: false,
      error: error.message || 'Client account not found'
    });
  }
});

router.post('/:businessId/:clientId/confirm-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    assertClientAccess(req, businessId, clientId);
    const { amount, note } = confirmPaymentSchema.parse(req.body);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('business_id', businessId)
      .eq('id', clientId)
      .single();

    if (clientError) {
      throw clientError;
    }

    const { data, error } = await supabase
      .from('payment_confirmations')
      .insert({
        business_id: businessId,
        client_id: client.id,
        amount,
        note,
        status: 'PENDING_CONFIRMATION'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      confirmation: data,
      message: 'Payment confirmation sent to the shopkeeper.'
    });
  } catch (error: any) {
    console.error('Confirm client payment error:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      error: error.message || 'Failed to send payment confirmation'
    });
  }
});

export default router;
