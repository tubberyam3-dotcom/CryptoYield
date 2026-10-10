import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Deposit {
  id: string;
  amount: string;
  depositMethod: string;
  status: string;
  createdAt: string;
}

interface UserPortfolio {
  id: string;
  investedAmount: string;
  createdAt: string;
  portfolio?: {
    name: string;
  };
}

interface UserBond {
  id: string;
  investedAmount: string;
  createdAt: string;
  bondProduct?: {
    name: string;
  };
}

export function RecentActivity() {
  const { data: deposits = [], isLoading: depositsLoading } = useQuery<Deposit[]>({
    queryKey: ['/api/deposits'],
  });

  const { data: portfolios = [], isLoading: portfoliosLoading } = useQuery<UserPortfolio[]>({
    queryKey: ['/api/user/portfolios'],
  });

  const { data: bonds = [], isLoading: bondsLoading } = useQuery<UserBond[]>({
    queryKey: ['/api/user/bonds'],
  });

  const isLoading = depositsLoading || portfoliosLoading || bondsLoading;

  // Combine all activities and sort by date
  const activities = [
    ...deposits.map(d => ({
      id: `deposit-${d.id}`,
      type: 'deposit' as const,
      description: `Deposit via ${d.depositMethod.replace('_', ' ')}`,
      amount: `$${parseFloat(d.amount).toLocaleString()}`,
      status: d.status,
      timestamp: d.createdAt,
      icon: <Wallet className="w-4 h-4" />,
      iconColor: d.status === 'completed' ? 'text-green-500' : d.status === 'pending' ? 'text-yellow-500' : 'text-red-500',
      iconBg: d.status === 'completed' ? 'bg-green-500/10' : d.status === 'pending' ? 'bg-yellow-500/10' : 'bg-red-500/10',
    })),
    ...portfolios.map(p => ({
      id: `portfolio-${p.id}`,
      type: 'investment' as const,
      description: `Invested in ${p.portfolio?.name || 'Portfolio'}`,
      amount: `$${parseFloat(p.investedAmount).toLocaleString()}`,
      status: 'completed',
      timestamp: p.createdAt,
      icon: <TrendingUp className="w-4 h-4" />,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
    })),
    ...bonds.map(b => ({
      id: `bond-${b.id}`,
      type: 'bond' as const,
      description: `Purchased ${b.bondProduct?.name || 'Bond'}`,
      amount: `$${parseFloat(b.investedAmount).toLocaleString()}`,
      status: 'completed',
      timestamp: b.createdAt,
      icon: <Award className="w-4 h-4" />,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, 5); // Show only 5 most recent

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <Card className="p-6 animate-fade-in-scale nude-gradient-warm border-nude-medium/20" data-testid="card-recent-activity">
      <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No recent activity</p>
          <p className="text-sm mt-1">Your transactions will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-center space-x-4 p-3 hover:bg-nude-medium/30 rounded-lg card-transition"
              data-testid={`activity-${activity.id}`}
            >
              <div className={`w-10 h-10 ${activity.iconBg} rounded-lg flex items-center justify-center`}>
                <span className={activity.iconColor}>{activity.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium" data-testid={`text-activity-description-${activity.id}`}>
                  {activity.description}
                </p>
                <p className="text-sm text-muted-foreground" data-testid={`text-activity-timestamp-${activity.id}`}>
                  {formatTime(activity.timestamp)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium" data-testid={`text-activity-amount-${activity.id}`}>
                  {activity.amount}
                </p>
                <p className={`text-xs capitalize ${
                  activity.status === 'completed' ? 'text-green-500' : 
                  activity.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                }`} data-testid={`text-activity-status-${activity.id}`}>
                  {activity.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
