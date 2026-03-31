import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchJson } from '../lib/api';

const CHAT_SESSION_STORAGE_KEY = 'khataflow-chat-session-id';
const MUTATING_INTENTS = new Set(['ADD_SALE', 'MARK_PAID', 'UPDATE_STOCK']);

export const useAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { conversationHistory, addMessage, triggerDashboardRefresh } = useAppStore();

  const sendMessage = async (message) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setIsLoading(true);

    const userMessage = {
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);

    try {
      const storedSessionId =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY)
          : null;
      const sessionId = storedSessionId || undefined;

      const data = await fetchJson('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmedMessage,
          sessionId,
          conversationHistory: [...conversationHistory, userMessage]
            .slice(-12)  // slightly more context
            .map((entry) => ({ role: entry.role, content: entry.content }))
        })
      });

      if (data.sessionId && typeof window !== 'undefined') {
        window.sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, data.sessionId);
      }

      const responseText =
        data.parsedCommand?.response ||
        data.action?.response ||
        'Done!';
      const actionResults = Array.isArray(data.actionResults) ? data.actionResults : [];
      const hasSuccessfulMutation = actionResults.some(({ action: currentAction, result }) =>
        MUTATING_INTENTS.has(currentAction?.intent) && result && !result.error
      );

      addMessage({
        role: 'ai',
        content: responseText,
        action: data.action,
        parsedCommand: data.parsedCommand,
        actionResults,
        dbResult: data.dbResult,
        timestamp: new Date().toISOString()
      });

      if (hasSuccessfulMutation) {
        triggerDashboardRefresh();
      }
    } catch (error) {
      console.error('Agent error:', error);
      addMessage({
        role: 'ai',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading };
};
