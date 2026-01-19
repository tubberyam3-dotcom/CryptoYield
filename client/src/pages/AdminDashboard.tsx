import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { UserManagement } from "@/components/admin/UserManagement";
import { ChallengeManagement } from "@/components/admin/ChallengeManagement";
import { CouponManagement } from "@/components/admin/CouponManagement";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { PaymentSettings } from "@/components/admin/PaymentSettings";
import { StockPurchaseApprovals } from "@/components/admin/StockPurchaseApprovals";
import { DepositApprovals } from "@/components/admin/DepositApprovals";
import { RewardsManagement } from "@/components/admin/RewardsManagement";
import { EmailSettings } from "@/components/admin/EmailSettings";
import { TransactionManagement } from "@/components/admin/TransactionManagement";
import { PortfolioManagement } from "@/components/admin/PortfolioManagement";
import type { Portfolio, CommunityChallenge, User } from "@shared/schema";
import { 
  CheckCircle, 
  Gift, 
  BarChart3, 
  Users, 
  PieChart, 
  Trophy, 
  Ticket, 
  Server, 
  Settings, 
  Shield,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Mail,
  ArrowLeftRight,
  History
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  approvedKyc: number;
  adminUsers: number;
}

interface AnalyticsData {
  totalRevenue: string;
  monthlyRevenue: string;
  totalInvestments: string;
  totalStaked: string;
  platformFees: string;
  transactionVolume: string;
  activePortfolios: number;
  completedChallenges: number;
}

interface SystemHealth {
  uptime: string;
  apiResponseTime: string;
  databaseStatus: 'healthy' | 'warning' | 'error';
  activeConnections: number;
  errorRate: string;
  lastBackup: string;
}

