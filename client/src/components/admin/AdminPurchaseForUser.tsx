import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, DollarSign, TrendingUp, ShoppingCart, User, Briefcase, RefreshCw, X, TrendingDown } from "lucide-react";
import { StockIcon } from "@/components/StockIcon";

interface UserType {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: string;
}

interface Portfolio {
  id: string;
  name: string;
  description: string;
  minInvestment: string;
  unitPrice: string;
  interestRate: string;
  riskLevel: string;
}

interface MarketStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
}

export function AdminPurchaseForUser() {
  const { toast } = useToast();

  // User selection
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  // Portfolio
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [autoApproveInvestment, setAutoApproveInvestment] = useState(true);

  // Stock selection
  const [stockSearch, setStockSearch] = useState("");
  const [selectedMarketStock, setSelectedMarketStock] = useState<MarketStock | null>(null);
  const [stockPickerOpen, setStockPickerOpen] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockPrice, setStockPrice] = useState("");
  const [autoApproveStock, setAutoApproveStock] = useState(true);
  const [liveQuote, setLiveQuote] = useState<StockQuote | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: portfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const { data: marketStocks, isLoading: loadingMarket } = useQuery<MarketStock[]>({
    queryKey: ["/api/stocks/top-performers"],
  });

  const filteredMarket = marketStocks?.filter(s => {
    const q = stockSearch.toLowerCase();
    return !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  }) ?? [];

  const fetchLivePrice = async (symbol: string) => {
    setFetchingQuote(true);
    setLiveQuote(null);
    try {
      const res = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const quote: StockQuote = await res.json();
        setLiveQuote(quote);
        setStockPrice(quote.price.toFixed(2));
      }
    } catch {
      // admin can type price manually
    } finally {
      setFetchingQuote(false);
    }
  };

  const handlePickStock = (stock: MarketStock) => {
    setSelectedMarketStock(stock);
    setStockPickerOpen(false);
    setStockSearch("");
    setLiveQuote(null);
    setStockPrice("");
    fetchLivePrice(stock.symbol);
  };

  const clearSelectedStock = () => {
    setSelectedMarketStock(null);
    setLiveQuote(null);
    setStockPrice("");
    setStockQuantity("");
  };

  const investMutation = useMutation({
    mutationFn: async (data: { userId: string; portfolioId: string; investedAmount: string; autoApprove: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${data.userId}/invest-portfolio`, {
        portfolioId: data.portfolioId,
        investedAmount: data.investedAmount,
        autoApprove: data.autoApprove,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Investment Created", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedPortfolio("");
      setInvestmentAmount("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create investment", variant: "destructive" });
    },
  });

  const buyStockMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      symbol: string;
      name: string;
      quantity: string;
      purchasePrice: string;
      autoApprove: boolean;
    }) => {
      const res = await apiRequest("POST", `/api/admin/users/${data.userId}/buy-stock`, {
        symbol: data.symbol,
        name: data.name,
        quantity: data.quantity,
        purchasePrice: data.purchasePrice,
        autoApprove: data.autoApprove,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Stock Purchase Created", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stock-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      clearSelectedStock();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create stock purchase", variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter(user => {
    const search = userSearch.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  }) || [];

  const handleInvestSubmit = () => {
    if (!selectedUser || !selectedPortfolio || !investmentAmount) {
      toast({ title: "Missing Information", description: "Please select a user, portfolio, and enter an investment amount", variant: "destructive" });
      return;
    }
    investMutation.mutate({ userId: selectedUser.id, portfolioId: selectedPortfolio, investedAmount: investmentAmount, autoApprove: autoApproveInvestment });
  };

  const handleStockSubmit = () => {
    if (!selectedUser || !selectedMarketStock || !stockQuantity || !stockPrice) {
      toast({ title: "Missing Information", description: "Please select a user, a stock, quantity, and price", variant: "destructive" });
      return;
    }
    buyStockMutation.mutate({
      userId: selectedUser.id,
      symbol: selectedMarketStock.symbol,
      name: selectedMarketStock.name,
      quantity: stockQuantity,
      purchasePrice: stockPrice,
      autoApprove: autoApproveStock,
    });
  };

  const selectedPortfolioDetails = portfolios?.find(p => p.id === selectedPortfolio);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Purchase for User</h2>
        <p className="text-muted-foreground">Create investments or stock purchases on behalf of users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User picker */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Select User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredUsers.slice(0, 20).map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'border-primary bg-primary/10'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-green-500 font-medium">
                    Balance: ${parseFloat(user.balance || '0').toLocaleString()}
                  </p>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Purchase panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Create Purchase
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a user to create a purchase</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Selected: {selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-sm text-green-500 font-medium">
                    Balance: ${parseFloat(selectedUser.balance || '0').toLocaleString()}
                  </p>
                </div>

                <Tabs defaultValue="stock" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="stock" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Stock Purchase
                    </TabsTrigger>
                    <TabsTrigger value="portfolio" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Portfolio Investment
                    </TabsTrigger>
                  </TabsList>

                  {/* ── STOCK TAB ── */}
                  <TabsContent value="stock" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Stock ({marketStocks?.length ?? 0} available)</Label>

                      {selectedMarketStock ? (
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <StockIcon symbol={selectedMarketStock.symbol} size="sm" />
                            <div>
                              <p className="font-semibold">{selectedMarketStock.symbol}</p>
                              <p className="text-sm text-muted-foreground">{selectedMarketStock.name}</p>
                            </div>
                          </div>
                          <button
                            onClick={clearSelectedStock}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              placeholder="Search 150 stocks by symbol or name…"
                              value={stockSearch}
                              onChange={(e) => { setStockSearch(e.target.value); setStockPickerOpen(true); }}
                              onFocus={() => setStockPickerOpen(true)}
                              className="pl-10 border-0 rounded-none focus-visible:ring-0"
                            />
                          </div>

                          <div className="max-h-56 overflow-y-auto border-t divide-y">
                            {loadingMarket ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">Loading stocks…</div>
                            ) : filteredMarket.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">No stocks match your search</div>
                            ) : (
                              filteredMarket.map((stock) => (
                                <button
                                  key={stock.symbol}
                                  type="button"
                                  onClick={() => handlePickStock(stock)}
                                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <StockIcon symbol={stock.symbol} size="sm" />
                                    <div>
                                      <span className="font-semibold text-sm">{stock.symbol}</span>
                                      <span className="text-muted-foreground text-sm ml-2">{stock.name}</span>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-2">
                                    <p className="text-sm font-medium">
                                      ${stock.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <span className={`text-xs ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                                    </span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedMarketStock && (
                      <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{selectedMarketStock.symbol} — {selectedMarketStock.name}</span>
                          {liveQuote && (
                            <Badge className={liveQuote.changePercent >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                              {liveQuote.changePercent >= 0 ? <TrendingUp className="inline w-3 h-3 mr-1" /> : <TrendingDown className="inline w-3 h-3 mr-1" />}
                              {liveQuote.changePercent >= 0 ? '+' : ''}{liveQuote.changePercent.toFixed(2)}%
                            </Badge>
                          )}
                        </div>
                        {fetchingQuote && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Fetching live price…</span>
                          </div>
                        )}
                        {liveQuote && !fetchingQuote && (
                          <p className="text-green-600 font-medium">Live Price: ${liveQuote.price.toFixed(2)}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity (Shares)</Label>
                        <Input
                          type="number"
                          placeholder="Number of shares"
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price per Share ($)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={stockPrice}
                            onChange={(e) => setStockPrice(e.target.value)}
                          />
                          {fetchingQuote && (
                            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {stockQuantity && stockPrice && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-medium">
                          Total Cost: ${(parseFloat(stockQuantity || '0') * parseFloat(stockPrice || '0')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label>Auto-approve purchase</Label>
                      <Switch checked={autoApproveStock} onCheckedChange={setAutoApproveStock} />
                    </div>

                    <Button
                      onClick={handleStockSubmit}
                      className="w-full"
                      disabled={buyStockMutation.isPending || fetchingQuote}
                    >
                      {buyStockMutation.isPending ? "Processing…" : "Create Stock Purchase"}
                    </Button>
                  </TabsContent>

                  {/* ── PORTFOLIO TAB ── */}
                  <TabsContent value="portfolio" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Portfolio</Label>
                      <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a portfolio" />
                        </SelectTrigger>
                        <SelectContent>
                          {portfolios?.map((portfolio) => (
                            <SelectItem key={portfolio.id} value={portfolio.id}>
                              {portfolio.name} — Min: ${parseFloat(portfolio.minInvestment || '0').toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPortfolioDetails && (
                      <div className="p-3 bg-muted/30 rounded-lg text-sm">
                        <p><strong>Unit Price:</strong> ${parseFloat(selectedPortfolioDetails.unitPrice || '100').toLocaleString()}</p>
                        <p><strong>Interest Rate:</strong> {(parseFloat(selectedPortfolioDetails.interestRate || '0') * 100).toFixed(2)}%</p>
                        <p><strong>Risk Level:</strong> {selectedPortfolioDetails.riskLevel}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Investment Amount ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Auto-approve investment</Label>
                      <Switch checked={autoApproveInvestment} onCheckedChange={setAutoApproveInvestment} />
                    </div>

                    <Button
                      onClick={handleInvestSubmit}
                      className="w-full"
                      disabled={investMutation.isPending}
                    >
                      {investMutation.isPending ? "Processing…" : "Create Investment"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
