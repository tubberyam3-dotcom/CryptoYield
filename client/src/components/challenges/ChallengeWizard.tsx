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
  Trophy, 
  Users, 
  Target, 
  DollarSign,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Zap,
  Star,
  Calendar
} from "lucide-react";
import type { CommunityChallenge } from "@shared/schema";

interface ChallengeWizardProps {
  challenge: CommunityChallenge | null;
  open: boolean;
  onClose: () => void;
}

type ChallengeStep = "overview" | "contribution" | "review" | "success";

export function ChallengeWizard({ challenge, open, onClose }: ChallengeWizardProps) {
  const [currentStep, setCurrentStep] = useState<ChallengeStep>("overview");
  const [contributionAmount, setContributionAmount] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const joinMutation = useMutation({
    mutationFn: async ({ challengeId, contributedAmount }: { challengeId: string; contributedAmount: string }) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/join`, { contributedAmount });
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep("success");
      setShowCelebration(true);
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
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
        title: "Failed to Join Challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const steps = {
    overview: { title: "Challenge Details", step: 1, total: 4 },
    contribution: { title: "Your Contribution", step: 2, total: 4 },
    review: { title: "Review & Join", step: 3, total: 4 },
    success: { title: "Welcome to the Challenge!", step: 4, total: 4 }
  };

  const handleNext = () => {
    if (currentStep === "overview") {
      setCurrentStep("contribution");
    } else if (currentStep === "contribution" && validateAmount()) {
      setCurrentStep("review");
    } else if (currentStep === "review") {
      handleJoin();
    }
  };

  const handleBack = () => {
    if (currentStep === "contribution") setCurrentStep("overview");
    else if (currentStep === "review") setCurrentStep("contribution");
  };

  const handleJoin = () => {
    if (challenge && contributionAmount) {
      joinMutation.mutate({
        challengeId: challenge.id,
        contributedAmount: contributionAmount
      });
    }
  };

  const validateAmount = () => {
    const amount = parseFloat(contributionAmount);
    return amount > 0;
  };

  const getContributionSuggestions = () => {
    if (!challenge) return [];
    const targetAmount = parseFloat(challenge.targetAmount);
    return [
      Math.max(100, targetAmount * 0.01),
      Math.max(500, targetAmount * 0.05),
      Math.max(1000, targetAmount * 0.1),
      Math.max(2500, targetAmount * 0.25)
    ].filter(amount => amount <= targetAmount);
  };

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case 'group': return "text-green-600 bg-green-50 dark:bg-green-950";
      case 'solo': return "text-blue-600 bg-blue-50 dark:bg-blue-950";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-950";
    }
  };

  const getDaysLeft = () => {
    if (!challenge) return 0;
    const end = new Date(challenge.endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getProgressPercentage = () => {
    if (!challenge) return 0;
    const current = parseFloat(challenge.currentAmount || "0");
    const target = parseFloat(challenge.targetAmount);
    return Math.min((current / target) * 100, 100);
  };

  const resetWizard = () => {
    setCurrentStep("overview");
    setContributionAmount("");
    setShowCelebration(false);
    onClose();
  };

  if (!challenge) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={resetWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="challenge-wizard">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{steps[currentStep].title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Step {steps[currentStep].step} of {steps[currentStep].total}
                </p>
              </div>
              <Badge className={getChallengeTypeColor(challenge.type)}>
                {challenge.type === 'group' ? 'Group Challenge' : 'Solo Challenge'}
              </Badge>
            </div>
            <Progress 
              value={(steps[currentStep].step / steps[currentStep].total) * 100} 
              className="w-full h-2 mt-4"
            />
          </DialogHeader>

          <div className="mt-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Challenge Overview */}
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
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl">
                          <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{challenge.name}</h3>
                          <p className="text-muted-foreground mb-4">{challenge.description}</p>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Target Amount</span>
                                <span className="font-bold text-lg">${parseFloat(challenge.targetAmount).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Progress</span>
                                <span className="font-medium">{getProgressPercentage().toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Time Left</span>
                                <span className="font-medium">{getDaysLeft()} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Type</span>
                                <Badge className={getChallengeTypeColor(challenge.type)}>
                                  {challenge.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Progress Visualization */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium">Challenge Progress</h4>
                      </div>
                      <div className="space-y-2">
                        <Progress value={getProgressPercentage()} className="h-3" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>${parseFloat(challenge.currentAmount || "0").toLocaleString()} raised</span>
                          <span>${parseFloat(challenge.targetAmount).toLocaleString()} target</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rewards */}
                  <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Challenge Reward</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            {challenge.reward}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Community Aspect */}
                  {challenge.type === 'group' && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-blue-600" />
                          <h4 className="font-medium">Community Challenge</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Join forces with other community members to reach the target together!
                        </p>
                        <div className="flex -space-x-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div 
                              key={i}
                              className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full border-2 border-card"
                            />
                          ))}
                          <div className="w-8 h-8 bg-muted rounded-full border-2 border-card flex items-center justify-center text-xs">
                            +12
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* Step 2: Contribution Amount */}
              {currentStep === "contribution" && (
                <motion.div
                  key="contribution"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="contributionAmount" className="text-base font-medium">
                      How much would you like to contribute?
                    </Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="contributionAmount"
                        type="number"
                        className="pl-10 text-lg py-6"
                        placeholder="0.00"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        data-testid="input-contribution-amount"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Any amount helps! Every contribution brings us closer to the goal.
                    </p>
                  </div>

                  {/* Suggested Amounts */}
                  <div>
                    <p className="text-sm font-medium mb-3">Suggested contributions:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {getContributionSuggestions().map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          className="h-12"
                          onClick={() => setContributionAmount(amount.toString())}
                          data-testid={`button-suggested-amount-${amount}`}
                        >
                          ${amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Impact Preview */}
                  {contributionAmount && parseFloat(contributionAmount) > 0 && (
                    <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <h4 className="font-medium text-green-800 dark:text-green-200">Your Impact</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Contribution</p>
                            <p className="font-bold text-lg">${parseFloat(contributionAmount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Progress Boost</p>
                            <p className="font-bold text-lg text-green-600">
                              +{((parseFloat(contributionAmount) / parseFloat(challenge.targetAmount)) * 100).toFixed(2)}%
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
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Challenge Participation Summary
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Challenge</span>
                          <span className="font-medium">{challenge.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Your Contribution</span>
                          <span className="text-2xl font-bold">${parseFloat(contributionAmount).toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Challenge Type</span>
                          <Badge className={getChallengeTypeColor(challenge.type)}>
                            {challenge.type === 'group' ? 'Group' : 'Solo'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time Remaining</span>
                          <span className="font-medium">{getDaysLeft()} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reward</span>
                          <span className="font-medium text-yellow-600">{challenge.reward}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800 dark:text-green-200">Ready to Join!</h4>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Your contribution will be added immediately and help the community reach its goal.
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
                  <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full mx-auto flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Welcome to the Challenge! 🏆</h3>
                    <p className="text-muted-foreground">
                      You've successfully joined "{challenge.name}" with ${parseFloat(contributionAmount).toLocaleString()}
                    </p>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span>Challenge</span>
                          <span className="font-medium">{challenge.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Your Contribution</span>
                          <span className="font-medium">${parseFloat(contributionAmount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Potential Reward</span>
                          <span className="font-medium text-yellow-600">{challenge.reward}</span>
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
                  (currentStep === "contribution" && !validateAmount()) ||
                  joinMutation.isPending
                }
                className="flex items-center gap-2"
                data-testid={`button-${currentStep === "review" ? "join-challenge" : "next"}`}
              >
                {joinMutation.isPending ? (
                  "Processing..."
                ) : currentStep === "review" ? (
                  <>
                    <Trophy className="w-4 h-4" />
                    Join Challenge
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
              <Button onClick={resetWizard} className="w-full" data-testid="button-close-challenge-wizard">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Celebration Animation */}
      <CelebrationAnimation 
        trigger={showCelebration}
        type="milestone"
        message={`Successfully joined ${challenge?.name} with $${contributionAmount}!`}
        onComplete={() => setShowCelebration(false)}
      />
    </>
  );
}