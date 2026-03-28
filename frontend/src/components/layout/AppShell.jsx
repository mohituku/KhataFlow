import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell = ({ children }) => {
  return (
    <div className="flex h-screen bg-khata-bg" data-testid="app-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto tech-grid-bg">
          {children}
        </main>
      </div>
    </div>
  );
};