import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { StockProduct, UserStock } from "@shared/schema";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function Stocks() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockProduct | null>(null);
  const [stockQuotes, setStockQuotes] = useState<{ [symbol: string]: StockQuote }>({});
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stockProducts, isLoading: productsLoading } = useQuery<StockProduct[]>({
    queryKey: ["/api/stocks/products"],
  });

  const { data: userStocks } = useQuery<(UserStock & { stockProduct: StockProduct })[]>({
    queryKey: ["/api/user/stocks"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ stockProductId, quantity, purchasePrice }: { stockProductId: string; quantity: string; purchasePrice: string }) => {
      const response = await apiRequest("POST", "/api/user/stocks", { stockProductId, quantity, purchasePrice });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful",
        description: `You've successfully purchased ${quantity} shares!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stocks"] });
      setSelectedStock(null);
      setQuantity("");
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

  const fetchStockQuote = async (symbol: string) => {
    if (stockQuotes[symbol]) return;
    
    try {
      const response = await fetch(`/api/stocks/quote?symbol=${symbol}`);
      const data = await response.json();
      setStockQuotes(prev => ({ ...prev, [symbol]: data }));
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
    }
  };

  const handlePurchase = () => {
    if (!selectedStock || !quantity) return;
    
    const quote = stockQuotes[selectedStock.symbol];
    if (!quote) {
      toast({
        title: "Price Unavailable",
        description: "Please wait for the stock price to load",
        variant: "destructive",
      });
      return;
    }

    const quantityNum = parseFloat(quantity);
    const minQuantity = parseFloat(selectedStock.minPurchaseQuantity?.toString() || '1');
    
    if (quantityNum < minQuantity) {
      toast({
        title: "Quantity Too Low",
        description: `Minimum purchase quantity is ${minQuantity} shares`,
        variant: "destructive",
      });
      return;
    }

    purchaseMutation.mutate({ 
      stockProductId: selectedStock.id, 
      quantity,
      purchasePrice: quote.price.toString()
    });
  };

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
              <h2 className="text-xl font-semibold">My Stock Holdings</h2>
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

                  if (!stockQuotes[holding.stockProduct.symbol]) {
                    fetchStockQuote(holding.stockProduct.symbol);
                  }

                  return (
                    <Card key={holding.id} className="p-6" data-testid={`card-stock-holding-${holding.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg" data-testid={`text-stock-symbol-${holding.stockProduct.symbol}`}>
                          {holding.stockProduct.symbol}
                        </h3>
                        <Badge className={profitLoss >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                          {profitLoss >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">{holding.stockProduct.name}</p>
                      
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
            <h2 className="text-xl font-semibold">Available Stocks</h2>
            
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading stocks...</p>
              </div>
            ) : stockProducts && stockProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stockProducts.map((stock) => {
                  const quote = stockQuotes[stock.symbol];
                  
                  if (!stockQuotes[stock.symbol]) {
                    fetchStockQuote(stock.symbol);
                  }

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
                          <div className="space-y-4">
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
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                data-testid="input-stock-quantity"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum: {stock.minPurchaseQuantity} shares
                              </p>
                            </div>
                            
                            {quantity && quote && (
                              <div className="p-4 bg-muted rounded-lg">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Total Cost</span>
                                  <span className="font-bold">
                                    ${(parseFloat(quantity) * quote.price).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <Button
                              onClick={handlePurchase}
                              className="w-full"
                              disabled={purchaseMutation.isPending || !quote}
                              data-testid="button-confirm-purchase"
                            >
                              {purchaseMutation.isPending ? "Processing..." : "Confirm Purchase"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No stocks available at the moment. Check back later!</p>
              </Card>
            )}
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
