import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Zap, Star, Crown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalPortfolioValue: string;
  activeStakes: string;
  activeChallenges: number;
  availableBalance: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export function AchievementBadges() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const portfolioValue = parseFloat(stats?.totalPortfolioValue || "0");
  const activeStakes = parseInt(stats?.activeStakes || "0");
  const joinedChallenges = stats?.activeChallenges || 0;

  const achievements: Achievement[] = [
    {
      id: "first-investment",
      title: "First Steps",
      description: "Make your first portfolio investment",
      icon: <Target className="w-5 h-5" />,
      unlocked: portfolioValue > 0,
      progress: portfolioValue > 0 ? 1 : 0,
      maxProgress: 1,
      rarity: "common"
    },
    {
      id: "portfolio-builder",
      title: "Portfolio Builder",
      description: "Reach $1,000 in total investments",
      icon: <TrendingUp className="w-5 h-5" />,
      unlocked: portfolioValue >= 1000,
      progress: Math.min(portfolioValue, 1000),
      maxProgress: 1000,
      rarity: "rare"
    },
    {
      id: "crypto-whale",
      title: "Crypto Whale",
      description: "Achieve $10,000 portfolio value",
      icon: <Crown className="w-5 h-5" />,
      unlocked: portfolioValue >= 10000,
      progress: Math.min(portfolioValue, 10000),
      maxProgress: 10000,
      rarity: "epic"
    },
    {
      id: "staking-master",
      title: "Staking Master",
      description: "Have 3+ active staking positions",
      icon: <Zap className="w-5 h-5" />,
      unlocked: activeStakes >= 3,
      progress: Math.min(activeStakes, 3),
      maxProgress: 3,
      rarity: "rare"
    },
    {
      id: "community-champion",
      title: "Community Champion",
      description: "Join 2+ community challenges",
      icon: <Trophy className="w-5 h-5" />,
      unlocked: joinedChallenges >= 2,
      progress: Math.min(joinedChallenges, 2),
      maxProgress: 2,
      rarity: "epic"
    },
    {
      id: "legendary-investor",
      title: "Legendary Investor",
      description: "Reach $50,000 portfolio value",
      icon: <Star className="w-5 h-5" />,
      unlocked: portfolioValue >= 50000,
      progress: Math.min(portfolioValue, 50000),
      maxProgress: 50000,
      rarity: "legendary"
    }
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "rare": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "epic": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "legendary": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Card data-testid="achievement-badges">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements
            </CardTitle>
            <CardDescription>
              {unlockedCount}/{achievements.length} unlocked
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            Level {Math.floor(unlockedCount / 2) + 1}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-2 md:p-3 rounded-lg border transition-all duration-200 text-xs md:text-sm ${
                achievement.unlocked
                  ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 shadow-sm"
                  : "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800 opacity-75"
              }`}
              data-testid={`achievement-${achievement.id}`}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <div className={`p-1.5 md:p-2 rounded-full ${
                  achievement.unlocked
                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                }`}>
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {achievement.title}
                    </h4>
                    <Badge className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                      {achievement.rarity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  {!achievement.unlocked && (
                    <div className="space-y-1">
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="h-1.5"
                      />
                      <p className="text-xs text-muted-foreground">
                        {achievement.maxProgress === 1 
                          ? "Complete the action to unlock"
                          : `${achievement.progress.toLocaleString()} / ${achievement.maxProgress.toLocaleString()}`
                        }
                      </p>
                    </div>
                  )}
                  {achievement.unlocked && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                      ✨ Unlocked!
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}