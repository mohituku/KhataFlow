import { Router, Request, Response } from 'express';
import { geminiService } from '../services/gemini';
import { supabase } from '../services/supabase';
import { z } from 'zod';
import { getBusinessId } from '../middleware/businessId';

const router = Router();

// Validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional().default([])
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory } = chatRequestSchema.parse(req.body);
    const businessId = getBusinessId(req);

    // Parse message using Gemini
    const action = await geminiService.parseBusinessCommand(message, conversationHistory);

    let dbResult = null;

    // Execute business logic based on intent
    switch (action.intent) {
      case 'ADD_SALE':
        dbResult = await handleAddSale(action, businessId);
        break;
      case 'UPDATE_STOCK':
        dbResult = await handleUpdateStock(action, businessId);
        break;
      case 'QUERY_LEDGER':
        dbResult = await handleQueryLedger(action, businessId);
        break;
      case 'MARK_PAID':
        dbResult = await handleMarkPaid(action, businessId);
        break;
      default:
        dbResult = null;
    }

    res.json({
      success: true,
      action,
      dbResult
    });
  } catch (error: any) {
    console.error('Chat route error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process message'
    });
  }
});

// Business Logic Handlers

async function handleAddSale(action: any, businessId: string) {
  try {
    const totalAmount = action.totalAmount || 0;

    if (!action.clientName || totalAmount <= 0) {
      return { error: 'Client name and total amount are required to add a sale' };
    }

    // Reuse the existing client if present so we never reset balances on conflict.
    const { data: existingClient, error: existingClientError } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .eq('name', action.clientName)
      .maybeSingle();

    if (existingClientError) throw existingClientError;

    let client = existingClient;

    if (!client) {
      const { data: insertedClient, error: clientError } = await supabase
      .from('clients')
        .insert({
          business_id: businessId,
          name: action.clientName || 'Unknown Client'
        })
        .select()
        .single();

      if (clientError) throw clientError;
      client = insertedClient;
    }

    // Insert transaction
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        business_id: businessId,
        client_id: client.id,
        type: 'SALE',
        amount: totalAmount,
        items: action.items || [],
        status: 'PENDING'
      })
      .select()
      .single();

    if (txnError) throw txnError;

    // Update client outstanding balance
    await supabase.rpc('increment_client_balance', {
      p_client_id: client.id,
      p_amount: totalAmount
    });

    return { client, transaction: txn };
  } catch (error) {
    console.error('Add sale error:', error);
    return { error: 'Failed to add sale' };
  }
}

async function handleUpdateStock(action: any, businessId: string) {
  try {
    if (!action.items || action.items.length === 0) {
      return { error: 'No items to update' };
    }

    const updates = [];
    for (const item of action.items) {
      const { data, error } = await supabase
        .from('inventory')
        .upsert({
          business_id: businessId,
          item_name: item.name,
          quantity: item.qty,
          unit: item.unit || 'kg',
          low_stock_threshold: 10
        }, {
          onConflict: 'business_id,item_name'
        })
        .select()
        .single();

      if (error) {
        console.error('Update stock item error:', error);
      } else {
        updates.push(data);
      }
    }

    return { updatedItems: updates };
  } catch (error) {
    console.error('Update stock error:', error);
    return { error: 'Failed to update stock' };
  }
}

async function handleQueryLedger(action: any, businessId: string) {
  try {
    if (!action.clientName) {
      return { error: 'Client name not provided' };
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .ilike('name', `%${action.clientName}%`)
      .single();

    if (error) throw error;

    // Get transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', data.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      client: data,
      transactions: transactions || []
    };
  } catch (error) {
    console.error('Query ledger error:', error);
    return { error: 'Client not found' };
  }
}

async function handleMarkPaid(action: any, businessId: string) {
  try {
    if (!action.clientName) {
      return { error: 'Client name not provided' };
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .ilike('name', `%${action.clientName}%`)
      .single();

    if (clientError) throw clientError;

    const paymentAmount = action.paymentAmount || client.total_outstanding;

    if (paymentAmount <= 0) {
      return { error: 'Payment amount must be greater than zero' };
    }

    if (paymentAmount > client.total_outstanding) {
      return { error: 'Payment amount exceeds outstanding balance' };
    }

    // Insert payment transaction
    await supabase.from('transactions').insert({
      business_id: businessId,
      client_id: client.id,
      type: 'PAYMENT',
      amount: paymentAmount,
      status: 'PAID'
    });

    // Update outstanding balance
    await supabase.rpc('decrement_client_balance', {
      p_client_id: client.id,
      p_amount: paymentAmount
    });

    return { settled: true, amount: paymentAmount };
  } catch (error) {
    console.error('Mark paid error:', error);
    return { error: 'Failed to mark payment' };
  }
}

export default router;
