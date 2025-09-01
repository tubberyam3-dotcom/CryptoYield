import { Card } from "@/components/ui/card";

const mockActivities = [
  {
    id: 1,
    type: "investment",
    description: "Invested in AI Revolution Portfolio",
    amount: "$2,500.00",
    change: "+3.2%",
    timestamp: "2 hours ago",
    icon: "fas fa-arrow-up",
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
  },
  {
    id: 2,
    type: "staking",
    description: "Started 2-Year Staking Plan",
    amount: "$5,000.00",
    change: "12.2% APY",
    timestamp: "5 hours ago",
    icon: "fas fa-coins",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    id: 3,
    type: "challenge",
    description: "Joined Community Challenge",
    amount: "$1,000.00",
    change: "Goal: $100K",
    timestamp: "1 day ago",
    icon: "fas fa-trophy",
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
  },
];

export function RecentActivity() {
  return (
    <Card className="p-6" data-testid="card-recent-activity">
      <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
      
      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <div 
            key={activity.id} 
            className="flex items-center space-x-4 p-3 hover:bg-muted rounded-lg transition-colors"
            data-testid={`activity-${activity.id}`}
          >
            <div className={`w-10 h-10 ${activity.iconBg} rounded-lg flex items-center justify-center`}>
              <i className={`${activity.icon} ${activity.iconColor}`}></i>
            </div>
            <div className="flex-1">
              <p className="font-medium" data-testid={`text-activity-description-${activity.id}`}>
                {activity.description}
              </p>
              <p className="text-sm text-muted-foreground" data-testid={`text-activity-timestamp-${activity.id}`}>
                {activity.timestamp}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium" data-testid={`text-activity-amount-${activity.id}`}>
                {activity.amount}
              </p>
              <p className={`text-xs ${activity.iconColor}`} data-testid={`text-activity-change-${activity.id}`}>
                {activity.change}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
