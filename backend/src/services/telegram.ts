import { Telegraf, Markup, Context } from 'telegraf';
import type { Request, Response, NextFunction } from 'express';
import { message } from 'telegraf/filters';
import { geminiService } from './gemini';
import { supabase } from './supabase';
import { notifyClient, notifyAdmin } from './notifications';
import { buildFinalResponse, executeActions, recordSale } from './commandExecution';
import { getClientAccessUrls } from './signedLinks';

// Admin Bot — shopkeeper interface
export const adminBot = new Telegraf(process.env.TELEGRAM_ADMIN_BOT_TOKEN || 'dummy-token');

// Client Bot — customer interface
export const clientBot = new Telegraf(process.env.TELEGRAM_CLIENT_BOT_TOKEN || 'dummy-token');

let telegramTransportInitPromise: Promise<void> | null = null;

function getBackendUrl() {
  return (process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
}

function isPublicHttpsUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function ensureWebhook(bot: Telegraf, targetUrl: string, label: string) {
  const info = await bot.telegram.getWebhookInfo();
  if (info.url === targetUrl) {
    console.log(`✅ Telegram ${label} webhook already configured`);
    return;
  }

  await bot.telegram.setWebhook(targetUrl);
  console.log(`✅ Telegram ${label} webhook configured: ${targetUrl}`);
}

function getPublicFrontendUrl() {
  const frontendUrl = (process.env.FRONTEND_URL || '').trim();

  if (!frontendUrl) {
    return null;
  }

  try {
    const parsed = new URL(frontendUrl);
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function isLocalOnlyUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function parseQuantityInput(input: string) {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) {
    return null;
  }

  return {
    quantity: Number(match[1]),
    unit: match[2] || null
  };
}

// ============================================
// ADMIN BOT HANDLERS
// ============================================

adminBot.start(async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const startParam = ctx.startPayload;

  // Check if linking a business
  if (startParam && startParam.startsWith('admin_')) {
    const businessId = startParam.replace('admin_', '');
    
    // Link this telegram account to the business
    const { data, error } = await supabase
      .from('businesses')
      .update({ 
        telegram_admin_id: telegramId,
        telegram_admin_username: ctx.from!.username || ''
      })
      .eq('id', businessId)
      .select('name')
      .single();

    if (error || !data) {
      await ctx.reply('❌ Failed to link account. Please try again from the dashboard.');
      return;
    }

    await ctx.reply(
      `✅ *Linked to: ${data.name}*\n\n` +
      `You can now manage your business via Telegram!\n\n` +
      `Send commands like:\n` +
      `• "Ramesh ne 5kg aloo liya 200 baaki"\n` +
      `• "Suresh ne 500 de diye"\n` +
      `• "Low stock dikhao"\n` +
      `• "Aaj ki report"`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Check if already linked
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('telegram_admin_id', telegramId)
    .maybeSingle();

  if (!business) {
    const publicFrontendUrl = getPublicFrontendUrl();
    const message =
      '🏪 *Welcome to KhataFlow Admin Bot!*\n\n' +
      'You are not linked to a business yet.\n' +
      'Open your KhataFlow dashboard and connect Telegram in Settings.';

    if (publicFrontendUrl) {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[
          Markup.button.url('Open Dashboard', publicFrontendUrl)
        ]])
      });
    } else {
      await ctx.reply(
        `${message}\n\nTelegram cannot open a localhost URL button, so use your browser to open the dashboard directly.`,
        { parse_mode: 'Markdown' }
      );
    }
    return;
  }

  await ctx.reply(
    `✅ *Linked to: ${business.name}*\n\n` +
    `Send any business command:\n` +
    `• "Ramesh ne 5kg aloo liya 200 baaki"\n` +
    `• "Suresh ne 500 de diye"\n` +
    `• "Low stock dikhao"\n` +
    `• "Aaj ki report"`,
    { parse_mode: 'Markdown' }
  );
});

