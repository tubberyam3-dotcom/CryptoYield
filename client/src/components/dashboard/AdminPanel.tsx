import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (user?.role !== 'admin') {
    return null;
  }

  const adminActions = [
    {
      title: "Manage Users",
      icon: "fas fa-users",
      color: "text-primary",
      link: "/admin#users",
      description: "User management & KYC",
    },
    {
      title: "Create Portfolio",
      icon: "fas fa-plus",
      color: "text-accent",
      link: "/admin#portfolios",
      description: "Add new portfolios",
    },
    {
      title: "Manage Staking",
      icon: "fas fa-cog",
      color: "text-yellow-500",
      link: "/admin#staking",
      description: "Staking plan management",
    },
    {
      title: "View Challenges",
      icon: "fas fa-trophy",
      color: "text-green-500",
      link: "/admin#challenges",
      description: "Community challenges",
    },
  ];

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminActions.map((action, index) => (
          <Link key={index} href={action.link}>
            <div 
              className="block p-4 border border-border rounded-lg hover:border-primary transition-colors duration-200 group cursor-pointer"
              data-testid={`link-admin-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className={`p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors`}>
                  <i className={`${action.icon} ${action.color} text-xl`}></i>
                </div>
                <div>
                  <h3 className="font-medium text-sm mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
