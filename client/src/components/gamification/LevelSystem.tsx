import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, Users, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalPortfolioValue: string;
  activeStakes: string;
  activeChallenges: number;
  availableBalance: string;
}

export function LevelSystem() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const portfolioValue = parseFloat(stats?.totalPortfolioValue || "0");
  const activeStakes = parseInt(stats?.activeStakes || "0");
  const joinedChallenges = stats?.activeChallenges || 0;

  // Calculate XP based on activities
  const calculateXP = () => {
    let xp = 0;
    xp += Math.floor(portfolioValue / 100) * 10; // 10 XP per $100 invested
    xp += activeStakes * 50; // 50 XP per active stake
    xp += joinedChallenges * 100; // 100 XP per challenge joined
    return xp;
  };

  const currentXP = calculateXP();
  const currentLevel = Math.floor(currentXP / 1000) + 1; // Level up every 1000 XP
  const xpInCurrentLevel = currentXP % 1000;
  const xpToNextLevel = 1000 - xpInCurrentLevel;

  const getLevelTitle = (level: number) => {
    if (level < 5) return "Crypto Novice";
    if (level < 10) return "Portfolio Builder";
    if (level < 20) return "Investment Expert";
    if (level < 35) return "Crypto Strategist";
    if (level < 50) return "Portfolio Master";
    return "Legendary Investor";
  };

  const getLevelColor = (level: number) => {
    if (level < 5) return "text-gray-600";
    if (level < 10) return "text-blue-600";
    if (level < 20) return "text-green-600";
    if (level < 35) return "text-purple-600";
    if (level < 50) return "text-orange-600";
    return "text-yellow-600";
  };

  const getXPSources = () => [
    {
      label: "Portfolio Value",
      value: Math.floor(portfolioValue / 100) * 10,
      icon: <TrendingUp className="w-4 h-4" />,
      description: `$${portfolioValue.toLocaleString()} invested`
    },
    {
      label: "Active Stakes",
      value: activeStakes * 50,
      icon: <Star className="w-4 h-4" />,
      description: `${activeStakes} positions staking`
    },
    {
      label: "Community Challenges",
      value: joinedChallenges * 100,
      icon: <Users className="w-4 h-4" />,
      description: `${joinedChallenges} challenges joined`
    }
  ];

  return (
    <Card data-testid="level-system" className="text-sm md:text-base">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Investor Level
            </CardTitle>
            <CardDescription>
              {currentXP.toLocaleString()} XP • {xpToNextLevel.toLocaleString()} to next level
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge className={`text-lg px-3 py-1 ${getLevelColor(currentLevel)}`}>
              Level {currentLevel}
            </Badge>
            <p className={`text-sm font-medium ${getLevelColor(currentLevel)}`}>
              {getLevelTitle(currentLevel)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-6 p-3 md:p-6">
        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Level {currentLevel}</span>
            <span>Level {currentLevel + 1}</span>
          </div>
          <Progress 
            value={(xpInCurrentLevel / 1000) * 100} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground text-center">
            {xpInCurrentLevel.toLocaleString()} / 1,000 XP
          </p>
        </div>

        {/* XP Breakdown */}
        <div className="space-y-2 md:space-y-3">
          <h4 className="font-medium text-sm">XP Sources</h4>
          {getXPSources().map((source, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground">
                  {source.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{source.label}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </div>
              </div>
              <Badge variant="outline">
                +{source.value.toLocaleString()} XP
              </Badge>
            </div>
          ))}
        </div>

        {/* Level Perks Preview */}
        <div className="p-2 md:p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800 text-xs md:text-sm">
          <h4 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-200">
            🎁 Next Level Rewards (Level {currentLevel + 1})
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Unlock new portfolio insights</li>
            <li>• Access to premium staking rates</li>
            <li>• Exclusive challenge early access</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}