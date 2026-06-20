import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StockProduct, InsertStockProduct } from "@shared/schema";
import { insertStockProductSchema } from "@shared/schema";
import { Search, Plus, TrendingUp, TrendingDown, CheckCircle, PlusCircle } from "lucide-react";
import { StockIcon } from "@/components/StockIcon";

interface MarketStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
}

export function StockManagement() {
  const [createStockOpen, setCreateStockOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [platformSearch, setPlatformSearch] = useState("");
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertStockProduct>({
    resolver: zodResolver(insertStockProductSchema.extend({
      minPurchaseQuantity: insertStockProductSchema.shape.minPurchaseQuantity.refine(
        (val) => val && parseInt(val.toString()) > 0,
        { message: "Must be a positive number" }
      ),
    })),
    defaultValues: {
      symbol: "",
      name: "",
      description: "",
      sector: "",
      minPurchaseQuantity: 1,
      isActive: true,
    },
  });

  const { data: stockProducts, isLoading: loadingProducts } = useQuery<StockProduct[]>({
    queryKey: ["/api/stocks/products"],
  });

  const { data: marketStocks, isLoading: loadingMarket } = useQuery<MarketStock[]>({
    queryKey: ["/api/stocks/top-performers"],
  });

  const addedSymbols = new Set(stockProducts?.map(s => s.symbol) ?? []);

  const createStockMutation = useMutation({
    mutationFn: async (stockData: InsertStockProduct) => {
      const response = await apiRequest("POST", "/api/stocks/products", {
        ...stockData,
        symbol: stockData.symbol.toUpperCase(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Stock Added", description: "Stock is now available for users to purchase." });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/products"] });
      setCreateStockOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in to continue", variant: "destructive" });
        return;
      }
      toast({ title: "Failed to Add Stock", description: error.message, variant: "destructive" });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: async (stock: MarketStock) => {
      setAddingSymbol(stock.symbol);
      const response = await apiRequest("POST", "/api/stocks/products", {
        symbol: stock.symbol,
        name: stock.name,
        description: `${stock.name} — traded on major exchanges.`,
        sector: guessSector(stock.symbol),
        minPurchaseQuantity: 1,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: (_, stock) => {
      toast({ title: `${stock.symbol} Added`, description: `${stock.name} is now available for users.` });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/products"] });
      setAddingSymbol(null);
    },
    onError: (error: any) => {
      setAddingSymbol(null);
      toast({ title: "Failed to Add Stock", description: error.message, variant: "destructive" });
    },
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (stockId: string) => {
      const response = await apiRequest("DELETE", `/api/stocks/products/${stockId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Stock Removed", description: "Stock has been removed from the platform." });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/products"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Remove Stock", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateStock = form.handleSubmit((data) => {
    createStockMutation.mutate(data);
  });

  const filteredMarket = marketStocks?.filter(s => {
    const q = catalogSearch.toLowerCase();
    return !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  }) ?? [];

  const filteredPlatform = stockProducts?.filter(s => {
    const q = platformSearch.toLowerCase();
    return !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  }) ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Stock Management</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {addedSymbols.size} of {marketStocks?.length ?? 0} stocks enabled for users
          </p>
        </div>

        <Dialog open={createStockOpen} onOpenChange={setCreateStockOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-stock">
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" data-testid="dialog-create-stock">
            <DialogHeader>
              <DialogTitle>Add Custom Stock</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStock} className="space-y-4">
              <div>
                <Label htmlFor="stockSymbol">Stock Symbol *</Label>
                <Input
                  id="stockSymbol"
                  placeholder="AAPL"
                  {...form.register("symbol", { setValueAs: (v) => v.toUpperCase() })}
                  data-testid="input-stock-symbol"
                />
                {form.formState.errors.symbol && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.symbol.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="stockName">Company Name *</Label>
                <Input
                  id="stockName"
                  placeholder="Apple Inc."
                  {...form.register("name")}
                  data-testid="input-stock-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="stockDescription">Description</Label>
                <Textarea
                  id="stockDescription"
                  placeholder="Brief description of the company"
                  {...form.register("description")}
                  data-testid="textarea-stock-description"
                />
              </div>
              <div>
                <Label htmlFor="stockSector">Sector</Label>
                <Input
                  id="stockSector"
                  placeholder="Technology"
                  {...form.register("sector")}
                  data-testid="input-stock-sector"
                />
              </div>
              <div>
                <Label htmlFor="minPurchaseQuantity">Minimum Purchase Quantity</Label>
                <Input
                  id="minPurchaseQuantity"
                  type="number"
                  placeholder="1"
                  {...form.register("minPurchaseQuantity", { setValueAs: (v) => parseInt(v) || 1 })}
                  data-testid="input-min-purchase-quantity"
                />
                {form.formState.errors.minPurchaseQuantity && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.minPurchaseQuantity.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createStockMutation.isPending}
                data-testid="button-confirm-create-stock"
              >
                {createStockMutation.isPending ? "Adding..." : "Add Stock"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="catalog">
            Stock Catalog
            <Badge className="ml-2 bg-muted text-muted-foreground text-xs">{marketStocks?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="platform">
            Platform Stocks
            <Badge className="ml-2 bg-primary/10 text-primary text-xs">{addedSymbols.size}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── CATALOG TAB: all 150 market stocks ── */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by symbol or company name…"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingMarket ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </Card>
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {filteredMarket.length} stock{filteredMarket.length !== 1 ? "s" : ""}
                {catalogSearch ? ` matching "${catalogSearch}"` : ""}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMarket.map((stock) => {
                  const isOnPlatform = addedSymbols.has(stock.symbol);
                  const isAdding = addingSymbol === stock.symbol;
                  return (
                    <Card
                      key={stock.symbol}
                      className={`p-4 transition-colors ${isOnPlatform ? "border-green-500/30 bg-green-500/5" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <StockIcon symbol={stock.symbol} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm">{stock.symbol}</span>
                              {isOnPlatform && (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm">
                            ${stock.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <span className={`text-xs ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stock.changePercent >= 0 ? (
                              <TrendingUp className="inline w-3 h-3 mr-0.5" />
                            ) : (
                              <TrendingDown className="inline w-3 h-3 mr-0.5" />
                            )}
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        {isOnPlatform ? (
                          <Badge className="w-full justify-center bg-green-500/10 text-green-600 border-green-500/20 text-xs py-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Available to Users
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            disabled={isAdding || quickAddMutation.isPending}
                            onClick={() => quickAddMutation.mutate(stock)}
                          >
                            {isAdding ? (
                              "Adding…"
                            ) : (
                              <>
                                <PlusCircle className="w-3 h-3 mr-1" />
                                Add to Platform
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── PLATFORM TAB: stocks enabled for users ── */}
        <TabsContent value="platform" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search platform stocks…"
              value={platformSearch}
              onChange={(e) => setPlatformSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingProducts ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </Card>
              ))}
            </div>
          ) : filteredPlatform.length === 0 ? (
            <Card className="p-8 text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground font-medium">No stocks on the platform yet</p>
              <p className="text-sm text-muted-foreground mt-1">Switch to the Stock Catalog tab and click "Add to Platform" to enable stocks for users.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPlatform.map((stock) => (
                <Card key={stock.id} className="p-5" data-testid={`card-admin-stock-${stock.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StockIcon symbol={stock.symbol} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-base font-semibold" data-testid={`text-stock-symbol-${stock.symbol}`}>
                            {stock.symbol}
                          </h4>
                          {stock.isActive ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-tight">{stock.name}</p>
                        {stock.sector && (
                          <p className="text-xs text-muted-foreground mt-0.5">{stock.sector}</p>
                        )}
                        {stock.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{stock.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Min. {stock.minPurchaseQuantity} share{parseFloat(stock.minPurchaseQuantity ?? '1') !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => deleteStockMutation.mutate(stock.id)}
                      disabled={deleteStockMutation.isPending}
                      data-testid={`button-delete-stock-${stock.id}`}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function guessSector(symbol: string): string {
  const tech = ['AAPL','MSFT','GOOGL','AMZN','NVDA','META','ADBE','CRM','AMD','ORCL','ACN','CSCO','QCOM','TXN','INTC','INTU','IBM','NOW','PANW','SNPS','CDNS','FTNT','MRVL','AMAT','MU','LRCX','KLAC','ANSS','ROP','MCHP','TER','KEYS','EPAM','ZBRA','PAYC','GDDY','NET','COIN','PYPL','UBER'];
  const health = ['LLY','UNH','JNJ','ABBV','MRK','ABT','DHR','TMO','PFE','AMGN','BMY','GILD','REGN','VRTX','ISRG','SYK','ZTS','ELV','CI','HCA','BSX','BDX','MDT'];
  const finance = ['BRK-B','V','JPM','MA','GS','MS','WFC','BAC','AXP','BLK','SCHW','CME','ICE','PNC','USB','TFC','COF','MET','PRU','CB','SPGI'];
  const consumer = ['WMT','HD','COST','MCD','NKE','KO','PEP','LOW','SBUX','TGT','DG','DLTR','ROST','CMG','YUM','DPZ','ORLY','AZO','BKNG','MAR','HLT','F','GM','EBAY','ABNB','SNAP'];
  const energy = ['XOM','CVX','SLB','EOG','MPC','VLO','OXY','HAL','DVN','COP','WMB','KMI'];
  const industrial = ['HON','UPS','CAT','BA','MMM','DE','EMR','GE','ITW','PH','RTX','LMT','NOC','GD','FDX','UNP'];
  const telecom = ['T','VZ','TMUS','CMCSA'];
  const utility = ['NEE'];
  const realestate = ['AMT','PLD'];
  const aerospace = ['SPACEX'];

  if (tech.includes(symbol)) return 'Technology';
  if (health.includes(symbol)) return 'Healthcare';
  if (finance.includes(symbol)) return 'Financials';
  if (consumer.includes(symbol)) return 'Consumer';
  if (energy.includes(symbol)) return 'Energy';
  if (industrial.includes(symbol)) return 'Industrials';
  if (telecom.includes(symbol)) return 'Telecommunications';
  if (utility.includes(symbol)) return 'Utilities';
  if (realestate.includes(symbol)) return 'Real Estate';
  if (aerospace.includes(symbol)) return 'Aerospace & Defense';
  return 'Equity';
}
