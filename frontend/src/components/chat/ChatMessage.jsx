import { User, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ActionConfirmCard } from './ActionConfirmCard';

export const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-4 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      data-testid={`chat-message-${message.role}`}
    >
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          border-[3px]
          ${
            isUser
              ? 'bg-khata-surface border-khata-border'
              : 'bg-khata-bg border-khata-accent'
          }
        `}
      >
        {isUser ? (
          <User className="w-5 h-5 text-khata-text" />
        ) : (
          <Bot className="w-5 h-5 text-khata-accent" />
        )}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div
          className={`
            p-4
            ${
              isUser
                ? 'bg-khata-surface border-[2px] border-khata-border rounded-tl-2xl rounded-bl-2xl rounded-tr-sm rounded-br-2xl'
                : 'bg-khata-bg border-l-[4px] border-khata-accent rounded-r-2xl'
            }
          `}
        >
          <p className="text-khata-text leading-relaxed">{message.content}</p>
        </div>

        {message.action && <ActionConfirmCard action={message.action} />}

        <span className="text-xs text-khata-muted tracking-wider">
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};