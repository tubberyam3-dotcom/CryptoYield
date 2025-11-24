import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Deposit, Withdrawal } from "@shared/schema";

const mockWalletAssets = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    balance: "0.75431",
    value: 32450.22,
    change24h: 2.4,
    icon: "fab fa-bitcoin",
    iconBg: "bg-orange-500",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: "12.8943",
    value: 28740.15,
    change24h: -1.2,
    icon: "fab fa-ethereum",
    iconBg: "bg-blue-600",
  },
  {
    symbol: "ADA",
    name: "Cardano",
    balance: "1250.00",
    value: 812.50,
    change24h: 5.7,
    icon: "fas fa-coins",
    iconBg: "bg-blue-400",
  },
  {
    symbol: "SOL",
    name: "Solana",
    balance: "45.20",
    value: 4520.30,
    change24h: 8.9,
    icon: "fas fa-sun",
    iconBg: "bg-purple-500",
  },
];

const mockTransactions = [
  {
    id: 1,
    type: "deposit",
    asset: "BTC",
    amount: "0.1",
    value: 4300.00,
    status: "completed",
    timestamp: "2024-01-15T10:30:00Z",
    txHash: "0x1234...5678",
  },
  {
    id: 2,
    type: "withdrawal",
    asset: "ETH",
    amount: "2.5",
    value: 5500.00,
    status: "pending",
    timestamp: "2024-01-14T15:45:00Z",
    txHash: "0x9876...4321",
  },
  {
    id: 3,
    type: "transfer",
    asset: "ADA",
    amount: "500",
    value: 325.00,
    status: "completed",
    timestamp: "2024-01-13T09:15:00Z",
    txHash: "0xabcd...efgh",
  },
];

