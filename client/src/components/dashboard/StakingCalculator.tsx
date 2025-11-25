import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StakingPlan } from "@shared/schema";

interface StakingCalculatorProps {
  plans: StakingPlan[];
  selectedPlan?: StakingPlan;
  onPlanChange: (plan: StakingPlan) => void;
}

export function StakingCalculator({ plans, selectedPlan, onPlanChange }: StakingCalculatorProps) {
  const [amount, setAmount] = useState("1000");
  const [calculation, setCalculation] = useState<{
    principal: string;
    rewards: string;
    total: string;
  } | null>(null);
  const { toast } = useToast();

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
      toast({
        title: "Staking Successful",
        description: "Your assets have been successfully staked!",
      });
    },
    onError: (error) => {
      toast({
        title: "Staking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (selectedPlan && amount) {
      calculateMutation.mutate({ amount: amount.replace(/,/g, ''), planId: selectedPlan.id });
    }
  }, [selectedPlan, amount]);

  const handleStake = () => {
    if (!selectedPlan || !amount) return;
    stakeMutation.mutate({ 
      stakingPlanId: selectedPlan.id, 
      amountLocked: amount.replace(/,/g, '') 
    });
  };

  return (
    <Card className="p-6" data-testid="card-staking-calculator">
      <h2 className="text-xl font-semibold mb-6">Staking Calculator</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="amount">Investment Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              className="pl-8 font-['Archivo']"
              placeholder="1,000"
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                const parts = value.split('.');
                if (parts.length > 2) return;
                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                const formatted = parts.length === 2 ? `${integerPart}.${parts[1].slice(0, 2)}` : integerPart;
                setAmount(formatted);
              }}
              data-testid="input-staking-amount"
            />
          </div>
        </div>
        
        <div>
          <Label>Staking Duration</Label>
          <Select value={selectedPlan?.id || ""} onValueChange={(value) => {
            const plan = plans.find(p => p.id === value);
            if (plan) onPlanChange(plan);
          }}>
            <SelectTrigger data-testid="select-staking-duration">
              <SelectValue placeholder="Select a staking plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id} data-testid={`option-plan-${plan.id}`}>
                  {plan.name} ({plan.apy}% APY)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {calculation && (
          <div className="bg-muted p-4 rounded-lg" data-testid="calculation-results">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Initial Investment</span>
              <span className="font-medium" data-testid="text-calculated-initial">
                ${parseFloat(calculation.principal).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Estimated Rewards</span>
              <span className="font-medium text-green-500" data-testid="text-calculated-rewards">
                ${parseFloat(calculation.rewards).toLocaleString()}
              </span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Return</span>
                <span className="font-bold text-primary text-lg" data-testid="text-calculated-total">
                  ${parseFloat(calculation.total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <Button 
          className="w-full" 
          onClick={handleStake}
          disabled={!selectedPlan || !amount || stakeMutation.isPending}
          data-testid="button-start-staking"
        >
          {stakeMutation.isPending ? "Processing..." : "Start Staking"}
        </Button>
      </div>
    </Card>
  );
}
