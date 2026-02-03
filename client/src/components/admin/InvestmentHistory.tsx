import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, 
  Eye, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Clock, 
  User,
  PieChart,
  Wallet,
  Briefcase,
  XCircle
} from "lucide-react";

interface InvestmentDetail {
  id: string;
  userId: string;
  portfolioId: string;
  investedAmount: string;
  currentValue: string;
  returns: string;
  status: string;
  unitsPurchased: string;
  totalAccruedProfit: string;
  accruedUnpaidProfit: string;
  periodsCompleted: number;
  nextInterestAt: string | null;
  lastInterestAppliedAt: string | null;
  maturityPaidAt: string | null;
  investmentStartDate: string;
  investmentEndDate: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  portfolio: {
    id: string;
    name: string;
    interestRate: string;
    interestPeriod: string;
    payoutTerm: string;
    termDuration: number;
    riskLevel: string;
  };
}

interface BondInvestment {
  id: string;
  userId: string;
  bondId: string;
  investmentAmount: string;
  expectedReturn: string;
  status: string;
  purchaseDate: string;
  maturityDate: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  bond: {
    id: string;
    name: string;
    bondType: string;
    yield: string;
    maturityMonths: number;
  };
}

interface StockPurchase {
  id: string;
  userId: string;
  symbol: string;
  quantity: string;
  purchasePrice: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

function formatDate(date: string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(amount: string | number | undefined | null) {
  if (amount === undefined || amount === null) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/30';
    case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/30';
    case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    default: return 'bg-muted/10 text-muted-foreground border-muted-foreground/30';
  }
}

function InvestmentDetailModal({ investment }: { investment: InvestmentDetail }) {
  const dailyPayout = parseFloat(investment.portfolio?.interestRate || '0') * parseFloat(investment.currentValue);
  const daysRemaining = investment.investmentEndDate 
    ? Math.max(0, Math.ceil((new Date(investment.investmentEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Investor</p>
          <p className="font-medium">{investment.user?.firstName} {investment.user?.lastName}</p>
          <p className="text-xs text-muted-foreground">{investment.user?.email}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Portfolio</p>
          <p className="font-medium">{investment.portfolio?.name}</p>
          <Badge variant="outline" className={getStatusColor(investment.status)}>
            {investment.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Invested Amount</p>
          <p className="text-lg font-bold">{formatCurrency(investment.investedAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Current Value</p>
          <p className="text-lg font-bold text-green-500">{formatCurrency(investment.currentValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Returns</p>
          <p className="text-lg font-bold text-accent">{formatCurrency(investment.returns || '0')}</p>
        </Card>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Investment Duration & Payout
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Start Date</p>
            <p className="font-medium">{formatDate(investment.investmentStartDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">End Date</p>
            <p className="font-medium">{formatDate(investment.investmentEndDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Days Remaining</p>
            <p className="font-medium">{daysRemaining !== null ? `${daysRemaining} days` : 'Ongoing'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Periods Completed</p>
            <p className="font-medium">{investment.periodsCompleted} / {investment.portfolio?.termDuration}</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Interest & Payout Details
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Interest Rate</p>
            <p className="font-medium">{(parseFloat(investment.portfolio?.interestRate || '0') * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Interest Period</p>
            <p className="font-medium capitalize">{investment.portfolio?.interestPeriod}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payout Term</p>
            <p className="font-medium capitalize">{investment.portfolio?.payoutTerm?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Est. {investment.portfolio?.interestPeriod} Payout</p>
            <p className="font-medium text-green-500">{formatCurrency(dailyPayout)}</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Profit Tracking
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Accrued Profit</p>
            <p className="font-medium text-green-500">{formatCurrency(investment.totalAccruedProfit || '0')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unpaid Profit (Pending)</p>
            <p className="font-medium text-yellow-500">{formatCurrency(investment.accruedUnpaidProfit || '0')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Interest Applied</p>
            <p className="font-medium">{formatDate(investment.lastInterestAppliedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Next Interest Due</p>
            <p className="font-medium">{formatDate(investment.nextInterestAt)}</p>
          </div>
        </div>
      </div>

      {investment.maturityPaidAt && (
        <div className="border border-green-500/30 rounded-lg p-4 bg-green-500/5">
          <p className="text-sm text-green-500 font-medium">
            Maturity payout completed on {formatDate(investment.maturityPaidAt)}
          </p>
        </div>
      )}
    </div>
  );
}

export function InvestmentHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentDetail | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [investmentToCancel, setInvestmentToCancel] = useState<InvestmentDetail | null>(null);
  const { toast } = useToast();

  const { data: allInvestments, isLoading: investmentsLoading } = useQuery<InvestmentDetail[]>({
    queryKey: ["/api/admin/all-investments"],
    staleTime: 0,
  });

  const { data: allBonds, isLoading: bondsLoading } = useQuery<BondInvestment[]>({
    queryKey: ["/api/admin/all-bonds"],
    staleTime: 0,
  });

  const { data: stockPurchases, isLoading: stocksLoading } = useQuery<StockPurchase[]>({
    queryKey: ["/api/admin/stock-purchases"],
    staleTime: 0,
  });

  const cancelMutation = useMutation({
    mutationFn: async (investmentId: string) => {
      const response = await apiRequest('POST', `/api/admin/user-portfolios/${investmentId}/cancel`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Investment Cancelled",
        description: `Refunded $${data.refundAmount} to user's account.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-investments"] });
      setCancelDialogOpen(false);
      setInvestmentToCancel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel investment",
        variant: "destructive",
      });
    },
  });

  const filteredInvestments = allInvestments?.filter(inv => {
    const matchesSearch = 
      inv.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.portfolio?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredBonds = allBonds?.filter(bond => {
    const matchesSearch = 
      bond.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bond.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bond.bond?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || bond.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredStocks = stockPurchases?.filter(stock => {
    const matchesSearch = 
      stock.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || stock.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const totalInvested = allInvestments?.reduce((sum, inv) => sum + parseFloat(inv.investedAmount || '0'), 0) || 0;
  const totalReturns = allInvestments?.reduce((sum, inv) => sum + parseFloat(inv.totalAccruedProfit || '0'), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investment History</h2>
          <p className="text-muted-foreground">View all user investments, payouts, and earnings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Portfolio Investments</p>
              <p className="text-xl font-bold">{allInvestments?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invested</p>
              <p className="text-xl font-bold">{formatCurrency(totalInvested)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Returns Paid</p>
              <p className="text-xl font-bold text-green-500">{formatCurrency(totalReturns)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bond + Stock Purchases</p>
              <p className="text-xl font-bold">{(allBonds?.length || 0) + (stockPurchases?.length || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by user name, email, or investment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="portfolios" className="w-full">
        <TabsList>
          <TabsTrigger value="portfolios" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Portfolios ({filteredInvestments.length})
          </TabsTrigger>
          <TabsTrigger value="bonds" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Bonds ({filteredBonds.length})
          </TabsTrigger>
          <TabsTrigger value="stocks" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Stocks ({filteredStocks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Investments</CardTitle>
            </CardHeader>
            <CardContent>
              {investmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredInvestments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No portfolio investments found</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredInvestments.map((investment) => (
                      <div 
                        key={investment.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{investment.user?.firstName} {investment.user?.lastName}</p>
                            <p className="text-sm text-muted-foreground">{investment.portfolio?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(investment.investedAmount)}</p>
                          <p className="text-sm text-green-500">+{formatCurrency(investment.totalAccruedProfit || '0')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={getStatusColor(investment.status)}>
                            {investment.status}
                          </Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedInvestment(investment)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Investment Details</DialogTitle>
                              </DialogHeader>
                              <InvestmentDetailModal investment={investment} />
                            </DialogContent>
                          </Dialog>
                          {investment.status !== 'cancelled' && investment.status !== 'rejected' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setInvestmentToCancel(investment);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonds" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bond Investments</CardTitle>
            </CardHeader>
            <CardContent>
              {bondsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredBonds.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bond investments found</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredBonds.map((bond) => (
                      <div 
                        key={bond.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">{bond.user?.firstName} {bond.user?.lastName}</p>
                            <p className="text-sm text-muted-foreground">{bond.bond?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(bond.investmentAmount)}</p>
                          <p className="text-sm text-muted-foreground">{bond.bond?.yield}% yield</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Maturity</p>
                          <p className="font-medium">{formatDate(bond.maturityDate)}</p>
                        </div>
                        <Badge variant="outline" className={getStatusColor(bond.status)}>
                          {bond.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stocks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              {stocksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredStocks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No stock purchases found</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredStocks.map((stock) => (
                      <div 
                        key={stock.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center font-bold text-green-500 text-sm">
                            {stock.symbol?.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{stock.user?.firstName} {stock.user?.lastName}</p>
                            <p className="text-sm text-muted-foreground">{stock.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{stock.quantity} shares</p>
                          <p className="text-sm text-muted-foreground">@ {formatCurrency(stock.purchasePrice)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(stock.totalAmount)}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(stock.createdAt)}</p>
                        </div>
                        <Badge variant="outline" className={getStatusColor(stock.status)}>
                          {stock.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Investment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this investment? This will refund the remaining capital and any accrued profits to the user's account.
            </DialogDescription>
          </DialogHeader>
          {investmentToCancel && (
            <div className="space-y-2 py-4">
              <p><strong>User:</strong> {investmentToCancel.user?.firstName} {investmentToCancel.user?.lastName}</p>
              <p><strong>Portfolio:</strong> {investmentToCancel.portfolio?.name}</p>
              <p><strong>Current Value:</strong> {formatCurrency(investmentToCancel.currentValue)}</p>
              <p><strong>Unpaid Profit:</strong> {formatCurrency(investmentToCancel.accruedUnpaidProfit || '0')}</p>
              <p className="text-green-600 font-semibold">
                <strong>Total Refund:</strong> {formatCurrency(
                  (parseFloat(investmentToCancel.currentValue || '0') + parseFloat(investmentToCancel.accruedUnpaidProfit || '0')).toString()
                )}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Investment
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => investmentToCancel && cancelMutation.mutate(investmentToCancel.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel & Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
