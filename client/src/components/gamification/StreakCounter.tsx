import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Calendar, TrendingUp, Zap } from "lucide-react";

export function StreakCounter() {
  // Mock data - in real app, this would come from user activity tracking
  const streaks = [
    {
      id: "login",
      title: "Daily Login",
      icon: <Calendar className="w-4 h-4" />,
      current: 7,
      record: 12,
      description: "Days logged in consecutively",
      color: "text-blue-500"
    },
    {
      id: "investment",
      title: "Investment Streak",
      icon: <TrendingUp className="w-4 h-4" />,
      current: 3,
      record: 5,
      description: "Consecutive weeks with investments",
      color: "text-green-500"
    },
    {
      id: "challenge",
      title: "Challenge Participation",
      icon: <Zap className="w-4 h-4" />,
      current: 2,
      record: 4,
      description: "Active in community challenges",
      color: "text-purple-500"
    }
  ];

  const totalStreak = streaks.reduce((sum, streak) => sum + streak.current, 0);

  return (
    <Card data-testid="streak-counter" className="text-sm md:text-base">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Activity Streaks
            </CardTitle>
            <CardDescription>Keep your momentum going!</CardDescription>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            🔥 {totalStreak}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
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
                  <p className="text-xs text-muted-foreground">Record: {streak.record}</p>
                </div>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={(streak.current / streak.record) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Current streak</span>
                  <span>{streak.current}/{streak.record} (Record)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {totalStreak >= 10 && (
          <div className="mt-2 md:mt-4 p-2 md:p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-lg border border-orange-200 dark:border-orange-800 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium text-sm text-orange-800 dark:text-orange-200">
                  🎉 Fire Streak Bonus!
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  You're on fire! Keep it up for special rewards.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}