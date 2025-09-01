import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StakingPlan, UserStaking } from "@shared/schema";

export default function Staking() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<StakingPlan | null>(null);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stakingPlans, isLoading: plansLoading } = useQuery<StakingPlan[]>({
    queryKey: ["/api/staking/plans"],
  });

  const { data: userStakings } = useQuery<(UserStaking & { stakingPlan: StakingPlan })[]>({
    queryKey: ["/api/user/staking"],
  });

  const stakeMutation = useMutation({
    mutationFn: async ({ stakingPlanId, amountLocked }: { stakingPlanId: string; amountLocked: string }) => {
      const response = await apiRequest("POST", "/api/user/staking", { stakingPlanId, amountLocked });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staking Successful",
        description: `You've staked $${stakeAmount} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/staking"] });
      setSelectedPlan(null);
      setStakeAmount("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Staking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Authentication is handled by App component routing

  const handleStake = () => {
    if (!selectedPlan || !stakeAmount) return;
    
    const amount = parseFloat(stakeAmount);
    const minAmount = parseFloat(selectedPlan.minAmount);
    
    if (amount < minAmount) {
      toast({
        title: "Amount Too Low",
        description: `Minimum staking amount is $${minAmount.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    stakeMutation.mutate({ 
      stakingPlanId: selectedPlan.id, 
      amountLocked: stakeAmount 
    });
  };

  const calculateTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      return `${Math.floor(diffDays / 365)} years`;
    } else if (diffDays > 30) {
      return `${Math.floor(diffDays / 30)} months`;
    } else if (diffDays > 0) {
      return `${diffDays} days`;
    } else {
      return "Completed";
    }
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    const totalTime = end.getTime() - start.getTime();
    const elapsedTime = now.getTime() - start.getTime();
    
    return Math.min(Math.max((elapsedTime / totalTime) * 100, 0), 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="staking-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Staking" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          
          {/* Active Stakes */}
          {userStakings && userStakings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">My Active Stakes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userStakings.map((staking) => (
                  <Card key={staking.id} className="p-6" data-testid={`card-active-stake-${staking.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={staking.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}>
                        {staking.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {calculateTimeRemaining(staking.endDate.toString())}
                      </div>
                    </div>
                    
                    <h3 className="font-semibold mb-2" data-testid={`text-stake-plan-${staking.id}`}>
                      {staking.stakingPlan.name}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Staked Amount</span>
                        <span className="font-medium">${parseFloat(staking.amountLocked).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">APY</span>
                        <span className="font-medium text-primary">{staking.stakingPlan.apy}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Est. Rewards</span>
                        <span className="font-medium text-green-500">
                          ${parseFloat(staking.estimatedRewards).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{Math.round(calculateProgress(staking.startDate?.toString() || '', staking.endDate?.toString() || ''))}%</span>
                        </div>
                        <Progress 
                          value={calculateProgress(staking.startDate?.toString() || '', staking.endDate?.toString() || '')} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Staking Plans */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Staking Plans</h2>
            
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3 mb-4"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stakingPlans?.map((plan) => (
                  <Card key={plan.id} className="p-6 hover-lift" data-testid={`card-staking-plan-${plan.id}`}>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2" data-testid={`text-plan-name-${plan.id}`}>
                        {plan.name}
                      </h3>
                      <div className="text-2xl font-bold text-primary mb-1">
                        {plan.apy}% APY
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plan.duration} months duration
                      </p>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min. Amount</span>
                        <span className="font-medium">
                          ${parseFloat(plan.minAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lock Period</span>
                        <span className="font-medium">{plan.duration} months</span>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full"
                          onClick={() => setSelectedPlan(plan)}
                          data-testid={`button-stake-plan-${plan.id}`}
                        >
                          Stake Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="dialog-stake">
                        <DialogHeader>
                          <DialogTitle>Stake with {selectedPlan?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex justify-between mb-2">
                              <span>APY</span>
                              <span className="font-bold text-primary">{selectedPlan?.apy}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duration</span>
                              <span>{selectedPlan?.duration} months</span>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="stakeAmount">Staking Amount</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                id="stakeAmount"
                                type="number"
                                className="pl-8"
                                placeholder={selectedPlan?.minAmount || "1000"}
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                data-testid="input-stake-amount"
                              />
                            </div>
                            {selectedPlan && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Minimum: ${parseFloat(selectedPlan.minAmount).toLocaleString()}
                              </p>
                            )}
                          </div>
                          
                          <Button 
                            className="w-full"
                            onClick={handleStake}
                            disabled={stakeMutation.isPending || !stakeAmount}
                            data-testid="button-confirm-stake"
                          >
                            {stakeMutation.isPending ? "Processing..." : "Confirm Staking"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </Card>
                )) || []}
              </div>
            )}
          </div>

          {/* Staking Rewards Info */}
          <Card className="p-6" data-testid="card-staking-info">
            <h3 className="text-lg font-semibold mb-4">How Staking Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-lock text-primary text-xl"></i>
                </div>
                <h4 className="font-medium mb-2">Lock Your Assets</h4>
                <p className="text-sm text-muted-foreground">
                  Choose a staking plan and lock your cryptocurrency for a fixed period.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-chart-line text-accent text-xl"></i>
                </div>
                <h4 className="font-medium mb-2">Earn Rewards</h4>
                <p className="text-sm text-muted-foreground">
                  Receive competitive APY returns on your staked assets automatically.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-coins text-green-500 text-xl"></i>
                </div>
                <h4 className="font-medium mb-2">Claim Rewards</h4>
                <p className="text-sm text-muted-foreground">
                  Access your original stake plus earned rewards when the term completes.
                </p>
              </div>
            </div>
          </Card>

        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
