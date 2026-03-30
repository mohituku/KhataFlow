import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Package, Wallet, DollarSign, ShoppingCart, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fetchJson } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';

const iconMap = {
  payment: DollarSign,
  nft: Wallet,
  inventory: Package,
  sale: ShoppingCart
};

const colorMap = {
  payment: 'accent',
  nft: 'chain',
  inventory: 'warning',
  sale: 'text'
};

export const ActivityFeed = () => {
  const dashboardRefreshKey = useAppStore((state) => state.dashboardRefreshKey);
  const [activity, setActivity] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const data = await fetchJson('/api/ledger/activity');
      if (data?.success) {
        setActivity(data.activity || []);
      }
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsRefreshing(true);

    fetchJson('/api/ledger/activity')
      .then((data) => {
        if (isMounted && data?.success) {
          setActivity(data.activity || []);
        }
      })
      .catch((error) => {
        console.error('Failed to load activity:', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dashboardRefreshKey]);

  return (
    <div className="bg-khata-surface border-[3px] border-khata-border" data-testid="activity-feed">
      <div className="p-6 border-b-[3px] border-khata-border flex items-center justify-between gap-3">
        <h3 className="text-xl font-heading uppercase tracking-wider">Recent Activity</h3>
        <button
          onClick={loadActivity}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-[2px] border-khata-border text-khata-muted hover:border-khata-accent hover:text-khata-accent transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <div className="divide-y divide-khata-border">
        {activity.length === 0 ? (
          <div className="p-6 text-sm text-khata-muted" data-testid="activity-empty-state">
            No recent activity found.
          </div>
        ) : (
          activity.map((entry) => {
            const Icon = iconMap[entry.type] || ArrowUpRight;
            const color = colorMap[entry.type] || 'text';

            return (
              <div
                key={entry.id}
                className="p-4 hover:bg-khata-bg/50 transition-colors duration-200"
                data-testid={`activity-item-${entry.id}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 bg-khata-bg border-[2px] border-khata-${color} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-5 h-5 text-khata-${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-khata-text">{entry.message}</p>
                    <p className="text-xs text-khata-muted mt-1 tracking-wider">
                      {entry.timestamp
                        ? formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })
                        : 'just now'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
