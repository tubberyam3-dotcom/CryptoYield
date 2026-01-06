import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban,
  Loader2,
  RefreshCw,
  Check,
  X
} from "lucide-react";
import { format } from "date-fns";
import type { Deposit, Withdrawal } from "@shared/schema";

type DepositWithUser = Deposit & { user: { email: string; firstName: string; lastName: string } };
type WithdrawalWithUser = Withdrawal & { user: { email: string; firstName: string; lastName: string } };

export function TransactionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("deposits");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: deposits = [], isLoading: depositsLoading, refetch: refetchDeposits } = useQuery<DepositWithUser[]>({
    queryKey: ["/api/admin/deposits"],
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery<WithdrawalWithUser[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const depositMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' | 'cancel' }) => {
      const response = await apiRequest("POST", `/api/admin/deposits/${id}/${action}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process deposit",
        variant: "destructive",
      });
    },
  });

  const withdrawalMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' | 'cancel' }) => {
      const response = await apiRequest("POST", `/api/admin/withdrawals/${id}/${action}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" /> {status === 'failed' ? 'Failed' : 'Rejected'}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"><Ban className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    const methodMap: Record<string, { label: string; className: string }> = {
      'crypto': { label: 'Crypto', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
      'bank_transfer': { label: 'Bank Transfer', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      'card_payment': { label: 'Card', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      'deposit_coupon': { label: 'Coupon', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      'wire_transfer': { label: 'Wire Transfer', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      'merchant_pay': { label: 'Merchant Pay', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
    };
    const info = methodMap[method] || { label: method, className: '' };
    return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
  };

  const filteredDeposits = deposits.filter(d => statusFilter === 'all' || d.status === statusFilter);
  const filteredWithdrawals = withdrawals.filter(w => statusFilter === 'all' || w.status === statusFilter);

  const depositStats = {
    pending: deposits.filter(d => d.status === 'pending').length,
    completed: deposits.filter(d => d.status === 'completed').length,
    cancelled: deposits.filter(d => d.status === 'cancelled' || d.status === 'failed').length,
  };

  const withdrawalStats = {
    pending: withdrawals.filter(w => w.status === 'pending').length,
    completed: withdrawals.filter(w => w.status === 'completed').length,
    cancelled: withdrawals.filter(w => w.status === 'cancelled' || w.status === 'rejected').length,
  };

  const isLoading = depositsLoading || withdrawalsLoading;

  return (
    <div className="space-y-6" data-testid="transaction-management">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Transaction Management</h3>
          <p className="text-sm text-muted-foreground">
            View and manage deposits and withdrawals
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            refetchDeposits();
            refetchWithdrawals();
          }}
          disabled={isLoading}
          data-testid="button-refresh-transactions"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-green-500" />
              Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{depositStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{depositStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{depositStats.cancelled}</p>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-red-500" />
              Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{withdrawalStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{withdrawalStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{withdrawalStats.cancelled}</p>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="deposits" data-testid="tab-deposits">
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    Deposits ({deposits.length})
                  </TabsTrigger>
                  <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">
                    <ArrowUpFromLine className="w-4 h-4 mr-2" />
                    Withdrawals ({withdrawals.length})
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    data-testid="filter-all"
                  >
                    All
                  </Button>
                  <Button 
                    variant={statusFilter === 'pending' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('pending')}
                    className={statusFilter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    data-testid="filter-pending"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Button>
                  <Button 
                    variant={statusFilter === 'completed' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('completed')}
                    className={statusFilter === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
                    data-testid="filter-completed"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                  </Button>
                  <Button 
                    variant={statusFilter === 'cancelled' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('cancelled')}
                    className={statusFilter === 'cancelled' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                    data-testid="filter-cancelled"
                  >
                    <Ban className="w-3 h-3 mr-1" />
                    Cancelled
                  </Button>
                </div>
              </div>

              <TabsContent value="deposits" className="mt-4">
                {depositsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredDeposits.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No deposits found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeposits.map((deposit) => (
                        <TableRow key={deposit.id} data-testid={`deposit-row-${deposit.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{deposit.user.firstName} {deposit.user.lastName}</p>
                              <p className="text-xs text-muted-foreground">{deposit.user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            +${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{getMethodBadge(deposit.depositMethod)}</TableCell>
                          <TableCell>{getStatusBadge(deposit.status || 'pending')}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {deposit.createdAt ? format(new Date(deposit.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {deposit.status === 'pending' && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => depositMutation.mutate({ id: deposit.id, action: 'approve' })}
                                  disabled={depositMutation.isPending}
                                  data-testid={`approve-deposit-${deposit.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => depositMutation.mutate({ id: deposit.id, action: 'reject' })}
                                  disabled={depositMutation.isPending}
                                  data-testid={`reject-deposit-${deposit.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                  onClick={() => depositMutation.mutate({ id: deposit.id, action: 'cancel' })}
                                  disabled={depositMutation.isPending}
                                  data-testid={`cancel-deposit-${deposit.id}`}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="withdrawals" className="mt-4">
                {withdrawalsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredWithdrawals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No withdrawals found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id} data-testid={`withdrawal-row-${withdrawal.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{withdrawal.user.firstName} {withdrawal.user.lastName}</p>
                              <p className="text-xs text-muted-foreground">{withdrawal.user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            -${parseFloat(withdrawal.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{getMethodBadge(withdrawal.withdrawMethod)}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={withdrawal.destinationAddress || ''}>
                            {withdrawal.destinationAddress || '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status || 'pending')}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {withdrawal.createdAt ? format(new Date(withdrawal.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {withdrawal.status === 'pending' && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => withdrawalMutation.mutate({ id: withdrawal.id, action: 'approve' })}
                                  disabled={withdrawalMutation.isPending}
                                  data-testid={`approve-withdrawal-${withdrawal.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => withdrawalMutation.mutate({ id: withdrawal.id, action: 'reject' })}
                                  disabled={withdrawalMutation.isPending}
                                  data-testid={`reject-withdrawal-${withdrawal.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                  onClick={() => withdrawalMutation.mutate({ id: withdrawal.id, action: 'cancel' })}
                                  disabled={withdrawalMutation.isPending}
                                  data-testid={`cancel-withdrawal-${withdrawal.id}`}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
