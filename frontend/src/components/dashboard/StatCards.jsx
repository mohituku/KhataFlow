import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Wallet, Users } from 'lucide-react';
import { formatCurrency } from '../../lib/mockData';
import { fetchJson } from '../../lib/api';

export const StatCards = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOutstanding: 0,
    activeNFTs: 0,
    totalClients: 0
  });

  useEffect(() => {
    let isMounted = true;

    fetchJson('/api/ledger/summary')
      .then((data) => {
        if (!isMounted || !data?.success) {
          return;
        }

        setStats({
          totalRevenue: Number(data.summary?.totalRevenue || 0),
          totalOutstanding: Number(data.summary?.totalOutstanding || 0),
          activeNFTs: Number(data.summary?.activeNFTs || 0),
          totalClients: Number(data.summary?.totalClients || 0)
        });
      })
      .catch((error) => {
        console.error('Failed to load stats:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = [
    {
      label: 'Total Revenue',
      value: stats.totalRevenue,
      icon: TrendingUp,
      color: 'accent',
      testId: 'stat-revenue',
      isCurrency: true
    },
    {
      label: 'Pending Amount',
      value: stats.totalOutstanding,
      icon: AlertCircle,
      color: 'warning',
      testId: 'stat-pending',
      isCurrency: true
    },
    {
      label: 'Active NFTs',
      value: stats.activeNFTs,
      icon: Wallet,
      color: 'chain',
      testId: 'stat-nfts'
    },
    {
      label: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'text',
      testId: 'stat-clients'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stat-cards">
      {cards.map((stat) => {
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
              {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
            </p>
          </div>
        );
      })}
    </div>
  );
};
