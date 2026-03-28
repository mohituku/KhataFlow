import { StockGrid } from '../components/inventory/StockGrid';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="p-6" data-testid="inventory-page">
      <div className="mb-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-khata-surface border-[3px] border-khata-accent flex items-center justify-center">
          <Package className="w-8 h-8 text-khata-accent" />
        </div>
        <div>
          <h2 className="text-4xl font-heading uppercase tracking-wider text-khata-text">
            Inventory
          </h2>
          <p className="text-khata-muted mt-1">Track your stock levels and manage inventory</p>
        </div>
      </div>
      <StockGrid />
    </div>
  );
}