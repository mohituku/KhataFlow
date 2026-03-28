import { TrendingUp, AlertCircle, Wallet, Users } from 'lucide-react';
import { formatCurrency, mockStats } from '../../lib/mockData';

const stats = [
  {
    label: 'Total Revenue',
    value: mockStats.totalRevenue,
    icon: TrendingUp,
    color: 'accent',
    testId: 'stat-revenue'
  },
  {
    label: 'Pending Amount',
    value: mockStats.pendingAmount,
    icon: AlertCircle,
    color: 'warning',
    testId: 'stat-pending'
  },
  {
    label: 'Active NFTs',
    value: mockStats.activeNFTs,
    icon: Wallet,
    color: 'chain',
    testId: 'stat-nfts'
  },
  {
    label: 'Total Clients',
    value: mockStats.totalClients,
    icon: Users,
    color: 'text',
    testId: 'stat-clients'
  }
];

export const StatCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stat-cards">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const colorClass = `text-khata-${stat.color}`;

        return (
          <div
            key={stat.label}
            data-testid={stat.testId}
            className="bg-khata-surface border-[3px] border-khata-border p-6 hover:-translate-y-1 hover:border-khata-accent hover:comic-shadow-accent transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-12 h-12 bg-khata-bg border-[3px] border-khata-${stat.color} flex items-center justify-center`}
              >
                <Icon className={`w-6 h-6 ${colorClass}`} />
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.15em] text-khata-muted mb-2 font-bold">
              {stat.label}
            </p>
            <p className={`text-4xl font-heading ${colorClass}`}>
              {typeof stat.value === 'number' && stat.label.toLowerCase().includes('amount') || stat.label.toLowerCase().includes('revenue')
                ? formatCurrency(stat.value)
                : stat.value}
            </p>
          </div>
        );
      })}
    </div>
  );
};