adminBot.on(message('text'), async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const messageText = ctx.message.text;

  if (messageText.startsWith('/')) {
    await ctx.reply(
      'This is the shopkeeper admin bot.\n\n' +
      'Client commands like /orders, /pay, /balance, and /history only work in the client bot after the customer scans their QR code.'
    );
    return;
  }

  // Resolve business from telegram admin ID
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('telegram_admin_id', telegramId)
    .maybeSingle();

  if (!business) {
    await ctx.reply('❌ Not linked to a business. Open KhataFlow dashboard first.');
    return;
  }

  try {
    const parsed = await geminiService.parseCommand(messageText, []);
    const actionResults = await executeActions(parsed.actions || [], business.id);
    const responseText = buildFinalResponse(parsed, actionResults) || parsed.response || 'Command received but no actions identified.';

    await ctx.reply(responseText, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error('Admin bot error:', error);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

// ============================================
// CLIENT BOT HANDLERS
// ============================================

clientBot.start(async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const startParam = ctx.startPayload; // clientId passed via QR deeplink

  if (startParam) {
    // Client registered via QR code — link their telegram ID
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, business_id, total_outstanding')
      .eq('id', startParam)
      .maybeSingle();

    if (error || !client) {
      await ctx.reply('❌ Invalid QR code. Please ask your shopkeeper for a new one.');
      return;
    }

    // Link telegram account
    await supabase
      .from('clients')
      .update({ 
        telegram_id: telegramId,
        telegram_username: ctx.from!.username || '',
        telegram_linked_at: new Date().toISOString()
      })
      .eq('id', client.id);

    await notifyClient(
      client.id,
      'TELEGRAM_JOINED',
      'Welcome to KhataFlow!',
      `Your account is now linked to Telegram.`
    );

    await ctx.reply(
      `🙏 *Namaste, ${client.name}!*\n\n` +
      `Your account is now linked.\n\n` +
      `Outstanding: *₹${client.total_outstanding}*\n\n` +
      `Commands:\n` +
      `/balance — Check outstanding\n` +
      `/orders — Browse available items\n` +
      `/history — Your purchase history\n` +
      `/pay — Notify a payment`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Check if already linked
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, total_outstanding')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!client) {
    await ctx.reply('Welcome to KhataFlow! Ask your shopkeeper to share your account QR code.');
    return;
  }

  await ctx.reply(
    `🙏 *Namaste, ${client.name}!*\n\n` +
    `Outstanding: *₹${client.total_outstanding}*\n\n` +
    `Commands:\n` +
    `/balance — Check outstanding\n` +
    `/orders — Browse available items\n` +
    `/history — Your purchase history\n` +
    `/pay — Notify a payment`,
    { parse_mode: 'Markdown' }
  );
});

clientBot.command('balance', async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);
  
  if (!client) {
    return ctx.reply('❌ Account not linked. Ask your shopkeeper for the QR code.');
  }

  await ctx.reply(
    `📊 *Your Account*\n\n` +
    `Outstanding: *₹${client.total_outstanding}*\n` +
    `Last updated: ${new Date(client.updated_at).toLocaleDateString('en-IN')}`,
    { parse_mode: 'Markdown' }
  );
});

clientBot.command('orders', async (ctx: any) => {
  try {
    const telegramId = String(ctx.from!.id);
    const client = await getClientByTelegramId(telegramId);
    
    if (!client) {
      return ctx.reply('❌ Account not linked. Ask your shopkeeper to share your client QR first.');
    }

    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, item_name, quantity, unit, price_per_unit')
      .eq('business_id', client.business_id)
      .gt('quantity', 0)
      .order('item_name');

    if (!inventory || inventory.length === 0) {
      return ctx.reply('No items available right now.');
    }

    const itemList = inventory
      .slice(0, 8)
      .map((item: any, i: number) =>
        `${i + 1}. *${item.item_name}* — ${item.quantity}${item.unit} available` +
        (Number(item.price_per_unit || 0) > 0
          ? ` @ ₹${item.price_per_unit}/${item.unit}`
          : ' _(price not set)_')
      )
      .join('\n');

    const keyboard = inventory.slice(0, 8).map((item: any) => ([
      Markup.button.callback(
        `Order ${item.item_name}`.slice(0, 30),
        `ORDER:${item.id}`
      )
    ]));

    await ctx.reply(
      `🛒 *Available Items*\n\n${itemList}\n\nTap an item to order:`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) }
    );
  } catch (error: any) {
    console.error('Client /orders error:', error);
    await ctx.reply(`❌ Could not load orders right now: ${error.message}`);
  }
});

