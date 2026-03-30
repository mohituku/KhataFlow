import { Router, Request, Response } from 'express';
import { geminiService } from '../services/gemini';
import { supabase } from '../services/supabase';
import { z } from 'zod';
import { getBusinessId } from '../middleware/businessId';
import { ActionUnit, ParsedCommand } from '../types';
import {
  getOrCreateChatSession,
  updateChatSession,
  messageHasReferenceWords,
  isInvoiceReference,
  isLedgerReference,
  isPaymentReference
} from '../services/chatSessionMemory';

const router = Router();
type ExecutedActionResult = { action: ActionUnit; result: any };

const chatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().nullable().optional(),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional().default([])
});

// ─── Main handler ──────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory, sessionId: incomingSessionId } = chatRequestSchema.parse(req.body);
    const businessId = getBusinessId(req);
    const { sessionId, session } = getOrCreateChatSession(businessId, incomingSessionId);

    // Parse with new multi-action Gemini
    const parsed: ParsedCommand = await geminiService.parseCommand(message, conversationHistory);
    const hydratedParsed = hydrateParsedCommand(parsed, message, session);

    // Execute ALL actions in parallel where safe (reads), serial for writes
    const actionResults = await executeActions(hydratedParsed.actions, businessId);
    syncSessionFromResults(sessionId, actionResults);

    // Build the final enriched response
    const finalResponse = buildFinalResponse(hydratedParsed, actionResults, message);

    res.json({
      success: true,
      sessionId,
      // Legacy field so frontend doesn't break
      action: {
        ...(hydratedParsed.actions[0] || { intent: 'UNKNOWN' as const }),
        response: finalResponse
      },
      // New fields
      parsedCommand: {
        ...hydratedParsed,
        response: finalResponse
      },
      actionResults,
      dbResult: actionResults[0]?.result || null
    });
  } catch (error: any) {
    console.error('Chat route error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process message'
    });
  }
});

// ─── Multi-action executor ─────────────────────────────────────────────────
async function executeActions(
  actions: ActionUnit[],
  businessId: string
): Promise<ExecutedActionResult[]> {
  const results = [];

  for (const action of actions) {
    let result: any = null;

    switch (action.intent) {
      case 'ADD_SALE':
        result = await handleAddSale(action, businessId);
        break;
      case 'UPDATE_STOCK':
        result = await handleUpdateStock(action, businessId);
        break;
      case 'MARK_PAID':
        result = await handleMarkPaid(action, businessId);
        break;
      case 'QUERY_LEDGER':
        result = await handleQueryLedger(action, businessId);
        break;
      case 'QUERY_STOCK':
        result = await handleQueryStock(action, businessId);
        break;
      case 'GENERATE_REPORT':
        result = await handleGenerateReport(action, businessId);
        break;
      case 'GENERATE_INVOICE':
        result = await handleGenerateInvoice(action, businessId);
        break;
      default:
        result = null;
    }

    results.push({ action, result });
  }

  return results;
}

function hydrateParsedCommand(parsed: ParsedCommand, message: string, session: {
  lastClientId?: string;
  lastClientName?: string;
  lastInvoiceId?: string;
  lastOutstandingAmount?: number;
}) {
  const hasReference = messageHasReferenceWords(message);

  const normalizedActions = parsed.actions.map((action) => {
    const nextAction: ActionUnit = {
      ...action,
      items: Array.isArray(action.items) ? action.items : [],
      filters: action.filters || {}
    };

    if (!nextAction.clientName && hasReference && session.lastClientName) {
      if (['QUERY_LEDGER', 'MARK_PAID', 'GENERATE_INVOICE'].includes(nextAction.intent)) {
        nextAction.clientName = session.lastClientName;
      }
    }

    if (
      nextAction.intent === 'MARK_PAID' &&
      !nextAction.paymentAmount &&
      hasReference &&
      session.lastOutstandingAmount
    ) {
      nextAction.paymentAmount = session.lastOutstandingAmount;
    }

    return nextAction;
  });

  if (
    normalizedActions.every((action) => action.intent === 'UNKNOWN') &&
    hasReference &&
    session.lastClientName
  ) {
    if (isPaymentReference(message)) {
      normalizedActions[0] = {
        intent: 'MARK_PAID',
        clientName: session.lastClientName,
        paymentAmount: session.lastOutstandingAmount || null,
        items: [],
        filters: {},
        totalAmount: null
      };
    } else if (isLedgerReference(message)) {
      normalizedActions[0] = {
        intent: 'QUERY_LEDGER',
        clientName: session.lastClientName,
        items: [],
        filters: {},
        totalAmount: null,
        paymentAmount: null
      };
    } else if (isInvoiceReference(message)) {
      normalizedActions[0] = {
        intent: 'GENERATE_INVOICE',
        clientName: session.lastClientName,
        items: [],
        filters: {},
        totalAmount: null,
        paymentAmount: null
      };
    }
  }

  return {
    ...parsed,
    actions: normalizedActions
  };
}

