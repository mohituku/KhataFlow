import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { getBusinessId } from '../middleware/walletAuth';
import { supabase } from '../services/supabase';
import { verifyClientAccessToken } from '../services/signedLinks';

const router = Router();

function extractClientAccessToken(req: Request) {
  const headerToken = req.headers['x-client-access-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

// Generate QR for a client to join the Telegram bot
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, business_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const token = extractClientAccessToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Signed client access token is required' });
    }

    verifyClientAccessToken(token, client.business_id, client.id);
    const botUsername = process.env.TELEGRAM_CLIENT_BOT_USERNAME || 'KhataFlowClientBot';

    // Telegram deeplink: t.me/BotName?start=clientId
    const telegramLink = `https://t.me/${botUsername}?start=${clientId}`;

    const qrDataUrl = await QRCode.toDataURL(telegramLink, {
      width: 400,
      margin: 2,
      color: { dark: '#00D084', light: '#0F1117' } // KhataFlow colors
    });

    res.json({ 
      success: true,
      qrDataUrl, 
      telegramLink, 
      clientId 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate QR for admin to link their Telegram admin access
router.get('/admin/link', async (req: Request, res: Response) => {
  try {
    const businessId = getBusinessId(req);
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, telegram_admin_id, telegram_admin_username')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    const botUsername = process.env.TELEGRAM_ADMIN_BOT_USERNAME || 'KhataFlowAdminBot';
    const telegramLink = `https://t.me/${botUsername}?start=admin_${businessId}`;
    
    const qrDataUrl = await QRCode.toDataURL(telegramLink, { 
      width: 400,
      margin: 2,
      color: { dark: '#00D084', light: '#0F1117' }
    });
    
    res.json({ 
      success: true,
      qrDataUrl, 
      telegramLink,
      businessId,
      businessName: business.name,
      botUsername,
      linked: Boolean(business.telegram_admin_id),
      linkedUsername: business.telegram_admin_username || null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