const navItems = [
  { id: "approvals", label: "Approvals", icon: CheckCircle },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "portfolios", label: "Portfolios", icon: PieChart },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "email", label: "Email", icon: Mail },
  { id: "login-history", label: "Login History", icon: History },
  { id: "system", label: "System", icon: Server },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("approvals");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createPortfolioOpen, setCreatePortfolioOpen] = useState(false);
  const [createStakingPlanOpen, setCreateStakingPlanOpen] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    name: "",
    description: "",
    strategyTag: "",
    minInvestment: "",
    riskLevel: "medium" as "low" | "medium" | "high",
    assets: {} as any,
  });
  const [newStakingPlan, setNewStakingPlan] = useState({
    name: "",
    duration: "",
    apy: "",
    minAmount: "",
  });

  const { adminUser, isLoading, logoutMutation } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const { data: stakingPlans } = useQuery<any[]>({
    queryKey: ["/api/staking/plans"],
  });

  const { data: challenges } = useQuery<CommunityChallenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: userStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/users/stats"],
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  const { data: systemHealth } = useQuery<SystemHealth>({
    queryKey: ["/api/admin/system/health"],
  });

  const { data: activityLogs } = useQuery<Array<{
    id: string;
    timestamp: Date;
    userId: string;
    userEmail: string;
    action: string;
    details: string;
    type: 'user' | 'admin' | 'system' | 'security';
    ipAddress?: string;
  }>>({
    queryKey: ["/api/admin/logs"],
  });

  const { data: loginHistory, isLoading: loginHistoryLoading } = useQuery<Array<{
    id: string;
    userId: string;
    loginMethod: string;
    ipAddress: string | null;
    userAgent: string | null;
    loginAt: Date;
    success: boolean;
    failureReason: string | null;
    user: { email: string; firstName: string; lastName: string };
  }>>({
    queryKey: ["/api/admin/login-history"],
  });

  const createPortfolioMutation = useMutation({
    mutationFn: async (portfolioData: any) => {
      const response = await apiRequest("POST", "/api/portfolios", portfolioData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portfolio Created",
        description: "New portfolio has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setCreatePortfolioOpen(false);
      setNewPortfolio({
        name: "",
        description: "",
        strategyTag: "",
        minInvestment: "",
        riskLevel: "medium",
        assets: {},
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to Create Portfolio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createStakingPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await apiRequest("POST", "/api/staking/plans", planData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staking Plan Created",
        description: "New staking plan has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/plans"] });
      setCreateStakingPlanOpen(false);
      setNewStakingPlan({
        name: "",
        duration: "",
        apy: "",
        minAmount: "",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to Create Staking Plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePortfolio = () => {
    const portfolioData = {
      ...newPortfolio,
      assets: { description: "Mock asset allocation for demonstration" },
    };
    createPortfolioMutation.mutate(portfolioData);
  };

  const handleCreateStakingPlan = () => {
    const planData = {
      ...newStakingPlan,
      duration: parseInt(newStakingPlan.duration),
    };
    createStakingPlanMutation.mutate(planData);
  };

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to access this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = '/admin'}
              className="w-full"
            >
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "approvals":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Approvals</h2>
              <p className="text-muted-foreground">Review and approve pending stock purchases and deposits</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Stock Purchase Approvals
                  </CardTitle>
                  <CardDescription>Review and approve pending stock purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <StockPurchaseApprovals />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Deposit Approvals
                  </CardTitle>
                  <CardDescription>Review and approve pending deposit requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <DepositApprovals />
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "transactions":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Transactions</h2>
              <p className="text-muted-foreground">View and manage deposits and withdrawals</p>
            </div>
            <TransactionManagement />
          </div>
        );

      case "rewards":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Rewards Management</h2>
              <p className="text-muted-foreground">Manage daily bonuses, XP rewards, and top earners</p>
            </div>
            <RewardsManagement />
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Analytics</h2>
              <p className="text-muted-foreground">Platform performance and financial metrics</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Financial Analytics
                  </CardTitle>
                  <CardDescription>Revenue and transaction metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics && (
                    <>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Monthly Revenue</span>
                        <span className="text-lg font-bold text-green-600">
                          ${parseFloat(analytics.monthlyRevenue).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Transaction Volume</span>
                        <span className="text-lg font-bold">
                          ${parseFloat(analytics.transactionVolume).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Platform Fees</span>
                        <span className="text-lg font-bold text-blue-600">
                          ${parseFloat(analytics.platformFees).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-600" />
                    Platform Analytics
                  </CardTitle>
                  <CardDescription>User engagement and platform usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics && userStats && (
                    <>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Active Portfolios</span>
                        <span className="text-lg font-bold text-purple-600">
                          {analytics.activePortfolios}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Completed Challenges</span>
                        <span className="text-lg font-bold text-orange-600">
                          {analytics.completedChallenges}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">KYC Approval Rate</span>
                        <span className="text-lg font-bold text-green-600">
                          {userStats.totalUsers > 0 ? Math.round((userStats.approvedKyc / userStats.totalUsers) * 100) : 0}%
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "users":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">User Management</h2>
              <p className="text-muted-foreground">Manage platform users and their roles</p>
            </div>
            <UserManagement />
          </div>
        );

      case "portfolios":
        return <PortfolioManagement />;

      case "challenges":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Challenge Management</h2>
              <p className="text-muted-foreground">Create and manage community investment challenges</p>
            </div>
            <ChallengeManagement />
          </div>
        );

      case "coupons":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Coupon Management</h2>
              <p className="text-muted-foreground">Create and manage promotional coupons</p>
            </div>
            <CouponManagement />
          </div>
        );

      case "system":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">System Health</h2>
              <p className="text-muted-foreground">Monitor system performance and health status</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemHealth && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-red-600" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Uptime</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {systemHealth.uptime}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">API Response</span>
                        <Badge variant="outline" className={
                          parseInt(systemHealth.apiResponseTime) > 1000 ? 
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }>
                          {systemHealth.apiResponseTime}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Database</span>
                        <Badge variant="outline" className={
                          systemHealth.databaseStatus === 'healthy' ? 
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          systemHealth.databaseStatus === 'warning' ?
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }>
                          {systemHealth.databaseStatus}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Connections</span>
                        <Badge variant="outline">{systemHealth.activeConnections}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Error Rate</span>
                        <Badge variant="outline" className={
                          parseFloat(systemHealth.errorRate) > 5 ?
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }>
                          {systemHealth.errorRate}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-purple-600" />
                        Backup
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Last Backup</span>
                        <Badge variant="outline">{systemHealth.lastBackup}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {activityLogs && activityLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest platform activity logs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activityLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            log.type === 'security' ? 'destructive' :
                            log.type === 'admin' ? 'default' :
                            log.type === 'system' ? 'secondary' : 'outline'
                          }>
                            {log.type}
                          </Badge>
                          <span>{log.action}</span>
                        </div>
                        <span className="text-muted-foreground">{log.userEmail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "email":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
              <p className="text-muted-foreground">Configure SMTP settings and email notifications</p>
            </div>
            <EmailSettings />
          </div>
        );

      case "login-history":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Login History</h2>
              <p className="text-muted-foreground">View all user login attempts and sessions</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Logins
                </CardTitle>
                <CardDescription>
                  All login attempts across the platform (last 500 records)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loginHistoryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : !loginHistory || loginHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No login history recorded yet
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {loginHistory.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${
                              record.success 
                                ? 'bg-green-100 dark:bg-green-900' 
                                : 'bg-red-100 dark:bg-red-900'
                            }`}>
                              {record.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {record.user?.firstName || 'Unknown'} {record.user?.lastName || ''}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {record.user?.email || 'Unknown email'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                IP: {record.ipAddress || 'Unknown'} | Agent: {record.userAgent?.substring(0, 50) || 'Unknown'}...
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              record.loginMethod === 'password' ? 'default' :
                              record.loginMethod === 'oauth' ? 'secondary' : 'outline'
                            }>
                              {record.loginMethod === 'xp_code' ? 'XP Code' : 
                               record.loginMethod.charAt(0).toUpperCase() + record.loginMethod.slice(1)}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">
                              {record.loginAt ? new Date(record.loginAt).toLocaleString() : 'Unknown'}
                            </div>
                            {record.failureReason && (
                              <div className="text-xs text-red-500 mt-1">
                                {record.failureReason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">System Settings</h2>
              <p className="text-muted-foreground">Configure platform settings and preferences</p>
            </div>
            <PaymentSettings />
            <SystemSettings />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex" data-testid="admin-dashboard">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-card border-r border-border
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Admin Panel</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {userStats && (
            <div className="p-4 border-b border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Users</span>
                <span className="font-medium">{userStats.totalUsers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending KYC</span>
                <Badge variant="secondary" className="text-xs">{userStats.pendingKyc}</Badge>
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {adminUser.firstName?.[0]}{adminUser.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {adminUser.firstName} {adminUser.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{adminUser.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Admin Panel</span>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Admin
          </Badge>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {/* Quick Stats for Desktop */}
          {userStats && analytics && (
            <div className="hidden lg:grid grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xl font-bold">{userStats.totalUsers}</div>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-xl font-bold">${parseFloat(analytics.totalRevenue).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xl font-bold">${parseFloat(analytics.totalInvestments).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Investments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="text-xl font-bold">${parseFloat(analytics.totalStaked).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total Staked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-xl font-bold">{portfolios?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Portfolios</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="text-xl font-bold">{challenges?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Challenges</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xl font-bold">{userStats.pendingKyc}</div>
                      <p className="text-xs text-muted-foreground">Pending KYC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Gift className="h-5 w-5 text-indigo-600" />
                    <div>
                      <div className="text-xl font-bold">${parseFloat(analytics.platformFees).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Platform Fees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {renderContent()}
        </main>
      </div>
    </div>
  );
}
