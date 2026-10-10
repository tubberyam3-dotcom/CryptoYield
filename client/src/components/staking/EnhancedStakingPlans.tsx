import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { StakingWizard } from "./StakingWizard";
import { 
  Zap, 
  Clock, 
  Shield, 
  TrendingUp, 
  Star,
  Lock,
  Unlock,
  Calendar
} from "lucide-react";
import type { StakingPlan } from "@shared/schema";

export function EnhancedStakingPlans() {
  const [selectedPlan, setSelectedPlan] = useState<StakingPlan | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: plans, isLoading } = useQuery<StakingPlan[]>({
    queryKey: ["/api/staking/plans"],
  });

  const handleSelectPlan = (plan: StakingPlan) => {
    setSelectedPlan(plan);
    setWizardOpen(true);
  };

  const getPlanColor = (duration: number) => {
    if (duration === 0) return {
      bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    };
    if (duration <= 90) return {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
      badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
    if (duration <= 180) return {
      bg: "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: "text-yellow-600 dark:text-yellow-400",
      badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    };
    return {
      bg: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950",
      border: "border-purple-200 dark:border-purple-800",
      icon: "text-purple-600 dark:text-purple-400",
      badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    };
  };

  const getRiskLevel = (duration: number, apy: string) => {
    const apyNum = parseFloat(apy);
    if (duration === 0 || apyNum < 10) return { level: "Low", color: "text-green-600" };
    if (duration <= 90 && apyNum < 15) return { level: "Medium", color: "text-yellow-600" };
    return { level: "High", color: "text-red-600" };
  };

  const getPopularityScore = (duration: number) => {
    // Mock popularity based on duration (shorter = more popular)
    if (duration === 0) return 95;
    if (duration <= 90) return 80;
    if (duration <= 180) return 65;
    return 45;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Staking Plans
          </CardTitle>
          <CardDescription>Choose a plan that matches your investment goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="enhanced-staking-plans">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Enhanced Staking Plans
          </CardTitle>
          <CardDescription>
            Lock your crypto and earn passive rewards with our flexible staking options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.map((plan, index) => {
              const colors = getPlanColor(plan.duration);
              const risk = getRiskLevel(plan.duration, plan.apy);
              const popularity = getPopularityScore(plan.duration);
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <Card 
                    className={`${colors.bg} ${colors.border} border-2 cursor-pointer group overflow-hidden relative`}
                    data-testid={`enhanced-staking-plan-${plan.id}`}
                  >
                    {/* Popular Badge */}
                    {popularity >= 80 && (
                      <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-yellow-500 text-white shadow-lg">
                          <Star className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      </div>
                    )}

                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent pointer-events-none" />

                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md`}>
                            {plan.duration === 0 ? 
                              <Unlock className={`w-5 h-5 ${colors.icon}`} /> :
                              <Lock className={`w-5 h-5 ${colors.icon}`} />
                            }
                          </div>
                          <div>
                            <h3 className="font-bold text-lg" data-testid={`plan-name-${plan.id}`}>
                              {plan.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {plan.duration === 0 ? "Withdraw anytime" : `${plan.duration} month lock`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* APY Display */}
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold mb-1" data-testid={`plan-apy-${plan.id}`}>
                          {plan.apy}%
                        </div>
                        <p className="text-sm text-muted-foreground">Annual Percentage Yield</p>
                      </div>

                      {/* Plan Details */}
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Min. Amount</span>
                          <span className="font-medium" data-testid={`plan-min-amount-${plan.id}`}>
                            ${parseFloat(plan.minAmount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lock Duration</span>
                          <Badge className={colors.badge}>
                            {plan.duration === 0 ? "Flexible" : `${plan.duration} months`}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Risk Level</span>
                          <span className={`font-medium ${risk.color}`}>
                            {risk.level}
                          </span>
                        </div>
                      </div>

                      {/* Popularity Indicator */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Popularity</span>
                          <span className="font-medium">{popularity}%</span>
                        </div>
                        <Progress value={popularity} className="h-2" />
                      </div>

                      {/* Expected Monthly Return */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">Monthly Return</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          For every $1,000 staked
                        </p>
                        <p className="font-bold text-green-600">
                          ${((1000 * parseFloat(plan.apy)) / 100 / 12).toFixed(2)}
                        </p>
                      </div>

                      {/* Stake Button */}
                      <Button 
                        onClick={() => handleSelectPlan(plan)}
                        className="w-full"
                        data-testid={`button-stake-${plan.id}`}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Stake Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Secure</h4>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Smart contracts audited by top security firms
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <h4 className="font-medium text-green-800 dark:text-green-200">Auto-Compound</h4>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Rewards automatically compound for maximum returns
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <h4 className="font-medium text-purple-800 dark:text-purple-200">Transparent</h4>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Real-time tracking of your staking performance
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <StakingWizard
        stakingPlan={selectedPlan}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}