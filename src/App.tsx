import { Component, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LedgerProvider } from "@/lib/ledger/store";
import { useLedgerSync } from "@/lib/sync/ledgerSync";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Wallets from "@/pages/Wallets";
import Reports from "@/pages/Reports";
import Aetheris from "@/pages/Aetheris";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 40, fontFamily: "monospace" }}><h2>Something went wrong</h2><pre style={{ whiteSpace: "pre-wrap", color: "red" }}>{this.state.error.stack ?? this.state.error.message}</pre></div>;
    }
    return this.props.children;
  }
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/login" replace />;
}

/** Mirrors the ledger to the shared suite backend when signed in with a
 *  cloud account. Renders nothing; must live inside AuthProvider. */
function LedgerSyncMount() {
  useLedgerSync();
  return null;
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <LedgerProvider>
                <LedgerSyncMount />
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/wallets" element={<Wallets />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/aetheris" element={<Aetheris />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/about" element={<About />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </LedgerProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
