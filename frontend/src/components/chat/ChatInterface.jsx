import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Bot } from 'lucide-react';

export const ChatInterface = () => {
  const { conversationHistory } = useAppStore();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-khata-bg" data-testid="chat-interface">
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {conversationHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center" data-testid="chat-empty-state">
            <div className="w-20 h-20 rounded-full bg-khata-surface border-[3px] border-khata-accent flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-khata-accent" />
            </div>
            <h3 className="text-2xl font-heading uppercase tracking-wider text-khata-text mb-2">
              Welcome to KhataFlow AI
            </h3>
            <p className="text-khata-muted max-w-md">
              I'm your AI assistant for managing your business ledger. You can record transactions,
              check inventory, generate invoices, and more.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-xl">
              {[
                'Ramesh ne 5kg aloo aur 3kg pyaaz liya, total 350 baaki',
                'Ramesh ne 200 diya aur Suresh ne 500 diya',
                '100kg rice aur 50kg wheat stock me add karo',
                'Total udhar mujhe kisskiss se lene hai?'
              ].map((example, i) => (
                <div
                  key={i}
                  className="p-3 bg-khata-surface border-[2px] border-khata-border hover:border-khata-accent transition-colors duration-200 cursor-pointer"
                >
                  <p className="text-sm text-khata-text">{example}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {conversationHistory.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <ChatInput />
    </div>
  );
};
