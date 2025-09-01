import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { AssetAllocation } from "@/components/dashboard/AssetAllocation";
import { FeaturedPortfolios } from "@/components/dashboard/FeaturedPortfolios";
import { StakingPlans } from "@/components/dashboard/StakingPlans";
import { StakingCalculator } from "@/components/dashboard/StakingCalculator";
import { CommunityChalllenges } from "@/components/dashboard/CommunityChalllenges";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { WalletOverview } from "@/components/dashboard/WalletOverview";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { StakingPlan } from "@shared/schema";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStakingPlan, setSelectedStakingPlan] = useState<StakingPlan>();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: stakingPlans } = useQuery<StakingPlan[]>({
    queryKey: ["/api/staking/plans"],
  });

  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="dashboard-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Dashboard" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          <StatsOverview />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PortfolioChart />
            </div>
            <AssetAllocation />
          </div>
          
          <FeaturedPortfolios />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StakingPlans 
              onSelectPlan={setSelectedStakingPlan}
              selectedPlan={selectedStakingPlan}
            />
            <StakingCalculator 
              plans={stakingPlans || []}
              selectedPlan={selectedStakingPlan}
              onPlanChange={setSelectedStakingPlan}
            />
          </div>
          
          <CommunityChalllenges />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity />
            <WalletOverview />
          </div>
          
          <AdminPanel />
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
