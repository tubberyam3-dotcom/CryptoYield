import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (user?.role !== 'admin') {
    return null;
  }

  const adminActions = [
    {
      title: "Create Portfolio",
      icon: "fas fa-plus",
      color: "text-primary",
      action: "createPortfolio",
    },
    {
      title: "Manage Staking",
      icon: "fas fa-cog",
      color: "text-accent",
      action: "manageStaking",
    },
    {
      title: "Review KYC",
      icon: "fas fa-user-check",
      color: "text-yellow-500",
      action: "reviewKYC",
    },
    {
      title: "Platform Stats",
      icon: "fas fa-chart-bar",
      color: "text-green-500",
      action: "viewAnalytics",
    },
  ];

  const handleAdminAction = (action: string) => {
    toast({
      title: "Admin Action",
      description: `${action} functionality coming soon!`,
    });
  };

  return (
    <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6 rounded-xl border border-accent/20" data-testid="admin-panel">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Quick actions for platform management</p>
        </div>
        <Badge className="bg-accent text-accent-foreground">
          Admin Access
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {adminActions.map((action) => (
          <Button
            key={action.action}
            variant="outline"
            className="p-4 h-auto flex flex-col items-center space-y-2 hover:border-primary transition-colors"
            onClick={() => handleAdminAction(action.action)}
            data-testid={`button-admin-${action.action}`}
          >
            <i className={`${action.icon} ${action.color} text-xl`}></i>
            <span className="font-medium text-center">{action.title}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