function syncSessionFromResults(sessionId: string, actionResults: ExecutedActionResult[]) {
  const lastSuccessful = [...actionResults]
    .reverse()
    .find(({ result }) => result && !result.error);

  if (!lastSuccessful) return;

  const nextSessionPatch: Record<string, any> = {
    lastIntent: lastSuccessful.action.intent
  };

  const resultClient =
    lastSuccessful.result.client ||
    (lastSuccessful.result.clientName
      ? {
          id: lastSuccessful.result.clientId,
          name: lastSuccessful.result.clientName,
          total_outstanding: lastSuccessful.result.remainingBalance
        }
      : null);

  if (resultClient?.name) {
    nextSessionPatch.lastClientName = resultClient.name;
  } else if (lastSuccessful.action.clientName) {
    nextSessionPatch.lastClientName = lastSuccessful.action.clientName;
  }

  if (resultClient?.id) {
    nextSessionPatch.lastClientId = resultClient.id;
  }

  if (typeof resultClient?.total_outstanding === 'number') {
    nextSessionPatch.lastOutstandingAmount = Number(resultClient.total_outstanding || 0);
  } else if (typeof lastSuccessful.result.remainingBalance === 'number') {
    nextSessionPatch.lastOutstandingAmount = Number(lastSuccessful.result.remainingBalance || 0);
  }

  if (lastSuccessful.result.invoice?.id) {
    nextSessionPatch.lastInvoiceId = lastSuccessful.result.invoice.id;
  } else if (lastSuccessful.result.invoices?.[0]?.id) {
    nextSessionPatch.lastInvoiceId = lastSuccessful.result.invoices[0].id;
  }

  updateChatSession(sessionId, nextSessionPatch);
}

// ─── Handlers ─────────────────────────────────────────────────────────────

async function handleAddSale(action: ActionUnit, businessId: string) {
  const totalAmount = action.totalAmount || 0;

  if (!action.clientName || totalAmount <= 0) {
    return { error: 'Client name and total amount are required to add a sale' };
  }

  const { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .ilike('name', `%${action.clientName}%`)
    .maybeSingle();

  let client = existingClient;

  if (!client) {
    const { data: insertedClient, error } = await supabase
      .from('clients')
      .insert({ business_id: businessId, name: action.clientName })
      .select()
      .single();
    if (error) throw error;
    client = insertedClient;
  }

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

  // Auto-create invoice draft
  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      business_id: businessId,
      client_id: client.id,
      amount: totalAmount,
      original_amount: totalAmount,
      paid_amount: 0,
      remaining_amount: totalAmount,
      items: action.items || [],
      status: 'PENDING'
    })
    .select()
    .single();

  await supabase.rpc('increment_client_balance', {
    p_client_id: client.id,
    p_amount: totalAmount
  });

  // Fetch fresh client with new balance
  const { data: updatedClient } = await supabase
    .from('clients')
    .select('*')
    .eq('id', client.id)
    .single();

  return { client: updatedClient, transaction: txn, invoice };
}

