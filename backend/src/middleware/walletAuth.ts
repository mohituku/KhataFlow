import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { supabase } from '../services/supabase';

export interface AuthRequest extends Request {
  businessId: string;
  walletAddress: string;
}

// Cache wallet → businessId for 5 minutes to avoid DB on every request
const walletCache = new Map<string, { businessId: string; exp: number }>();

function isPublicPath(path: string) {
  const clientPortalPathPattern = /^\/api\/client\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}(?:\/confirm-payment)?$/;

  if (path === '/health' || path.startsWith('/health/')) {
    return true;
  }

  if (path.startsWith('/api/client/lookup/')) {
    return true;
  }

  if (clientPortalPathPattern.test(path)) {
    return true;
  }

  if (path.startsWith('/api/payment/x402/')) {
    return true;
  }

  if (path.startsWith('/api/payment/on-chain/')) {
    return true;
  }

  if (path.startsWith('/api/qr/client/')) {
    return true;
  }

  return false;
}

export async function walletAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isPublicPath(req.path)) {
    return next();
  }

  const walletAddress = req.headers['x-wallet-address'] as string;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Wallet not connected. Connect MetaMask to continue.' 
    });
  }

  const normalizedWallet = walletAddress.toLowerCase();

  // Check cache
  const cached = walletCache.get(normalizedWallet);
  if (cached && cached.exp > Date.now()) {
    (req as AuthRequest).businessId = cached.businessId;
    (req as AuthRequest).walletAddress = normalizedWallet;
    return next();
  }

  try {
    // Look up or create business record
    let { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id')
      .eq('wallet_address', normalizedWallet)
      .maybeSingle();

    if (fetchError) {
      console.error('Database error in walletAuth:', fetchError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (!business) {
      const shopName = `Shop ${normalizedWallet.slice(0, 6)}`;
      const { error: upsertError } = await supabase
        .from('businesses')
        .upsert({
          wallet_address: normalizedWallet,
          name: shopName
        }, { onConflict: 'wallet_address' });

      if (upsertError) {
        console.error('Failed to create business:', upsertError);
        return res.status(500).json({ success: false, error: 'Failed to create business record' });
      }

      const { data: createdBusiness, error: createdBusinessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('wallet_address', normalizedWallet)
        .single();

      if (createdBusinessError || !createdBusiness) {
        console.error('Failed to fetch business after create:', createdBusinessError);
        return res.status(500).json({ success: false, error: 'Failed to load business record' });
      }

      business = createdBusiness;
    }

    // Cache for 5 minutes
    walletCache.set(normalizedWallet, { 
      businessId: business.id, 
      exp: Date.now() + 5 * 60 * 1000 
    });

    (req as AuthRequest).businessId = business.id;
    (req as AuthRequest).walletAddress = normalizedWallet;
    next();
  } catch (error: any) {
    console.error('Wallet auth error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export function getBusinessId(req: Request): string {
  return (req as AuthRequest).businessId;
}

export function getWalletAddress(req: Request): string {
  return (req as AuthRequest).walletAddress;
}
