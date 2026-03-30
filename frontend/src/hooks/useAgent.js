import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchJson } from '../lib/api';

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
      const data = await fetchJson('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmedMessage,
          conversationHistory: [...conversationHistory, userMessage]
            .slice(-12)  // slightly more context
            .map((entry) => ({ role: entry.role, content: entry.content }))
        })
      });

      const responseText =
        data.parsedCommand?.response ||
        data.action?.response ||
        'Done!';

      addMessage({
        role: 'ai',
        content: responseText,
        action: data.action,
        parsedCommand: data.parsedCommand,
        actionResults: data.actionResults,
        dbResult: data.dbResult,
        timestamp: new Date().toISOString()
      });

      if (Array.isArray(data.actionResults) && data.actionResults.length > 0) {
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
