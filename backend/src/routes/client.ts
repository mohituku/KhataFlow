import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';

const router = Router();

const confirmPaymentSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(500).optional().default('')
});

function getFallbackBusinessName(businessId: string) {
  if (businessId === 'demo-business-001') {
    return 'KhataFlow Demo Store';
  }

  return 'KhataFlow Merchant';
}

router.get('/:businessId/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, total_outstanding, phone, address')
      .eq('business_id', businessId)
      .eq('id', clientId)
      .single();

    if (clientError) {
      throw clientError;
    }

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, type, amount, items, created_at, status')
      .eq('business_id', businessId)
      .eq('client_id', clientId)
      .eq('type', 'SALE')
      .order('created_at', { ascending: false });

    if (transactionsError) {
      throw transactionsError;
    }

    const { data: latestInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, amount, status, nft_token_id, nft_tx_hash, due_date, created_at')
      .eq('business_id', businessId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceError) {
      throw invoiceError;
    }

    let businessName = getFallbackBusinessName(businessId);
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle();

    if (business?.name) {
      businessName = business.name;
    }

    res.json({
      success: true,
      businessId,
      businessName,
      client,
      transactions: transactions || [],
      nft: latestInvoice?.nft_token_id
        ? {
            tokenId: latestInvoice.nft_token_id,
            txHash: latestInvoice.nft_tx_hash,
            dueDate: latestInvoice.due_date,
            status: latestInvoice.status,
            invoiceId: latestInvoice.id,
            amount: latestInvoice.amount
          }
        : null
    });
  } catch (error: any) {
    console.error('Get client portal error:', error);
    res.status(404).json({
      success: false,
      error: 'Client account not found'
    });
  }
});

router.post('/:businessId/:clientId/confirm-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
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
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to send payment confirmation'
    });
  }
});

export default router;
