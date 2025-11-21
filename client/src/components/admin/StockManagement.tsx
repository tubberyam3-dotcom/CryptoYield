import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import type { StockProduct, InsertStockProduct } from "@shared/schema";
import { insertStockProductSchema } from "@shared/schema";

export function StockManagement() {
  const [createStockOpen, setCreateStockOpen] = useState(false);
  
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

  const { data: stockProducts } = useQuery<StockProduct[]>({
    queryKey: ["/api/stocks/products"],
  });

  const createStockMutation = useMutation({
    mutationFn: async (stockData: InsertStockProduct) => {
      const response = await apiRequest("POST", "/api/stocks/products", {
        ...stockData,
        symbol: stockData.symbol.toUpperCase(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock Product Created",
        description: "New stock has been added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/products"] });
      setCreateStockOpen(false);
      form.reset();
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

  const handleCreateStock = form.handleSubmit((data) => {
    createStockMutation.mutate(data);
  });

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
            <form onSubmit={handleCreateStock} className="space-y-4">
              <div>
                <Label htmlFor="stockSymbol">Stock Symbol *</Label>
                <Input
                  id="stockSymbol"
                  placeholder="AAPL"
                  {...form.register("symbol", {
                    setValueAs: (value) => value.toUpperCase(),
                  })}
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
                  {...form.register("minPurchaseQuantity", {
                    setValueAs: (value) => parseInt(value) || 1,
                  })}
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
                {createStockMutation.isPending ? "Creating..." : "Add Stock"}
              </Button>
            </form>
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
