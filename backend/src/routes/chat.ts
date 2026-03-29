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

    action.response = buildAssistantResponse(action, dbResult, message);

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

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: businessId,
        client_id: client.id,
        amount: totalAmount,
        items: action.items || [],
        status: 'PENDING'
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Update client outstanding balance
    await supabase.rpc('increment_client_balance', {
      p_client_id: client.id,
      p_amount: totalAmount
    });

    return { client, transaction: txn, invoice };
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
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, total_outstanding')
        .eq('business_id', businessId)
        .gt('total_outstanding', 0)
        .order('total_outstanding', { ascending: false });

      if (error) throw error;

      const totalOutstanding = (clients || []).reduce(
        (sum, client) => sum + Number(client.total_outstanding || 0),
        0
      );

      return {
        summary: {
          totalOutstanding,
          totalClients: clients?.length || 0,
          clients: clients || []
        }
      };
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

    return {
      settled: true,
      amount: paymentAmount,
      clientName: client.name,
      remainingBalance: Math.max(Number(client.total_outstanding || 0) - Number(paymentAmount), 0)
    };
  } catch (error) {
    console.error('Mark paid error:', error);
    return { error: 'Failed to mark payment' };
  }
}

function buildAssistantResponse(action: any, dbResult: any, originalMessage: string) {
  if (dbResult?.error) {
    return toHinglishError(dbResult.error);
  }

  switch (action.intent) {
    case 'ADD_SALE': {
      const clientName = dbResult?.client?.name || action.clientName || 'client';
      const amount = Number(action.totalAmount || dbResult?.transaction?.amount || 0);
      const previousOutstanding = Number(dbResult?.client?.total_outstanding || 0);
      const newOutstanding = previousOutstanding + amount;
      return `${clientName} ka ₹${formatInr(amount)} udhar add kar diya. Naya balance ₹${formatInr(newOutstanding)} hai, aur invoice bhi create ho gaya.`;
    }
    case 'MARK_PAID': {
      const clientName = dbResult?.clientName || action.clientName || 'client';
      const amount = Number(dbResult?.amount || action.paymentAmount || 0);
      const remainingBalance = Number(dbResult?.remainingBalance || 0);
      return `${clientName} se ₹${formatInr(amount)} payment record kar diya. Remaining balance ₹${formatInr(remainingBalance)} hai.`;
    }
    case 'UPDATE_STOCK': {
      const count = Array.isArray(dbResult?.updatedItems) ? dbResult.updatedItems.length : 0;
      if (count === 0) {
        return 'Inventory request samajh aayi, lekin koi item update nahi hua.';
      }
      const itemNames = dbResult.updatedItems
        .slice(0, 3)
        .map((item: any) => item.item_name)
        .join(', ');
      return `Inventory update ho gaya. ${count} item save kiye: ${itemNames}.`;
    }
    case 'QUERY_LEDGER': {
      if (dbResult?.summary) {
        const total = Number(dbResult.summary.totalOutstanding || 0);
        const clients = Array.isArray(dbResult.summary.clients) ? dbResult.summary.clients : [];

        if (clients.length === 0) {
          return 'Abhi kisi client se koi udhar lena baaki nahi hai.';
        }

        const topClients = clients
          .slice(0, 5)
          .map((client: any) => `${client.name}: ₹${formatInr(client.total_outstanding)}`)
          .join(', ');

        return `Aapko total ₹${formatInr(total)} lena hai. Top outstanding clients: ${topClients}.`;
      }

      if (dbResult?.client) {
        const clientName = dbResult.client.name;
        const totalOutstanding = Number(dbResult.client.total_outstanding || 0);
        const recentTransactions = Array.isArray(dbResult.transactions) ? dbResult.transactions.length : 0;
        return `${clientName} se aapko ₹${formatInr(totalOutstanding)} lena hai. Recent entries ${recentTransactions} hain.`;
      }

      return 'Ledger details mil gayi, lekin summary bana nahi paaya.';
    }
    default:
      return action.response || getDefaultUnknownResponse(originalMessage);
  }
}

function toHinglishError(error: string) {
  if (error.includes('Client not found')) {
    return 'Client nahi mila. Naam thoda aur clearly batao.';
  }

  if (error.includes('Client name not provided')) {
    return 'Client ka naam missing hai. Naam ke saath dobara bolo.';
  }

  if (error.includes('Payment amount exceeds outstanding balance')) {
    return 'Payment outstanding balance se zyada hai. Amount check karo.';
  }

  return error;
}

function getDefaultUnknownResponse(message: string) {
  return `Main "${message}" ko clearly sale, payment, stock update, ya ledger query me map nahi kar paaya. Client name aur amount ke saath dobara bolo.`;
}

function formatInr(value: number | string) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default router;
