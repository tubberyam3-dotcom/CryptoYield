import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, ArrowUpRight, Award, Trophy, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  color: string;
}

interface HistoricalData {
  prices: [number, number][];
}

interface CalculationResult {
  asset: string;
  investment: number;
  projectedValue: number;
  profit: number;
  profitPercentage: number;
  cagr: number;
  historicalROI: number;
}

const cryptoAssets: CryptoAsset[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", color: "#f7931a" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627eea" },
  { id: "solana", symbol: "SOL", name: "Solana", color: "#14f195" },
  { id: "worldcoin-wld", symbol: "WLD", name: "Worldcoin", color: "#000000" },
];

export function CryptoCalculator() {
  const [selectedAsset, setSelectedAsset] = useState<string>("bitcoin");
  const [selectedAsset2, setSelectedAsset2] = useState<string>("ethereum");
  const [duration, setDuration] = useState<number>(3);
  const [amount, setAmount] = useState<string>("1000");
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [result2, setResult2] = useState<CalculationResult | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<CalculationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = async (coinId: string, days: number, signal?: AbortSignal): Promise<HistoricalData | null> => {
    try {
      const response = await fetch(
        `/api/crypto/historical/${coinId}?days=${days * 365}`,
        { signal }
      );
      if (!response.ok) throw new Error("Failed to fetch data");
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null;
      }
      console.error("Error fetching historical data:", error);
      throw error;
    }
  };

  const calculateCAGR = (startValue: number, endValue: number, years: number): number => {
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  };

  const calculateProjection = async (coinId: string, investmentAmount: number, years: number, signal?: AbortSignal): Promise<CalculationResult | null> => {
    const data = await fetchHistoricalData(coinId, years, signal);
    if (!data || !data.prices || data.prices.length < 2) return null;

    const startPrice = data.prices[0][1];
    const endPrice = data.prices[data.prices.length - 1][1];
    
    const historicalROI = ((endPrice - startPrice) / startPrice) * 100;
    const cagr = calculateCAGR(startPrice, endPrice, years);
    
    const projectedValue = investmentAmount * Math.pow(1 + cagr / 100, years);
    const profit = projectedValue - investmentAmount;
    const profitPercentage = (profit / investmentAmount) * 100;

    return {
      asset: coinId,
      investment: investmentAmount,
      projectedValue,
      profit,
      profitPercentage,
      cagr,
      historicalROI,
    };
  };

  const generateChartData = async (coinId: string, investmentAmount: number, years: number, signal?: AbortSignal) => {
    const data = await fetchHistoricalData(coinId, years, signal);
    if (!data || !data.prices) return [];

    const prices = data.prices;
    const startPrice = prices[0][1];
    const cagr = calculateCAGR(prices[0][1], prices[prices.length - 1][1], years);

    const chartPoints = [];
    const pointsCount = 12;
    const interval = Math.floor(prices.length / pointsCount);

    for (let i = 0; i < pointsCount; i++) {
      const index = i * interval;
      if (index < prices.length) {
        const date = new Date(prices[index][0]);
        const currentPrice = prices[index][1];
        const value = investmentAmount * (currentPrice / startPrice);
        
        chartPoints.push({
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          value: Math.round(value),
          projected: Math.round(investmentAmount * Math.pow(1 + cagr / 100, (i / pointsCount) * years)),
        });
      }
    }

    return chartPoints;
  };

  const calculateLeaderboard = async () => {
    const results: CalculationResult[] = [];
    for (const asset of cryptoAssets) {
      const result = await calculateProjection(asset.id, 1000, 3);
      if (result) results.push(result);
    }
    results.sort((a, b) => b.cagr - a.cagr);
    setLeaderboard(results.slice(0, 3));
  };

  const handleCalculate = async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    
    try {
      const investmentAmount = parseFloat(amount) || 1000;

      const calculation = await calculateProjection(selectedAsset, investmentAmount, duration, signal);
      if (signal.aborted) return;
      setResult(calculation);

      if (compareMode) {
        const calculation2 = await calculateProjection(selectedAsset2, investmentAmount, duration, signal);
        if (signal.aborted) return;
        setResult2(calculation2);
      } else {
        setResult2(null);
      }

      const chart = await generateChartData(selectedAsset, investmentAmount, duration, signal);
      if (signal.aborted) return;
      setChartData(chart);
    } catch (err: any) {
      if (!signal.aborted) {
        setError("Failed to fetch crypto data. Please try again.");
        console.error("Calculation error:", err);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (compareMode && selectedAsset === selectedAsset2) {
      const availableAssets = cryptoAssets.filter(a => a.id !== selectedAsset);
      if (availableAssets.length > 0) {
        setSelectedAsset2(availableAssets[0].id);
        return;
      }
    }
    
    const controller = new AbortController();
    handleCalculate(controller.signal);
    return () => controller.abort();
  }, [selectedAsset, selectedAsset2, duration, amount, compareMode]);

  useEffect(() => {
    calculateLeaderboard();
  }, []);

  const getBadge = (cagr: number) => {
    if (cagr > 100) return { text: "Best Performer", icon: Trophy, color: "bg-yellow-500" };
    if (cagr > 50) return { text: "High Growth", icon: TrendingUp, color: "bg-green-500" };
    return { text: "Most Stable", icon: Shield, color: "bg-blue-500" };
  };

  const selectedAssetData = cryptoAssets.find(a => a.id === selectedAsset);
  const selectedAsset2Data = cryptoAssets.find(a => a.id === selectedAsset2);

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
                  Investment Calculator
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Calculate potential returns based on historical performance
                </CardDescription>
              </div>
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
          </CardHeader>
          <CardContent className="space-y-8 relative">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="asset" className="text-sm font-semibold text-foreground/90">Primary Asset</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger id="asset" className="h-12 border-2 hover:border-primary/50 transition-colors" data-testid="select-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cryptoAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }}></div>
                          <span className="font-medium">{asset.symbol}</span>
                          <span className="text-muted-foreground">- {asset.name}</span>
                        </div>
                      </SelectItem>
                    ))}
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
                    onValueChange={(value) => {
                      setSelectedAsset2(value);
                    }}
                  >
                    <SelectTrigger id="asset2" className="h-12 border-2 hover:border-accent/50 transition-colors" data-testid="select-asset2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoAssets.filter(a => a.id !== selectedAsset).map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }}></div>
                            <span className="font-medium">{asset.symbol}</span>
                            <span className="text-muted-foreground">- {asset.name}</span>
                          </div>
                        </SelectItem>
                      ))}
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

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="error-message">
                {error}
              </div>
            )}

            {loading ? (
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
                            <p className="text-xs font-medium text-muted-foreground uppercase">Annual Growth Rate (CAGR)</p>
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
                              <p className="text-xs font-medium text-muted-foreground uppercase">Annual Growth Rate (CAGR)</p>
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
                          Historical Performance & Projection
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
                              name="Historical Value"
                              dot={false}
                              fill="url(#colorValue)"
                            />
                            <Line
                              type="monotone"
                              dataKey="projected"
                              stroke="hsl(var(--accent))"
                              strokeWidth={3}
                              strokeDasharray="8 4"
                              name="Projected (CAGR)"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </>
            )}

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-purple-600 rounded-2xl blur opacity-40 group-hover:opacity-75 transition duration-1000"></div>
              <Button 
                className="relative w-full bg-gradient-to-r from-primary via-accent to-purple-600 hover:from-primary/90 hover:via-accent/90 hover:to-purple-600/90 text-white font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02] text-lg py-7" 
                size="lg" 
                onClick={() => window.location.href = "/signup"}
                data-testid="button-start-investing"
              >
                <TrendingUp className="w-6 h-6 mr-2" />
                Start Investing Now
                <ArrowUpRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-yellow-500/5 via-card to-orange-500/5 overflow-hidden" data-testid="leaderboard-card">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-full blur-3xl -z-10"></div>
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Top Performers</CardTitle>
                  <CardDescription className="text-base">Based on $1,000 investment over 3 years</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((item, index) => {
                  const asset = cryptoAssets.find(a => a.id === item.asset);
                  const badge = getBadge(item.cagr);
                  const BadgeIcon = badge.icon;
                  return (
                    <motion.div
                      key={item.asset}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="relative group"
                      data-testid={`leaderboard-item-${index}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50 group-hover:border-primary/30 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                            'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                          }`}>
                            {index === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-300 rounded-full animate-pulse"></div>}
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: asset?.color }}></div>
                            <div>
                              <p className="font-bold text-lg">{asset?.symbol}</p>
                              <p className="text-sm text-muted-foreground">{asset?.name}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-2xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            ${item.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">{item.cagr.toFixed(1)}% CAGR</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
