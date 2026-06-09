import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { GamifiedStats } from "@/components/gamification/GamifiedStats";
import { BalanceSummary } from "@/components/dashboard/BalanceSummary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { AssetAllocation } from "@/components/dashboard/AssetAllocation";
import { FeaturedPortfolios } from "@/components/dashboard/FeaturedPortfolios";
import { EnhancedStakingPlans } from "@/components/staking/EnhancedStakingPlans";
import { EnhancedChallenges } from "@/components/challenges/EnhancedChallenges";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { WalletOverview } from "@/components/dashboard/WalletOverview";
import { AchievementBadges } from "@/components/gamification/AchievementBadges";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { LevelSystem } from "@/components/gamification/LevelSystem";
import { CelebrationAnimation } from "@/components/gamification/CelebrationAnimations";
import { InteractiveElements } from "@/components/gamification/InteractiveElements";
import { FloatingClaimButton } from "@/components/dashboard/FloatingClaimButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<"investment" | "achievement" | "milestone" | "streak">("achievement");
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const { user, isLoading } = useAuth();

  // Authentication is handled by App component routing

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
        <TopBar title="Dashboard" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-4 md:p-8 space-y-6 md:space-y-8 pb-24 lg:pb-8">
          <BalanceSummary />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="hidden lg:block lg:col-span-2">
              <PortfolioChart />
            </div>
            <AssetAllocation />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Featured Portfolios</h2>
            <FeaturedPortfolios />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Staking Plans</h2>
            <EnhancedStakingPlans />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Community Challenges</h2>
            <EnhancedChallenges />
          </div>
          
          {/* Gamification Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Your Progress</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <LevelSystem />
              <StreakCounter />
              <div className="lg:col-span-1">
                <InteractiveElements />
              </div>
            </div>
          </div>
          
          <AchievementBadges />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <RecentActivity />
            <WalletOverview />
          </div>
          
          {/* Admin Access Link - Only show for admin users */}
          {user?.role === 'admin' && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <i className="fas fa-shield-alt text-purple-600"></i>
                      Administrator Access
                    </h3>
                    <p className="text-muted-foreground">
                      Access the dedicated admin dashboard for platform management
                    </p>
                  </div>
                  <Link href="/admin-panel">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <i className="fas fa-cog mr-2"></i>
                      Open Admin Panel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
      
      <MobileNav />
      
      {/* Floating Claim Button - Mobile Only */}
      <FloatingClaimButton />
      
      {/* Celebration Animation */}
      <CelebrationAnimation 
        trigger={showCelebration}
        type={celebrationType}
        message={celebrationMessage}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
}
