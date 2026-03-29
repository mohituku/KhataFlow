import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain';
import { supabase } from '../services/supabase';
import { z } from 'zod';
import { getBusinessId } from '../middleware/businessId';

const router = Router();

// Record NFT mint transaction
const recordMintSchema = z.object({
  txHash: z.string().min(1),
  tokenId: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
  clientName: z.string().optional(),
  amount: z.number().optional(),
  dueDate: z.string().optional()
});

router.post('/record-mint', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const mintData = recordMintSchema.parse(req.body);

    // Verify transaction on blockchain
    const isValid = await blockchainService.verifyTransaction(mintData.txHash);

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Transaction failed or not found on blockchain'
      });
      return;
    }

    // Get transaction details
    const txDetails = await blockchainService.getTransactionDetails(mintData.txHash);

    // Update invoice if provided
    if (mintData.invoiceId) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'MINTED',
          nft_token_id: mintData.tokenId,
          nft_tx_hash: mintData.txHash,
          chain: 'flow-evm-testnet',
          due_date: mintData.dueDate || null
        })
        .eq('business_id', businessId)
        .eq('id', mintData.invoiceId);

      if (updateError) {
        throw updateError;
      }
    }

    res.json({
      success: true,
      verified: true,
      txHash: mintData.txHash,
      explorerUrl: blockchainService.getExplorerUrl(mintData.txHash),
      details: txDetails
    });
  } catch (error: any) {
    console.error('Record mint error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

const settleSchema = z.object({
  tokenId: z.string().min(1),
  invoiceId: z.string().uuid().optional()
});

router.post('/settle', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const { tokenId, invoiceId } = settleSchema.parse(req.body);

    let query = supabase
      .from('invoices')
      .update({ status: 'SETTLED' })
      .eq('business_id', businessId)
      .eq('nft_token_id', tokenId);

    if (invoiceId) {
      query = query.eq('id', invoiceId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      invoice: data
    });
  } catch (error: any) {
    console.error('Settle NFT error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to settle NFT' });
  }
});

// Get NFT token details
router.get('/token/:tokenId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const { tokenId } = req.params;
    const tokenIdStr = Array.isArray(tokenId) ? tokenId[0] : tokenId;

    const onChainRecord = await blockchainService.getDebtRecord(tokenIdStr);

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients:client_id (
          name
        )
      `)
      .eq('business_id', businessId)
      .eq('nft_token_id', tokenIdStr)
      .single();

    if (error) {
      res.json({
        success: true,
        nft: {
          tokenId: parseInt(tokenIdStr),
          status: onChainRecord?.settled ? 'SETTLED' : 'ACTIVE',
          contractAddress: blockchainService.getContractAddress(),
          debtRecord: onChainRecord
        }
      });
      return;
    }

    res.json({
      success: true,
      nft: {
        tokenId: parseInt(tokenIdStr),
        clientName: (data as any).clients?.name,
        amount: data.amount,
        status: onChainRecord?.settled ? 'SETTLED' : data.status === 'MINTED' ? 'ACTIVE' : 'PENDING',
        invoiceId: data.id,
        contractAddress: blockchainService.getContractAddress(),
        txHash: (data as any).nft_tx_hash,
        dueDate: (data as any).due_date,
        debtRecord: onChainRecord
      }
    });
  } catch (error: any) {
    console.error('Get token error:', error);
    res.status(404).json({ success: false, error: 'Token not found' });
  }
});

// Get transaction status
router.get('/tx/:txHash', async (req: Request, res: Response): Promise<void> => {
  try {
    const { txHash } = req.params;
    const txHashStr = Array.isArray(txHash) ? txHash[0] : txHash;

    const details = await blockchainService.getTransactionDetails(txHashStr);

    if (!details) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
      return;
    }

    res.json({
      success: true,
      transaction: details,
      explorerUrl: blockchainService.getExplorerUrl(txHashStr)
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
