import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Zap, Eye, EyeOff } from "lucide-react";
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
    <div className="space-y-3 md:space-y-4" data-testid="balance-summary">
      {/* Main Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2 md:pb-4 px-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-blue-500 rounded-xl shadow-lg">
                  <Wallet className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl">Total Balance</CardTitle>
                  <CardDescription>All your crypto investments</CardDescription>
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
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl md:text-4xl font-bold text-blue-600 dark:text-blue-400" data-testid="total-balance">
                  {showBalance ? `$${totalBalance.toLocaleString()}` : "****"}
                </h2>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                  +12.4%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Total growth this month • Last updated now
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Portfolio and Staking Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* Portfolio Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="portfolio-summary">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">Portfolio</h3>
                    <p className="text-xs text-muted-foreground">Active investments</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">
                  {showBalance ? `$${portfolioValue.toLocaleString()}` : "****"}
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Across multiple assets →
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Staking Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="staking-summary">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">Staking</h3>
                    <p className="text-xs text-muted-foreground">Earning rewards</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  8.5% APY
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {showBalance ? `$${stakingValue.toLocaleString()}` : "****"}
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  View staking plans →
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}