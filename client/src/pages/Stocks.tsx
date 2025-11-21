import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StockProduct, UserStock, InsertUserStock } from "@shared/schema";
import { insertUserStockSchema } from "@shared/schema";
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Activity } from "lucide-react";

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  marketCap?: number;
}

const purchaseFormSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  stockProductId: z.string(),
  purchasePrice: z.number().positive("Purchase price must be positive"),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

export default function Stocks() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockProduct | null>(null);
  const [stockQuotes, setStockQuotes] = useState<{ [symbol: string]: StockQuote }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { user, isLoading} = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const purchaseForm = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      quantity: 1,
      stockProductId: "",
      purchasePrice: 0,
    },
  });

  const { data: stockProducts, isLoading: productsLoading } = useQuery<StockProduct[]>({
    queryKey: ["/api/stocks/products"],
  });

  const { data: userStocks } = useQuery<(UserStock & { stockProduct: StockProduct })[]>({
    queryKey: ["/api/user/stocks"],
  });

  const { data: topPerformers, isLoading: topPerformersLoading } = useQuery<StockQuote[]>({
    queryKey: ["/api/stocks/top-performers"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const response = await apiRequest("POST", "/api/user/stocks", {
        stockProductId: data.stockProductId,
        quantity: data.quantity.toString(),
        purchasePrice: data.purchasePrice.toString(),
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Purchase Submitted",
        description: `Your purchase of ${variables.quantity} shares is pending admin approval. You'll be refunded if rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setSelectedStock(null);
      purchaseForm.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch quotes for all visible stocks in useEffect instead of during render
  useEffect(() => {
    const fetchAllQuotes = async () => {
      if (!stockProducts) return;
      
      for (const stock of stockProducts) {
        // Only fetch if we don't have a quote yet
        setStockQuotes(prev => {
          if (prev[stock.symbol]) return prev; // Already have this quote
          
          // Fetch in the background
          fetch(`/api/stocks/quote?symbol=${stock.symbol}`)
            .then(res => res.json())
            .then(data => {
              setStockQuotes(current => ({ ...current, [stock.symbol]: data }));
            })
            .catch(error => {
              console.error(`Failed to fetch quote for ${stock.symbol}:`, error);
            });
          
          return prev;
        });
      }
    };
    
    fetchAllQuotes();
  }, [stockProducts]);

  // Also fetch quotes for user holdings
  useEffect(() => {
    const fetchHoldingQuotes = async () => {
      if (!userStocks) return;
      
      for (const holding of userStocks) {
        const symbol = holding.stockProduct.symbol;
        
        // Only fetch if we don't have a quote yet
        setStockQuotes(prev => {
          if (prev[symbol]) return prev; // Already have this quote
          
          // Fetch in the background
          fetch(`/api/stocks/quote?symbol=${symbol}`)
            .then(res => res.json())
            .then(data => {
              setStockQuotes(current => ({ ...current, [symbol]: data }));
            })
            .catch(error => {
              console.error(`Failed to fetch quote for ${symbol}:`, error);
            });
          
          return prev;
        });
      }
    };
    
    fetchHoldingQuotes();
  }, [userStocks]);

  const handlePurchase = purchaseForm.handleSubmit((data) => {
    const minQuantity = selectedStock?.minPurchaseQuantity ? parseInt(selectedStock.minPurchaseQuantity.toString()) : 1;
    
    if (data.quantity < minQuantity) {
      toast({
        title: "Quantity Too Low",
        description: `Minimum purchase quantity is ${minQuantity} shares`,
        variant: "destructive",
      });
      return;
    }

    purchaseMutation.mutate(data);
  });

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
    <div className="min-h-screen bg-background text-foreground" data-testid="stocks-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Stocks" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          
          {/* My Stock Holdings */}
          {userStocks && userStocks.length > 0 && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border">
                <h2 className="text-2xl font-bold">My Stock Holdings</h2>
                <p className="text-sm text-muted-foreground">Track your investment performance in real-time</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userStocks.map((holding) => {
                  const quote = stockQuotes[holding.stockProduct.symbol];
                  const purchasePrice = parseFloat(holding.purchasePrice);
                  const currentPrice = quote?.price || purchasePrice;
                  const quantity = parseFloat(holding.quantity);
                  const currentValue = currentPrice * quantity;
                  const totalInvested = parseFloat(holding.totalInvested);
                  const profitLoss = currentValue - totalInvested;
                  const profitLossPercent = (profitLoss / totalInvested) * 100;

                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'pending':
                        return (
                          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20" data-testid={`badge-status-pending-${holding.id}`}>
                            <Clock className="w-3 h-3 mr-1" />
                            Pending Approval
                          </Badge>
                        );
                      case 'approved':
                        return (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20" data-testid={`badge-status-approved-${holding.id}`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        );
                      case 'rejected':
                        return (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20" data-testid={`badge-status-rejected-${holding.id}`}>
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        );
                      case 'active':
                        return (
                          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" data-testid={`badge-status-active-${holding.id}`}>
                            <Activity className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        );
                      case 'sold':
                        return (
                          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20" data-testid={`badge-status-sold-${holding.id}`}>
                            Sold
                          </Badge>
                        );
                      default:
                        return null;
                    }
                  };

                  return (
                    <Card key={holding.id} className="p-6" data-testid={`card-stock-holding-${holding.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg" data-testid={`text-stock-symbol-${holding.stockProduct.symbol}`}>
                          {holding.stockProduct.symbol}
                        </h3>
                        {holding.status !== 'pending' && holding.status !== 'rejected' && (
                          <Badge className={profitLoss >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                            {profitLoss >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-muted-foreground">{holding.stockProduct.name}</p>
                        {getStatusBadge(holding.status)}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shares</span>
                          <span className="font-medium">{quantity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Purchase Price</span>
                          <span className="font-medium">${purchasePrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Price</span>
                          <span className="font-medium">${currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="text-muted-foreground">Total Value</span>
                          <span className="font-bold">${currentValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Profit/Loss</span>
                          <span className={`font-bold ${profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Stocks */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-border">
              <h2 className="text-2xl font-bold">Available Stocks</h2>
              <p className="text-sm text-muted-foreground">Curated stock offerings selected by our team</p>
            </div>
            
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading stocks...</p>
              </div>
            ) : stockProducts && stockProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stockProducts.map((stock) => {
                  const quote = stockQuotes[stock.symbol];

                  return (
                    <Card key={stock.id} className="p-6 hover:shadow-lg transition-shadow" data-testid={`card-available-stock-${stock.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-xl">{stock.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{stock.sector}</p>
                        </div>
                        {quote && (
                          <Badge className={quote.changePercent >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                            {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium mb-2">{stock.name}</p>
                      {stock.description && (
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{stock.description}</p>
                      )}
                      
                      <div className="mb-4">
                        {quote ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">${quote.price.toFixed(2)}</span>
                            <span className={`text-sm ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Loading price...</div>
                        )}
                      </div>
                      
                      <Dialog 
                        open={selectedStock?.id === stock.id}
                        onOpenChange={(open) => !open && setSelectedStock(null)}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full"
                            onClick={() => setSelectedStock(stock)}
                            data-testid={`button-buy-stock-${stock.id}`}
                          >
                            Buy Shares
                          </Button>
                        </DialogTrigger>
                        <DialogContent data-testid={`dialog-buy-stock-${stock.id}`}>
                          <DialogHeader>
                            <DialogTitle>Purchase {stock.symbol} Shares</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            if (quote) {
                              purchaseForm.setValue('stockProductId', stock.id);
                              purchaseForm.setValue('purchasePrice', quote.price);
                              handlePurchase();
                            }
                          }} className="space-y-4">
                            <div>
                              <p className="text-sm font-medium mb-2">{stock.name}</p>
                              {quote && (
                                <p className="text-2xl font-bold">${quote.price.toFixed(2)} per share</p>
                              )}
                            </div>
                            
                            <div>
                              <Label htmlFor="quantity">Number of Shares</Label>
                              <Input
                                id="quantity"
                                type="number"
                                placeholder={`Min. ${stock.minPurchaseQuantity}`}
                                {...purchaseForm.register("quantity", {
                                  setValueAs: (value) => parseInt(value) || 1,
                                })}
                                data-testid="input-stock-quantity"
                              />
                              {purchaseForm.formState.errors.quantity && (
                                <p className="text-sm text-red-500 mt-1">{purchaseForm.formState.errors.quantity.message}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum: {stock.minPurchaseQuantity} shares
                              </p>
                            </div>
                            
                            {purchaseForm.watch('quantity') > 0 && quote && (
                              <div className="p-4 bg-muted rounded-lg">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Total Cost</span>
                                  <span className="font-bold">
                                    ${(purchaseForm.watch('quantity') * quote.price).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={purchaseMutation.isPending || !quote}
                              data-testid="button-confirm-purchase"
                            >
                              {purchaseMutation.isPending ? "Processing..." : "Confirm Purchase"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Start Your Investment Journey</h3>
                  <p className="text-muted-foreground">
                    Browse our curated selection of top-performing stocks below and start building your wealth today. Every successful investor started with their first purchase!
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Top 50 Performing Stocks */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-border">
              <div>
                <h2 className="text-2xl font-bold">Top 50 Performing Stocks</h2>
                <p className="text-sm text-muted-foreground">Real-time market data from leading companies</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Input
                  placeholder="Search by symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                  data-testid="input-search-stocks"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {topPerformersLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading top performers...</p>
              </div>
            ) : topPerformers && topPerformers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {topPerformers
                  .filter(stock => 
                    searchQuery === "" || 
                    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((stock) => (
                    <Card 
                      key={stock.symbol} 
                      className="p-3 md:p-4 hover:shadow-xl hover:border-primary/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer" 
                      data-testid={`card-top-stock-${stock.symbol}`}
                      onClick={() => setLocation(`/stocks/${stock.symbol}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base md:text-lg mb-0.5" data-testid={`text-top-stock-symbol-${stock.symbol}`}>{stock.symbol}</h3>
                          <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">{stock.name}</p>
                        </div>
                        <Badge className={`ml-1 text-[10px] md:text-xs px-1.5 md:px-2 ${stock.changePercent >= 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {stock.changePercent >= 0 ? <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />}
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1.5 pb-2 border-b border-border/50">
                          <span className="text-xl md:text-2xl font-bold tracking-tight">${stock.price.toFixed(2)}</span>
                          <span className={`text-[10px] md:text-sm font-semibold ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] md:text-xs">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground mb-0.5">High</span>
                            <span className="font-semibold">${stock.dayHigh?.toFixed(2) || 'N/A'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground mb-0.5">Low</span>
                            <span className="font-semibold">${stock.dayLow?.toFixed(2) || 'N/A'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground mb-0.5">Vol</span>
                            <span className="font-semibold">{stock.volume ? (stock.volume / 1000000).toFixed(1) + 'M' : 'N/A'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground mb-0.5">MCap</span>
                            <span className="font-semibold">
                              {stock.marketCap ? '$' + (stock.marketCap / 1000000000).toFixed(1) + 'B' : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                {topPerformers.filter(stock => 
                  searchQuery === "" || 
                  stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  stock.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <Card className="col-span-full p-8 text-center">
                    <p className="text-muted-foreground">No stocks match your search.</p>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Unable to load top performers. Please try again later.</p>
              </Card>
            )}
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
