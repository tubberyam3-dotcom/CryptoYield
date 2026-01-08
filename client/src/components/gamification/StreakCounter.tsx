import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Calendar, TrendingUp, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalPortfolioValue: string;
  activeBonds: string;
  activeChallenges: number;
  availableBalance: string;
}

interface UserPortfolio {
  id: string;
}

interface UserBond {
  id: string;
}

export function StreakCounter() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: portfolios = [] } = useQuery<UserPortfolio[]>({
    queryKey: ['/api/user/portfolios'],
  });

  const { data: bonds = [] } = useQuery<UserBond[]>({
    queryKey: ['/api/user/bonds'],
  });

  // Calculate real stats based on actual data
  const activeChallenges = stats?.activeChallenges || 0;
  const totalInvestments = portfolios.length + bonds.length;

  const streaks = [
    {
      id: "investment",
      title: "Active Investments",
      icon: <TrendingUp className="w-4 h-4" />,
      current: totalInvestments,
      target: 5,
      description: "Portfolio and bond positions",
      color: "text-green-500"
    },
    {
      id: "challenge",
      title: "Active Challenges",
      icon: <Zap className="w-4 h-4" />,
      current: activeChallenges,
      target: 3,
      description: "Community challenges joined",
      color: "text-purple-500"
    }
  ];

  const totalActivity = streaks.reduce((sum, streak) => sum + streak.current, 0);

  return (
    <Card data-testid="streak-counter" className="text-sm md:text-base">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Activity Summary
            </CardTitle>
            <CardDescription>Your investment activity</CardDescription>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            {totalActivity} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        {totalActivity === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>No activity yet</p>
            <p className="text-sm mt-1">Start investing to track your progress</p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-4">
            {streaks.map((streak) => (
              <div key={streak.id} className="space-y-1 md:space-y-2" data-testid={`streak-${streak.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${streak.color}`}>
                      {streak.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{streak.title}</p>
                      <p className="text-xs text-muted-foreground">{streak.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{streak.current}</p>
                    <p className="text-xs text-muted-foreground">Target: {streak.target}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={Math.min((streak.current / streak.target) * 100, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{streak.current}/{streak.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {totalActivity >= 5 && (
          <div className="mt-2 md:mt-4 p-2 md:p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-lg border border-orange-200 dark:border-orange-800 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium text-sm text-orange-800 dark:text-orange-200">
                  Active Investor!
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Great job building your portfolio.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
