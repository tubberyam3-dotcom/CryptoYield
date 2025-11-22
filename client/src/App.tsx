import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Portfolios from "@/pages/Portfolios";
import Stocks from "@/pages/Stocks";
import StockDetail from "@/pages/StockDetail";
import Staking from "@/pages/Staking";
import Challenges from "@/pages/Challenges";
import TransactionHistory from "@/pages/TransactionHistory";
import Wallet from "@/pages/Wallet";
import Settings from "@/pages/Settings";
import DailyBonus from "@/pages/DailyBonus";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/useAdminAuth";

// Admin Router Component
function AdminRouter() {
  const { adminUser, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!adminUser ? (
        <Route path="/admin/*" component={AdminLogin} />
      ) : (
        <Route path="/admin/*" component={AdminDashboard} />
      )}
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Admin routes - separate authentication system */}
      <Route path="/admin/*">
        <AdminAuthProvider>
          <AdminRouter />
        </AdminAuthProvider>
      </Route>
      
      {/* Regular user routes */}
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/portfolios" component={Portfolios} />
          <Route path="/stocks" component={Stocks} />
          <Route path="/stocks/:symbol" component={StockDetail} />
          <Route path="/staking" component={Staking} />
          <Route path="/challenges" component={Challenges} />
          <Route path="/transactions" component={TransactionHistory} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/daily-bonus" component={DailyBonus} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