clientBot.action(/ORDER:(.+)/, async (ctx: any) => {
  const [, inventoryId] = ctx.match;
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);

  if (!client) {
    return ctx.answerCbQuery('Client not found');
  }

  const { data: item, error: itemError } = await supabase
    .from('inventory')
    .select('id, business_id, item_name, quantity, unit, price_per_unit')
    .eq('id', inventoryId)
    .eq('business_id', client.business_id)
    .single();

  if (itemError || !item) {
    return ctx.answerCbQuery('Item not found');
  }

  if (Number(item.quantity || 0) <= 0) {
    return ctx.answerCbQuery('Item is out of stock');
  }

  if (Number(item.price_per_unit || 0) <= 0) {
    await ctx.answerCbQuery('Shopkeeper has not set a price for this item yet');
    await ctx.reply(
      `❌ ${item.item_name} is not available for instant ordering yet because the price is not set.\nAsk the shopkeeper to add a price in Inventory first.`
    );
    return;
  }

  const { error: sessionError } = await supabase
    .from('telegram_sessions')
    .upsert({
      telegram_id: telegramId,
      client_id: client.id,
      business_id: client.business_id,
      state: 'AWAITING_ORDER_QUANTITY',
      pending_order: {
        inventoryId: item.id,
        itemName: item.item_name,
        defaultUnit: item.unit,
        pricePerUnit: Number(item.price_per_unit || 0),
        availableQuantity: Number(item.quantity || 0)
      },
      last_message_at: new Date().toISOString()
    }, { onConflict: 'telegram_id' });

  if (sessionError) {
    console.error('Save Telegram order session error:', sessionError);
    return ctx.answerCbQuery('Could not start order flow');
  }

  await ctx.editMessageText(
    `🛒 *${item.item_name}*\n\n` +
    `Available: ${item.quantity} ${item.unit}\n` +
    `${item.price_per_unit ? `Price: ₹${item.price_per_unit}/${item.unit}\n\n` : '\n'}` +
    `Reply with quantity to place your order.\n` +
    `Examples:\n` +
    `• \`2\`\n` +
    `• \`2 ${item.unit}\`\n` +
    `• \`5 packet\``,
    { parse_mode: 'Markdown' }
  );
  await ctx.answerCbQuery('Send quantity in chat');
});

