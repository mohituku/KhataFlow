import { Telegraf, Markup, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { geminiService } from './gemini';
import { supabase } from './supabase';
import { notifyClient, notifyAdmin } from './notifications';
import { buildFinalResponse, executeActions } from './commandExecution';
import { getClientAccessUrls } from './signedLinks';

// Admin Bot — shopkeeper interface
export const adminBot = new Telegraf(process.env.TELEGRAM_ADMIN_BOT_TOKEN || 'dummy-token');

// Client Bot — customer interface
export const clientBot = new Telegraf(process.env.TELEGRAM_CLIENT_BOT_TOKEN || 'dummy-token');

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
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);
  
  if (!client) {
    return ctx.reply('❌ Account not linked.');
  }

  // Fetch available inventory from their shopkeeper
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
    .map((item: any, i: number) =>
      `${i + 1}. *${item.item_name}* — ${item.quantity}${item.unit} available` +
      (item.price_per_unit ? ` @ ₹${item.price_per_unit}/${item.unit}` : '')
    )
    .join('\n');

  const keyboard = inventory.slice(0, 8).map((item: any) => ([
    Markup.button.callback(
      `Order ${item.item_name}`,
      `ORDER:${item.id}:${client.id}`
    )
  ]));

  await ctx.reply(
    `🛒 *Available Items*\n\n${itemList}\n\nTap an item to order:`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) }
  );
});

clientBot.command('pay', async (ctx: any) => {
  const telegramId = String(ctx.from!.id);
  const client = await getClientByTelegramId(telegramId);
  
  if (!client) {
    return ctx.reply('❌ Account not linked.');
  }

  await ctx.reply(
    `💳 *Pay via KhataFlow*\n\n` +
    `Outstanding: ₹${client.total_outstanding}\n\n` +
    `Choose payment method:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💰 Pay with USDC (x402)', `PAY_USDC:${client.id}`)],
        [Markup.button.callback('🔵 Pay with FLOW token', `PAY_FLOW:${client.id}`)],
        [Markup.button.callback('✅ I paid in cash', `PAY_CASH:${client.id}`)],
      ])
    }
  );
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

// Handle payment method selection
clientBot.action(/PAY_CASH:(.+)/, async (ctx: any) => {
  const [, clientId] = ctx.match;
  const client = await getClientById(clientId);
  
  if (!client) {
    return ctx.answerCbQuery('Client not found');
  }

  // Create payment confirmation record
  await supabase.from('payment_confirmations').insert({
    business_id: client.business_id,
    client_id: clientId,
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

clientBot.action(/PAY_USDC:(.+)/, async (ctx: any) => {
  const [, clientId] = ctx.match;
  const client = await getClientById(clientId);
  
  if (!client) {
    return ctx.answerCbQuery('Client not found');
  }

  const { paymentUrl } = getClientAccessUrls(client.business_id, client.id);

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

clientBot.action(/PAY_FLOW:(.+)/, async (ctx: any) => {
  const [, clientId] = ctx.match;
  const client = await getClientById(clientId);
  
  if (!client) {
    return ctx.answerCbQuery('Client not found');
  }

  const { paymentUrl } = getClientAccessUrls(client.business_id, client.id);
  const flowPaymentUrl = `${paymentUrl}${paymentUrl.includes('?') ? '&' : '?'}tokenType=FLOW`;

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

export function launchTelegramBots() {
  if (!process.env.TELEGRAM_ADMIN_BOT_TOKEN || !process.env.TELEGRAM_CLIENT_BOT_TOKEN) {
    console.log('⚠️  Telegram bot tokens not configured. Bots will not start.');
    return;
  }

  try {
    adminBot.launch();
    clientBot.launch();
    console.log('✅ Telegram bots launched successfully');
    console.log(`   - Admin Bot: @${process.env.TELEGRAM_ADMIN_BOT_USERNAME}`);
    console.log(`   - Client Bot: @${process.env.TELEGRAM_CLIENT_BOT_USERNAME}`);
  } catch (error) {
    console.error('❌ Failed to launch Telegram bots:', error);
  }

  // Enable graceful stop
  process.once('SIGINT', () => {
    adminBot.stop('SIGINT');
    clientBot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    adminBot.stop('SIGTERM');
    clientBot.stop('SIGTERM');
  });
}
