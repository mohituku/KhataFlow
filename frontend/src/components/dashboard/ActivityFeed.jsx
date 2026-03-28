import { ArrowUpRight, Package, Wallet, DollarSign } from 'lucide-react';
import { mockActivity } from '../../lib/mockData';

const iconMap = {
  payment: DollarSign,
  nft: Wallet,
  inventory: Package
};

const colorMap = {
  payment: 'accent',
  nft: 'chain',
  inventory: 'warning'
};

export const ActivityFeed = () => {
  return (
    <div className="bg-khata-surface border-[3px] border-khata-border" data-testid="activity-feed">
      <div className="p-6 border-b-[3px] border-khata-border">
        <h3 className="text-xl font-heading uppercase tracking-wider">Recent Activity</h3>
      </div>
      <div className="divide-y divide-khata-border">
        {mockActivity.map((activity) => {
          const Icon = iconMap[activity.type] || ArrowUpRight;
          const color = colorMap[activity.type] || 'text';

          return (
            <div
              key={activity.id}
              className="p-4 hover:bg-khata-bg/50 transition-colors duration-200"
              data-testid={`activity-item-${activity.id}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 bg-khata-bg border-[2px] border-khata-${color} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-5 h-5 text-khata-${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-khata-text">{activity.message}</p>
                  <p className="text-xs text-khata-muted mt-1 tracking-wider">{activity.time}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};