import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Users, Package, FileText, Coins, ScrollText } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Chat', icon: MessageSquare },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/ledger', label: 'Ledger', icon: ScrollText },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/chain', label: 'Chain', icon: Coins }
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-khata-surface border-r-[3px] border-khata-border flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b-[3px] border-khata-border">
        <h1 className="text-3xl font-heading uppercase tracking-wider text-glow-accent" data-testid="app-title">
          KhataFlow
        </h1>
        <p className="text-xs text-khata-muted mt-1 tracking-[0.1em]">AI LEDGER SYSTEM</p>
      </div>

      <nav className="flex-1 p-4 space-y-2" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`
                flex items-center gap-3 px-4 py-3 
                font-bold uppercase tracking-wider text-sm
                border-[3px] transition-all duration-300
                ${
                  isActive
                    ? 'bg-khata-accent text-khata-bg border-khata-bg comic-shadow-accent scale-[1.02]'
                    : 'bg-transparent text-khata-text border-khata-border hover:border-khata-accent hover:text-khata-accent hover:scale-[1.02]'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t-[3px] border-khata-border">
        <div className="text-xs text-khata-muted space-y-1">
          <p className="tracking-[0.05em]">VERSION 1.0</p>
          <p className="tracking-[0.05em]">FLOW EVM TESTNET</p>
        </div>
      </div>
    </aside>
  );
};
