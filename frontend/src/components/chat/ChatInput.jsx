import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAgent } from '../../hooks/useAgent';

export const ChatInput = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, isLoading } = useAgent();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      sendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-khata-surface border-t-[3px] border-khata-border">
      <div className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          data-testid="chat-input-field"
          className="
            flex-1 px-4 py-3
            bg-khata-bg text-khata-text
            border-[3px] border-khata-border
            focus:border-khata-accent focus:outline-none
            placeholder:text-khata-muted
            disabled:opacity-50 disabled:cursor-not-allowed
            font-body
            transition-colors duration-200
          "
        />
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          data-testid="send-message-btn"
          className="
            clip-angled-sm
            px-6 py-3
            bg-khata-accent text-khata-bg
            font-bold uppercase tracking-wider
            border-[3px] border-khata-bg
            hover:scale-[1.02] transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2
          "
          style={{
            boxShadow: !message.trim() || isLoading ? 'none' : '0 0 15px rgba(0, 208, 132, 0.5)'
          }}
        >
          <Send className="w-5 h-5" />
          Send
        </button>
      </div>
    </form>
  );
};