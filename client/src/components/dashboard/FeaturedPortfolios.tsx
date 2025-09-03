import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { QuickInvestButton } from "@/components/investment/QuickInvestButton";
import type { Portfolio } from "@shared/schema";

export function FeaturedPortfolios() {
  const { data: portfolios, isLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Featured Portfolios</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-16 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'high': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy?.toLowerCase()) {
      case 'ai': return 'bg-accent/10 text-accent';
      case 'defi': return 'bg-green-500/10 text-green-500';
      case 'layer2': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Featured Portfolios</h2>
        <Link href="/portfolios">
          <Button variant="ghost" className="text-primary hover:text-primary/80" data-testid="button-view-all-portfolios">
            View All <i className="fas fa-arrow-right ml-1"></i>
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios?.slice(0, 3).map((portfolio) => (
          <Card 
            key={portfolio.id} 
            className="p-6 hover-lift cursor-pointer" 
            data-testid={`card-portfolio-${portfolio.id}`}
          >
            <div className="flex items-center justify-between mb-4">
              <Badge className={getStrategyColor(portfolio.strategyTag || '')}>
                {portfolio.strategyTag || 'General'}
              </Badge>
              <div className="text-green-500 text-sm font-medium" data-testid={`text-portfolio-return-${portfolio.id}`}>
                +{portfolio.currentReturn}%
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mb-2" data-testid={`text-portfolio-name-${portfolio.id}`}>
              {portfolio.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-4" data-testid={`text-portfolio-description-${portfolio.id}`}>
              {portfolio.description}
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Min. Investment</span>
                <span className="font-medium" data-testid={`text-portfolio-min-investment-${portfolio.id}`}>
                  ${parseFloat(portfolio.minInvestment).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Risk Level</span>
                <Badge variant="outline" className={getRiskColor(portfolio.riskLevel)}>
                  {portfolio.riskLevel}
                </Badge>
              </div>
            </div>
            
            <QuickInvestButton 
              portfolio={portfolio}
              size="sm"
              className="w-full"
            />
          </Card>
        )) || []}
      </div>
    </div>
  );
}
