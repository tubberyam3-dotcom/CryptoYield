import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

interface DashboardStats {
  totalPortfolioValue: string;
  activeStakes: string;
  activeChallenges: number;
  availableBalance: string;
  portfolioGrowthPercent: string;
  totalProfit: string;
}

export function StatsOverview() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </Card>
        ))}
      </div>
    );
  }

  const growthPercent = parseFloat(stats?.portfolioGrowthPercent || '0');
  const totalProfit = parseFloat(stats?.totalProfit || '0');
  const growthLabel = growthPercent !== 0
    ? `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(2)}% all-time return`
    : totalProfit === 0 && parseFloat(stats?.totalPortfolioValue || '0') === 0
      ? 'No investments yet'
      : 'Returns accruing…';

  const statsData = [
    {
      title: "Total Portfolio Value",
      value: `$${parseFloat(stats?.totalPortfolioValue || '0').toLocaleString()}`,
      change: growthLabel,
      changeColor: growthPercent > 0 ? "text-green-500" : growthPercent < 0 ? "text-red-500" : "text-muted-foreground",
      icon: "fas fa-chart-line",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Active Stakes",
      value: `$${parseFloat(stats?.activeStakes || '0').toLocaleString()}`,
      change: "8.5% APY average",
      changeColor: "text-blue-500",
      icon: "fas fa-coins",
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      title: "Challenge Progress",
      value: `${stats?.activeChallenges || 0} Active`,
      change: "2 completed this week",
      changeColor: "text-yellow-500",
      icon: "fas fa-trophy",
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-500",
    },
    {
      title: "Available Balance",
      value: `$${parseFloat(stats?.availableBalance || '0').toLocaleString()}`,
      change: "Ready to invest",
      changeColor: "text-muted-foreground",
      icon: "fas fa-dollar-sign",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="p-6" data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold text-foreground" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </p>
              <p className={`text-sm flex items-center mt-1 ${stat.changeColor}`}>
                <i className="fas fa-arrow-up mr-1"></i>
                {stat.change}
              </p>
            </div>
            <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
              <i className={`${stat.icon} ${stat.iconColor}`}></i>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
