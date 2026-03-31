import { useEffect, useState } from 'react';
import { Bot, ExternalLink, Link2, Loader2, QrCode, RefreshCcw } from 'lucide-react';
import { fetchJson } from '../../lib/api';
import { toast } from 'sonner';

export const TelegramAdminCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTelegramLink = async () => {
    setLoading(true);

    try {
      try {
        await fetchJson('/api/telegram/register-webhooks', {
          method: 'POST',
          body: JSON.stringify({})
        });
      } catch (telegramError) {
        console.error('Failed to register Telegram webhooks:', telegramError);
      }

      const payload = await fetchJson('/api/qr/admin/link');
      setData(payload);

      if (payload.telegramSetupError) {
        toast.error('Telegram setup needs attention', {
          description: payload.telegramSetupError
        });
      }
    } catch (error) {
      console.error('Failed to load Telegram admin QR:', error);
      toast.error('Failed to load Telegram admin access', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTelegramLink();
  }, []);

  const copyLink = async () => {
    if (!data?.telegramLink) return;

    try {
      await navigator.clipboard.writeText(data.telegramLink);
      toast.success('Telegram admin link copied');
    } catch (error) {
      toast.error('Failed to copy Telegram link');
    }
  };

  const startCommand = data?.telegramLink
    ? `/start ${new URL(data.telegramLink).searchParams.get('start') || ''}`
    : '';

  const copyStartCommand = async () => {
    if (!startCommand) return;

    try {
      await navigator.clipboard.writeText(startCommand);
      toast.success('Telegram start command copied');
    } catch (error) {
      toast.error('Failed to copy start command');
    }
  };

  return (
    <div className="bg-khata-surface border-[3px] border-khata-border p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-khata-muted mb-2">Telegram Admin</p>
          <h3 className="text-2xl font-heading uppercase tracking-wider text-khata-text">
            Link Shopkeeper Bot
          </h3>
        </div>
        <div className="w-12 h-12 bg-khata-bg border-[3px] border-khata-accent flex items-center justify-center">
          <Bot className="w-6 h-6 text-khata-accent" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-khata-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating Telegram link…</span>
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] border-[2px] ${
              data.linked
                ? 'bg-khata-accent/10 border-khata-accent text-khata-accent'
                : 'bg-khata-warning/10 border-khata-warning text-khata-warning'
            }`}>
              {data.linked ? `Linked${data.linkedUsername ? ` as @${data.linkedUsername}` : ''}` : 'Not linked yet'}
            </span>
            <span className="text-sm text-khata-muted">
              Bot: <span className="text-khata-text font-bold">@{data.botUsername}</span>
            </span>
            {data.telegram?.lastError && (
              <span className="text-sm text-khata-danger">
                Transport: {data.telegram.lastError}
              </span>
            )}
          </div>

          <p className="text-sm text-khata-muted">
            Scan this QR from Telegram on your phone, or open the deeplink directly. After Telegram opens,
            press <span className="text-khata-text font-bold">Start</span> once to link this dashboard.
          </p>

          <div className="bg-khata-bg border-[3px] border-khata-border p-4 flex flex-col items-center gap-4">
            {data.qrDataUrl ? (
              <img src={data.qrDataUrl} alt="Telegram admin link QR code" className="w-full max-w-[240px]" />
            ) : (
              <div className="w-full max-w-[240px] aspect-square border-[3px] border-dashed border-khata-border flex items-center justify-center text-khata-muted">
                <QrCode className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={data.telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-khata-accent text-khata-bg font-bold uppercase tracking-wider text-sm border-[3px] border-khata-bg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Bot
            </a>
            <button
              onClick={copyLink}
              className="px-4 py-3 bg-transparent text-khata-text font-bold uppercase tracking-wider text-sm border-[3px] border-khata-border hover:border-khata-accent hover:text-khata-accent transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={() => {
                void loadTelegramLink();
              }}
              className="px-4 py-3 bg-transparent text-khata-text font-bold uppercase tracking-wider text-sm border-[3px] border-khata-border hover:border-khata-accent hover:text-khata-accent transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="bg-khata-bg border-[3px] border-khata-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-khata-muted">Manual Fallback</p>
            <p className="text-sm text-khata-muted">
              If Telegram opens the bot but does not link after you press Start, send this exact command in the bot chat:
            </p>
            <div className="px-4 py-3 border-[2px] border-khata-border bg-khata-surface text-khata-text font-mono text-sm break-all">
              {startCommand || 'Start command unavailable'}
            </div>
            <button
              onClick={copyStartCommand}
              disabled={!startCommand}
              className="px-4 py-3 bg-transparent text-khata-text font-bold uppercase tracking-wider text-sm border-[3px] border-khata-border hover:border-khata-accent hover:text-khata-accent transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Link2 className="w-4 h-4" />
              Copy Start Command
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-khata-danger">Telegram admin access could not be loaded.</p>
      )}
    </div>
  );
};
