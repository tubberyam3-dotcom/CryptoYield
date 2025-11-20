import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Trophy, Shield, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface StockAsset {
  symbol: string;
  name: string;
  color: string;
  avgAnnualReturn: number; // Historical average annual return percentage
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
}

interface CalculationResult {
  asset: string;
  currentPrice: number;
  investment: number;
  projectedValue: number;
  profit: number;
  profitPercentage: number;
  cagr: number;
}

const stockAssets: StockAsset[] = [
  { symbol: "AAPL", name: "Apple Inc.", color: "#000000", avgAnnualReturn: 28.5 },
  { symbol: "MSFT", name: "Microsoft Corporation", color: "#00A4EF", avgAnnualReturn: 26.3 },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)", color: "#4285F4", avgAnnualReturn: 22.1 },
  { symbol: "NVDA", name: "NVIDIA Corporation", color: "#76B900", avgAnnualReturn: 45.2 },
  { symbol: "TSLA", name: "Tesla Inc.", color: "#CC0000", avgAnnualReturn: 38.7 },
  { symbol: "AMZN", name: "Amazon.com Inc.", color: "#FF9900", avgAnnualReturn: 24.8 },
];

export function InvestmentCalculator() {
  const [selectedAsset, setSelectedAsset] = useState<string>("AAPL");
  const [selectedAsset2, setSelectedAsset2] = useState<string>("MSFT");
  const [duration, setDuration] = useState<number>(3);
  const [amount, setAmount] = useState<string>("1000");
  const [compareMode, setCompareMode] = useState<boolean>(false);

  // Fetch live stock quotes
  const { data: stockQuotes, isLoading: quotesLoading, refetch } = useQuery<StockQuote[]>({
    queryKey: ['/api/stocks/quotes', { symbols: stockAssets.map(s => s.symbol).join(',') }],
    refetchInterval: 60000, // Refresh every minute
  });

  const calculateProjection = (
    stockSymbol: string,
    currentPrice: number,
    investmentAmount: number,
    years: number
  ): CalculationResult | null => {
    const stock = stockAssets.find(s => s.symbol === stockSymbol);
    if (!stock) return null;

    // Use historical average annual return for projection
    const cagr = stock.avgAnnualReturn;
    const projectedValue = investmentAmount * Math.pow(1 + cagr / 100, years);
    const profit = projectedValue - investmentAmount;
    const profitPercentage = (profit / investmentAmount) * 100;

    return {
      asset: stockSymbol,
      currentPrice,
      investment: investmentAmount,
      projectedValue,
      profit,
      profitPercentage,
      cagr,
    };
  };

  const generateChartData = (
    investmentAmount: number,
    years: number,
    cagr: number
  ) => {
    const chartPoints = [];
    const pointsPerYear = 4; // Quarterly points
    const totalPoints = years * pointsPerYear;

    for (let i = 0; i <= totalPoints; i++) {
      const yearsElapsed = (i / pointsPerYear);
      const value = investmentAmount * Math.pow(1 + cagr / 100, yearsElapsed);
      
      const date = new Date();
      date.setMonth(date.getMonth() + (i * 3));
      
      chartPoints.push({
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: Math.round(value),
      });
    }

    return chartPoints;
  };

  const getQuote = (symbol: string): StockQuote | undefined => {
    return stockQuotes?.find(q => q.symbol === symbol);
  };

  const selectedAssetData = stockAssets.find(a => a.symbol === selectedAsset);
  const selectedAsset2Data = stockAssets.find(a => a.symbol === selectedAsset2);

  const investmentAmount = parseFloat(amount) || 1000;
  
  const quote1 = getQuote(selectedAsset);
  const quote2 = getQuote(selectedAsset2);
  
  const result = quote1 && selectedAssetData 
    ? calculateProjection(selectedAsset, quote1.price, investmentAmount, duration)
    : null;
    
  const result2 = compareMode && quote2 && selectedAsset2Data
    ? calculateProjection(selectedAsset2, quote2.price, investmentAmount, duration)
    : null;

  const chartData = result ? generateChartData(investmentAmount, duration, result.cagr) : [];

  // Calculate leaderboard
  const leaderboard = stockQuotes
    ?.map(quote => {
      const stock = stockAssets.find(s => s.symbol === quote.symbol);
      if (!stock) return null;
      return calculateProjection(quote.symbol, quote.price, 1000, 3);
    })
    .filter((r): r is CalculationResult => r !== null)
    .sort((a, b) => b.cagr - a.cagr)
    .slice(0, 3) || [];

  const getBadge = (cagr: number) => {
    if (cagr > 35) return { text: "High Growth", icon: Trophy, color: "bg-yellow-500" };
    if (cagr > 20) return { text: "Strong Performer", icon: TrendingUp, color: "bg-green-500" };
    return { text: "Stable Growth", icon: Shield, color: "bg-blue-500" };
  };

  useEffect(() => {
    if (compareMode && selectedAsset === selectedAsset2) {
      const availableAssets = stockAssets.filter(a => a.symbol !== selectedAsset);
      if (availableAssets.length > 0) {
        setSelectedAsset2(availableAssets[0].symbol);
      }
    }
  }, [selectedAsset, selectedAsset2, compareMode]);

  return (
    <div className="w-full space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative border-0 shadow-2xl bg-gradient-to-br from-background via-background/95 to-primary/5 backdrop-blur-xl overflow-hidden" data-testid="calculator-card">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none"></div>
          <CardHeader className="space-y-4 pb-8 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Stock Investment Calculator
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Live stock prices powered by real market data
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={quotesLoading}
                  data-testid="button-refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${quotesLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="default"
                  onClick={() => setCompareMode(!compareMode)}
                  className="shadow-lg"
                  data-testid="button-compare-toggle"
                >
                  {compareMode ? "Single Mode" : "Compare Mode"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 relative">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="asset" className="text-sm font-semibold text-foreground/90">Primary Stock</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger id="asset" className="h-12 border-2 hover:border-primary/50 transition-colors" data-testid="select-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stockAssets.map((asset) => {
                      const quote = getQuote(asset.symbol);
                      return (
                        <SelectItem key={asset.symbol} value={asset.symbol}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }}></div>
                            <span className="font-medium">{asset.symbol}</span>
                            <span className="text-muted-foreground">- {asset.name}</span>
                            {quote && (
                              <span className="ml-auto text-sm">${quote.price.toFixed(2)}</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {compareMode && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <Label htmlFor="asset2" className="text-sm font-semibold text-foreground/90">Compare With</Label>
                  <Select 
                    value={selectedAsset2} 
                    onValueChange={setSelectedAsset2}
                  >
                    <SelectTrigger id="asset2" className="h-12 border-2 hover:border-accent/50 transition-colors" data-testid="select-asset2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stockAssets.filter(a => a.symbol !== selectedAsset).map((asset) => {
                        const quote = getQuote(asset.symbol);
                        return (
                          <SelectItem key={asset.symbol} value={asset.symbol}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }}></div>
                              <span className="font-medium">{asset.symbol}</span>
                              <span className="text-muted-foreground">- {asset.name}</span>
                              {quote && (
                                <span className="ml-auto text-sm">${quote.price.toFixed(2)}</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              <div className="space-y-3">
                <Label htmlFor="amount" className="text-sm font-semibold text-foreground/90">Investment Amount</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="h-12 pl-8 border-2 hover:border-primary/50 focus:border-primary transition-colors text-lg"
                    data-testid="input-amount"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground/90">Investment Duration</Label>
                <Badge variant="secondary" className="text-base px-4 py-1.5 font-bold" data-testid="text-duration">
                  {duration} {duration === 1 ? "Year" : "Years"}
                </Badge>
              </div>
              <Slider
                value={[duration]}
                onValueChange={(value) => setDuration(value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
                data-testid="slider-duration"
              />
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>1 Year</span>
                <span>2 Years</span>
                <span>3 Years</span>
                <span>4 Years</span>
                <span>5 Years</span>
              </div>
            </div>

            {quotesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-primary/20"></div>
                </div>
              </div>
            ) : (
              <>
                {result && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-primary/5 via-primary/10 to-purple-500/10 shadow-xl hover:shadow-2xl transition-shadow" data-testid="result-card-1">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-bold flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedAssetData?.color }}></div>
                              {selectedAssetData?.symbol}
                            </CardTitle>
                            {getBadge(result.cagr).text && (
                              <Badge className={`${getBadge(result.cagr).color} text-white shadow-lg`}>
                                {getBadge(result.cagr).text}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Current: ${result.currentPrice.toFixed(2)}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Projected Value</p>
                            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent" data-testid="text-projected-value">
                              ${result.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase">Profit</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-profit">
                                +${result.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase">ROI</p>
                              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-roi">
                                +{result.profitPercentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className="pt-4 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Avg Annual Return</p>
                            <p className="text-2xl font-bold text-foreground" data-testid="text-cagr">
                              {result.cagr.toFixed(2)}%
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {compareMode && result2 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Card className="border-0 bg-gradient-to-br from-accent/5 via-accent/10 to-pink-500/10 shadow-xl hover:shadow-2xl transition-shadow" data-testid="result-card-2">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-xl font-bold flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedAsset2Data?.color }}></div>
                                {selectedAsset2Data?.symbol}
                              </CardTitle>
                              {getBadge(result2.cagr).text && (
                                <Badge className={`${getBadge(result2.cagr).color} text-white shadow-lg`}>
                                  {getBadge(result2.cagr).text}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Current: ${result2.currentPrice.toFixed(2)}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Projected Value</p>
                              <p className="text-4xl font-bold bg-gradient-to-r from-accent to-pink-600 bg-clip-text text-transparent" data-testid="text-projected-value-2">
                                ${result2.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Profit</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-profit-2">
                                  +${result2.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">ROI</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-roi-2">
                                  +{result2.profitPercentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            <div className="pt-4 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase">Avg Annual Return</p>
                              <p className="text-2xl font-bold text-foreground" data-testid="text-cagr-2">
                                {result2.cagr.toFixed(2)}%
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                )}

                {chartData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20" data-testid="chart-container">
                      <CardHeader className="pb-6">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <TrendingUp className="w-5 h-5 text-primary" />
                          </div>
                          Projected Growth
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={chartData}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={selectedAssetData?.color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={selectedAssetData?.color} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                            <XAxis 
                              dataKey="date" 
                              className="text-xs" 
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={selectedAssetData?.color}
                              strokeWidth={3}
                              dot={{ fill: selectedAssetData?.color, r: 4 }}
                              activeDot={{ r: 6 }}
                              name="Portfolio Value"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-yellow-500/5 via-card to-orange-500/5 overflow-hidden" data-testid="leaderboard-card">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                Top Performing Stocks (3-Year Projection)
              </CardTitle>
              <CardDescription>Based on $1,000 investment with historical average returns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaderboard.map((item, index) => {
                const stockData = stockAssets.find(s => s.symbol === item.asset);
                const badge = getBadge(item.cagr);
                const BadgeIcon = badge.icon;
                
                return (
                  <motion.div
                    key={item.asset}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className={`border-2 ${
                      index === 0 ? 'border-yellow-500/50 bg-yellow-500/5' :
                      index === 1 ? 'border-slate-400/50 bg-slate-400/5' :
                      'border-orange-600/50 bg-orange-600/5'
                    } hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-slate-400 text-white' :
                              'bg-orange-600 text-white'
                            } font-bold`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stockData?.color }}></div>
                                <span className="font-bold text-lg">{item.asset}</span>
                                <span className="text-sm text-muted-foreground">{stockData?.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Current: ${item.currentPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">
                              ${item.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <div className="flex items-center gap-2 justify-end mt-1">
                              <BadgeIcon className="w-4 h-4 text-green-600" />
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                +{item.cagr.toFixed(1)}% annual
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
