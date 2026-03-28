import { create } from 'zustand';

export const useAppStore = create((set) => ({
  conversationHistory: [],
  
  addMessage: (message) => set((state) => ({
    conversationHistory: [...state.conversationHistory, message]
  })),
  
  clearConversation: () => set({ conversationHistory: [] })
}));