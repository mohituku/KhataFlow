import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/sonner';
import { AppShell } from './components/layout/AppShell';
import ChatPage from './pages/ChatPage';
import ClientsPage from './pages/ClientsPage';
import LedgerPage from './pages/LedgerPage';
import InventoryPage from './pages/InventoryPage';
import InvoicesPage from './pages/InvoicesPage';
import ChainPage from './pages/ChainPage';
import ClientPortalPage from './pages/ClientPortalPage';
import PaymentPage from './pages/PaymentPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function App() {
  const withShell = (element) => (
    <AppShell>{element}</AppShell>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/client/:businessId/:clientId" element={<ClientPortalPage />} />
            <Route path="/client/:clientId" element={<ClientPortalPage />} />
            <Route path="/pay/:clientId" element={<PaymentPage />} />
            <Route path="/" element={withShell(<ChatPage />)} />
            <Route path="/clients" element={withShell(<ClientsPage />)} />
            <Route path="/ledger" element={withShell(<LedgerPage />)} />
            <Route path="/inventory" element={withShell(<InventoryPage />)} />
            <Route path="/invoices" element={withShell(<InvoicesPage />)} />
            <Route path="/chain" element={withShell(<ChainPage />)} />
          </Routes>
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
