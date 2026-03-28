import { useEffect, useState } from 'react';
import { AlertTriangle, Package as PackageIcon } from 'lucide-react';
import { fetchJson } from '../../lib/api';

export const StockGrid = () => {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    let isMounted = true;

    fetchJson('/api/inventory')
      .then((data) => {
        if (isMounted && data?.success) {
          setInventory(data.inventory || []);
        }
      })
      .catch((error) => {
        console.error('Failed to load inventory:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="stock-grid">
      {inventory.map((item) => (
        <div
          key={item.id}
          className={`
            bg-khata-surface border-[3px] p-6
            hover:-translate-y-1 transition-all duration-300
            ${
              item.lowStock
                ? 'border-khata-warning hover:comic-shadow-warning'
                : 'border-khata-border hover:border-khata-accent hover:comic-shadow-accent'
            }
          `}
          data-testid={`stock-item-${item.id}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className={`
                w-12 h-12 flex items-center justify-center border-[3px]
                ${
                  item.lowStock
                    ? 'bg-khata-warning/10 border-khata-warning'
                    : 'bg-khata-bg border-khata-accent'
                }
              `}
            >
              {item.lowStock ? (
                <AlertTriangle className="w-6 h-6 text-khata-warning" />
              ) : (
                <PackageIcon className="w-6 h-6 text-khata-accent" />
              )}
            </div>
            {item.lowStock && (
              <span className="px-2 py-1 bg-khata-warning text-khata-bg text-xs font-bold uppercase tracking-wider">
                Low
              </span>
            )}
          </div>
          <h3 className="text-xl font-heading text-khata-text mb-2">{item.item_name}</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-heading text-khata-accent">{Number(item.quantity || 0)}</p>
            <p className="text-sm text-khata-muted uppercase tracking-wider">{item.unit}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
