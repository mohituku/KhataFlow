import { supabase } from './supabase';

// Import bots dynamically to avoid circular dependency
let adminBotInstance: any = null;
let clientBotInstance: any = null;

export function setTelegramBots(adminBot: any, clientBot: any) {
  adminBotInstance = adminBot;
  clientBotInstance = clientBot;
}

export type NotificationType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_DUE'
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_DELIVERED'
  | 'LOW_STOCK'
  | 'NFT_MINTED'
  | 'NFT_SETTLED'
  | 'PAYMENT_CONFIRMED_CHAIN'
  | 'TELEGRAM_JOINED';

export async function notifyClient(
  clientId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('telegram_id, telegram_username, name, business_id')
      .eq('id', clientId)
      .single();

    if (!client) return;

    // 1. Store notification in DB
    await supabase.from('notifications').insert({
      business_id: client.business_id,
      client_id: clientId,
      type,
      title,
      body,
      channel: client.telegram_id ? 'TELEGRAM' : 'WEB',
      metadata,
      sent: !!client.telegram_id,
      sent_at: client.telegram_id ? new Date().toISOString() : null
    });

    // 2. Send via Telegram if linked
    if (client.telegram_id && clientBotInstance) {
      const icon = getNotificationIcon(type);

      await clientBotInstance.telegram.sendMessage(
        client.telegram_id,
        `${icon} *${title}*\n\n${body}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Error sending client notification:', error);
  }
}

export async function notifyAdmin(
  businessId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('telegram_admin_id')
      .eq('id', businessId)
      .single();

    if (!business) return;

    // Store notification
    await supabase.from('notifications').insert({
      business_id: businessId,
      type,
      title,
      body,
      channel: business.telegram_admin_id ? 'TELEGRAM' : 'WEB',
      metadata,
      sent: !!business.telegram_admin_id,
      sent_at: business.telegram_admin_id ? new Date().toISOString() : null
    });

    if (business.telegram_admin_id && adminBotInstance) {
      const icon = getNotificationIcon(type);
      
      await adminBotInstance.telegram.sendMessage(
        business.telegram_admin_id,
        `${icon} *${title}*\n\n${body}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

function getNotificationIcon(type: NotificationType): string {
  const icons = {
    PAYMENT_RECEIVED: '✅',
    PAYMENT_DUE: '⚠️',
    ORDER_PLACED: '📦',
    ORDER_CONFIRMED: '✅',
    ORDER_DELIVERED: '🚚',
    LOW_STOCK: '⚠️',
    NFT_MINTED: '🔗',
    NFT_SETTLED: '✅',
    PAYMENT_CONFIRMED_CHAIN: '💳',
    TELEGRAM_JOINED: '👋'
  };
  return icons[type] || 'ℹ️';
}
