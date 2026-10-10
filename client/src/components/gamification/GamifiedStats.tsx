import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Trophy, DollarSign, Target, Star } from "lucide-react";

interface DashboardStats {
  totalPortfolioValue: string;
  activeStakes: string;
  activeChallenges: number;
  availableBalance: string;
  portfolioGrowthPercent: string;
  totalProfit: string;
}

export function GamifiedStats() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-3 md:p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </Card>
        ))}
      </div>
    );
  }

  const portfolioValue = parseFloat(stats?.totalPortfolioValue || '0');
  const stakingValue = parseFloat(stats?.activeStakes || '0');
  const challenges = stats?.activeChallenges || 0;
  const balance = parseFloat(stats?.availableBalance || '0');

  const growthPercent = parseFloat(stats?.portfolioGrowthPercent || '0');
  const portfolioGrowthLabel = growthPercent !== 0
    ? `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(2)}% all-time return`
    : portfolioValue === 0 ? 'No investments yet' : 'Returns accruing…';

  const statsData = [
    {
      title: "Portfolio Power",
      value: `$${portfolioValue.toLocaleString()}`,
      change: portfolioGrowthLabel,
      changeColor: growthPercent > 0 ? "text-green-500" : growthPercent < 0 ? "text-red-500" : "text-muted-foreground",
      icon: <TrendingUp className="w-4 h-4 md:w-6 md:h-6" />,
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      iconColor: "text-white",
      progress: Math.min((portfolioValue / 10000) * 100, 100),
      nextMilestone: "$10,000",
      gamificationBadge: portfolioValue >= 1000 ? "💎 Whale" : portfolioValue >= 500 ? "🚀 Rising" : "🌱 Growing",
      celebration: portfolioValue >= 1000
    },
    {
      title: "Staking Mastery",
      value: `$${stakingValue.toLocaleString()}`,
      change: "8.5% APY average",
      changeColor: "text-blue-500",
      icon: <Zap className="w-4 h-4 md:w-6 md:h-6" />,
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
      iconColor: "text-white",
      progress: Math.min((stakingValue / 5000) * 100, 100),
      nextMilestone: "$5,000",
      gamificationBadge: stakingValue >= 1000 ? "⚡ Power Staker" : stakingValue >= 100 ? "💪 Committed" : "🔋 Starting",
      celebration: stakingValue >= 1000
    },
    {
      title: "Challenge Hunter",
      value: `${challenges} Active`,
      change: "2 completed this week",
      changeColor: "text-yellow-500",
      icon: <Trophy className="w-4 h-4 md:w-6 md:h-6" />,
      iconBg: "bg-gradient-to-br from-yellow-500 to-orange-600",
      iconColor: "text-white",
      progress: Math.min((challenges / 5) * 100, 100),
      nextMilestone: "5 challenges",
      gamificationBadge: challenges >= 3 ? "🏆 Champion" : challenges >= 1 ? "🎯 Hunter" : "👀 Explorer",
      celebration: challenges >= 3
    },
    {
      title: "War Chest",
      value: `$${balance.toLocaleString()}`,
      change: "Ready to deploy",
      changeColor: "text-muted-foreground",
      icon: <DollarSign className="w-4 h-4 md:w-6 md:h-6" />,
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      iconColor: "text-white",
      progress: Math.min((balance / 2000) * 100, 100),
      nextMilestone: "$2,000",
      gamificationBadge: balance >= 1000 ? "💰 Loaded" : balance >= 100 ? "🎯 Ready" : "🔄 Building",
      celebration: balance >= 1000
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6" data-testid="gamified-stats">
      {statsData.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative"
        >
          <Card className="p-3 md:p-6 relative overflow-hidden group cursor-pointer" data-testid={`gamified-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            {/* Celebration sparkles */}
            {stat.celebration && (
              <div className="absolute top-2 right-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Star className="w-4 h-4 text-yellow-500" />
                </motion.div>
              </div>
            )}

            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${stat.iconBg} shadow-lg`}>
                    <div className={stat.iconColor}>
                      {stat.icon}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900 dark:to-pink-900 dark:text-purple-200 border-0 text-xs">
                      {stat.gamificationBadge}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div>
                  <h3 className="text-lg md:text-2xl font-bold tracking-tight">{stat.value}</h3>
                  <p className={`text-sm ${stat.changeColor} font-medium`}>
                    {stat.change}
                  </p>
                </div>

                {/* Progress to next milestone */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress to {stat.nextMilestone}</span>
                    <span>{Math.round(stat.progress)}%</span>
                  </div>
                  <Progress 
                    value={stat.progress} 
                    className="h-2 bg-muted"
                  />
                </div>

                {/* Achievement indicator */}
                {stat.progress >= 100 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"
                  >
                    <Target className="w-3 h-3" />
                    Milestone achieved! 🎉
                  </motion.div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}