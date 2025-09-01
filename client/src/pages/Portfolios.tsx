import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Portfolio } from "@shared/schema";

export default function Portfolios() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [investAmount, setInvestAmount] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portfolios, isLoading: portfoliosLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const { data: userPortfolios } = useQuery<any[]>({
    queryKey: ["/api/user/portfolios"],
  });

  const investMutation = useMutation({
    mutationFn: async ({ portfolioId, investedAmount }: { portfolioId: string; investedAmount: string }) => {
      const response = await apiRequest("POST", "/api/user/portfolios", { 
        portfolioId, 
        investedAmount 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Investment Successful",
        description: `You've invested $${investAmount} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/portfolios"] });
      setSelectedPortfolio(null);
      setInvestAmount("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Investment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Authentication is handled by App component routing

  const handleInvest = () => {
    if (!selectedPortfolio || !investAmount) return;
    
    const amount = parseFloat(investAmount);
    const minInvestment = parseFloat(selectedPortfolio.minInvestment);
    
    if (amount < minInvestment) {
      toast({
        title: "Investment Too Low",
        description: `Minimum investment for this portfolio is $${minInvestment.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    investMutation.mutate({ 
      portfolioId: selectedPortfolio.id, 
      investedAmount: investAmount 
    });
  };

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
    <div className="min-h-screen bg-background text-foreground" data-testid="portfolios-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Portfolios" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          {/* My Investments */}
          {userPortfolios && Array.isArray(userPortfolios) && userPortfolios.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">My Investments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(userPortfolios) ? userPortfolios.map((investment: any) => (
                  <Card key={investment.id} className="p-6" data-testid={`card-my-investment-${investment.id}`}>
                    <h3 className="font-semibold mb-2">{investment.portfolio.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invested</span>
                        <span>${parseFloat(investment.investedAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Value</span>
                        <span>${parseFloat(investment.currentValue).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Returns</span>
                        <span className="text-green-500">+${parseFloat(investment.returns || '0').toLocaleString()}</span>
                      </div>
                    </div>
                  </Card>
                )) : null}
              </div>
            </div>
          )}

          {/* All Portfolios */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All Portfolios</h2>
            
            {portfoliosLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolios?.map((portfolio) => (
                  <Card key={portfolio.id} className="p-6 hover-lift" data-testid={`card-portfolio-${portfolio.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={getStrategyColor(portfolio.strategyTag || '')}>
                        {portfolio.strategyTag || 'General'}
                      </Badge>
                      <div className="text-green-500 text-sm font-medium">
                        +{portfolio.currentReturn}%
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">{portfolio.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {portfolio.description}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Min. Investment</span>
                        <span className="font-medium">
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

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full"
                          onClick={() => setSelectedPortfolio(portfolio)}
                          data-testid={`button-invest-${portfolio.id}`}
                        >
                          Invest Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="dialog-invest">
                        <DialogHeader>
                          <DialogTitle>Invest in {selectedPortfolio?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="investAmount">Investment Amount</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                id="investAmount"
                                type="number"
                                className="pl-8"
                                placeholder={selectedPortfolio?.minInvestment || "1000"}
                                value={investAmount}
                                onChange={(e) => setInvestAmount(e.target.value)}
                                data-testid="input-invest-amount"
                              />
                            </div>
                            {selectedPortfolio && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Minimum: ${parseFloat(selectedPortfolio.minInvestment).toLocaleString()}
                              </p>
                            )}
                          </div>
                          
                          <Button 
                            className="w-full"
                            onClick={handleInvest}
                            disabled={investMutation.isPending || !investAmount}
                            data-testid="button-confirm-invest"
                          >
                            {investMutation.isPending ? "Processing..." : "Confirm Investment"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </Card>
                )) || []}
              </div>
            )}
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
