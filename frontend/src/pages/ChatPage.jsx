import { ChatInterface } from '../components/chat/ChatInterface';
import { StatCards } from '../components/dashboard/StatCards';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { PendingInvoices } from '../components/dashboard/PendingInvoices';

export default function ChatPage() {
  return (
    <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-6 p-6" data-testid="chat-page">
      <div className="lg:col-span-3 flex flex-col h-full min-h-0">
        <div className="mb-6">
          <h2 className="text-3xl font-heading uppercase tracking-wider text-khata-text mb-2">
            AI Assistant
          </h2>
          <p className="text-khata-muted">Chat with your business ledger AI</p>
        </div>
        <div className="flex-1 min-h-0 bg-khata-surface border-[3px] border-khata-border overflow-hidden flex flex-col">
          <ChatInterface />
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6 min-h-0 lg:overflow-y-auto lg:pr-1">
        <StatCards />
        <ActivityFeed />
        <PendingInvoices />
      </div>
    </div>
  );
}