async function applyPaymentToInvoices(clientId: string, businessId: string, paymentAmount: number) {
  const { data: openInvoices, error } = await supabase
    .from('invoices')
    .select('id, amount, original_amount, paid_amount, remaining_amount, status, nft_token_id, due_date, created_at')
    .eq('business_id', businessId)
    .eq('client_id', clientId)
    .in('status', ['PENDING', 'MINTED'])
    .order('created_at', { ascending: true });

  if (error) throw error;

  const allocations = [];
  let remainingPayment = paymentAmount;

  for (const invoice of openInvoices || []) {
    if (remainingPayment <= 0) break;

    const invoiceOriginal = Number(invoice.original_amount ?? invoice.amount ?? 0);
    const invoiceRemaining = Number(invoice.remaining_amount ?? invoice.amount ?? 0);
    if (invoiceRemaining <= 0) continue;

    const appliedAmount = Math.min(invoiceRemaining, remainingPayment);
    const nextPaidAmount = Number(invoice.paid_amount || 0) + appliedAmount;
    const nextRemainingAmount = Math.max(invoiceRemaining - appliedAmount, 0);
    const nextStatus = nextRemainingAmount === 0 ? 'SETTLED' : invoice.status;

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        original_amount: invoiceOriginal,
        paid_amount: nextPaidAmount,
        remaining_amount: nextRemainingAmount,
        status: nextStatus,
        settled_at: nextRemainingAmount === 0 ? new Date().toISOString() : null
      })
      .eq('business_id', businessId)
      .eq('id', invoice.id)
      .select('id, status, original_amount, paid_amount, remaining_amount, nft_token_id, due_date')
      .single();

    if (updateError) throw updateError;

    allocations.push({
      invoiceId: invoice.id,
      appliedAmount,
      remainingAmount: nextRemainingAmount,
      recoveredAmount: nextPaidAmount,
      status: nextStatus,
      hasMintedNFT: Boolean(invoice.nft_token_id),
      dueDate: invoice.due_date,
      updatedInvoice
    });

    remainingPayment -= appliedAmount;
  }

  return {
    allocations,
    unallocatedAmount: remainingPayment
  };
}

async function handleUpdateStock(action: ActionUnit, businessId: string) {
  if (!action.items || action.items.length === 0) {
    return { error: 'No items to update' };
  }

  const updates = [];
  for (const item of action.items) {
    const { data: existingItem } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('business_id', businessId)
      .ilike('item_name', item.name)
      .maybeSingle();

    const newQty = (Number(existingItem?.quantity) || 0) + Number(item.qty || 0);

    const { data, error } = await supabase
      .from('inventory')
      .upsert({
        business_id: businessId,
        item_name: item.name,
        quantity: newQty,
        unit: item.unit || 'kg',
        low_stock_threshold: 10
      }, { onConflict: 'business_id,item_name' })
      .select()
      .single();

    if (!error && data) updates.push(data);
  }

  return { updatedItems: updates, count: updates.length };
}

async function handleMarkPaid(action: ActionUnit, businessId: string) {
  if (!action.clientName) return { error: 'Client name not provided' };

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .ilike('name', `%${action.clientName}%`)
    .single();

  if (clientError || !client) return { error: `Client "${action.clientName}" not found` };

  const paymentAmount = action.paymentAmount || Number(client.total_outstanding);

  if (paymentAmount <= 0) return { error: 'Payment amount must be greater than zero' };
  if (paymentAmount > Number(client.total_outstanding)) {
    return { error: `Payment ₹${paymentAmount} exceeds outstanding balance ₹${client.total_outstanding}` };
  }

  await supabase.from('transactions').insert({
    business_id: businessId,
    client_id: client.id,
    type: 'PAYMENT',
    amount: paymentAmount,
    status: 'PAID'
  });

  const invoiceAllocation = await applyPaymentToInvoices(client.id, businessId, paymentAmount);

  await supabase.rpc('decrement_client_balance', {
    p_client_id: client.id,
    p_amount: paymentAmount
  });

  const remainingBalance = Math.max(Number(client.total_outstanding) - paymentAmount, 0);
  const { data: updatedClient } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', client.id)
    .single();

  return {
    settled: remainingBalance === 0,
    amount: paymentAmount,
    clientName: client.name,
    clientId: client.id,
    remainingBalance,
    recoveredAmount: paymentAmount,
    statement: {
      recoveredAmount: paymentAmount,
      remainingBalance,
      invoices: invoiceAllocation.allocations,
      unallocatedAmount: invoiceAllocation.unallocatedAmount
    },
    client: updatedClient
  };
}

