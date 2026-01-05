import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import PendingApproval from "@/pages/PendingApproval";
import Portfolios from "@/pages/Portfolios";
import PortfolioDetail from "@/pages/PortfolioDetail";
import Stocks from "@/pages/Stocks";
import StockDetail from "@/pages/StockDetail";
import Staking from "@/pages/Staking";
import Challenges from "@/pages/Challenges";
import TransactionHistory from "@/pages/TransactionHistory";
import Wallet from "@/pages/Wallet";
import Deposit from "@/pages/Deposit";
import Withdrawal from "@/pages/Withdrawal";
import Settings from "@/pages/Settings";
import Rewards from "@/pages/Rewards";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import JoinAccount from "@/pages/JoinAccount";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/useAdminAuth";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

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

  if (!adminUser) {
    return <AdminLogin />;
  }
  
  return <AdminDashboard />;
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const isKycApproved = user?.kycStatus === 'approved' || user?.role === 'admin';

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
    <>
      <ScrollToTop />
      <Switch>
        {/* Admin routes - separate authentication system */}
        <Route path="/admin">
          <AdminAuthProvider>
            <AdminRouter />
          </AdminAuthProvider>
        </Route>
        <Route path="/admin/:rest*">
          <AdminAuthProvider>
            <AdminRouter />
          </AdminAuthProvider>
        </Route>
        
        {/* Joint account invite route - available to all users */}
        <Route path="/join/:joinCode" component={JoinAccount} />
        
        {/* Regular user routes */}
        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : !isKycApproved ? (
          <Route path="/" component={PendingApproval} />
        ) : (
          <>
            <Route path="/" component={Dashboard} />
            <Route path="/portfolios" component={Portfolios} />
            <Route path="/portfolios/:id" component={PortfolioDetail} />
            <Route path="/stocks" component={Stocks} />
            <Route path="/stocks/:symbol" component={StockDetail} />
            <Route path="/staking" component={Staking} />
            <Route path="/challenges" component={Challenges} />
            <Route path="/transactions" component={TransactionHistory} />
            <Route path="/wallet" component={Wallet} />
            <Route path="/deposit" component={Deposit} />
            <Route path="/withdrawal" component={Withdrawal} />
            <Route path="/rewards" component={Rewards} />
            <Route path="/settings" component={Settings} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </>
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
