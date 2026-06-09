import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Zap, Eye, EyeOff, Trophy, Gift, Activity, BarChart2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface DashboardStats {
  totalPortfolioValue: string;
  activeStakes: string;
  activeChallenges: number;
  availableBalance: string;
  stocksValue: string;
  portfolioGrowthPercent: string;
  totalProfit: string;
}

interface StockHolding {
  id: string;
  quantity: string;
  purchasePrice: string;
  totalInvested: string;
  status: string;
  stockProduct: { symbol: string; name: string };
}

interface StockQuote {
  symbol: string;
  price: number;
}

export function BalanceSummary() {
  const [showBalance, setShowBalance] = useState(true);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, number>>({});
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: userStocks } = useQuery<StockHolding[]>({
    queryKey: ["/api/user/stocks"],
  });

  // Fetch live market prices for all approved/active holdings
  useEffect(() => {
    if (!userStocks || userStocks.length === 0) return;

    const activeHoldings = userStocks.filter(
      h => h.status === 'approved' || h.status === 'active'
    );
    if (activeHoldings.length === 0) return;

    const symbols = [...new Set(activeHoldings.map(h => h.stockProduct.symbol))].join(',');

    const fetchQuotes = () => {
      fetch(`/api/stocks/quotes?symbols=${encodeURIComponent(symbols)}`)
        .then(res => res.json())
        .then((quotes: StockQuote[]) => {
          const map: Record<string, number> = {};
          quotes.forEach(q => { map[q.symbol] = q.price; });
          setLiveQuotes(map);
        })
        .catch(() => {});
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000);
    return () => clearInterval(interval);
  }, [userStocks]);

  // Compute live total stock market value
  const liveStocksValue = useMemo(() => {
    if (!userStocks) return null;
    const activeHoldings = userStocks.filter(
      h => h.status === 'approved' || h.status === 'active'
    );
    if (activeHoldings.length === 0) return 0;
    // If we have live quotes for at least one holding, use them
    const hasAnyLiveQuote = activeHoldings.some(h => liveQuotes[h.stockProduct.symbol] !== undefined);
    if (!hasAnyLiveQuote) return null; // still loading
    return activeHoldings.reduce((sum, h) => {
      const qty = parseFloat(h.quantity);
      const price = liveQuotes[h.stockProduct.symbol] ?? parseFloat(h.purchasePrice);
      return sum + qty * price;
    }, 0);
  }, [userStocks, liveQuotes]);

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
  // Use live market value if available, fall back to purchase-price total from server
  const stocksValue = liveStocksValue !== null ? liveStocksValue : parseFloat(stats?.stocksValue || '0');
  const totalBalance = portfolioValue + stakingValue + availableBalance + stocksValue;

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
                {parseFloat(stats?.portfolioGrowthPercent || '0') !== 0 && (
                  <Badge className={parseFloat(stats?.portfolioGrowthPercent || '0') >= 0
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs"
                  }>
                    {parseFloat(stats?.portfolioGrowthPercent || '0') >= 0 ? '+' : ''}
                    {parseFloat(stats?.portfolioGrowthPercent || '0').toFixed(2)}%
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {parseFloat(stats?.portfolioGrowthPercent || '0') !== 0
                  ? `+$${parseFloat(stats?.totalProfit || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} portfolio returns • Last updated now`
                  : totalBalance > 0 ? 'No portfolio returns yet • Last updated now' : 'Deposit funds to start investing • Last updated now'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Portfolio and Staking Cards - Swipeable on Mobile, Grid on Desktop */}
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full md:hidden"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {/* Portfolio Card */}
          <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
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
          </CarouselItem>

          {/* Stocks Card */}
          <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="stocks-summary">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm md:text-base">Stocks</h3>
                        <p className="text-xs text-muted-foreground">Market holdings</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Live
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {showBalance ? `$${stocksValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "****"}
                    </p>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      View stock holdings →
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </CarouselItem>

          {/* Staking Card */}
          <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
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
          </CarouselItem>

          {/* Challenges Card */}
          <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="challenges-summary">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                        <Trophy className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm md:text-base">Challenges</h3>
                        <p className="text-xs text-muted-foreground">Community goals</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {stats?.activeChallenges || 0} Active
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                      3
                    </p>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      Join challenges →
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </CarouselItem>

          {/* Rewards Card */}
          <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="rewards-summary">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
                        <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm md:text-base">Rewards</h3>
                        <p className="text-xs text-muted-foreground">Total earned</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-pink-50 dark:bg-pink-950">
                      New
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg md:text-2xl font-bold text-pink-600 dark:text-pink-400">
                      {showBalance ? "$247" : "****"}
                    </p>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      View rewards history →
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </CarouselItem>

          {/* Activity Card */}
          <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="activity-summary">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                        <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm md:text-base">Activity</h3>
                        <p className="text-xs text-muted-foreground">Recent transactions</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      12 Today
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg md:text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                      54
                    </p>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      View all activity →
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      {/* Desktop Grid View */}
      <div className="hidden md:grid md:grid-cols-2 gap-3 md:gap-4">
        {/* Portfolio Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="portfolio-summary-desktop">
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

        {/* Stocks Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="stocks-summary-desktop">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">Stocks</h3>
                    <p className="text-xs text-muted-foreground">Market holdings</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {showBalance ? `$${stocksValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "****"}
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  View stock holdings →
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
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="staking-summary-desktop">
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

        {/* Challenges Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="challenges-summary-desktop">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Trophy className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">Challenges</h3>
                    <p className="text-xs text-muted-foreground">Community goals</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {stats?.activeChallenges || 0} Active
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                  3
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Join challenges →
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rewards Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="rewards-summary-desktop">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
                    <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">Rewards</h3>
                    <p className="text-xs text-muted-foreground">Total earned</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-pink-50 dark:bg-pink-950">
                  New
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-lg md:text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {showBalance ? "$247" : "****"}
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  View rewards history →
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer group" data-testid="activity-summary-desktop">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                    <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">Activity</h3>
                    <p className="text-xs text-muted-foreground">Recent transactions</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  12 Today
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-lg md:text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  54
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  View all activity →
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}