clientBot.command('pay', async (ctx: any) => {
  try {
    const telegramId = String(ctx.from!.id);
    const client = await getClientByTelegramId(telegramId);
    
    if (!client) {
      return ctx.reply('❌ Account not linked. Ask your shopkeeper to share your client QR first.');
    }

    await ctx.reply(
      `💳 *Pay via KhataFlow*\n\n` +
      `Outstanding: ₹${client.total_outstanding}\n\n` +
      `Choose payment method:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💰 Pay with USDC (x402)', 'PAY_USDC')],
          [Markup.button.callback('🔵 Pay with FLOW token', 'PAY_FLOW')],
          [Markup.button.callback('✅ I paid in cash', 'PAY_CASH')],
        ])
      }
    );
  } catch (error: any) {
    console.error('Client /pay error:', error);
    await ctx.reply(`❌ Could not open payment options right now: ${error.message}`);
  }
});

clientBot.command('history', async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);
  
  if (!client) {
    return ctx.reply('❌ Account not linked.');
  }

  // Fetch last 10 transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, items, created_at, status')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!transactions || transactions.length === 0) {
    return ctx.reply('No transaction history found.');
  }

  const historyText = transactions
    .map((txn: any) => {
      const date = new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const icon = txn.type === 'SALE' ? '📦' : '💰';
      const normalizedItems = Array.isArray(txn.items)
        ? txn.items
        : typeof txn.items === 'string'
          ? JSON.parse(txn.items)
          : [];
      const items = normalizedItems.map((item: any) => item.itemName || item.name).filter(Boolean).join(', ');
      return `${icon} ${date} - ₹${txn.amount} ${items ? `(${items})` : ''} ${txn.status === 'PAID' ? '✅' : '⏳'}`;
    })
    .join('\n');

  await ctx.reply(
    `📜 *Recent Transactions*\n\n${historyText}`,
    { parse_mode: 'Markdown' }
  );
});

clientBot.on(message('text'), async (ctx: any, next: any) => {
  const messageText = (ctx.message?.text || '').trim();

  if (!messageText || messageText.startsWith('/')) {
    return next();
  }

  const telegramId = String(ctx.from!.id);
  const { data: session } = await supabase
    .from('telegram_sessions')
    .select('telegram_id, client_id, business_id, state, pending_order')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!session || session.state !== 'AWAITING_ORDER_QUANTITY' || !session.pending_order) {
    return next();
  }

  const parsed = parseQuantityInput(messageText);
  if (!parsed || parsed.quantity <= 0) {
    await ctx.reply(
      'Please reply with a valid quantity.\nExamples: `2`, `2 kg`, `5 packet`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const client = await getClientById(session.client_id);
  if (!client) {
    await ctx.reply('❌ Client account not found. Please re-link your Telegram account.');
    return;
  }

  const { data: item, error: itemError } = await supabase
    .from('inventory')
    .select('id, item_name, quantity, unit, price_per_unit')
    .eq('business_id', session.business_id)
    .eq('id', session.pending_order.inventoryId)
    .single();

  if (itemError || !item) {
    await ctx.reply('❌ That item is no longer available.');
    return;
  }

  const finalUnit = parsed.unit || session.pending_order.defaultUnit || item.unit;
  const availableQuantity = Number(item.quantity || 0);

  if (parsed.quantity > availableQuantity) {
    await ctx.reply(
      `Only ${availableQuantity} ${item.unit} of ${item.item_name} is available right now. Please send a smaller quantity.`
    );
    return;
  }

  const unitPrice = Number(item.price_per_unit || 0);
  if (unitPrice <= 0) {
    await supabase
      .from('telegram_sessions')
      .upsert({
        telegram_id: telegramId,
        client_id: client.id,
        business_id: client.business_id,
        state: 'IDLE',
        pending_order: {},
        last_message_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' });

    await ctx.reply('❌ This item does not have a valid price yet. Ask the shopkeeper to update inventory pricing.');
    return;
  }

  const estimatedAmount = Number(item.price_per_unit || 0) * parsed.quantity;
  const orderItems = [{
    id: item.id,
    name: item.item_name,
    qty: parsed.quantity,
    unit: finalUnit,
    price: unitPrice,
    remainingQuantity: Math.max(availableQuantity - parsed.quantity, 0)
  }];

  const saleResult = await recordSale({
    businessId: client.business_id,
    client,
    totalAmount: estimatedAmount,
    items: orderItems,
    notes: `Telegram order from @${ctx.from?.username || 'client'}`,
    decrementInventory: true
  });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      business_id: client.business_id,
      client_id: client.id,
      status: 'CONFIRMED',
      source: 'TELEGRAM',
      items: orderItems,
      total_amount: estimatedAmount,
      payment_method: 'PENDING',
      payment_status: 'UNPAID',
      notes: `Telegram order from @${ctx.from?.username || 'client'}`
    })
    .select('id, total_amount')
    .single();

  if (orderError || !order) {
    console.error('Create Telegram order error:', orderError);
    await ctx.reply('❌ Order was priced but could not be tracked. Please contact the shopkeeper.');
    return;
  }

  await supabase
    .from('telegram_sessions')
    .upsert({
      telegram_id: telegramId,
      client_id: client.id,
      business_id: client.business_id,
      state: 'IDLE',
      pending_order: {},
      last_message_at: new Date().toISOString()
    }, { onConflict: 'telegram_id' });

  await notifyAdmin(
    client.business_id,
    'ORDER_PLACED',
    'New Telegram Order',
    `${client.name} ordered ${parsed.quantity} ${finalUnit} of ${item.item_name} for ₹${estimatedAmount}. Outstanding is now ₹${saleResult.client.total_outstanding}.`
  );

  await ctx.reply(
    `✅ *Order placed!*\n\n` +
    `${item.item_name} x ${parsed.quantity} ${finalUnit} has been sent to your shopkeeper.\n` +
    `Added to your khata: ₹${estimatedAmount}\n` +
    `New outstanding: ₹${saleResult.client.total_outstanding}\n` +
    `Order ID: ${order.id}`,
    { parse_mode: 'Markdown' }
  );
});

// Handle payment method selection
clientBot.action('PAY_CASH', async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);
  
  if (!client) {
    return ctx.answerCbQuery('Client not found');
  }

  // Create payment confirmation record
  await supabase.from('payment_confirmations').insert({
    business_id: client.business_id,
    client_id: client.id,
    amount: client.total_outstanding,
    note: 'Cash payment via Telegram',
    status: 'PENDING_CONFIRMATION'
  });

  await notifyAdmin(
    client.business_id,
    'PAYMENT_RECEIVED',
    'Payment Notification',
    `${client.name} says they paid ₹${client.total_outstanding} in cash. Please confirm in the dashboard.`
  );

  await ctx.editMessageText(
    `✅ *Notification sent!*\n\n` +
    `Your shopkeeper has been notified about the ₹${client.total_outstanding} cash payment.\n` +
    `They will confirm it shortly.`,
    { parse_mode: 'Markdown' }
  );
  await ctx.answerCbQuery();
});

clientBot.action('PAY_USDC', async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);
  
  if (!client) {
    return ctx.answerCbQuery('Client not found');
  }

  const { paymentUrl } = getClientAccessUrls(client.business_id, client.id);

  if (isLocalOnlyUrl(paymentUrl)) {
    await ctx.editMessageText(
      `Pay ₹${client.total_outstanding} with USDC\n\n` +
      `Local development links cannot be opened as Telegram buttons.\n\n` +
      `Open this link on the same machine running KhataFlow:\n${paymentUrl}`
    );
    await ctx.answerCbQuery();
    return;
  }

  await ctx.editMessageText(
    `💳 *Pay ₹${client.total_outstanding} with USDC*\n\n` +
    `Tap the button below to pay on Flow EVM.\n` +
    `Funds go directly to the shopkeeper's wallet.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[
        Markup.button.url('Pay with USDC →', paymentUrl)
      ]])
    }
  );
  await ctx.answerCbQuery();
});

