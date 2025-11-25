import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";

export function StockPurchaseApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingPurchases, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/stock-purchases/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/stock-purchases/${purchaseId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Approved",
        description: "Stock purchase has been approved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stock-purchases/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Approve",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/stock-purchases/${purchaseId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Rejected",
        description: "Stock purchase has been rejected and user refunded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stock-purchases/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Reject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading pending purchases...</p>
      </div>
    );
  }

  if (!pendingPurchases || pendingPurchases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No Pending Purchases</p>
          <p className="text-sm text-muted-foreground mt-2">
            All stock purchases have been processed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pending Stock Purchases</h3>
          <p className="text-sm text-muted-foreground">
            Review and approve or reject stock purchases
          </p>
        </div>
        <Badge variant="secondary">{pendingPurchases.length} Pending</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingPurchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{purchase.stockProduct.symbol}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {purchase.stockProduct.name}
                  </p>
                </div>
                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 pb-3 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  {purchase.user?.email || 'Unknown User'}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">
                    {parseFloat(purchase.quantity).toLocaleString()} shares
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Purchase Price</span>
                  <span className="font-medium">${parseFloat(purchase.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-bold text-base">
                    ${parseFloat(purchase.totalInvested).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => approveMutation.mutate(purchase.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid={`button-approve-${purchase.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => rejectMutation.mutate(purchase.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  data-testid={`button-reject-${purchase.id}`}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
