import { create } from 'zustand';

export const useAppStore = create((set) => ({
  conversationHistory: [],
  dashboardRefreshKey: 0,
  
  addMessage: (message) => set((state) => ({
    conversationHistory: [...state.conversationHistory, message]
  })),

  triggerDashboardRefresh: () => set((state) => ({
    dashboardRefreshKey: state.dashboardRefreshKey + 1
  })),
  
  clearConversation: () => set({ conversationHistory: [] })
}));
