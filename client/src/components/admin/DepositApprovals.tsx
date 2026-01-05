import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, User, DollarSign, CreditCard, Building } from "lucide-react";

interface Deposit {
  id: string;
  userId: string;
  amount: string;
  method: string;
  status: string;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export function DepositApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deposits, isLoading } = useQuery<Deposit[]>({
    queryKey: ["/api/admin/deposits"],
  });

  const pendingDeposits = deposits?.filter(d => d.status === 'pending') || [];

  const approveMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const response = await apiRequest("POST", `/api/admin/deposits/${depositId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit Approved",
        description: "Deposit has been approved and funds added to user wallet.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
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
    mutationFn: async (depositId: string) => {
      const response = await apiRequest("POST", `/api/admin/deposits/${depositId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit Rejected",
        description: "Deposit has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Reject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer':
        return <Building className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading deposits...</p>
      </div>
    );
  }

  if (pendingDeposits.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No Pending Deposits</p>
          <p className="text-sm text-muted-foreground mt-2">
            All deposits have been processed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pending Deposits</h3>
          <p className="text-sm text-muted-foreground">
            Review and approve or reject user deposit requests
          </p>
        </div>
        <Badge variant="secondary">{pendingDeposits.length} Pending</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingDeposits.map((deposit) => (
          <Card key={deposit.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getMethodIcon(deposit.method || '')}
                  <CardTitle className="text-lg">
                    ${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </CardTitle>
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
                  {deposit.user?.email || 'Unknown User'}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium capitalize">{(deposit.method || 'Unknown').replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {new Date(deposit.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => approveMutation.mutate(deposit.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                  data-testid={`button-approve-deposit-${deposit.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => rejectMutation.mutate(deposit.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                  data-testid={`button-reject-deposit-${deposit.id}`}
                >
                  <XCircle className="w-4 h-4 mr-1" />
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
