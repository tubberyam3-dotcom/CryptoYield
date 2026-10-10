import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertUserStockSchema } from "@shared/schema";
import { z } from "zod";
import { ArrowLeft, TrendingUp, TrendingDown, Building2, Tag, Calendar, BarChart3, DollarSign, Activity, Clock, ShoppingCart } from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StockIcon } from "@/components/StockIcon";

const purchaseFormSchema = z.object({
  stockProductId: z.string().min(1, "Stock ID is required"),
  quantity: z.string().min(1, "Quantity is required"),
  accountId: z.string().min(1, "Account ID is required"),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function StockDetail() {
  const { symbol } = useParams();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const { toast } = useToast();

  const { data: user } = useQuery<any>({
    queryKey: ['/api/user'],
  });

  const { data: stockProduct, isLoading: productLoading } = useQuery({
    queryKey: ['/api/stocks/products', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/products?symbol=${symbol}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data[0] || null;
    },
  });

  useEffect(() => {
    if (symbol) {
      setLoadingQuote(true);
      fetch(`/api/stocks/quote?symbol=${symbol}`)
        .then(res => {
          if (!res.ok) throw new Error('Current market quote unavailable');
          return res.json();
        })
        .then(data => {
          setQuote(data);
          setLoadingQuote(false);
        })
        .catch(err => {
          setQuote(null);
          console.error('Failed to fetch quote:', err);
          setLoadingQuote(false);
        });

      const interval = setInterval(() => {
        fetch(`/api/stocks/quote?symbol=${symbol}`)
          .then(res => {
            if (!res.ok) throw new Error('Current market quote unavailable');
            return res.json();
          })
          .then(data => setQuote(data))
          .catch(err => {
            setQuote(null);
            console.error('Failed to refresh quote:', err);
          });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [symbol]);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      stockProductId: stockProduct?.id || "",
      quantity: "",
      accountId: user?.activeAccountId || "",
    },
  });

  useEffect(() => {
    if (stockProduct?.id) {
      form.setValue('stockProductId', stockProduct.id);
    }
  }, [stockProduct, form]);

  useEffect(() => {
    if (user?.activeAccountId) {
      form.setValue('accountId', user.activeAccountId);
    }
  }, [user, form]);

  const purchaseMutation = useMutation({
    mutationFn: async (values: PurchaseFormValues) => {
      return apiRequest('/api/user/stocks', 'POST', {
        stockProductId: values.stockProductId,
        accountId: values.accountId,
        quantity: parseFloat(values.quantity),
        purchasePrice: quote.price.toString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Purchase Submitted",
        description: `Your purchase of ${form.getValues('quantity')} shares is pending admin approval. You'll be refunded if rejected.`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/user/stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error.message,
      });
    },
  });

  const nonAdminPurchaseMutation = useMutation({
    mutationFn: async (data: { quantity: number; price: number }) => {
      const response = await apiRequest("POST", "/api/user/stocks", {
        symbol: symbol,
        name: quote.name,
        sector: 'Technology',
        quantity: data.quantity.toString(),
        purchasePrice: data.price.toString(),
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Purchase Submitted",
        description: `Your purchase of ${variables.quantity} shares is pending admin approval. You'll be refunded if rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setShowPurchaseDialog(false);
      setPurchaseQuantity(1);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error.message,
      });
    },
  });

  const onSubmit = (values: PurchaseFormValues) => {
    purchaseMutation.mutate(values);
  };

  if (loadingQuote) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <TopBar title="Stock Details" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
          
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading stock details...</p>
            </div>
          </main>
        </div>
        
        <MobileNav />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <TopBar title="Stock Details" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
          
          <main className="flex-1 p-6 flex items-center justify-center">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Unable to load stock information</p>
              <Button onClick={() => setLocation('/stocks')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Stocks
              </Button>
            </Card>
          </main>
        </div>
        
        <MobileNav />
      </div>
    );
  }

  const isAdminOffering = !!stockProduct;

  const quantity = form.watch('quantity');
  const totalCost = quantity ? parseFloat(quantity) * quote.price : 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <TopBar title="Stock Details" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Back Button */}
            <Button 
              onClick={() => setLocation('/stocks')} 
              variant="ghost" 
              className="mb-2"
              data-testid="button-back-to-stocks"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stocks
            </Button>

            {/* Stock Header */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <StockIcon symbol={symbol || ""} size="lg" />
                    <h1 className="text-4xl font-bold" data-testid="text-stock-symbol">{symbol}</h1>
                    <Badge className={quote.changePercent >= 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                      {quote.changePercent >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                    </Badge>
                  </div>
                  <h2 className="text-xl text-muted-foreground mb-1">{quote.name}</h2>
                  {stockProduct?.sector && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      {stockProduct.sector}
                    </div>
                  )}
                </div>
                
                <div className="text-left md:text-right">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-5xl font-bold tracking-tight">${quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`text-lg font-semibold ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {quote.change >= 0 ? '+' : ''}${Math.abs(quote.change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Today
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Market Data */}
              <div className="lg:col-span-2 space-y-6">
                {/* Key Statistics */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Key Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Previous Close</p>
                      <p className="text-xl font-semibold">${quote.previousClose?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Day High</p>
                      <p className="text-xl font-semibold text-green-500">${quote.dayHigh?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Day Low</p>
                      <p className="text-xl font-semibold text-red-500">${quote.dayLow?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Volume</p>
                      <p className="text-xl font-semibold">
                        {quote.volume ? (quote.volume / 1000000).toFixed(2) + 'M' : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                      <p className="text-xl font-semibold">
                        {quote.marketCap ? '$' + (quote.marketCap / 1000000000).toFixed(2) + 'B' : 'N/A'}
                      </p>
                    </div>
                    {isAdminOffering && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Min. Purchase</p>
                        <p className="text-xl font-semibold">{stockProduct.minPurchaseQuantity} shares</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* About */}
                {stockProduct?.description && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      About {quote.name}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{stockProduct.description}</p>
                  </Card>
                )}
              </div>

              {/* Purchase Form or Info Card */}
              <div className="lg:col-span-1">
                {isAdminOffering ? (
                  <Card className="p-6 sticky top-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Buy Shares
                    </h3>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Stock Price Card */}
                        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Current Price</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold">${quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className="text-sm text-muted-foreground">per share</span>
                            </div>
                            <Badge className={quote.changePercent >= 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                              {quote.changePercent >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                              {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                            </Badge>
                          </div>
                        </Card>

                        {/* Quantity Input */}
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Shares</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder={`Min: ${stockProduct?.minPurchaseQuantity || 1}`}
                                  {...field}
                                  min={stockProduct?.minPurchaseQuantity || 1}
                                  step="1"
                                  className="text-lg"
                                  data-testid="input-quantity"
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum: {stockProduct?.minPurchaseQuantity || 1} shares
                              </p>
                            </FormItem>
                          )}
                        />

                        {/* Cost Summary Card */}
                        {quantity && (
                          <Card className="p-4 bg-muted/50">
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Price per share</span>
                                <span className="font-medium">${quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Quantity</span>
                                <span className="font-medium">{quantity} shares</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between items-center">
                                <span className="font-semibold">Total Cost</span>
                                <span className="text-2xl font-bold text-primary">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </Card>
                        )}

                        {/* Approval Notice */}
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                          <div className="flex gap-2">
                            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                              Purchase requires admin approval. Funds will be deducted and refunded if rejected.
                            </p>
                          </div>
                        </div>

                        {/* Purchase Button */}
                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          disabled={purchaseMutation.isPending || !quantity}
                          data-testid="button-purchase-stock"
                        >
                          {purchaseMutation.isPending ? (
                            <>
                              <Activity className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Purchase {quantity || 0} {parseInt(quantity) === 1 ? 'Share' : 'Shares'}
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          Market quotes refresh every 30 seconds. Provider delays may apply.
                        </p>
                      </form>
                    </Form>
                  </Card>
                ) : (
                  <Card className="p-6 sticky top-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Buy Shares
                    </h3>
                    <div className="space-y-4">
                      {loadingQuote ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : quote ? (
                        <>
                          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                            <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                            <p className="text-3xl font-bold">${quote.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</p>
                            <Badge className={`mt-2 ${quote.change >= 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                              {quote.changePercent >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                              {quote.change >= 0 ? '+' : ''}{Math.abs(quote.change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({quote.changePercent?.toFixed(2)}%)
                            </Badge>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Day High</span>
                              <span className="font-medium text-green-600">${quote.dayHigh?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Day Low</span>
                              <span className="font-medium text-red-600">${quote.dayLow?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Volume</span>
                              <span className="font-medium">{quote.volume ? (quote.volume / 1e6).toFixed(1) + 'M' : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Market Cap</span>
                              <span className="font-medium">${quote.marketCap ? (quote.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}</span>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <Button
                            onClick={() => setShowPurchaseDialog(true)}
                            className="w-full"
                            size="lg"
                            data-testid="button-buy-stock-detail"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Buy Now
                          </Button>
                          
                          <p className="text-xs text-muted-foreground text-center">
                            Market quotes refresh every 30 seconds. Provider delays may apply.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Unable to load market data</p>
                      )}
                    </div>
                  </Card>
                )}
            </div>
          </div>
          </div>
        </main>
      </div>
      
      {/* Purchase Dialog for Non-Admin Stocks */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg rounded-2xl" data-testid="dialog-purchase-stock-detail">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              Purchase {symbol} Shares
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 sm:space-y-5">
            {/* Stock Info Card */}
            <Card className="p-4 sm:p-5 bg-gradient-to-br from-blue-500/10 via-primary/10 to-purple-500/10 border-primary/20 shadow-lg rounded-xl">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl sm:text-2xl tracking-tight">{symbol}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">{quote?.name}</p>
                  </div>
                  <Badge className={quote?.changePercent >= 0 ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 px-2 sm:px-3 py-1 text-xs sm:text-sm' : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 px-2 sm:px-3 py-1 text-xs sm:text-sm'}>
                    {quote?.changePercent >= 0 ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />}
                    {quote?.changePercent >= 0 ? '+' : ''}{quote?.changePercent?.toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2 sm:gap-3 pt-1 sm:pt-2">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight">${quote?.price?.toFixed(2)}</span>
                  <span className={`text-base sm:text-lg font-semibold ${quote?.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {quote?.change >= 0 ? '+' : ''}${quote?.change?.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
            
            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="purchase-quantity" className="text-sm font-semibold">Number of Shares</Label>
              <Input
                id="purchase-quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                onWheel={(e) => e.currentTarget.blur()}
                className="text-lg h-12 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                data-testid="input-purchase-quantity-detail"
              />
            </div>
            
            {/* Cost Summary Card */}
            <Card className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground font-medium">Price per share</span>
                  <span className="font-bold text-foreground">${quote?.price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground font-medium">Quantity</span>
                  <span className="font-bold text-foreground">{purchaseQuantity} {purchaseQuantity === 1 ? 'share' : 'shares'}</span>
                </div>
                <Separator className="my-1 sm:my-2" />
                <div className="flex justify-between items-center pt-1 sm:pt-2">
                  <span className="font-bold text-sm sm:text-base">Total Investment</span>
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    ${((quote?.price || 0) * purchaseQuantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
            
            {/* Approval Notice */}
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <div className="p-1 sm:p-1.5 rounded-lg bg-orange-500/20 h-fit">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300">Approval Required</p>
                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 leading-relaxed">
                    This purchase requires admin approval. Funds will be deducted immediately and refunded if rejected.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPurchaseDialog(false)}
                className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
                data-testid="button-cancel-purchase"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (quote) {
                    nonAdminPurchaseMutation.mutate({
                      quantity: purchaseQuantity,
                      price: quote.price,
                    });
                  }
                }}
                disabled={nonAdminPurchaseMutation.isPending || purchaseQuantity < 1}
                className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-lg"
                data-testid="button-confirm-purchase-detail"
              >
                {nonAdminPurchaseMutation.isPending ? (
                  <>
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Confirm - {purchaseQuantity} {purchaseQuantity === 1 ? 'Share' : 'Shares'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <MobileNav />
    </div>
  );
}