async function handleQueryLedger(action: ActionUnit, businessId: string) {
  const filters = action.filters || {};

  // Specific client query
  if (action.clientName) {
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .ilike('name', `%${action.clientName}%`)
      .single();

    if (error) return { error: `Client "${action.clientName}" not found` };

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return { client, transactions: transactions || [] };
  }

  // Aggregate query with filters
  let query = supabase
    .from('clients')
    .select('id, name, total_outstanding, updated_at')
    .eq('business_id', businessId);

  if (filters.minOutstanding !== null && filters.minOutstanding !== undefined) {
    query = query.gte('total_outstanding', filters.minOutstanding);
  }
  if (filters.maxOutstanding !== null && filters.maxOutstanding !== undefined) {
    query = query.lte('total_outstanding', filters.maxOutstanding);
  }

  query = query.gt('total_outstanding', 0).order('total_outstanding', { ascending: false });

  const { data: clients, error } = await query;
  if (error) throw error;

  // Filter by last payment date if requested
  let filteredClients = clients || [];
  if (filters.daysSinceLastPayment !== null && filters.daysSinceLastPayment !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filters.daysSinceLastPayment);

    const { data: recentPayors } = await supabase
      .from('transactions')
      .select('client_id')
      .eq('business_id', businessId)
      .eq('type', 'PAYMENT')
      .gte('created_at', cutoff.toISOString());

    const recentPayorIds = new Set((recentPayors || []).map(t => t.client_id));
    filteredClients = filteredClients.filter(c => !recentPayorIds.has(c.id));
  }

  const totalOutstanding = filteredClients.reduce(
    (sum, c) => sum + Number(c.total_outstanding || 0), 0
  );

  return {
    summary: {
      totalOutstanding,
      totalClients: filteredClients.length,
      clients: filteredClients,
      filters
    }
  };
}

async function handleQueryStock(action: ActionUnit, businessId: string) {
  const filters = action.filters || {};

  let query = supabase
    .from('inventory')
    .select('*')
    .eq('business_id', businessId);

  if (filters.itemName) {
    query = query.ilike('item_name', `%${filters.itemName}%`);
  }

  const { data: inventory, error } = await query.order('item_name');
  if (error) throw error;

  let items = inventory || [];

  if (filters.lowStockOnly) {
    items = items.filter(item => Number(item.quantity) <= Number(item.low_stock_threshold || 10));
  }

  return {
    items,
    totalItems: items.length,
    lowStockItems: items.filter(i => Number(i.quantity) <= Number(i.low_stock_threshold || 10))
  };
}

async function handleGenerateReport(action: ActionUnit, businessId: string) {
  const filters = action.filters || {};
  const today = new Date().toISOString().split('T')[0];
  const dateFrom = filters.dateFrom || today;
  const dateTo = filters.dateTo || today;

  const { data: sales } = await supabase
    .from('transactions')
    .select('amount, created_at, clients:client_id(name)')
    .eq('business_id', businessId)
    .eq('type', 'SALE')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`);

  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, created_at, clients:client_id(name)')
    .eq('business_id', businessId)
    .eq('type', 'PAYMENT')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`);

  const totalSales = (sales || []).reduce((s, t) => s + Number(t.amount), 0);
  const totalPayments = (payments || []).reduce((s, t) => s + Number(t.amount), 0);

  // Top clients by sales
  const clientSales: Record<string, number> = {};
  (sales || []).forEach((t: any) => {
    const name = t.clients?.name || 'Unknown';
    clientSales[name] = (clientSales[name] || 0) + Number(t.amount);
  });

  const topClients = Object.entries(clientSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  return {
    period: { from: dateFrom, to: dateTo },
    totalSales,
    totalPaymentsReceived: totalPayments,
    netOutstanding: totalSales - totalPayments,
    transactionCount: (sales || []).length,
    topClients
  };
}

