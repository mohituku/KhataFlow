import { ethers } from 'ethers';
import { ActionUnit, ParsedCommand } from '../types';
import { supabase } from './supabase';
import { notifyClient, notifyAdmin } from './notifications';

export type ExecutedActionResult = { action: ActionUnit; result: any };

type PaymentSourceConfig = {
  businessId: string;
  client: any;
  paymentAmount: number;
  type?: 'CASH' | 'ON_CHAIN';
  chainStatus?: string | null;
  notes?: string | null;
  notificationTitle?: string;
  notificationBody?: (remainingBalance: number) => string;
  adminTitle?: string;
  adminBody?: (remainingBalance: number) => string;
};

type SaleSourceConfig = {
  businessId: string;
  client: any;
  totalAmount: number;
  items?: any[];
  notes?: string | null;
  decrementInventory?: boolean;
  notificationTitle?: string;
  notificationBody?: (updatedClient: any) => string;
  adminTitle?: string;
  adminBody?: (updatedClient: any) => string;
  notifyAdminOnSale?: boolean;
};

export async function executeActions(
  actions: ActionUnit[],
  businessId: string
): Promise<ExecutedActionResult[]> {
  const results: ExecutedActionResult[] = [];

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

export function buildFinalResponse(
  parsed: ParsedCommand,
  actionResults: ExecutedActionResult[]
): string {
  const errors = actionResults.filter((entry) => entry.result?.error).map((entry) => entry.result.error);
  if (errors.length > 0) {
    return errors.map(toHinglishError).join(' | ');
  }

  if (actionResults.length === 1) {
    return buildSingleActionResponse(actionResults[0].action, actionResults[0].result, parsed.response);
  }

  const lines = actionResults
    .map(({ action, result }) => buildSingleActionResponse(action, result, ''))
    .filter(Boolean);

  return lines.join('\n') || parsed.response;
}

export async function confirmOnChainPayment(
  clientId: string,
  txHash: string,
  amountPaid: string,
  tokenSymbol: 'USDC' | 'FLOW'
) {
  const provider = new ethers.JsonRpcProvider(
    process.env.FLOW_EVM_RPC || 'https://testnet.evm.nodes.onflow.org'
  );
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt || receipt.status !== 1) {
    throw new Error('Transaction not confirmed on-chain');
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, business_id, total_outstanding')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    throw new Error('Client not found');
  }

  const { data: existingPayment } = await supabase
    .from('on_chain_payments')
    .select('id, client_id, business_id, amount_inr, status')
    .eq('tx_hash', txHash)
    .maybeSingle();

  if (existingPayment) {
    if (existingPayment.client_id !== clientId || existingPayment.business_id !== client.business_id) {
      const error: any = new Error('tx_hash already used for another client');
      error.statusCode = 409;
      throw error;
    }

    return {
      success: true,
      duplicate: true,
      txHash,
      amountPaid: Number(existingPayment.amount_inr || 0),
      tokenSymbol
    };
  }

  const amountInr = Number(client.total_outstanding || 0);
  if (amountInr <= 0) {
    return {
      success: true,
      duplicate: false,
      txHash,
      amountPaid: 0,
      tokenSymbol,
      message: 'No outstanding balance to settle'
    };
  }

  const { error: insertError } = await supabase.from('on_chain_payments').insert({
    business_id: client.business_id,
    client_id: clientId,
    tx_hash: txHash,
    amount_inr: amountInr,
    token_symbol: tokenSymbol,
    token_amount: amountPaid,
    chain: 'flow-evm-testnet',
    status: 'CONFIRMED',
    from_address: receipt.from,
    to_address: receipt.to,
    block_number: receipt.blockNumber,
    confirmed_at: new Date().toISOString()
  });

  if (insertError) {
    throw insertError;
  }

  const paymentResult = await recordPayment({
    businessId: client.business_id,
    client,
    paymentAmount: amountInr,
    type: 'ON_CHAIN',
    chainStatus: 'ON_CHAIN',
    notes: `x402 payment: ${txHash} (${tokenSymbol})`,
    notificationTitle: 'Payment Confirmed!',
    notificationBody: () =>
      `✅ Your payment of ₹${amountInr} via ${tokenSymbol} has been confirmed on Flow blockchain.\n\nTx: ${txHash.slice(0, 20)}...`,
    adminTitle: 'On-Chain Payment Received',
    adminBody: () =>
      `${client.name} paid ₹${amountInr} via ${tokenSymbol}. Transaction confirmed on Flow EVM.`
  });

  return {
    success: true,
    duplicate: false,
    txHash,
    amountPaid: amountInr,
    tokenSymbol,
    client: paymentResult.client,
    remainingBalance: paymentResult.remainingBalance
  };
}

