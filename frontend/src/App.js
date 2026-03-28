import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/sonner';
import { AppShell } from './components/layout/AppShell';
import ChatPage from './pages/ChatPage';
import LedgerPage from './pages/LedgerPage';
import InventoryPage from './pages/InventoryPage';
import InvoicesPage from './pages/InvoicesPage';
import ChainPage from './pages/ChainPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="App">
          <AppShell>
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/ledger" element={<LedgerPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/chain" element={<ChainPage />} />
            </Routes>
          </AppShell>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1D27',
                color: '#E2E8F0',
                border: '3px solid #2A2D3A'
              }
            }}
          />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;