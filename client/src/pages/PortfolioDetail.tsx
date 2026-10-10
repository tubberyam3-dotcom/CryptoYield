import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QuickInvestButton } from "@/components/investment/QuickInvestButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Portfolio } from "@shared/schema";
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  TrendingUp, 
  Shield, 
  DollarSign,
  PieChart,
  Calendar,
  Activity
} from "lucide-react";
import aiTechImage from "@assets/stock_images/artificial_intellige_0671b83c.jpg";
import financeChartImage from "@assets/stock_images/stock_market_trading_39893979.jpg";

const ALLOCATION_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-orange-500',
];

export default function PortfolioDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: portfolios, isLoading: portfoliosLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const portfolio = portfolios?.find(p => p.id === id);

  const { data: userPortfolios } = useQuery<any[]>({
    queryKey: ["/api/user/portfolios"],
  });

  const userInvestment = userPortfolios?.find(up => up.portfolio?.id === id);

  const handleDownloadWhitepaper = () => {
    if (portfolio?.whitepaperUrl) {
      window.open(portfolio.whitepaperUrl, '_blank');
      toast({
        title: "Download Started",
        description: "Your whitepaper download has begun.",
      });
    } else {
      toast({
        title: "Not Available",
        description: "Whitepaper is not available for this portfolio.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async () => {
    if (!userInvestment) {
      toast({
        title: "No Investment",
        description: "You must invest in this portfolio before generating a report.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/portfolios/${id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${portfolio?.name || 'portfolio'}-investment-report-${new Date().toISOString().slice(0, 7)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Generated",
        description: "Your monthly investment report PDF has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadStatement = async () => {
    if (!userInvestment) {
      toast({
        title: "No Investment",
        description: "You must invest in this portfolio before downloading a statement.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/portfolios/${id}/statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate statement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${portfolio?.name || 'portfolio'}-statement-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Statement Downloaded",
        description: "Your investment statement PDF has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download statement. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy?.toLowerCase()) {
      case 'ai': return 'bg-accent/10 text-accent border-accent/20';
      case 'defi': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'layer2': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'growth': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'value': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'dividend': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  if (isLoading || portfoliosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading portfolio details...</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Portfolio Not Found</h2>
          <p className="text-muted-foreground mb-4">The portfolio you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/portfolios')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portfolios
          </Button>
        </Card>
      </div>
    );
  }

  const assets = Array.isArray(portfolio.assets) ? portfolio.assets : [];

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="portfolio-detail-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title={portfolio.name} onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-4 sm:p-6 space-y-6 pb-20 lg:pb-6">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/portfolios')}
            className="mb-4"
            data-testid="button-back-to-portfolios"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portfolios
          </Button>

          {/* Hero Image Banner */}
          <div className="relative rounded-xl overflow-hidden h-48 sm:h-64 mb-6">
            <img 
              src={portfolio.imageUrl || (portfolio.strategyTag?.toLowerCase().includes('ai') ? aiTechImage : financeChartImage)} 
              alt={portfolio.name}
              className="w-full h-full object-cover"
              data-testid="img-portfolio-hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={getStrategyColor(portfolio.strategyTag || '')}>
                  {portfolio.strategyTag || 'General'}
                </Badge>
                <Badge variant="outline" className={`${getRiskColor(portfolio.riskLevel)} bg-background`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {portfolio.riskLevel} Risk
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground drop-shadow-lg">{portfolio.name}</h1>
            </div>
          </div>

          {/* Portfolio Header */}
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div className="flex-1">
                <p className="text-lg text-muted-foreground">{portfolio.description}</p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="text-sm text-muted-foreground">Current Return</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  <span className="text-3xl font-bold text-green-500">
                    +{portfolio.currentReturn}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Min. Investment</span>
                </div>
                <div className="text-2xl font-bold">
                  ${parseFloat(portfolio.minInvestment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Assets</span>
                </div>
                <div className="text-2xl font-bold">{assets.length}</div>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                <div className="text-2xl font-bold text-green-500">Active</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <QuickInvestButton portfolio={portfolio} className="flex-1" />
              {portfolio.whitepaperUrl && (
                <Button 
                  variant="outline" 
                  onClick={handleDownloadWhitepaper}
                  className="flex-1"
                  data-testid="button-download-whitepaper"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Whitepaper
                </Button>
              )}
              {userInvestment && (
                <Button 
                  variant="outline"
                  onClick={handleGenerateReport}
                  className="flex-1"
                  data-testid="button-generate-report"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Monthly Report
                </Button>
              )}
              {userInvestment && (
                <Button 
                  variant="outline"
                  onClick={handleDownloadStatement}
                  className="flex-1"
                  data-testid="button-download-statement"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Statement
                </Button>
              )}
            </div>
          </Card>

          {/* My Investment (if invested) */}
          {userInvestment && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                My Investment
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Invested Amount</div>
                  <div className="text-2xl font-bold">
                    ${parseFloat(userInvestment.investedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Current Value</div>
                  <div className="text-2xl font-bold text-green-500">
                    ${parseFloat(userInvestment.currentValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Returns</div>
                  <div className="text-2xl font-bold text-green-500">
                    +${parseFloat(userInvestment.returns || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Detailed Description */}
          {portfolio.detailedDescription && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">About This Portfolio</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {portfolio.detailedDescription}
                </p>
              </div>
            </Card>
          )}

          {/* Asset Allocation */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Asset Allocation
            </h2>
            {assets.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Pie Chart Representation */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {(() => {
                        let cumulativePercent = 0;
                        return assets.map((asset: any, index: number) => {
                          const percent = asset.allocation;
                          const startPercent = cumulativePercent;
                          cumulativePercent += percent;
                          const strokeDasharray = `${percent} ${100 - percent}`;
                          const strokeDashoffset = -startPercent;
                          const colorClasses = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#F43F5E', '#06B6D4', '#6366F1', '#F97316'];
                          return (
                            <circle
                              key={index}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={colorClasses[index % colorClasses.length]}
                              strokeWidth="20"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-500"
                              style={{ strokeDasharray: `${percent} ${100 - percent}`, strokeDashoffset: -startPercent }}
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{assets.length}</div>
                        <div className="text-xs text-muted-foreground">Assets</div>
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {assets.map((asset: any, index: number) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`} />
                        <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Asset List */}
                <div className="space-y-4">
                  {assets.map((asset: any, index: number) => (
                    <div key={index} className="bg-muted/30 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`} />
                          <div>
                            <div className="font-semibold text-lg">{asset.symbol || asset.name}</div>
                            <div className="text-sm text-muted-foreground">{asset.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{asset.allocation}%</div>
                          <Badge variant="outline" className="text-xs">{asset.type || 'Stock'}</Badge>
                        </div>
                      </div>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground mt-2">{asset.description}</p>
                      )}
                      <div className="w-full bg-muted rounded-full h-2 mt-3">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                          style={{ width: `${asset.allocation}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <img 
                  src={financeChartImage} 
                  alt="Investment Chart" 
                  className="w-full max-w-md mx-auto rounded-lg opacity-50 mb-4"
                />
                <p className="text-muted-foreground">No asset allocation data available for this portfolio.</p>
              </div>
            )}
          </Card>

          {/* Performance & Risk Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Highlights
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Return</span>
                  <span className="font-semibold text-green-500">+{portfolio.currentReturn}%</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Risk Level</span>
                  <Badge variant="outline" className={getRiskColor(portfolio.riskLevel)}>
                    {portfolio.riskLevel}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Strategy</span>
                  <span className="font-semibold">{portfolio.strategyTag || 'General'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Risk Information
              </h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                {portfolio.riskLevel === 'low' && (
                  <p>This portfolio is designed for conservative investors seeking stable, predictable returns with minimal volatility.</p>
                )}
                {portfolio.riskLevel === 'medium' && (
                  <p>This balanced portfolio aims for moderate growth while maintaining reasonable risk levels suitable for most investors.</p>
                )}
                {portfolio.riskLevel === 'high' && (
                  <p>This aggressive portfolio targets maximum growth potential but comes with higher volatility and risk. Suitable for experienced investors with longer time horizons.</p>
                )}
                <div className="bg-muted/50 rounded p-3 mt-3">
                  <p className="text-xs">
                    Past performance does not guarantee future results. All investments carry risk, including potential loss of principal.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
