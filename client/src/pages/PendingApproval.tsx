import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function PendingApproval() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.clear();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    toast({
      title: "Checking status...",
      description: "Refreshing your account status",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center" data-testid="card-pending-approval">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2" data-testid="text-pending-title">
          Account Pending Approval
        </h1>
        
        <p className="text-muted-foreground mb-6" data-testid="text-pending-message">
          Hi {user?.firstName || "there"}, your account is currently under review. 
          Our team will verify your information and approve your account shortly.
        </p>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            <strong>What to expect:</strong><br />
            Account verification typically takes 1-2 business days. 
            You'll receive an email once your account is approved.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="w-full"
            data-testid="button-refresh-status"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Status
          </Button>
          
          <Button 
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-muted-foreground"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Need help? Contact support at support@refluxcapital.com
        </p>
      </Card>
    </div>
  );
}
