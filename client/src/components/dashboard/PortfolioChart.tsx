import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalPortfolioValue: string;
  activeBonds: string;
  activeChallenges: number;
  availableBalance: string;
}

export function PortfolioChart() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const portfolioValue = parseFloat(stats?.totalPortfolioValue || '0');
  const bondsValue = parseFloat(stats?.activeBonds || '0');
  const balance = parseFloat(stats?.availableBalance || '0');
  const totalValue = portfolioValue + bondsValue + balance;

  // Show current snapshot since we don't have historical data yet
  const hasData = totalValue > 0;

  return (
    <Card className="p-6 card-hover animate-fade-in-scale nude-gradient-light border-nude-medium/20" data-testid="card-portfolio-chart">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Portfolio Overview</h2>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-medium">No portfolio data yet</p>
          <p className="text-sm mt-1">Start investing to see your portfolio growth</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-primary" data-testid="text-total-portfolio">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Cash Balance</p>
              <p className="text-lg font-semibold text-green-500" data-testid="text-chart-balance">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Portfolios</p>
              <p className="text-lg font-semibold text-blue-500" data-testid="text-chart-portfolios">
                ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Bonds</p>
              <p className="text-lg font-semibold text-purple-500" data-testid="text-chart-bonds">
                ${bondsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Visual representation as a simple bar */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Asset Allocation</p>
            <div className="h-4 rounded-full overflow-hidden flex bg-muted">
              {balance > 0 && (
                <div 
                  className="bg-green-500 h-full" 
                  style={{ width: `${(balance / totalValue) * 100}%` }}
                  title={`Cash: $${balance.toLocaleString()}`}
                />
              )}
              {portfolioValue > 0 && (
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${(portfolioValue / totalValue) * 100}%` }}
                  title={`Portfolios: $${portfolioValue.toLocaleString()}`}
                />
              )}
              {bondsValue > 0 && (
                <div 
                  className="bg-purple-500 h-full" 
                  style={{ width: `${(bondsValue / totalValue) * 100}%` }}
                  title={`Bonds: $${bondsValue.toLocaleString()}`}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Cash
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Portfolios
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Bonds
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
