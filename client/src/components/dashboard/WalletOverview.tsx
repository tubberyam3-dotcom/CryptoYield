import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const mockWalletData = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    balance: "0.75431",
    value: "$32,450.22",
    icon: "fab fa-bitcoin",
    iconBg: "bg-orange-500",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: "12.8943",
    value: "$28,740.15",
    icon: "fab fa-ethereum",
    iconBg: "bg-blue-600",
  },
];

export function WalletOverview() {
  const { toast } = useToast();
  
  const handleConnectWallet = () => {
    toast({
      title: "Wallet Connection",
      description: "Wallet connection feature coming soon!",
    });
  };

  const handleTransfer = () => {
    toast({
      title: "Transfer Initiated",
      description: "Self-custody transfer feature coming soon!",
    });
  };

  const totalValue = mockWalletData.reduce((sum, asset) => {
    return sum + parseFloat(asset.value.replace('$', '').replace(',', ''));
  }, 0);

  return (
    <Card className="p-6 card-hover animate-fade-in-scale nude-gradient-light border-nude-medium/20" data-testid="card-wallet-overview">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Wallet Overview</h2>
        <Button 
          variant="default" 
          size="sm"
          className="bg-accent hover:bg-accent/90"
          onClick={handleConnectWallet}
          data-testid="button-connect-wallet"
        >
          Connect Wallet
        </Button>
      </div>
      
      <div className="space-y-4">
        {mockWalletData.map((asset, index) => (
          <div key={asset.symbol} className="p-4 bg-muted rounded-lg" data-testid={`wallet-asset-${index}`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-8 h-8 ${asset.iconBg} rounded-full flex items-center justify-center`}>
                <i className={`${asset.icon} text-white text-sm`}></i>
              </div>
              <div>
                <p className="font-medium" data-testid={`text-asset-name-${index}`}>{asset.name}</p>
                <p className="text-sm text-muted-foreground" data-testid={`text-asset-symbol-${index}`}>{asset.symbol}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground" data-testid={`text-asset-balance-${index}`}>
                {asset.balance} {asset.symbol}
              </span>
              <span className="font-medium" data-testid={`text-asset-value-${index}`}>{asset.value}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Wallet Value</span>
            <span className="text-lg font-bold text-primary" data-testid="text-total-wallet-value">
              ${totalValue.toLocaleString()}
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleTransfer}
          data-testid="button-transfer-custody"
        >
          Transfer to Self-Custody
        </Button>
      </div>
    </Card>
  );
}
