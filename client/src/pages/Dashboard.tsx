import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BalanceSummary } from "@/components/dashboard/BalanceSummary";
import { Link } from "wouter";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { AssetAllocation } from "@/components/dashboard/AssetAllocation";
import { FeaturedPortfolios } from "@/components/dashboard/FeaturedPortfolios";
import { EnhancedStakingPlans } from "@/components/staking/EnhancedStakingPlans";
import { EnhancedChallenges } from "@/components/challenges/EnhancedChallenges";
import { WalletOverview } from "@/components/dashboard/WalletOverview";
import { AchievementBadges } from "@/components/gamification/AchievementBadges";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { LevelSystem } from "@/components/gamification/LevelSystem";
import { CelebrationAnimation } from "@/components/gamification/CelebrationAnimations";
import { InteractiveElements } from "@/components/gamification/InteractiveElements";
import { FloatingClaimButton } from "@/components/dashboard/FloatingClaimButton";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "investments" | "earn" | "progress">("overview");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<"investment" | "achievement" | "milestone" | "streak">("achievement");
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const { user, isLoading, hasJointAccount } = useAuth();

  // Authentication is handled by App component routing

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground" data-testid="dashboard-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-[100dvh]">
        <TopBar title="Dashboard" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="mx-auto max-w-[1440px] space-y-4 p-3 pb-28 sm:p-5 lg:space-y-5 lg:p-7 lg:pb-7">
          <nav aria-label="Account shortcuts" className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <span className="w-full text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:w-auto sm:pr-1">Account shortcuts</span>
            <Link href="/settings?tab=security#xp-code" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5">
              <i className="fas fa-key text-primary" aria-hidden="true"></i>
              XP Code
            </Link>
            <Link href="/settings?tab=account#joint-account" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5">
              <i className="fas fa-users text-primary" aria-hidden="true"></i>
              {hasJointAccount ? "Joint account" : "Set up joint account"}
            </Link>
          </nav>

          <section aria-label="Account balance" className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Your account</h2>
            <BalanceSummary />
          </section>

          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Choose a view to see the details you need.</p>
            </div>
            <div role="tablist" aria-label="Dashboard sections" className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1.5 sm:grid-cols-4">
              {[
                { id: "overview" as const, label: "Overview", icon: "fas fa-th-large" },
                { id: "investments" as const, label: "Investments", icon: "fas fa-chart-line" },
                { id: "earn" as const, label: "Earn & explore", icon: "fas fa-coins" },
                { id: "progress" as const, label: "Progress", icon: "fas fa-award" },
              ].map((tab, index, tabs) => (
                <button
                  key={tab.id}
                  id={`dashboard-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === tab.id}
                  aria-controls={`dashboard-panel-${tab.id}`}
                  tabIndex={activeSection === tab.id ? 0 : -1}
                  onClick={() => setActiveSection(tab.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
                    event.preventDefault();
                    const nextIndex = event.key === "Home" ? 0
                      : event.key === "End" ? tabs.length - 1
                      : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
                    const nextTab = tabs[nextIndex];
                    setActiveSection(nextTab.id);
                    document.getElementById(`dashboard-tab-${nextTab.id}`)?.focus();
                  }}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                    activeSection === tab.id
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                  }`}
                >
                  <i className={`${tab.icon} hidden sm:inline`} aria-hidden="true"></i>
                  {tab.label}
                </button>
              ))}
            </div>

            <section
              id={`dashboard-panel-${activeSection}`}
              role="tabpanel"
              aria-labelledby={`dashboard-tab-${activeSection}`}
              tabIndex={0}
              className="min-w-0 space-y-4 outline-none"
            >
              {activeSection === "overview" && (
                <>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <EnhancedChallenges compact />
                    <WalletOverview />
                  </div>
                  {user?.role === "admin" && (
                    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div>
                        <h3 className="font-semibold">Administrator access</h3>
                        <p className="text-sm text-muted-foreground">Platform management tools</p>
                      </div>
                      <Link href="/admin-panel" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                        <i className="fas fa-shield-alt" aria-hidden="true"></i>
                        Open admin panel
                      </Link>
                    </section>
                  )}
                </>
              )}

              {activeSection === "investments" && (
                <>
                  <section aria-label="Investment overview" className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
                    <div className="lg:col-span-2">
                      <PortfolioChart />
                    </div>
                    <AssetAllocation />
                  </section>
                  <section className="space-y-2.5">
                    <h3 className="text-lg font-bold text-foreground">Featured Portfolios</h3>
                    <FeaturedPortfolios />
                  </section>
                </>
              )}

              {activeSection === "earn" && (
                <>
                  <section className="space-y-2.5">
                    <h3 className="text-lg font-bold text-foreground">Staking Plans</h3>
                    <EnhancedStakingPlans />
                  </section>
                  <section className="space-y-2.5">
                    <h3 className="text-lg font-bold text-foreground">Community Challenges</h3>
                    <EnhancedChallenges />
                  </section>
                </>
              )}

              {activeSection === "progress" && (
                <>
                  <section className="space-y-2.5">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <h3 className="text-lg font-bold text-foreground">Your Progress</h3>
                      <Link href="/rewards" className="text-sm font-medium text-primary hover:underline">View rewards</Link>
                    </div>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
                      <LevelSystem />
                      <StreakCounter />
                      <InteractiveElements />
                    </div>
                  </section>
                  <section className="space-y-2.5" aria-label="Achievements">
                    <h3 className="text-lg font-bold text-foreground">Achievements</h3>
                    <AchievementBadges />
                  </section>
                </>
              )}
            </section>
            {(["overview", "investments", "earn", "progress"] as const)
              .filter((section) => section !== activeSection)
              .map((section) => (
                <section
                  key={section}
                  id={`dashboard-panel-${section}`}
                  role="tabpanel"
                  aria-labelledby={`dashboard-tab-${section}`}
                  tabIndex={0}
                  hidden
                />
              ))}
          </div>
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
