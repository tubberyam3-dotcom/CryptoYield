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
  TrendingUp, 
  Shield, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Target,
  PieChart,
  Sparkles
} from "lucide-react";
import type { Portfolio } from "@shared/schema";

interface InvestmentWizardProps {
  portfolio: Portfolio | null;
  open: boolean;
  onClose: () => void;
}

type InvestmentStep = "overview" | "amount" | "review" | "success";

export function InvestmentWizard({ portfolio, open, onClose }: InvestmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<InvestmentStep>("overview");
  const [investAmount, setInvestAmount] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const investMutation = useMutation({
    mutationFn: async ({ portfolioId, investedAmount }: { portfolioId: string; investedAmount: string }) => {
      const response = await apiRequest("POST", "/api/user/portfolios", { 
        portfolioId, 
        investedAmount 
      });
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep("success");
      setShowCelebration(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user/portfolios"] });
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
        title: "Investment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const steps = {
    overview: { title: "Portfolio Overview", step: 1, total: 4 },
    amount: { title: "Investment Amount", step: 2, total: 4 },
    review: { title: "Review & Confirm", step: 3, total: 4 },
    success: { title: "Investment Complete", step: 4, total: 4 }
  };

  const handleNext = () => {
    if (currentStep === "overview") setCurrentStep("amount");
    else if (currentStep === "amount" && validateAmount()) setCurrentStep("review");
    else if (currentStep === "review") handleInvest();
  };

  const handleBack = () => {
    if (currentStep === "amount") setCurrentStep("overview");
    else if (currentStep === "review") setCurrentStep("amount");
  };

  const handleInvest = () => {
    if (portfolio && investAmount) {
      investMutation.mutate({
        portfolioId: portfolio.id,
        investedAmount: investAmount
      });
    }
  };

  const validateAmount = () => {
    const amount = parseFloat(investAmount.replace(/,/g, ''));
    const minAmount = parseFloat(portfolio?.minInvestment || "0");
    return amount >= minAmount && amount > 0;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-950';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getInvestmentSuggestions = () => {
    const minAmount = parseFloat(portfolio?.minInvestment || "0");
    return [
      minAmount,
      minAmount * 2,
      minAmount * 5,
      minAmount * 10
    ].filter(amount => amount <= 50000);
  };

  const resetWizard = () => {
    setCurrentStep("overview");
    setInvestAmount("");
    setShowCelebration(false);
    onClose();
  };

  if (!portfolio) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={resetWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="investment-wizard">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{steps[currentStep].title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Step {steps[currentStep].step} of {steps[currentStep].total}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {portfolio.strategyTag}
              </Badge>
            </div>
            <Progress 
              value={(steps[currentStep].step / steps[currentStep].total) * 100} 
              className="w-full h-2 mt-4"
            />
          </DialogHeader>

          <div className="mt-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Portfolio Overview */}
              {currentStep === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl w-fit">
                          <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold mb-2">{portfolio.name}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{portfolio.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex justify-between items-center py-2 border-b border-border sm:border-0">
                              <span className="text-sm text-muted-foreground">Min. Investment</span>
                              <span className="font-medium">${parseFloat(portfolio.minInvestment).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border sm:border-0">
                              <span className="text-sm text-muted-foreground">Current Return</span>
                              <span className="text-green-600 font-medium">+{portfolio.currentReturn || 0}%</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border sm:border-0">
                              <span className="text-sm text-muted-foreground">Risk Level</span>
                              <Badge className={getRiskColor(portfolio.riskLevel)}>
                                {portfolio.riskLevel}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-muted-foreground">Strategy</span>
                              <span className="font-medium text-sm">{portfolio.strategyTag}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Warning for High Risk Portfolios */}
                  {portfolio.riskLevel === 'high' && (
                    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-orange-800 dark:text-orange-200">High Risk Investment</h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              This portfolio carries higher volatility. Only invest what you can afford to lose.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* Step 2: Investment Amount */}
              {currentStep === "amount" && (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="investAmount" className="text-base font-medium">
                      How much would you like to invest?
                    </Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="investAmount"
                        type="text"
                        inputMode="decimal"
                        className="pl-10 text-lg py-6 font-['Archivo']"
                        placeholder="0.00"
                        value={investAmount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          const parts = value.split('.');
                          if (parts.length > 2) return;
                          const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                          const formatted = parts.length === 2 ? `${integerPart}.${parts[1].slice(0, 2)}` : integerPart;
                          setInvestAmount(formatted);
                        }}
                        data-testid="input-investment-amount"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Minimum investment: ${parseFloat(portfolio.minInvestment).toLocaleString()}
                    </p>
                  </div>

                  {/* Quick Amount Suggestions */}
                  <div>
                    <p className="text-sm font-medium mb-3">Quick select:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {getInvestmentSuggestions().map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          className="h-12"
                          onClick={() => setInvestAmount(amount.toLocaleString())}
                          data-testid={`button-quick-amount-${amount}`}
                        >
                          ${amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Investment Calculator */}
                  {investAmount && parseFloat(investAmount.replace(/,/g, '')) > 0 && (
                    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">Projected Returns</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">1 Month</p>
                            <p className="font-medium">
                              ${(parseFloat(investAmount.replace(/,/g, '')) * (1 + (parseFloat(portfolio.currentReturn || "0") / 100) / 12)).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">6 Months</p>
                            <p className="font-medium">
                              ${(parseFloat(investAmount.replace(/,/g, '')) * (1 + (parseFloat(portfolio.currentReturn || "0") / 100) / 2)).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">1 Year</p>
                            <p className="font-medium">
                              ${(parseFloat(investAmount.replace(/,/g, '')) * (1 + (parseFloat(portfolio.currentReturn || "0") / 100))).toLocaleString()}
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
                        Investment Summary
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Portfolio</span>
                          <span className="font-medium">{portfolio.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Investment Amount</span>
                          <span className="text-2xl font-bold">${parseFloat(investAmount.replace(/,/g, '')).toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Strategy</span>
                          <Badge>{portfolio.strategyTag}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Risk Level</span>
                          <Badge className={getRiskColor(portfolio.riskLevel)}>
                            {portfolio.riskLevel}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expected Annual Return</span>
                          <span className="font-medium text-green-600">+{portfolio.currentReturn || 0}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800 dark:text-green-200">Ready to Invest!</h4>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Your investment will be processed immediately and start earning returns.
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
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full mx-auto flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Investment Successful! 🎉</h3>
                    <p className="text-muted-foreground">
                      You've successfully invested ${parseFloat(investAmount.replace(/,/g, '')).toLocaleString()} in {portfolio.name}
                    </p>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span>Portfolio</span>
                          <span className="font-medium">{portfolio.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Investment Amount</span>
                          <span className="font-medium">${parseFloat(investAmount.replace(/,/g, '')).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected Growth</span>
                          <span className="font-medium text-green-600">+{portfolio.currentReturn || 0}% annually</span>
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
                  investMutation.isPending
                }
                className="flex items-center gap-2"
                data-testid={`button-${currentStep === "review" ? "confirm" : "next"}`}
              >
                {investMutation.isPending ? (
                  "Processing..."
                ) : currentStep === "review" ? (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Confirm Investment
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
              <Button onClick={resetWizard} className="w-full" data-testid="button-close-wizard">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Celebration Animation */}
      <CelebrationAnimation 
        trigger={showCelebration}
        type="investment"
        message={`Successfully invested $${investAmount} in ${portfolio?.name}!`}
        onComplete={() => setShowCelebration(false)}
      />
    </>
  );
}