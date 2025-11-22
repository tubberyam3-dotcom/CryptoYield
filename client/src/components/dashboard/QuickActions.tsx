import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export function QuickActions() {
  const actions = [
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: "Buy Stocks",
      description: "Invest in stocks",
      href: "/stocks",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: "Buy Bonds",
      description: "Fixed income securities",
      href: "/bonds",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950"
    },
    {
      icon: <ArrowUpCircle className="w-5 h-5" />,
      label: "Deposit Funds",
      description: "Add money to account",
      href: "#",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950"
    },
    {
      icon: <ArrowDownCircle className="w-5 h-5" />,
      label: "Withdraw Cash",
      description: "Transfer to bank",
      href: "#",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950"
    }
  ];

  return (
    <Card className="p-6 hover:shadow-sm transition-shadow" data-testid="card-quick-actions">
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <Link key={index} href={action.href}>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-3 hover:bg-muted"
              data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2 rounded-lg ${action.bg}`}>
                  <div className={action.color}>
                    {action.icon}
                  </div>
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}
