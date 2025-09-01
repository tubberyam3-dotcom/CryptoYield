import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import type { StakingPlan } from "@shared/schema";

interface StakingPlansProps {
  onSelectPlan: (plan: StakingPlan) => void;
  selectedPlan?: StakingPlan;
}

export function StakingPlans({ onSelectPlan, selectedPlan }: StakingPlansProps) {
  const { data: plans, isLoading } = useQuery<StakingPlan[]>({
    queryKey: ["/api/staking/plans"],
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Staking Plans</h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-muted rounded-lg animate-pulse">
              <div className="h-4 bg-background rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-background rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-staking-plans">
      <h2 className="text-xl font-semibold mb-6">Staking Plans</h2>
      
      <div className="space-y-4">
        {plans?.map((plan) => (
          <div
            key={plan.id}
            className={`p-4 rounded-lg border transition-colors cursor-pointer ${
              selectedPlan?.id === plan.id
                ? "border-primary bg-primary/5"
                : "bg-muted border-border hover:border-primary"
            }`}
            onClick={() => onSelectPlan(plan)}
            data-testid={`staking-plan-${plan.id}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Lock your assets for {plan.duration} months
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary" data-testid={`text-plan-apy-${plan.id}`}>
                  {plan.apy}% APY
                </div>
                <div className="text-xs text-muted-foreground">
                  {plan.duration} months
                </div>
              </div>
            </div>
          </div>
        )) || []}
      </div>
    </Card>
  );
}
