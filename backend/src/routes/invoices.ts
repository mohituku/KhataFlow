import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { z } from 'zod';
import { getBusinessId } from '../middleware/walletAuth';

const router = Router();

// Get all invoices
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const status =
      typeof req.query.status === 'string' && req.query.status.trim()
        ? req.query.status.trim().toUpperCase()
        : null;
    const search =
      typeof req.query.search === 'string' && req.query.search.trim()
        ? req.query.search.trim().toLowerCase()
        : '';

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients:client_id (
          id,
          name
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const invoices = (data || []).filter((invoice) => {
      const matchesStatus = status
        ? String(invoice.status).toUpperCase() === status
        : true;

      if (!matchesStatus) return false;
      if (!search) return true;

      return [
        invoice.id,
        invoice.clients?.name,
        invoice.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    res.json({ success: true, invoices });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create invoice
const invoiceSchema = z.object({
  client_id: z.string().uuid(),
  amount: z.number().min(0),
  items: z.array(z.any()).optional(),
  status: z.enum(['PENDING', 'MINTED', 'SETTLED']).optional().default('PENDING')
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const invoiceData = invoiceSchema.parse(req.body);

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        business_id: businessId,
        ...invoiceData,
        original_amount: invoiceData.amount,
        paid_amount: 0,
        remaining_amount: invoiceData.amount
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, invoice: data });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update invoice (mark as minted)
router.patch('/:invoiceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const { invoiceId } = req.params;
    const { status, nft_token_id, nft_tx_hash, due_date, chain } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (nft_token_id) updateData.nft_token_id = nft_token_id;
    if (nft_tx_hash) updateData.nft_tx_hash = nft_tx_hash;
    if (due_date) updateData.due_date = due_date;
    if (chain) updateData.chain = chain;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('business_id', businessId)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, invoice: data });
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invoice by ID
router.get('/:invoiceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const { invoiceId } = req.params;

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients:client_id (
          id,
          name,
          total_outstanding
        )
      `)
      .eq('business_id', businessId)
      .eq('id', invoiceId)
      .single();

    if (error) throw error;

    res.json({ success: true, invoice: data });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(404).json({ success: false, error: 'Invoice not found' });
  }
});

export default router;
