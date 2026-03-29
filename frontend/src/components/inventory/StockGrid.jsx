import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Package as PackageIcon, Plus, Trash2 } from 'lucide-react';
import { fetchJson } from '../../lib/api';
import { toast } from 'sonner';

const initialForm = {
  item_name: '',
  quantity: '',
  unit: 'kg',
  low_stock_threshold: '10'
};

export const StockGrid = () => {
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadInventory = async () => {
    try {
      const data = await fetchJson('/api/inventory');
      setInventory(data.inventory || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory', {
        description: error.message
      });
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleAddItem = async (event) => {
    event.preventDefault();

    if (!form.item_name.trim()) {
      toast.error('Item name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await fetchJson('/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          item_name: form.item_name.trim(),
          quantity: Number(form.quantity || 0),
          unit: form.unit.trim() || 'kg',
          low_stock_threshold: Number(form.low_stock_threshold || 10)
        })
      });

      toast.success('Inventory item saved');
      setForm(initialForm);
      await loadInventory();
    } catch (error) {
      console.error('Failed to save inventory item:', error);
      toast.error('Failed to save inventory item', {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item) => {
    const confirmed = window.confirm(`Delete ${item.item_name} from inventory?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);

    try {
      await fetchJson(`/api/inventory/${item.id}`, {
        method: 'DELETE'
      });

      toast.success(`${item.item_name} removed from inventory`);
      await loadInventory();
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      toast.error('Failed to delete inventory item', {
        description: error.message
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="stock-grid">
      <form
        onSubmit={handleAddItem}
        className="bg-khata-surface border-[3px] border-khata-border p-6 space-y-4"
        data-testid="inventory-form"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-heading uppercase tracking-wider text-khata-text">
              Manage Inventory
            </h3>
            <p className="text-sm text-khata-muted mt-1">Add new stock items or update existing ones.</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="inventory-save-btn"
            className="
              clip-angled-sm
              flex items-center gap-2 px-5 py-3
              bg-khata-accent text-khata-bg
              font-bold uppercase tracking-wider
              border-[3px] border-khata-bg
              hover:scale-[1.02] transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            style={{
              boxShadow: isSubmitting ? 'none' : '0 0 15px rgba(0, 208, 132, 0.5)'
            }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isSubmitting ? 'Saving...' : 'Save Item'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-khata-muted font-bold">Item Name</span>
            <input
              name="item_name"
              value={form.item_name}
              onChange={handleChange}
              placeholder="Rice"
              className="mt-2 w-full px-4 py-3 bg-khata-bg text-khata-text border-[3px] border-khata-border focus:border-khata-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-khata-muted font-bold">Quantity</span>
            <input
              name="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={handleChange}
              placeholder="50"
              className="mt-2 w-full px-4 py-3 bg-khata-bg text-khata-text border-[3px] border-khata-border focus:border-khata-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-khata-muted font-bold">Unit</span>
            <input
              name="unit"
              value={form.unit}
              onChange={handleChange}
              placeholder="kg"
              className="mt-2 w-full px-4 py-3 bg-khata-bg text-khata-text border-[3px] border-khata-border focus:border-khata-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-khata-muted font-bold">Low Stock Alert</span>
            <input
              name="low_stock_threshold"
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={handleChange}
              placeholder="10"
              className="mt-2 w-full px-4 py-3 bg-khata-bg text-khata-text border-[3px] border-khata-border focus:border-khata-accent focus:outline-none"
            />
          </label>
        </div>
      </form>

      {inventory.length === 0 ? (
        <div className="bg-khata-surface border-[3px] border-khata-border p-8 text-center text-khata-muted">
          No inventory items yet. Add your first item above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="flex items-start justify-between mb-4 gap-4">
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
                <div className="flex items-center gap-2">
                  {item.lowStock && (
                    <span className="px-2 py-1 bg-khata-warning text-khata-bg text-xs font-bold uppercase tracking-wider">
                      Low
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item)}
                    disabled={deletingId === item.id}
                    data-testid={`delete-stock-item-${item.id}`}
                    className="
                      px-3 py-2
                      bg-transparent text-khata-text
                      border-[2px] border-khata-border
                      hover:border-khata-danger hover:text-khata-danger
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-heading text-khata-text mb-2">{item.item_name}</h3>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-3xl font-heading text-khata-accent">{Number(item.quantity || 0)}</p>
                <p className="text-sm text-khata-muted uppercase tracking-wider">{item.unit}</p>
              </div>
              <p className="text-xs uppercase tracking-wider text-khata-muted">
                Low stock threshold: {Number(item.low_stock_threshold || 0)} {item.unit}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
