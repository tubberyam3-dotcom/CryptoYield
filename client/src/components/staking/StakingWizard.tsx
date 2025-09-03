import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CelebrationAnimation } from "@/components/gamification/CelebrationAnimations";
import { 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Shield, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Lock,
  Calendar,
  Sparkles
} from "lucide-react";
import type { StakingPlan } from "@shared/schema";

interface StakingWizardProps {
  stakingPlan: StakingPlan | null;
  open: boolean;
  onClose: () => void;
}

type StakingStep = "overview" | "amount" | "review" | "success";

export function StakingWizard({ stakingPlan, open, onClose }: StakingWizardProps) {
  const [currentStep, setCurrentStep] = useState<StakingStep>("overview");
  const [stakeAmount, setStakeAmount] = useState("");
  const [calculation, setCalculation] = useState<{
    principal: string;
    rewards: string;
    total: string;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const calculateMutation = useMutation({
    mutationFn: async ({ amount, planId }: { amount: string; planId: string }) => {
      const response = await apiRequest("POST", "/api/staking/calculate", { amount, planId });
      return response.json();
    },
    onSuccess: (data) => {
      setCalculation(data);
    },
  });

  const stakeMutation = useMutation({
    mutationFn: async ({ stakingPlanId, amountLocked }: { stakingPlanId: string; amountLocked: string }) => {
      const response = await apiRequest("POST", "/api/user/staking", { stakingPlanId, amountLocked });
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep("success");
      setShowCelebration(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user/staking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
        title: "Staking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const steps = {
    overview: { title: "Staking Plan Details", step: 1, total: 4 },
    amount: { title: "Stake Amount", step: 2, total: 4 },
    review: { title: "Review & Confirm", step: 3, total: 4 },
    success: { title: "Staking Complete", step: 4, total: 4 }
  };

  const handleNext = () => {
    if (currentStep === "overview") {
      setCurrentStep("amount");
    } else if (currentStep === "amount" && validateAmount()) {
      // Calculate rewards before moving to review
      if (stakingPlan) {
        calculateMutation.mutate({ amount: stakeAmount, planId: stakingPlan.id });
      }
      setCurrentStep("review");
    } else if (currentStep === "review") {
      handleStake();
    }
  };

  const handleBack = () => {
    if (currentStep === "amount") setCurrentStep("overview");
    else if (currentStep === "review") setCurrentStep("amount");
  };

  const handleStake = () => {
    if (stakingPlan && stakeAmount) {
      stakeMutation.mutate({
        stakingPlanId: stakingPlan.id,
        amountLocked: stakeAmount
      });
    }
  };

  const validateAmount = () => {
    const amount = parseFloat(stakeAmount);
    const minAmount = parseFloat(stakingPlan?.minAmount || "0");
    return amount >= minAmount && amount > 0;
  };

  const getAmountSuggestions = () => {
    const minAmount = parseFloat(stakingPlan?.minAmount || "0");
    return [
      minAmount,
      minAmount * 2,
      minAmount * 5,
      minAmount * 10
    ].filter(amount => amount <= 100000);
  };

  const getDurationColor = (duration: number) => {
    if (duration === 0) return "text-blue-600 bg-blue-50 dark:bg-blue-950";
    if (duration <= 90) return "text-green-600 bg-green-50 dark:bg-green-950";
    if (duration <= 180) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950";
    return "text-purple-600 bg-purple-50 dark:bg-purple-950";
  };

  const getMonthlyRewards = () => {
    if (!calculation || !stakingPlan) return 0;
    const totalRewards = parseFloat(calculation.rewards);
    const duration = stakingPlan.duration || 1;
    return totalRewards / duration;
  };

  const resetWizard = () => {
    setCurrentStep("overview");
    setStakeAmount("");
    setCalculation(null);
    setShowCelebration(false);
    onClose();
  };

  if (!stakingPlan) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={resetWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="staking-wizard">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{steps[currentStep].title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Step {steps[currentStep].step} of {steps[currentStep].total}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {stakingPlan.apy}% APY
              </Badge>
            </div>
            <Progress 
              value={(steps[currentStep].step / steps[currentStep].total) * 100} 
              className="w-full h-2 mt-4"
            />
          </DialogHeader>

          <div className="mt-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Staking Plan Overview */}
              {currentStep === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                          <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{stakingPlan.name}</h3>
                          <p className="text-muted-foreground mb-4">
                            Lock your crypto assets and earn passive rewards with our secure staking protocol.
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Annual APY</span>
                                <span className="font-bold text-lg text-green-600">{stakingPlan.apy}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Duration</span>
                                <Badge className={getDurationColor(stakingPlan.duration)}>
                                  {stakingPlan.duration === 0 ? "Flexible" : `${stakingPlan.duration} months`}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Min. Amount</span>
                                <span className="font-medium">${parseFloat(stakingPlan.minAmount).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Reward Type</span>
                                <span className="font-medium">Compound</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Features & Benefits */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        Plan Features
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Secure smart contracts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Automated reward distribution</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Transparent performance tracking</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{stakingPlan.duration === 0 ? "Withdraw anytime" : "Guaranteed returns"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Warning */}
                  {stakingPlan.duration > 365 && (
                    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-orange-800 dark:text-orange-200">Long-term Lock</h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              This plan requires a long commitment. Your funds will be locked for over a year.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* Step 2: Stake Amount */}
              {currentStep === "amount" && (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="stakeAmount" className="text-base font-medium">
                      How much would you like to stake?
                    </Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="stakeAmount"
                        type="number"
                        className="pl-10 text-lg py-6"
                        placeholder="0.00"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        data-testid="input-stake-amount"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Minimum staking amount: ${parseFloat(stakingPlan.minAmount).toLocaleString()}
                    </p>
                  </div>

                  {/* Quick Amount Suggestions */}
                  <div>
                    <p className="text-sm font-medium mb-3">Quick select:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {getAmountSuggestions().map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          className="h-12"
                          onClick={() => setStakeAmount(amount.toString())}
                          data-testid={`button-quick-stake-${amount}`}
                        >
                          ${amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Earnings Preview */}
                  {stakeAmount && parseFloat(stakeAmount) > 0 && (
                    <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <h4 className="font-medium text-purple-800 dark:text-purple-200">Earnings Preview</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Monthly Rewards</p>
                            <p className="font-bold text-lg">
                              ${((parseFloat(stakeAmount) * parseFloat(stakingPlan.apy)) / 100 / 12).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total After {stakingPlan.duration || 12} Months</p>
                            <p className="font-bold text-lg text-green-600">
                              ${(parseFloat(stakeAmount) * (1 + parseFloat(stakingPlan.apy) / 100 * (stakingPlan.duration || 12) / 12)).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* Step 3: Review & Confirm */}
              {currentStep === "review" && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-purple-600" />
                        Staking Summary
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Staking Plan</span>
                          <span className="font-medium">{stakingPlan.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stake Amount</span>
                          <span className="text-2xl font-bold">${parseFloat(stakeAmount).toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">APY Rate</span>
                          <span className="font-medium text-green-600">{stakingPlan.apy}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lock Period</span>
                          <Badge className={getDurationColor(stakingPlan.duration)}>
                            {stakingPlan.duration === 0 ? "Flexible" : `${stakingPlan.duration} months`}
                          </Badge>
                        </div>
                        {calculation && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Estimated Rewards</span>
                              <span className="font-medium text-purple-600">
                                ${parseFloat(calculation.rewards).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Return</span>
                              <span className="font-bold text-xl text-green-600">
                                ${parseFloat(calculation.total).toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800 dark:text-green-200">Ready to Stake!</h4>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Your staking position will be activated immediately and start earning rewards.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {currentStep === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto flex items-center justify-center">
                    <Zap className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Staking Activated! ⚡</h3>
                    <p className="text-muted-foreground">
                      You've successfully staked ${parseFloat(stakeAmount).toLocaleString()} in {stakingPlan.name}
                    </p>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span>Staking Plan</span>
                          <span className="font-medium">{stakingPlan.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Staked Amount</span>
                          <span className="font-medium">${parseFloat(stakeAmount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected Rewards</span>
                          <span className="font-medium text-purple-600">{stakingPlan.apy}% APY</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          {currentStep !== "success" && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === "overview"}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === "amount" && !validateAmount()) ||
                  stakeMutation.isPending
                }
                className="flex items-center gap-2"
                data-testid={`button-${currentStep === "review" ? "confirm-stake" : "next"}`}
              >
                {stakeMutation.isPending ? (
                  "Processing..."
                ) : currentStep === "review" ? (
                  <>
                    <Zap className="w-4 h-4" />
                    Confirm Staking
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {currentStep === "success" && (
            <div className="mt-6">
              <Button onClick={resetWizard} className="w-full" data-testid="button-close-staking-wizard">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Celebration Animation */}
      <CelebrationAnimation 
        trigger={showCelebration}
        type="achievement"
        message={`Successfully staked $${stakeAmount} in ${stakingPlan?.name}!`}
        onComplete={() => setShowCelebration(false)}
      />
    </>
  );
}