import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { addMessage } = useAppStore();

  const sendMessage = async (message) => {
    setIsLoading(true);
    
    addMessage({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => {
      const mockResponse = generateMockResponse(message);
      addMessage({
        role: 'ai',
        content: mockResponse.content,
        action: mockResponse.action,
        timestamp: new Date().toISOString()
      });
      setIsLoading(false);
    }, 1500);
  };

  return { sendMessage, isLoading };
};

function generateMockResponse(message) {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('ramesh') || lowerMsg.includes('udhaar')) {
    return {
      content: "I've recorded this transaction for Ramesh Kumar.",
      action: {
        type: 'confirm_transaction',
        data: {
          client: 'Ramesh Kumar',
          amount: 200,
          item: 'Aloo (5kg)',
          type: 'credit'
        }
      }
    };
  }
  
  if (lowerMsg.includes('stock') || lowerMsg.includes('inventory')) {
    return {
      content: "Here's your current inventory status. You have 3 items with low stock.",
      action: null
    };
  }
  
  if (lowerMsg.includes('payment') || lowerMsg.includes('paid')) {
    return {
      content: "Payment recorded! I'll update the ledger.",
      action: {
        type: 'payment_received',
        data: {
          client: 'Ramesh Kumar',
          amount: 500
        }
      }
    };
  }
  
  return {
    content: "I understand. How can I help you with your business today?",
    action: null
  };
}