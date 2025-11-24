import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { EnhancedChallenges } from "@/components/challenges/EnhancedChallenges";
import { useAuth } from "@/hooks/useAuth";

export default function Challenges() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();

  // Authentication is handled by App component routing

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="challenges-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Community Challenges" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-3 sm:p-6 pb-24 lg:pb-6">
          <EnhancedChallenges />
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}