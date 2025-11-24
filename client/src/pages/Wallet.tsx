import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DepositDialog } from "@/components/wallet/DepositDialog";
import { useQuery } from "@tanstack/react-query";
import type { Deposit } from "@shared/schema";

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
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: deposits = [] } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
  });

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
              
              <Button 
                onClick={() => setDepositDialogOpen(true)}
                data-testid="button-deposit"
                size="lg"
              >
                <i className="fas fa-plus mr-2"></i>
                Deposit Funds
              </Button>
            </div>
          </Card>

          <Tabs defaultValue="deposits" className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="deposits" data-testid="tab-deposits">Deposit History</TabsTrigger>
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
      <DepositDialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen} />
    </div>
  );
}
