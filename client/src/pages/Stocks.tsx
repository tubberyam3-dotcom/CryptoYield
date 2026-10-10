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
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StockProduct, UserStock, InsertUserStock } from "@shared/schema";
import { insertUserStockSchema } from "@shared/schema";
import {
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Activity,
  ShoppingCart, ChevronRight, Calendar, BarChart2, DollarSign, Percent, X
} from "lucide-react";
import { StockIcon } from "@/components/StockIcon";

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

type HoldingWithProduct = UserStock & { stockProduct: StockProduct };

const purchaseFormSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  stockProductId: z.string(),
  purchasePrice: z.number().positive("Purchase price must be positive"),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

function statusBadge(status: string, id: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs" data-testid={`badge-status-pending-${id}`}>
          <Clock className="w-3 h-3 mr-1" />Pending
        </Badge>
      );
    case 'approved':
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs" data-testid={`badge-status-approved-${id}`}>
          <CheckCircle className="w-3 h-3 mr-1" />Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs" data-testid={`badge-status-rejected-${id}`}>
          <XCircle className="w-3 h-3 mr-1" />Rejected
        </Badge>
      );
    case 'active':
      return (
        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs" data-testid={`badge-status-active-${id}`}>
          <Activity className="w-3 h-3 mr-1" />Active
        </Badge>
      );
    case 'sold':
      return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-xs">Sold</Badge>;
    default:
      return null;
  }
}

