import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StockProduct } from "@shared/schema";

export function StockManagement() {
  const [createStockOpen, setCreateStockOpen] = useState(false);
  const [newStock, setNewStock] = useState({
    symbol: "",
    name: "",
    description: "",
    sector: "",
    minPurchaseQuantity: "1",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stockProducts } = useQuery<StockProduct[]>({
    queryKey: ["/api/stocks/products"],
  });

  const createStockMutation = useMutation({
    mutationFn: async (stockData: any) => {
      const response = await apiRequest("POST", "/api/stocks/products", stockData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock Product Created",
        description: "New stock has been added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/products"] });
      setCreateStockOpen(false);
      setNewStock({
        symbol: "",
        name: "",
        description: "",
        sector: "",
        minPurchaseQuantity: "1",
      });
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
        title: "Failed to Create Stock",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (stockId: string) => {
      const response = await apiRequest("DELETE", `/api/stocks/products/${stockId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock Deleted",
        description: "Stock has been removed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/products"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Stock",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateStock = () => {
    if (!newStock.symbol || !newStock.name) {
      toast({
        title: "Validation Error",
        description: "Symbol and name are required",
        variant: "destructive",
      });
      return;
    }

    createStockMutation.mutate({
      symbol: newStock.symbol.toUpperCase(),
      name: newStock.name,
      description: newStock.description,
      sector: newStock.sector,
      minPurchaseQuantity: newStock.minPurchaseQuantity,
      isActive: true,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Manage Stock Products</h3>
        
        <Dialog open={createStockOpen} onOpenChange={setCreateStockOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-stock">
              <i className="fas fa-plus mr-2"></i>
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" data-testid="dialog-create-stock">
            <DialogHeader>
              <DialogTitle>Add New Stock Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="stockSymbol">Stock Symbol *</Label>
                <Input
                  id="stockSymbol"
                  placeholder="AAPL"
                  value={newStock.symbol}
                  onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })}
                  data-testid="input-stock-symbol"
                />
              </div>
              
              <div>
                <Label htmlFor="stockName">Company Name *</Label>
                <Input
                  id="stockName"
                  placeholder="Apple Inc."
                  value={newStock.name}
                  onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                  data-testid="input-stock-name"
                />
              </div>
              
              <div>
                <Label htmlFor="stockDescription">Description</Label>
                <Textarea
                  id="stockDescription"
                  placeholder="Brief description of the company"
                  value={newStock.description}
                  onChange={(e) => setNewStock({ ...newStock, description: e.target.value })}
                  data-testid="textarea-stock-description"
                />
              </div>
              
              <div>
                <Label htmlFor="stockSector">Sector</Label>
                <Input
                  id="stockSector"
                  placeholder="Technology"
                  value={newStock.sector}
                  onChange={(e) => setNewStock({ ...newStock, sector: e.target.value })}
                  data-testid="input-stock-sector"
                />
              </div>
              
              <div>
                <Label htmlFor="minPurchaseQuantity">Minimum Purchase Quantity</Label>
                <Input
                  id="minPurchaseQuantity"
                  type="number"
                  placeholder="1"
                  value={newStock.minPurchaseQuantity}
                  onChange={(e) => setNewStock({ ...newStock, minPurchaseQuantity: e.target.value })}
                  data-testid="input-min-purchase-quantity"
                />
              </div>
              
              <Button 
                onClick={handleCreateStock}
                className="w-full"
                disabled={createStockMutation.isPending}
                data-testid="button-confirm-create-stock"
              >
                {createStockMutation.isPending ? "Creating..." : "Add Stock"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {stockProducts?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No stock products available. Add your first stock to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stockProducts?.map((stock) => (
            <Card key={stock.id} className="p-6" data-testid={`card-admin-stock-${stock.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold" data-testid={`text-stock-symbol-${stock.symbol}`}>
                      {stock.symbol}
                    </h4>
                    {stock.isActive ? (
                      <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-gray-500/10 text-gray-500 rounded-full">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm font-medium mb-1">{stock.name}</p>
                  {stock.description && (
                    <p className="text-sm text-muted-foreground mb-2">{stock.description}</p>
                  )}
                  {stock.sector && (
                    <p className="text-xs text-muted-foreground">Sector: {stock.sector}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Min. Purchase: {stock.minPurchaseQuantity} shares
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteStockMutation.mutate(stock.id)}
                  disabled={deleteStockMutation.isPending}
                  data-testid={`button-delete-stock-${stock.id}`}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
