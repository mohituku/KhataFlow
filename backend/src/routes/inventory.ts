import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { z } from 'zod';
import { getBusinessId } from '../middleware/walletAuth';

const router = Router();

// Get all inventory items
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);

    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('business_id', businessId)
      .order('item_name', { ascending: true });

    if (error) throw error;

    // Add low_stock flag
    const inventory = data?.map(item => ({
      ...item,
      lowStock: item.quantity <= (item.low_stock_threshold || 10)
    })) || [];

    res.json({ success: true, inventory });
  } catch (error: any) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add or update inventory item
const inventorySchema = z.object({
  item_name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  low_stock_threshold: z.number().optional().default(10)
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const itemData = inventorySchema.parse(req.body);

    const { data, error } = await supabase
      .from('inventory')
      .upsert({
        business_id: businessId,
        ...itemData
      }, {
        onConflict: 'business_id,item_name'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, item: data });
  } catch (error: any) {
    console.error('Add/update inventory error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update quantity
router.patch('/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
      res.status(400).json({ success: false, error: 'Invalid quantity' });
      return;
    }

    const { data, error } = await supabase
      .from('inventory')
      .update({ quantity })
      .eq('business_id', businessId)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, item: data });
  } catch (error: any) {
    console.error('Update inventory quantity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = getBusinessId(req);
    const { itemId } = req.params;

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('business_id', businessId)
      .eq('id', itemId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