export default function Stocks() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockProduct | null>(null);
  const [selectedTopStock, setSelectedTopStock] = useState<StockQuote | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithProduct | null>(null);
  const [stockQuotes, setStockQuotes] = useState<{ [symbol: string]: StockQuote }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const purchaseForm = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: { quantity: 1, stockProductId: "", purchasePrice: 0 },
  });

  const { data: stockProducts, isLoading: productsLoading } = useQuery<StockProduct[]>({
    queryKey: ["/api/stocks/products"],
    refetchInterval: 30000,
  });

  const { data: userStocks } = useQuery<HoldingWithProduct[]>({
    queryKey: ["/api/user/stocks"],
  });

  const { data: topPerformers, isLoading: topPerformersLoading } = useQuery<StockQuote[]>({
    queryKey: ["/api/stocks/top-performers"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData & { symbol?: string; name?: string; sector?: string }) => {
      const payload: any = {
        quantity: data.quantity.toString(),
        purchasePrice: data.purchasePrice.toString(),
      };
      if (data.stockProductId) {
        payload.stockProductId = data.stockProductId;
      } else {
        payload.symbol = data.symbol;
        payload.name = data.name;
        payload.sector = data.sector;
      }
      const response = await apiRequest("POST", "/api/user/stocks", payload);
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Purchase Submitted",
        description: `Your purchase of ${variables.quantity} shares is pending admin approval.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setSelectedStock(null);
      setSelectedTopStock(null);
      purchaseForm.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in to continue", variant: "destructive" });
        return;
      }
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!stockProducts) return;
    const refreshProducts = () => {
      for (const stock of stockProducts) {
        fetch(`/api/stocks/quote?symbol=${stock.symbol}`)
          .then(res => {
            if (!res.ok) throw new Error('Market quote unavailable');
            return res.json();
          })
          .then(data => setStockQuotes(cur => ({ ...cur, [stock.symbol]: data })))
          .catch(() => setStockQuotes(cur => {
            const next = { ...cur };
            delete next[stock.symbol];
            return next;
          }));
      }
    };
    refreshProducts();
    const interval = setInterval(refreshProducts, 30000);
    return () => clearInterval(interval);
  }, [stockProducts]);

  useEffect(() => {
    if (!userStocks || userStocks.length === 0) return;
    const fetchHoldingQuotes = () => {
      for (const h of userStocks) {
        const sym = h.stockProduct?.symbol;
        if (!sym) continue;
        fetch(`/api/stocks/quote?symbol=${sym}`)
          .then(res => {
            if (!res.ok) throw new Error('Market quote unavailable');
            return res.json();
          })
          .then(data => setStockQuotes(cur => ({ ...cur, [sym]: data })))
          .catch(() => setStockQuotes(cur => {
            const next = { ...cur };
            delete next[sym];
            return next;
          }));
      }
    };
    fetchHoldingQuotes();
    const interval = setInterval(fetchHoldingQuotes, 30000);
    return () => clearInterval(interval);
  }, [userStocks]);

  const handlePurchase = purchaseForm.handleSubmit((data) => {
    const minQty = selectedStock?.minPurchaseQuantity ? parseInt(selectedStock.minPurchaseQuantity.toString()) : 1;
    if (data.quantity < minQty) {
      toast({ title: "Quantity Too Low", description: `Minimum is ${minQty} shares`, variant: "destructive" });
      return;
    }
    purchaseMutation.mutate(data);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const activeHoldings = userStocks?.filter(h => h.status !== 'rejected') ?? [];
  const totalPortfolioValue = activeHoldings.reduce((sum, h) => {
    const quote = stockQuotes[h.stockProduct?.symbol];
    const price = quote?.price ?? parseFloat(h.purchasePrice);
    return sum + price * parseFloat(h.quantity);
  }, 0);
  const totalInvestedAll = activeHoldings.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0);
  const totalPL = totalPortfolioValue - totalInvestedAll;

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="stocks-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Stocks" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />

        <main className="p-4 sm:p-6 space-y-8 pb-24 lg:pb-6">

          {/* ── MY HOLDINGS ── */}
          {activeHoldings.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-2 border-b border-border">
                <div>
                  <h2 className="text-2xl font-bold">My Holdings</h2>
                  <p className="text-sm text-muted-foreground">Tap any position to see full details</p>
                </div>
                {totalInvestedAll > 0 && (
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Portfolio Value</p>
                      <p className="font-bold">${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total P&amp;L</p>
                      <p className={`font-bold ${totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalPL >= 0 ? '+' : ''}${Math.abs(totalPL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Card className="divide-y divide-border overflow-hidden">
                {activeHoldings.map((holding) => {
                  const quote = stockQuotes[holding.stockProduct?.symbol];
                  const qty = parseFloat(holding.quantity);
                  const purchasePrice = parseFloat(holding.purchasePrice);
                  const currentPrice = quote?.price ?? purchasePrice;
                  const currentValue = currentPrice * qty;
                  const totalInvested = parseFloat(holding.totalInvested);
                  const pl = currentValue - totalInvested;
                  const plPct = totalInvested > 0 ? (pl / totalInvested) * 100 : 0;
                  const hasLive = !!quote?.price;
                  const canShowPL = holding.status !== 'pending' && holding.status !== 'rejected' && hasLive;

                  return (
                    <button
                      key={holding.id}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
                      onClick={() => setSelectedHolding(holding)}
                      data-testid={`card-stock-holding-${holding.id}`}
                    >
                      <StockIcon symbol={holding.stockProduct?.symbol} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base" data-testid={`text-stock-symbol-${holding.stockProduct?.symbol}`}>
                            {holding.stockProduct?.symbol}
                          </span>
                          {statusBadge(holding.status ?? '', holding.id)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{holding.stockProduct?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{qty.toLocaleString()} shares</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {hasLive ? (
                          <>
                            <p className="font-semibold text-sm">${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            {canShowPL && (
                              <p className={`text-xs font-medium ${pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {pl >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </Card>
            </section>
          )}

          {/* ── AVAILABLE STOCKS (platform-seeded) ── */}
          {stockProducts && stockProducts.length > 0 && (
            <section className="space-y-4">
              <div className="pb-2 border-b border-border">
                <h2 className="text-2xl font-bold">Available Stocks</h2>
                <p className="text-sm text-muted-foreground">Curated stock offerings selected by our team</p>
              </div>

              {productsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stockProducts.map((stock) => {
                    const quote = stockQuotes[stock.symbol];
                    return (
                      <Card key={stock.id} className="p-5 hover:shadow-lg transition-shadow" data-testid={`card-available-stock-${stock.id}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <StockIcon symbol={stock.symbol} size="md" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{stock.symbol}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">{stock.sector}</p>
                            </div>
                          </div>
                          {quote && (
                            <Badge className={quote.changePercent >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                              {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm font-medium mb-1">{stock.name}</p>
                        {stock.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{stock.description}</p>
                        )}

                        <div className="mb-4">
                          {quote ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">${quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className={`text-sm ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {quote.change >= 0 ? '+' : ''}{quote.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground animate-pulse">Loading price…</div>
                          )}
                        </div>

                        <Dialog open={selectedStock?.id === stock.id} onOpenChange={(open) => !open && setSelectedStock(null)}>
                          <DialogTrigger asChild>
                            <Button className="w-full" onClick={() => setSelectedStock(stock)} data-testid={`button-buy-stock-${stock.id}`}>
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
                                <p className="text-sm font-medium mb-1">{stock.name}</p>
                                {quote && <p className="text-2xl font-bold">${quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per share</p>}
                              </div>
                              <div>
                                <Label htmlFor="quantity">Number of Shares</Label>
                                <Input
                                  id="quantity"
                                  type="number"
                                  placeholder={`Min. ${stock.minPurchaseQuantity}`}
                                  {...purchaseForm.register("quantity", { setValueAs: (v) => parseInt(v) || 1 })}
                                  data-testid="input-stock-quantity"
                                />
                                {purchaseForm.formState.errors.quantity && (
                                  <p className="text-sm text-red-500 mt-1">{purchaseForm.formState.errors.quantity.message}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">Minimum: {stock.minPurchaseQuantity} shares</p>
                              </div>
                              {purchaseForm.watch('quantity') > 0 && quote && (
                                <div className="p-4 bg-muted rounded-lg">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Total Cost</span>
                                    <span className="font-bold">${(purchaseForm.watch('quantity') * quote.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              )}
                              <Button type="submit" className="w-full" disabled={purchaseMutation.isPending || !quote} data-testid="button-confirm-purchase">
                                {purchaseMutation.isPending ? "Processing..." : "Confirm Purchase"}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── MARKET / TOP 150 ── */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-border">
              <div>
                <h2 className="text-2xl font-bold">Stock Market</h2>
                <p className="text-sm text-muted-foreground">Real-time prices from leading companies</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Input
                  placeholder="Search by symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                  data-testid="input-search-stocks"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {topPerformersLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading market data…</p>
              </div>
            ) : topPerformers && topPerformers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {topPerformers
                  .filter(s => !searchQuery || s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((stock) => (
                    <Card key={stock.symbol} className="p-3 md:p-4 hover:shadow-xl hover:border-primary/30 transition-all duration-200" data-testid={`card-top-stock-${stock.symbol}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => setLocation(`/stocks/${stock.symbol}`)}>
                          <StockIcon symbol={stock.symbol} size="sm" className="flex-shrink-0" />
                          <div className="min-w-0">
                            <h3 className="font-bold text-base md:text-lg mb-0.5" data-testid={`text-top-stock-symbol-${stock.symbol}`}>{stock.symbol}</h3>
                            <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">{stock.name}</p>
                          </div>
                        </div>
                        <Badge className={`ml-1 text-[10px] md:text-xs px-1.5 md:px-2 ${stock.changePercent >= 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {stock.changePercent >= 0 ? <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />}
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1.5 pb-2 border-b border-border/50 cursor-pointer" onClick={() => setLocation(`/stocks/${stock.symbol}`)}>
                          <span className="text-xl md:text-2xl font-bold tracking-tight">${stock.price.toFixed(2)}</span>
                          <span className={`text-[10px] md:text-sm font-semibold ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] md:text-xs cursor-pointer" onClick={() => setLocation(`/stocks/${stock.symbol}`)}>
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
                            <span className="font-semibold">{stock.marketCap ? '$' + (stock.marketCap / 1000000000).toFixed(1) + 'B' : 'N/A'}</span>
                          </div>
                        </div>

                        <Button
                          className="w-full mt-2 text-xs md:text-sm"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTopStock(stock);
                            purchaseForm.setValue('purchasePrice', stock.price);
                            purchaseForm.setValue('quantity', 1);
                          }}
                          data-testid={`button-buy-${stock.symbol}`}
                        >
                          Buy Now
                        </Button>
                      </div>
                    </Card>
                  ))}
                {topPerformers.filter(s => !searchQuery || s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <Card className="col-span-full p-8 text-center">
                    <p className="text-muted-foreground">No stocks match your search.</p>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Unable to load market data. Please try again later.</p>
              </Card>
            )}
          </section>
        </main>
      </div>

      {/* ── HOLDING DETAIL DIALOG ── */}
      <Dialog open={!!selectedHolding} onOpenChange={(open) => !open && setSelectedHolding(null)}>
        <DialogContent className="max-w-md">
          {selectedHolding && (() => {
            const h = selectedHolding;
            const sym = h.stockProduct?.symbol;
            const quote = stockQuotes[sym];
            const qty = parseFloat(h.quantity);
            const purchasePrice = parseFloat(h.purchasePrice);
            const currentPrice = quote?.price ?? purchasePrice;
            const totalInvested = parseFloat(h.totalInvested);
            const currentValue = currentPrice * qty;
            const pl = currentValue - totalInvested;
            const plPct = totalInvested > 0 ? (pl / totalInvested) * 100 : 0;
            const hasLive = !!quote?.price;
            const canShowPL = h.status !== 'pending' && h.status !== 'rejected' && hasLive;
            const purchaseDate = h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <StockIcon symbol={sym} size="lg" />
                    <div>
                      <DialogTitle className="text-xl">{sym}</DialogTitle>
                      <p className="text-sm text-muted-foreground">{h.stockProduct?.name}</p>
                    </div>
                    <div className="ml-auto">{statusBadge(h.status ?? '', h.id)}</div>
                  </div>
                </DialogHeader>

                {/* Live price strip */}
                {hasLive && (
                  <div className={`rounded-xl p-4 ${pl >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                        <p className="text-3xl font-bold">${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      {quote && (
                        <Badge className={`text-sm px-3 py-1.5 ${quote.changePercent >= 0 ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                          {quote.changePercent >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                          {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Detail rows */}
                <div className="space-y-1">
                  <DetailRow icon={<Calendar className="w-4 h-4 text-muted-foreground" />} label="Purchase Date" value={purchaseDate} />
                  <Separator />
                  <DetailRow icon={<BarChart2 className="w-4 h-4 text-muted-foreground" />} label="Shares Held" value={qty.toLocaleString()} />
                  <Separator />
                  <DetailRow icon={<DollarSign className="w-4 h-4 text-muted-foreground" />} label="Purchase Price / Share" value={`$${purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  <Separator />
                  <DetailRow icon={<DollarSign className="w-4 h-4 text-muted-foreground" />} label="Total Invested" value={`$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  {hasLive && (
                    <>
                      <Separator />
                      <DetailRow
                        icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
                        label="Current Value"
                        value={`$${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        bold
                      />
                    </>
                  )}
                  {canShowPL && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3 py-2">
                        <Percent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground flex-1">Profit / Loss</span>
                        <div className="text-right">
                          <p className={`font-bold ${pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pl >= 0 ? '+' : ''}${Math.abs(pl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className={`text-xs ${pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pl >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {h.stockProduct?.sector && (
                    <>
                      <Separator />
                      <DetailRow icon={<Activity className="w-4 h-4 text-muted-foreground" />} label="Sector" value={h.stockProduct.sector} />
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSelectedHolding(null); setLocation(`/stocks/${sym}`); }}
                >
                  View Full Stock Page
                </Button>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog for Market Stocks */}
      <Dialog open={!!selectedTopStock} onOpenChange={(open) => !open && setSelectedTopStock(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg rounded-2xl" data-testid={`dialog-buy-top-stock-${selectedTopStock?.symbol || ''}`}>
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              Purchase {selectedTopStock?.symbol} Shares
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedTopStock) {
              purchaseMutation.mutate({
                symbol: selectedTopStock.symbol,
                name: selectedTopStock.name,
                sector: 'Equity',
                quantity: purchaseForm.watch('quantity'),
                purchasePrice: purchaseForm.watch('purchasePrice'),
                stockProductId: '',
              });
            }
          }} className="space-y-4 sm:space-y-5">
            {selectedTopStock && (
              <>
                <Card className="p-4 sm:p-5 bg-gradient-to-br from-blue-500/10 via-primary/10 to-purple-500/10 border-primary/20 rounded-xl">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-bold text-xl sm:text-2xl tracking-tight">{selectedTopStock.symbol}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">{selectedTopStock.name}</p>
                      </div>
                      <Badge className={selectedTopStock.changePercent >= 0 ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 px-2 sm:px-3 py-1' : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 px-2 sm:px-3 py-1'}>
                        {selectedTopStock.changePercent >= 0 ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />}
                        {selectedTopStock.changePercent >= 0 ? '+' : ''}{selectedTopStock.changePercent.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2 sm:gap-3 pt-1 sm:pt-2">
                      <span className="text-3xl sm:text-4xl font-bold tracking-tight">${selectedTopStock.price.toFixed(2)}</span>
                      <span className={`text-base sm:text-lg font-semibold ${selectedTopStock.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {selectedTopStock.change >= 0 ? '+' : ''}${selectedTopStock.change.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="top-stock-quantity" className="text-sm font-semibold">Number of Shares</Label>
                  <Input
                    id="top-stock-quantity"
                    type="number"
                    placeholder="Enter quantity"
                    min="1"
                    className="text-lg h-12 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onWheel={(e) => e.currentTarget.blur()}
                    {...purchaseForm.register("quantity", { setValueAs: (v) => parseInt(v) || 1 })}
                    data-testid="input-top-stock-quantity"
                  />
                  {purchaseForm.formState.errors.quantity && (
                    <p className="text-sm text-red-500 mt-1">{purchaseForm.formState.errors.quantity.message}</p>
                  )}
                </div>

                {purchaseForm.watch('quantity') > 0 && (
                  <Card className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground font-medium">Price per share</span>
                        <span className="font-bold">${selectedTopStock.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground font-medium">Shares</span>
                        <span className="font-bold">{purchaseForm.watch('quantity').toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="font-semibold">Total Cost</span>
                        <span className="font-bold text-primary">${(purchaseForm.watch('quantity') * selectedTopStock.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </Card>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  disabled={purchaseMutation.isPending}
                  data-testid="button-confirm-top-stock-purchase"
                >
                  {purchaseMutation.isPending ? "Processing..." : `Buy ${purchaseForm.watch('quantity') || 1} Share${(purchaseForm.watch('quantity') || 1) !== 1 ? 's' : ''}`}
                </Button>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}

function DetailRow({ icon, label, value, bold }: { icon: React.ReactNode; label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}
