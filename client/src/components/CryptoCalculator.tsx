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
    <div className="w-full space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-2" data-testid="calculator-card">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Crypto Investment Calculator</CardTitle>
            <CardDescription>
              Calculate potential returns based on historical performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Compare Assets</Label>
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
                data-testid="button-compare-toggle"
              >
                {compareMode ? "Single Mode" : "Compare Mode"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset">Select Crypto Asset</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger id="asset" data-testid="select-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cryptoAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.symbol} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {compareMode && (
                <div className="space-y-2">
                  <Label htmlFor="asset2">Compare With</Label>
                  <Select 
                    value={selectedAsset2} 
                    onValueChange={(value) => {
                      setSelectedAsset2(value);
                    }}
                  >
                    <SelectTrigger id="asset2" data-testid="select-asset2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoAssets.filter(a => a.id !== selectedAsset).map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Investment Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  data-testid="input-amount"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Investment Duration</Label>
                <Badge variant="secondary" data-testid="text-duration">
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 Year</span>
                <span>5 Years</span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="error-message">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {result && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-accent/10" data-testid="result-card-1">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {selectedAssetData?.symbol}
                          {getBadge(result.cagr).text && (
                            <Badge className={`${getBadge(result.cagr).color} text-white`}>
                              {getBadge(result.cagr).text}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Projected Value</p>
                          <p className="text-2xl font-bold text-primary" data-testid="text-projected-value">
                            ${result.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Profit</p>
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="text-profit">
                              ${result.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">ROI</p>
                            <p className="text-lg font-semibold" data-testid="text-roi">
                              {result.profitPercentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">CAGR (Annual Growth)</p>
                          <p className="text-xl font-bold" data-testid="text-cagr">
                            {result.cagr.toFixed(2)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {compareMode && result2 && (
                      <Card className="bg-gradient-to-br from-accent/10 to-primary/10" data-testid="result-card-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {selectedAsset2Data?.symbol}
                            {getBadge(result2.cagr).text && (
                              <Badge className={`${getBadge(result2.cagr).color} text-white`}>
                                {getBadge(result2.cagr).text}
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Projected Value</p>
                            <p className="text-2xl font-bold text-accent" data-testid="text-projected-value-2">
                              ${result2.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Profit</p>
                              <p className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="text-profit-2">
                                ${result2.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">ROI</p>
                              <p className="text-lg font-semibold" data-testid="text-roi-2">
                                {result2.profitPercentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">CAGR (Annual Growth)</p>
                            <p className="text-xl font-bold" data-testid="text-cagr-2">
                              {result2.cagr.toFixed(2)}%
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {chartData.length > 0 && (
                  <Card data-testid="chart-container">
                    <CardHeader>
                      <CardTitle className="text-lg">Historical Performance & Projection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={selectedAssetData?.color}
                            strokeWidth={2}
                            name="Historical Value"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="projected"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Projected (CAGR)"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => window.location.href = "/signup"}
              data-testid="button-start-investing"
            >
              Start Investing Now
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card data-testid="leaderboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Performers (3-Year Returns)
              </CardTitle>
              <CardDescription>Based on $1,000 investment over 3 years</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((item, index) => {
                  const asset = cryptoAssets.find(a => a.id === item.asset);
                  const badge = getBadge(item.cagr);
                  const BadgeIcon = badge.icon;
                  return (
                    <div
                      key={item.asset}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      data-testid={`leaderboard-item-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          'bg-orange-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{asset?.symbol}</p>
                          <p className="text-xs text-muted-foreground">{asset?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                          ${item.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>{item.cagr.toFixed(1)}% CAGR</span>
                        </div>
                      </div>
                    </div>
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
