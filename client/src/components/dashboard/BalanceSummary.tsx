import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Zap, Eye, EyeOff, Trophy, Gift, Activity } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalPortfolioValue: string;
  activeStakes: string;
  activeChallenges: number;
  availableBalance: string;
}

export function BalanceSummary() {
  const [showBalance, setShowBalance] = useState(true);
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3 md:space-y-4">
        {/* Main Card Skeleton */}
        <Card className="p-4 md:p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-12 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
          </div>
        </Card>
        
        {/* Smaller Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Card className="p-3 md:p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </Card>
          <Card className="p-3 md:p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </Card>
        </div>
      </div>
    );
  }

  const portfolioValue = parseFloat(stats?.totalPortfolioValue || '0');
  const stakingValue = parseFloat(stats?.activeStakes || '0');
  const availableBalance = parseFloat(stats?.availableBalance || '0');
  const totalBalance = portfolioValue + stakingValue + availableBalance;

  return (
    <div className="space-y-6" data-testid="balance-summary">
      {/* Main Balance Display - Coinbase Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="py-6"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-1" data-testid="total-balance">
              {showBalance ? `$${totalBalance.toLocaleString()}` : "****"}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">+12.4% this month</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">Last updated now</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBalance(!showBalance)}
            className="text-muted-foreground hover:text-foreground"
            data-testid="toggle-balance-visibility"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
      </motion.div>

      {/* Account Breakdown - Clean Coinbase Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Portfolio Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-5 hover:shadow-sm transition-all cursor-pointer border-l-4 border-l-primary" data-testid="portfolio-summary">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Stocks & Bonds</h3>
                  <p className="text-xs text-muted-foreground">Active investments</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold mb-1">
                {showBalance ? `$${portfolioValue.toLocaleString()}` : "****"}
              </p>
              <p className="text-xs text-primary font-medium">
                Earn up to 12% returns
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Staking Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-5 hover:shadow-sm transition-all cursor-pointer border-l-4 border-l-accent" data-testid="staking-summary">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-semibold text-sm">Staking</h3>
                  <p className="text-xs text-muted-foreground">Fixed income</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold mb-1">
                {showBalance ? `$${stakingValue.toLocaleString()}` : "****"}
              </p>
              <p className="text-xs text-accent font-medium">
                Earn up to 8.5% APY
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Available Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="p-5 hover:shadow-sm transition-all cursor-pointer border-l-4 border-l-green-500" data-testid="cash-summary">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-semibold text-sm">Cash</h3>
                  <p className="text-xs text-muted-foreground">Available balance</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold mb-1">
                {showBalance ? `$${availableBalance.toLocaleString()}` : "****"}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                Ready to invest
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}