clientBot.action('PAY_FLOW', async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);
  
  if (!client) {
    return ctx.answerCbQuery('Client not found');
  }

  const { paymentUrl } = getClientAccessUrls(client.business_id, client.id);
  const flowPaymentUrl = `${paymentUrl}${paymentUrl.includes('?') ? '&' : '?'}tokenType=FLOW`;

  if (isLocalOnlyUrl(flowPaymentUrl)) {
    await ctx.editMessageText(
      `Pay ₹${client.total_outstanding} with FLOW\n\n` +
      `Local development links cannot be opened as Telegram buttons.\n\n` +
      `Open this link on the same machine running KhataFlow:\n${flowPaymentUrl}`
    );
    await ctx.answerCbQuery();
    return;
  }

  await ctx.editMessageText(
    `🔵 *Pay ₹${client.total_outstanding} with FLOW*\n\n` +
    `Tap the button below to pay on Flow EVM.\n` +
    `Funds go directly to the shopkeeper's wallet.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[
        Markup.button.url('Pay with FLOW →', flowPaymentUrl)
      ]])
    }
  );
  await ctx.answerCbQuery();
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getClientByTelegramId(telegramId: string) {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  return data;
}

async function getClientById(clientId: string) {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();
  return data;
}

// ============================================
// LAUNCH FUNCTION
// ============================================
export function getTelegramTransportStatus() {
  const configured = Boolean(
    process.env.TELEGRAM_ADMIN_BOT_TOKEN && process.env.TELEGRAM_CLIENT_BOT_TOKEN
  );
  const backendUrl = getBackendUrl();
  const isProduction = (process.env.NODE_ENV || 'development') === 'production';

  return {
    configured,
    mode: isProduction ? 'webhook' : 'polling',
    backendUrl,
    adminWebhookPath: '/api/telegram/admin/webhook',
    clientWebhookPath: '/api/telegram/client/webhook'
  };
}

async function launchTelegramPolling() {
  await adminBot.telegram.deleteWebhook();
  await clientBot.telegram.deleteWebhook();
  await adminBot.launch();
  await clientBot.launch();
  console.log('✅ Telegram bots launched successfully');
  console.log(`   - Admin Bot: @${process.env.TELEGRAM_ADMIN_BOT_USERNAME}`);
  console.log(`   - Client Bot: @${process.env.TELEGRAM_CLIENT_BOT_USERNAME}`);

  process.once('SIGINT', () => {
    adminBot.stop('SIGINT');
    clientBot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    adminBot.stop('SIGTERM');
    clientBot.stop('SIGTERM');
  });
}

async function registerTelegramWebhooks() {
  const backendUrl = getBackendUrl();
  if (!isPublicHttpsUrl(backendUrl)) {
    console.log('⚠️  BACKEND_URL is not a public HTTPS URL. Telegram webhooks were not configured.');
    return;
  }

  await ensureWebhook(
    adminBot,
    `${backendUrl}/api/telegram/admin/webhook`,
    'admin'
  );
  await ensureWebhook(
    clientBot,
    `${backendUrl}/api/telegram/client/webhook`,
    'client'
  );
}

export function initializeTelegramTransport() {
  if (telegramTransportInitPromise) {
    return telegramTransportInitPromise;
  }

  if (!process.env.TELEGRAM_ADMIN_BOT_TOKEN || !process.env.TELEGRAM_CLIENT_BOT_TOKEN) {
    console.log('⚠️  Telegram bot tokens not configured. Bots will not start.');
    telegramTransportInitPromise = Promise.resolve();
    return telegramTransportInitPromise;
  }

  const isProduction = (process.env.NODE_ENV || 'development') === 'production';
  telegramTransportInitPromise = (isProduction ? registerTelegramWebhooks() : launchTelegramPolling())
    .catch((error) => {
      console.error('❌ Failed to initialize Telegram transport:', error);
    });

  return telegramTransportInitPromise;
}

function createExpressWebhookHandler(bot: Telegraf) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await bot.handleUpdate(req.body, res);

      if (!res.headersSent) {
        res.status(200).json({ ok: true });
      }
    } catch (error) {
      next(error);
    }
  };
}

export const adminWebhookHandler = createExpressWebhookHandler(adminBot);
export const clientWebhookHandler = createExpressWebhookHandler(clientBot);