export async function recordSale(config: SaleSourceConfig) {
  const {
    businessId,
    client,
    totalAmount,
    items = [],
    notes = null,
    decrementInventory = false,
    notificationTitle = 'New Purchase Added',
    notificationBody = (updatedClient) =>
      `₹${totalAmount} has been added to your account. Total outstanding: ₹${updatedClient?.total_outstanding || 0}.`,
    adminTitle = 'New Sale Recorded',
    adminBody = (updatedClient) =>
      `${client.name} added ₹${totalAmount} to ledger. Outstanding: ₹${updatedClient?.total_outstanding || 0}.`,
    notifyAdminOnSale = false
  } = config;

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      business_id: businessId,
      client_id: client.id,
      type: 'SALE',
      amount: totalAmount,
      items,
      status: 'PENDING',
      notes
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
      original_amount: totalAmount,
      paid_amount: 0,
      remaining_amount: totalAmount,
      items,
      status: 'PENDING'
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  if (decrementInventory) {
    for (const item of items) {
      if (!item?.id || !item?.qty) continue;

      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({
          quantity: Math.max(Number(item.remainingQuantity ?? 0), 0)
        })
        .eq('business_id', businessId)
        .eq('id', item.id);

      if (inventoryError) throw inventoryError;
    }
  }

  await supabase.rpc('increment_client_balance', {
    p_client_id: client.id,
    p_amount: totalAmount
  });

  const { data: updatedClient, error: updatedClientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', client.id)
    .single();

  if (updatedClientError || !updatedClient) {
    throw updatedClientError || new Error('Failed to refresh client after sale');
  }

  await notifyClient(
    client.id,
    'PAYMENT_DUE',
    notificationTitle,
    notificationBody(updatedClient)
  );

  if (notifyAdminOnSale) {
    await notifyAdmin(
      businessId,
      'PAYMENT_DUE',
      adminTitle,
      adminBody(updatedClient)
    );
  }

  return { client: updatedClient, transaction: txn, invoice };
}

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

  return recordSale({
    businessId,
    client,
    totalAmount,
    items: action.items || []
  });
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
      tokenId: invoice.nft_token_id || null,
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

async function recordPayment(config: PaymentSourceConfig) {
  const {
    businessId,
    client,
    paymentAmount,
    type = 'CASH',
    chainStatus = null,
    notes = null,
    notificationTitle = 'Payment Recorded',
    notificationBody = (remainingBalance) =>
      `₹${paymentAmount} payment received. Remaining balance: ₹${remainingBalance}.`,
    adminTitle = 'Payment Received',
    adminBody = (remainingBalance) =>
      `${client.name} paid ₹${paymentAmount}. Remaining: ₹${remainingBalance}.`
  } = config;

  const { error: transactionError } = await supabase.from('transactions').insert({
    business_id: businessId,
    client_id: client.id,
    type: 'PAYMENT',
    amount: paymentAmount,
    status: 'PAID',
    chain_status: chainStatus,
    notes
  });

  if (transactionError) throw transactionError;

  const invoiceAllocation = await applyPaymentToInvoices(client.id, businessId, paymentAmount);

  await supabase.rpc('decrement_client_balance', {
    p_client_id: client.id,
    p_amount: paymentAmount
  });

  const { data: updatedClient, error: updatedClientError } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', client.id)
    .single();

  if (updatedClientError || !updatedClient) {
    throw updatedClientError || new Error('Failed to refresh client after payment');
  }

  const remainingBalance = Number(updatedClient.total_outstanding || 0);
  const settledInvoices = invoiceAllocation.allocations.filter(
    (allocation) => allocation.status === 'SETTLED'
  );
  const settledMintedInvoices = settledInvoices.filter(
    (allocation) => allocation.hasMintedNFT
  );

  await notifyClient(
    client.id,
    type === 'ON_CHAIN' ? 'PAYMENT_CONFIRMED_CHAIN' : 'PAYMENT_RECEIVED',
    notificationTitle,
    notificationBody(remainingBalance)
  );

  await notifyAdmin(
    businessId,
    'PAYMENT_RECEIVED',
    adminTitle,
    adminBody(remainingBalance)
  );

  if (settledInvoices.length > 0) {
    const invoiceSummary = settledInvoices
      .map((allocation) => `${allocation.invoiceId} (₹${allocation.recoveredAmount})`)
      .join(', ');

    await notifyAdmin(
      businessId,
      'PAYMENT_RECEIVED',
      'Invoice Recovered',
      `${client.name} settled ${settledInvoices.length} invoice(s): ${invoiceSummary}.`
    );
  }

  if (settledMintedInvoices.length > 0) {
    const nftSummary = settledMintedInvoices
      .map((allocation) => `Invoice ${allocation.invoiceId}${allocation.tokenId ? ` / NFT #${allocation.tokenId}` : ''}`)
      .join(', ');

    await notifyClient(
      client.id,
      'NFT_SETTLED',
      'Debt Record Settled',
      `Your NFT-backed khata is marked settled for ${nftSummary}.`
    );

    await notifyAdmin(
      businessId,
      'NFT_SETTLED',
      'NFT Debt Settled',
      `${client.name} fully paid ${nftSummary}. Recovered amount is now reflected in invoices.`
    );
  }

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
      settledInvoices,
      settledMintedInvoices,
      unallocatedAmount: invoiceAllocation.unallocatedAmount
    },
    client: updatedClient
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

  const lowStockItems = updates.filter(
    (item) => Number(item.quantity) <= Number(item.low_stock_threshold || 10)
  );

  if (lowStockItems.length > 0) {
    await notifyAdmin(
      businessId,
      'LOW_STOCK',
      'Low Stock Alert',
      `${lowStockItems.map((item) => item.item_name).join(', ')} ${lowStockItems.length > 1 ? 'are' : 'is'} running low.`
    );
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

  return recordPayment({
    businessId,
    client,
    paymentAmount
  });
}

async function handleQueryLedger(action: ActionUnit, businessId: string) {
  const filters = action.filters || {};

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

    const recentPayorIds = new Set((recentPayors || []).map((entry) => entry.client_id));
    filteredClients = filteredClients.filter((entry) => !recentPayorIds.has(entry.id));
  }

  const totalOutstanding = filteredClients.reduce(
    (sum, entry) => sum + Number(entry.total_outstanding || 0), 0
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
    items = items.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold || 10));
  }

  return {
    items,
    totalItems: items.length,
    lowStockItems: items.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold || 10))
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

  const totalSales = (sales || []).reduce((sum, txn) => sum + Number(txn.amount), 0);
  const totalPayments = (payments || []).reduce((sum, txn) => sum + Number(txn.amount), 0);

  const clientSales: Record<string, number> = {};
  (sales || []).forEach((txn: any) => {
    const name = txn.clients?.name || 'Unknown';
    clientSales[name] = (clientSales[name] || 0) + Number(txn.amount);
  });

  const topClients = Object.entries(clientSales)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
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
    totalPending: (pendingInvoices || []).reduce(
      (sum, invoice) => sum + Number(invoice.remaining_amount ?? invoice.amount),
      0
    )
  };
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
      const names = (result.updatedItems || []).slice(0, 3).map((item: any) => item.item_name).join(', ');
      return `Inventory update: ${count} item${count !== 1 ? 's' : ''} save kiye — ${names}.`;
    }
    case 'QUERY_LEDGER': {
      if (result.summary) {
        const total = formatInr(result.summary.totalOutstanding);
        const count = result.summary.totalClients;
        if (count === 0) return 'Koi outstanding balance nahi hai.';
        const top = (result.summary.clients || []).slice(0, 3)
          .map((entry: any) => `${entry.name}: ₹${formatInr(entry.total_outstanding)}`)
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
      const summary = items.slice(0, 3).map((item: any) => `${item.item_name}: ${item.quantity}${item.unit}`).join(', ');
      return `${items.length} items found. ${low > 0 ? `⚠️ ${low} low stock. ` : ''}${summary}${items.length > 3 ? ' ...' : ''}.`;
    }
    case 'GENERATE_REPORT': {
      const { totalSales, totalPaymentsReceived, transactionCount, topClients } = result;
      const period = result.period?.from === result.period?.to ? 'aaj' : `${result.period?.from} to ${result.period?.to}`;
      const top = (topClients || []).slice(0, 2).map((entry: any) => `${entry.name} ₹${formatInr(entry.amount)}`).join(', ');
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