export default function Wallet() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<'crypto' | 'bank_transfer'>('crypto');
  const [destinationAddress, setDestinationAddress] = useState("");
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: deposits = [] } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
  });

  const { data: withdrawals = [] } = useQuery<Withdrawal[]>({
    queryKey: ["/api/withdrawals"],
    enabled: !!user,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: string; withdrawMethod: 'crypto' | 'bank_transfer'; destinationAddress: string }) => {
      const res = await apiRequest("POST", "/api/withdrawals", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Withdrawal Submitted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setDestinationAddress("");
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !destinationAddress) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    withdrawMutation.mutate({ amount: withdrawAmount, withdrawMethod, destinationAddress });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'failed': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return { icon: 'fas fa-arrow-down', color: 'text-green-500' };
      case 'withdrawal': return { icon: 'fas fa-arrow-up', color: 'text-red-500' };
      case 'transfer': return { icon: 'fas fa-exchange-alt', color: 'text-blue-500' };
      default: return { icon: 'fas fa-circle', color: 'text-muted-foreground' };
    }
  };

  const totalValue = mockWalletAssets.reduce((sum, asset) => sum + asset.value, 0);

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
    <div className="min-h-screen bg-background text-foreground" data-testid="wallet-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Wallet" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          
          {/* Balance Summary */}
          <Card className="p-6" data-testid="card-balance-summary">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                  <i className="fas fa-wallet text-xl text-primary"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Available Balance</h2>
                  <div className="text-3xl font-bold text-primary" data-testid="text-wallet-balance">
                    ${user?.balance ? parseFloat(user.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  onClick={() => setLocation("/deposit")}
                  data-testid="button-deposit"
                  size="lg"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Deposit
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setWithdrawDialogOpen(true)}
                  data-testid="button-withdraw"
                  size="lg"
                >
                  <i className="fas fa-arrow-up mr-2"></i>
                  Withdraw
                </Button>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="deposits" className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl">
              <TabsTrigger value="deposits" data-testid="tab-deposits">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="tab-transactions">All Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="deposits" className="space-y-6">
              {/* Deposit History */}
              <Card className="p-6" data-testid="card-deposit-history">
                <h3 className="text-lg font-semibold mb-4">Recent Deposits</h3>
                
                {deposits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-inbox text-4xl mb-4"></i>
                    <p>No deposits yet. Click "Deposit Funds" to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deposits.slice(0, 10).map((deposit) => (
                      <div 
                        key={deposit.id}
                        className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`deposit-${deposit.id}`}
                      >
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <i className="fas fa-arrow-down text-green-500"></i>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium capitalize" data-testid={`text-deposit-method-${deposit.id}`}>
                              {deposit.depositMethod.replace('_', ' ')}
                            </span>
                            <Badge className={
                              deposit.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                              deposit.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-red-500/10 text-red-500'
                            }>
                              {deposit.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {deposit.createdAt && formatDate(deposit.createdAt.toString())}
                          </p>
                          {deposit.status === 'pending' && (
                            <p className="text-xs text-yellow-500 mt-1">
                              <i className="fas fa-clock mr-1"></i>
                              Awaiting admin approval
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium text-lg" data-testid={`text-deposit-amount-${deposit.id}`}>
                            ${parseFloat(deposit.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="withdrawals" className="space-y-6">
              <Card className="p-6" data-testid="card-withdrawal-history">
                <h3 className="text-lg font-semibold mb-4">Withdrawal History</h3>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-arrow-up text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground">No withdrawals yet</p>
                    <Button onClick={() => setWithdrawDialogOpen(true)} className="mt-4" data-testid="button-first-withdrawal">
                      Make Your First Withdrawal
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawals.map((withdrawal) => (
                      <div 
                        key={withdrawal.id}
                        className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`withdrawal-${withdrawal.id}`}
                      >
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <i className="fas fa-arrow-up text-orange-500"></i>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium capitalize" data-testid={`text-withdrawal-method-${withdrawal.id}`}>
                              {withdrawal.withdrawMethod.replace('_', ' ')}
                            </span>
                            <Badge className={
                              withdrawal.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                              withdrawal.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-red-500/10 text-red-500'
                            }>
                              {withdrawal.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {withdrawal.createdAt && formatDate(withdrawal.createdAt.toString())}
                          </p>
                          {withdrawal.status === 'pending' && (
                            <p className="text-xs text-yellow-500 mt-1">
                              <i className="fas fa-clock mr-1"></i>
                              Awaiting admin approval
                            </p>
                          )}
                          {withdrawal.status === 'rejected' && (
                            <p className="text-xs text-red-500 mt-1">
                              <i className="fas fa-times-circle mr-1"></i>
                              Withdrawal rejected - funds returned to balance
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium text-lg text-orange-500" data-testid={`text-withdrawal-amount-${withdrawal.id}`}>
                            -${parseFloat(withdrawal.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="transactions" className="space-y-6">
                <Card className="p-6" data-testid="card-transaction-history">
                  <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
                  
                  <div className="space-y-4">
                    {mockTransactions.map((tx) => {
                      const iconData = getTransactionIcon(tx.type);
                      return (
                        <div 
                          key={tx.id}
                          className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                          data-testid={`transaction-${tx.id}`}
                        >
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <i className={`${iconData.icon} ${iconData.color}`}></i>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium capitalize" data-testid={`text-tx-type-${tx.id}`}>
                                {tx.type}
                              </span>
                              <Badge className={getStatusColor(tx.status)}>
                                {tx.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {tx.amount} {tx.asset} • {formatDate(tx.timestamp)}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {tx.txHash}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-medium" data-testid={`text-tx-value-${tx.id}`}>
                              ${tx.value.toLocaleString()}
                            </p>
                            <Button variant="ghost" size="sm" className="text-xs" data-testid={`button-view-tx-${tx.id}`}>
                              View <i className="fas fa-external-link-alt ml-1"></i>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

        </main>
      </div>
      
      <MobileNav />
      
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Request a withdrawal from your wallet
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (USD)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                data-testid="input-withdraw-amount"
              />
              <p className="text-sm text-muted-foreground">
                Available: ${user?.balance ? parseFloat(user.balance).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-method">Withdrawal Method</Label>
              <Select value={withdrawMethod} onValueChange={(value: 'crypto' | 'bank_transfer') => setWithdrawMethod(value)}>
                <SelectTrigger data-testid="select-withdraw-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">
                {withdrawMethod === 'crypto' ? 'Crypto Wallet Address' : 'Bank Account Number'}
              </Label>
              <Input
                id="destination"
                type="text"
                placeholder={withdrawMethod === 'crypto' ? 'Enter wallet address' : 'Enter account number'}
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                data-testid="input-destination"
              />
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-yellow-500">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Withdrawals require admin approval and may take 2-3 business days to process.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={withdrawMutation.isPending}
              data-testid="button-submit-withdrawal"
            >
              {withdrawMutation.isPending ? "Processing..." : "Submit Withdrawal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
