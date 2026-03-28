import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchJson } from '../lib/api';

export const useAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { conversationHistory, addMessage } = useAppStore();

  const sendMessage = async (message) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

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
            .slice(-10)
            .map((entry) => ({
              role: entry.role,
              content: entry.content
            }))
        })
      });

      addMessage({
        role: 'ai',
        content: data.action?.response || 'Done!',
        action: data.action,
        dbResult: data.dbResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Agent error:', error);
      addMessage({
        role: 'ai',
        content: `Error: ${error.message}. Make sure the backend is running on port 8001.`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading };
};
