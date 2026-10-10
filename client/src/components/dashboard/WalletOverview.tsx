import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalPortfolioValue: string;
  activeBonds: string;
  activeChallenges: number;
  availableBalance: string;
}

export function WalletOverview() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const balance = parseFloat(stats?.availableBalance || '0');
  const portfolioValue = parseFloat(stats?.totalPortfolioValue || '0');
  const bondsValue = parseFloat(stats?.activeBonds || '0');
  const totalAssets = balance + portfolioValue + bondsValue;

  return (
    <Card className="p-6 animate-fade-in-scale nude-gradient-light border-nude-medium/20" data-testid="card-wallet-overview">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Wallet Overview</h2>
        <Link href="/wallet">
          <Button 
            variant="default" 
            size="sm"
            className="bg-accent hover:bg-accent/90 text-foreground"
            data-testid="button-view-wallet"
          >
            View Wallet
          </Button>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg" data-testid="wallet-available-balance">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium" data-testid="text-available-label">Available Balance</p>
                <p className="text-sm text-muted-foreground">Ready to invest</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cash</span>
              <span className="font-medium text-lg" data-testid="text-available-value">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg" data-testid="wallet-portfolios">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium">Portfolio Investments</p>
                <p className="text-sm text-muted-foreground">Active investments</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Value</span>
              <span className="font-medium" data-testid="text-portfolio-value">
                ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg" data-testid="wallet-bonds">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium">Bond Holdings</p>
                <p className="text-sm text-muted-foreground">Fixed income</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Value</span>
              <span className="font-medium" data-testid="text-bonds-value">
                ${bondsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Assets</span>
              <span className="text-lg font-bold text-primary" data-testid="text-total-assets">
                ${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
