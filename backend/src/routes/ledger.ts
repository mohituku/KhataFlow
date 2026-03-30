import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { getBusinessId } from '../middleware/walletAuth';

const router = Router();

// Get all clients
router.get('/clients', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const search =
      typeof req.query.search === 'string' && req.query.search.trim()
        ? req.query.search.trim().toLowerCase()
        : '';

    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const clientIds = clients?.map((client) => client.id) || [];
    let transactionsByClient = new Map<string, string>();

    if (clientIds.length > 0) {
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('client_id, created_at')
        .eq('business_id', businessId)
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      if (txnError) throw txnError;

      transactions?.forEach((txn) => {
        if (!transactionsByClient.has(txn.client_id)) {
          transactionsByClient.set(txn.client_id, txn.created_at);
        }
      });
    }

    const enrichedClients =
      clients?.map((client) => ({
        ...client,
        lastTransaction: transactionsByClient.get(client.id) || client.updated_at || client.created_at
      }))
        .filter((client) => {
          if (!search) return true;

          return [
            client.id,
            client.name,
            client.phone
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        }) || [];

    res.json({ success: true, clients: enrichedClients });
  } catch (error: any) {
    console.error('Get clients error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ledger summary
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('total_outstanding')
      .eq('business_id', businessId);

    if (clientsError) throw clientsError;

    const { data: pendingTransactions, error: pendingError } = await supabase
      .from('transactions')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'PENDING');

    if (pendingError) throw pendingError;

    const { data: sales, error: salesError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('business_id', businessId)
      .eq('type', 'SALE');

    if (salesError) throw salesError;

    const { data: mintedInvoices, error: mintedError } = await supabase
      .from('invoices')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'MINTED');

    if (mintedError) throw mintedError;

    const totalOutstanding = clients?.reduce((sum, client) => sum + Number(client.total_outstanding || 0), 0) || 0;
    const totalRevenue = sales?.reduce((sum, txn) => sum + Number(txn.amount || 0), 0) || 0;

    res.json({
      success: true,
      summary: {
        totalOutstanding,
        totalRevenue,
        pendingTransactions: pendingTransactions?.length || 0,
        totalClients: clients?.length || 0,
        activeNFTs: mintedInvoices?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Get summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent activity
router.get('/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        type,
        amount,
        created_at,
        clients:client_id (
          name
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionsError) throw transactionsError;

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        updated_at,
        clients:client_id (
          name
        )
      `)
      .eq('business_id', businessId)
      .eq('status', 'MINTED')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (invoicesError) throw invoicesError;

    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('id, item_name, quantity, low_stock_threshold, updated_at')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (inventoryError) throw inventoryError;

    const activity = [
      ...(transactions || []).map((txn: any) => ({
        id: `txn-${txn.id}`,
        type: txn.type === 'PAYMENT' ? 'payment' : 'sale',
        message:
          txn.type === 'PAYMENT'
            ? `${txn.clients?.name || 'Unknown client'} paid ₹${Number(txn.amount || 0)}`
            : `${txn.clients?.name || 'Unknown client'} added ₹${Number(txn.amount || 0)} to ledger`,
        timestamp: txn.created_at
      })),
      ...(invoices || []).map((invoice: any) => ({
        id: `invoice-${invoice.id}`,
        type: 'nft',
        message: `NFT minted for ${invoice.clients?.name || 'Unknown client'}`,
        timestamp: invoice.updated_at
      })),
      ...(inventory || [])
        .filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold || 10))
        .map((item) => ({
          id: `inventory-${item.id}`,
          type: 'inventory',
          message: `Low stock alert: ${item.item_name}`,
          timestamp: item.updated_at
        }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    res.json({ success: true, activity });
  } catch (error: any) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get client details with transactions
router.get('/clients/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const { clientId } = req.params;

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('business_id', businessId)
      .single();

    if (clientError) throw clientError;

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (transactionsError) throw transactionsError;

    res.json({
      success: true,
      client,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Get client details error:', error);
    res.status(404).json({ success: false, error: 'Client not found' });
  }
});

export default router;