async function handleGenerateInvoice(action: ActionUnit, businessId: string) {
  if (!action.clientName) return { error: 'Client name required for invoice' };

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .ilike('name', `%${action.clientName}%`)
    .single();

  if (!client) return { error: `Client "${action.clientName}" not found` };

  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .eq('client_id', client.id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  return {
    client,
    invoices: pendingInvoices || [],
    totalPending: (pendingInvoices || []).reduce((s, i) => s + Number(i.remaining_amount ?? i.amount), 0)
  };
}

// ─── Response builder ──────────────────────────────────────────────────────
function buildFinalResponse(
  parsed: ParsedCommand,
  actionResults: Array<{ action: ActionUnit; result: any }>,
  originalMessage: string
): string {
  // If any result has an error, surface it
  const errors = actionResults.filter(r => r.result?.error).map(r => r.result.error);
  if (errors.length > 0) {
    return errors.map(toHinglishError).join(' | ');
  }

  // For single action, use rich response
  if (actionResults.length === 1) {
    return buildSingleActionResponse(actionResults[0].action, actionResults[0].result, parsed.response);
  }

  // For multi-action, build a combined summary
  const lines = actionResults.map(({ action, result }) =>
    buildSingleActionResponse(action, result, '')
  ).filter(Boolean);

  return lines.join('\n') || parsed.response;
}

function buildSingleActionResponse(action: ActionUnit, result: any, fallback: string): string {
  if (!result) return fallback;
  if (result.error) return toHinglishError(result.error);

  switch (action.intent) {
    case 'ADD_SALE': {
      const name = result.client?.name || action.clientName || 'client';
      const amount = formatInr(action.totalAmount || 0);
      const newBalance = formatInr(result.client?.total_outstanding || 0);
      const items = (action.items || []).length;
      return `${name} ka ₹${amount} udhar add ho gaya${items > 1 ? ` (${items} items)` : ''}. Naya balance: ₹${newBalance}.`;
    }
    case 'MARK_PAID': {
      const name = result.clientName || action.clientName || 'client';
      const amount = formatInr(result.recoveredAmount || result.amount || 0);
      const remaining = formatInr(result.remainingBalance || 0);
      const settled = result.settled ? ' ✅ Full balance clear!' : '';
      const invoiceNote = result.statement?.invoices?.length
        ? ` Recovered: ₹${amount}. Remaining balance: ₹${remaining}.`
        : '';
      return `${name} ki ₹${amount} payment record ho gayi. Baaki balance: ₹${remaining}.${settled}${invoiceNote}`;
    }
    case 'UPDATE_STOCK': {
      const count = result.updatedItems?.length || 0;
      const names = (result.updatedItems || []).slice(0, 3).map((i: any) => i.item_name).join(', ');
      return `Inventory update: ${count} item${count !== 1 ? 's' : ''} save kiye — ${names}.`;
    }
    case 'QUERY_LEDGER': {
      if (result.summary) {
        const total = formatInr(result.summary.totalOutstanding);
        const count = result.summary.totalClients;
        if (count === 0) return 'Koi outstanding balance nahi hai.';
        const top = (result.summary.clients || []).slice(0, 3)
          .map((c: any) => `${c.name}: ₹${formatInr(c.total_outstanding)}`)
          .join(', ');
        return `${count} client${count > 1 ? 's' : ''} se total ₹${total} lena hai. Top: ${top}.`;
      }
      if (result.client) {
        return `${result.client.name} se ₹${formatInr(result.client.total_outstanding)} lena hai. Recent entries: ${result.transactions?.length || 0}.`;
      }
      return fallback;
    }
    case 'QUERY_STOCK': {
      const items = result.items || [];
      if (items.length === 0) return 'Koi item nahi mila.';
      if (result.totalItems === 1) {
        const item = items[0];
        return `${item.item_name}: ${item.quantity} ${item.unit} available hai.`;
      }
      const low = result.lowStockItems?.length || 0;
      const summary = items.slice(0, 3).map((i: any) => `${i.item_name}: ${i.quantity}${i.unit}`).join(', ');
      return `${items.length} items found. ${low > 0 ? `⚠️ ${low} low stock. ` : ''}${summary}${items.length > 3 ? ' ...' : ''}.`;
    }
    case 'GENERATE_REPORT': {
      const { totalSales, totalPaymentsReceived, transactionCount, topClients } = result;
      const period = result.period?.from === result.period?.to ? 'aaj' : `${result.period?.from} to ${result.period?.to}`;
      const top = (topClients || []).slice(0, 2).map((c: any) => `${c.name} ₹${formatInr(c.amount)}`).join(', ');
      return `${period} ki report: ₹${formatInr(totalSales)} sales (${transactionCount} transactions), ₹${formatInr(totalPaymentsReceived)} received. Top: ${top || 'none'}.`;
    }
    case 'GENERATE_INVOICE': {
      const count = result.invoices?.length || 0;
      if (count === 0) return `${result.client?.name} ke liye koi pending invoice nahi hai.`;
      return `${result.client?.name} ke ${count} pending invoice${count > 1 ? 's' : ''} hain. Total: ₹${formatInr(result.totalPending)}.`;
    }
    default:
      return fallback;
  }
}

function toHinglishError(error: string): string {
  if (error.includes('not found')) return 'Client nahi mila. Naam dobara check karo.';
  if (error.includes('exceeds outstanding')) return 'Payment outstanding se zyada hai. Amount check karo.';
  if (error.includes('name not provided')) return 'Client ka naam batao.';
  return error;
}

function formatInr(value: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default router;
