import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, Zap, Crown, Star } from "lucide-react";

export function InteractiveElements() {
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(false);

  const handleClaimDailyReward = () => {
    setDailyRewardClaimed(true);
    setConfettiTrigger(true);
    setTimeout(() => setConfettiTrigger(false), 3000);
  };

  const todaysBonus = {
    xp: 50,
    description: "Daily Login Bonus",
    streak: 7
  };

  const quickActions = [
    {
      title: "Double XP Weekend",
      description: "Earn 2x XP on all investments",
      icon: <Zap className="w-5 h-5" />,
      active: true,
      color: "bg-yellow-500",
      timeLeft: "2 days left"
    },
    {
      title: "Staking Boost",
      description: "+1% APY bonus this week",
      icon: <Star className="w-5 h-5" />,
      active: true,
      color: "bg-blue-500",
      timeLeft: "5 days left"
    },
    {
      title: "Challenge Master",
      description: "Join 3 challenges for special rewards",
      icon: <Crown className="w-5 h-5" />,
      active: false,
      color: "bg-purple-500",
      timeLeft: "Available soon"
    }
  ];

  return (
    <div className="space-y-3 md:space-y-6" data-testid="interactive-elements">
      {/* Rewards Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-500" />
                Rewards
              </CardTitle>
              <CardDescription>
                Streak: {todaysBonus.streak} days • Keep it going!
              </CardDescription>
            </div>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Day {todaysBonus.streak}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">+{todaysBonus.xp} XP</p>
              <p className="text-sm text-muted-foreground">{todaysBonus.description}</p>
            </div>
            <motion.div
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleClaimDailyReward}
                disabled={dailyRewardClaimed}
                className={`${
                  dailyRewardClaimed
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                } text-white`}
                data-testid="claim-rewards-btn"
              >
                {dailyRewardClaimed ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Claimed!
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Claim
                  </>
                )}
              </Button>
            </motion.div>
          </div>

          {dailyRewardClaimed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800"
            >
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                🎉 Bonus claimed! +{todaysBonus.xp} XP added to your account.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Active Promotions */}
      <Card data-testid="active-promotions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Active Promotions
          </CardTitle>
          <CardDescription>
            Limited time bonuses and rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="space-y-2 md:space-y-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-2 md:p-4 rounded-lg border transition-all duration-200 text-xs md:text-sm ${
                  action.active
                    ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800"
                    : "bg-muted/50 border-muted"
                }`}
                data-testid={`promotion-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${action.color} text-white`}>
                      {action.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{action.title}</h4>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={action.active ? "default" : "secondary"} className="text-xs">
                      {action.timeLeft}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confetti Effect */}
      {confettiTrigger && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -10,
                rotate: 0,
              }}
              animate={{
                y: window.innerHeight + 10,
                rotate: 360,
                x: Math.random() * window.innerWidth,
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: Math.random() * 1,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}