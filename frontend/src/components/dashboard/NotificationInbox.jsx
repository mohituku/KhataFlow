import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  CreditCard,
  Link2,
  Loader2,
  MessageSquareMore,
  Package,
  RefreshCw,
  TriangleAlert
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fetchJson } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';

const iconMap = {
  PAYMENT_RECEIVED: CreditCard,
  PAYMENT_DUE: TriangleAlert,
  ORDER_PLACED: Package,
  ORDER_CONFIRMED: Package,
  ORDER_DELIVERED: Package,
  LOW_STOCK: TriangleAlert,
  NFT_MINTED: Link2,
  NFT_SETTLED: Link2,
  PAYMENT_CONFIRMED_CHAIN: CreditCard,
  TELEGRAM_JOINED: MessageSquareMore
};

const borderMap = {
  PAYMENT_RECEIVED: 'border-khata-accent text-khata-accent',
  PAYMENT_DUE: 'border-khata-warning text-khata-warning',
  ORDER_PLACED: 'border-khata-chain text-khata-chain',
  ORDER_CONFIRMED: 'border-khata-chain text-khata-chain',
  ORDER_DELIVERED: 'border-khata-chain text-khata-chain',
  LOW_STOCK: 'border-khata-warning text-khata-warning',
  NFT_MINTED: 'border-khata-chain text-khata-chain',
  NFT_SETTLED: 'border-khata-chain text-khata-chain',
  PAYMENT_CONFIRMED_CHAIN: 'border-khata-accent text-khata-accent',
  TELEGRAM_JOINED: 'border-khata-border text-khata-text'
};

export const NotificationInbox = () => {
  const dashboardRefreshKey = useAppStore((state) => state.dashboardRefreshKey);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const payload = await fetchJson('/api/ledger/notifications?limit=12');
      if (payload?.success) {
        setNotifications(payload.notifications || []);
        setUnreadCount(payload.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, dashboardRefreshKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    setIsMarkingRead(true);

    try {
      await fetchJson('/api/ledger/notifications/mark-all-read', {
        method: 'POST'
      });
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <div className="bg-khata-surface border-[3px] border-khata-border" data-testid="notification-inbox">
      <div className="p-6 border-b-[3px] border-khata-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 border-[2px] border-khata-accent bg-khata-bg flex items-center justify-center">
            <Bell className="w-5 h-5 text-khata-accent" />
          </div>
          <div>
            <h3 className="text-xl font-heading uppercase tracking-wider">Notifications</h3>
            <p className="text-xs uppercase tracking-[0.2em] text-khata-muted">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadNotifications}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-[2px] border-khata-border text-khata-muted hover:border-khata-accent hover:text-khata-accent transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingRead || unreadCount === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-[2px] border-khata-border text-khata-muted hover:border-khata-accent hover:text-khata-accent transition-all disabled:opacity-50"
          >
            {isMarkingRead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Mark Read
          </button>
        </div>
      </div>

      <div className="divide-y divide-khata-border max-h-[28rem] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-sm text-khata-muted">
            No admin notifications yet.
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = iconMap[notification.type] || Bell;
            const accentClasses = borderMap[notification.type] || 'border-khata-border text-khata-text';

            return (
              <div
                key={notification.id}
                className={`p-4 transition-colors ${notification.read ? 'bg-transparent' : 'bg-khata-bg/50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 bg-khata-bg border-[2px] ${accentClasses} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-khata-text">{notification.title}</p>
                        <p className="text-sm text-khata-muted mt-1">{notification.body}</p>
                      </div>
                      {!notification.read && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] bg-khata-accent text-khata-bg">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-3 text-xs uppercase tracking-[0.2em] text-khata-muted">
                      <span>
                        {notification.clients?.name ? `Client: ${notification.clients.name}` : notification.channel}
                      </span>
                      <span>
                        {notification.created_at
                          ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                          : 'just now'}
                      </span>
                    </div>
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
