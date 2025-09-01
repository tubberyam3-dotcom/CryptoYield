import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Authentication is handled by App component routing

  const handleConnectWallet = () => {
    setIsWalletConnected(true);
    toast({
      title: "Wallet Connected",
      description: "Your wallet has been successfully connected!",
    });
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  const handleTransferToCustody = () => {
    toast({
      title: "Transfer Initiated",
      description: "Self-custody transfer feature coming soon!",
    });
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
        <TopBar title="Wallet" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          
          {/* Wallet Connection Status */}
          <Card className="p-6" data-testid="card-wallet-status">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isWalletConnected ? 'bg-green-500/10' : 'bg-muted'
                }`}>
                  <i className={`fas fa-wallet text-xl ${
                    isWalletConnected ? 'text-green-500' : 'text-muted-foreground'
                  }`}></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {isWalletConnected ? 'Wallet Connected' : 'Connect Your Wallet'}
                  </h2>
                  <p className="text-muted-foreground">
                    {isWalletConnected 
                      ? 'Your external wallet is connected and ready to use'
                      : 'Connect your external wallet to view balances and transfer assets'
                    }
                  </p>
                </div>
              </div>
              
              {isWalletConnected ? (
                <Button 
                  variant="outline"
                  onClick={handleDisconnectWallet}
                  data-testid="button-disconnect-wallet"
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  onClick={handleConnectWallet}
                  data-testid="button-connect-wallet"
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </Card>

          {isWalletConnected ? (
            <Tabs defaultValue="assets" className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full max-w-md">
                <TabsTrigger value="assets" data-testid="tab-assets">Assets</TabsTrigger>
                <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="assets" className="space-y-6">
                {/* Portfolio Summary */}
                <Card className="p-6" data-testid="card-portfolio-summary">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-primary mb-2" data-testid="text-total-wallet-value">
                      ${totalValue.toLocaleString()}
                    </div>
                    <p className="text-muted-foreground">Total Wallet Value</p>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <Button 
                      variant="outline"
                      onClick={handleTransferToCustody}
                      data-testid="button-transfer-custody"
                    >
                      <i className="fas fa-arrow-right mr-2"></i>
                      Transfer to Self-Custody
                    </Button>
                  </div>
                </Card>

                {/* Asset List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mockWalletAssets.map((asset, index) => (
                    <Card key={asset.symbol} className="p-6 hover-lift" data-testid={`card-asset-${asset.symbol}`}>
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`w-12 h-12 ${asset.iconBg} rounded-full flex items-center justify-center`}>
                          <i className={`${asset.icon} text-white text-xl`}></i>
                        </div>
                        <div>
                          <h3 className="font-semibold" data-testid={`text-asset-name-${index}`}>{asset.name}</h3>
                          <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-medium" data-testid={`text-asset-balance-${index}`}>
                            {asset.balance} {asset.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Value</span>
                          <span className="font-medium" data-testid={`text-asset-value-${index}`}>
                            ${asset.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">24h Change</span>
                          <span className={`font-medium ${
                            asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                          }`} data-testid={`text-asset-change-${index}`}>
                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
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
          ) : (
            /* Wallet Connection Instructions */
            <Card className="p-8 text-center" data-testid="card-connect-instructions">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-wallet text-muted-foreground text-2xl"></i>
              </div>
              
              <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your external cryptocurrency wallet to view balances, track assets, 
                and enable transfers to self-custody wallets.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                <div className="p-4 border border-border rounded-lg">
                  <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fab fa-bitcoin text-orange-500"></i>
                  </div>
                  <p className="text-sm font-medium">Bitcoin Wallets</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fab fa-ethereum text-blue-600"></i>
                  </div>
                  <p className="text-sm font-medium">Ethereum Wallets</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-coins text-primary"></i>
                  </div>
                  <p className="text-sm font-medium">Multi-Asset Wallets</p>
                </div>
              </div>
              
              <Button 
                size="lg"
                onClick={handleConnectWallet}
                data-testid="button-connect-wallet-main"
              >
                <i className="fas fa-link mr-2"></i>
                Connect Wallet
              </Button>
            </Card>
          )}

        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
