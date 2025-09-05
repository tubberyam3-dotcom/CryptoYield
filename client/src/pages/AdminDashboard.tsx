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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { UserManagement } from "@/components/admin/UserManagement";
import type { Portfolio, StakingPlan, CommunityChallenge, User } from "@shared/schema";

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

export default function AdminDashboard() {
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

  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    name: "",
    description: "",
    targetAmount: "",
    type: "group" as "solo" | "group",
    endDate: ""
  });

  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: portfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const { data: stakingPlans } = useQuery<StakingPlan[]>({
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

  // Investment management queries
  const { data: allUserStaking, refetch: refetchStaking } = useQuery<Array<any>>({
    queryKey: ["/api/admin/staking"],
  });

  const { data: allUserPortfolios, refetch: refetchPortfolios } = useQuery<Array<any>>({
    queryKey: ["/api/admin/portfolios"],
  });

  // Investment management mutations
  const updateStakingStatusMutation = useMutation({
    mutationFn: async ({ stakingId, status }: { stakingId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/staking/${stakingId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      refetchStaking();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staking"] });
      toast({
        title: "Success",
        description: "Staking status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: async ({ portfolioId, updates }: { portfolioId: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/portfolios/${portfolioId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      refetchPortfolios();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portfolios"] });
      toast({
        title: "Success",
        description: "Portfolio updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, updates }: { challengeId: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/challenges/${challengeId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: "Success",
        description: "Challenge updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/challenges/${challengeId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: "Success",
        description: "Challenge deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Portfolio mutation
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

  // Staking plan mutation
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

  // Challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (challengeData: any) => {
      const response = await apiRequest("POST", "/api/challenges", challengeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge Created",
        description: "New challenge has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setCreateChallengeOpen(false);
      setNewChallenge({
        name: "",
        description: "",
        targetAmount: "",
        type: "group",
        endDate: ""
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
        title: "Failed to Create Challenge",
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

  const handleCreateChallenge = () => {
    const challengeData = {
      ...newChallenge,
      targetAmount: parseFloat(newChallenge.targetAmount),
      endDate: new Date(newChallenge.endDate),
    };
    createChallengeMutation.mutate(challengeData);
  };

  // Authentication check
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

  if (user?.role !== 'admin') {
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
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return to Main Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="admin-dashboard">
      {/* Admin Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <i className="fas fa-shield-alt text-primary"></i>
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">Platform Administration & Management</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <i className="fas fa-user-shield mr-1"></i>
                Admin Access
              </Badge>
              <Badge variant="outline">
                {user.firstName} {user.lastName}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats Overview */}
        {userStats && analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-users text-primary text-lg"></i>
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
                  <i className="fas fa-dollar-sign text-green-600 text-lg"></i>
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
                  <i className="fas fa-chart-line text-blue-600 text-lg"></i>
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
                  <i className="fas fa-lock text-yellow-600 text-lg"></i>
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
                  <i className="fas fa-chart-pie text-purple-600 text-lg"></i>
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
                  <i className="fas fa-trophy text-orange-600 text-lg"></i>
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
                  <i className="fas fa-user-check text-blue-600 text-lg"></i>
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
                  <i className="fas fa-percent text-indigo-600 text-lg"></i>
                  <div>
                    <div className="text-xl font-bold">${parseFloat(analytics.platformFees).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Platform Fees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Management Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-7 w-full h-auto">
            <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-chart-bar mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">📊</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-server mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">System</span>
              <span className="sm:hidden">🖥️</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-history mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">Logs</span>
              <span className="sm:hidden">📋</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-users mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">Users</span>
              <span className="sm:hidden">👥</span>
            </TabsTrigger>
            <TabsTrigger value="portfolios" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-chart-pie mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">Portfolios</span>
              <span className="sm:hidden">💼</span>
            </TabsTrigger>
            <TabsTrigger value="staking" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-lock mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">Staking</span>
              <span className="sm:hidden">🔒</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-trophy mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">Challenges</span>
              <span className="sm:hidden">🏆</span>
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-chart-line text-green-600"></i>
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

              {/* Platform Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-chart-pie text-purple-600"></i>
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
                          {Math.round((userStats.approvedKyc / userStats.totalUsers) * 100)}%
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemHealth && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <i className="fas fa-heartbeat text-red-600"></i>
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
                        <i className="fas fa-network-wired text-blue-600"></i>
                        Connections
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Connections</span>
                        <span className="font-bold text-blue-600">{systemHealth.activeConnections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Error Rate</span>
                        <span className="font-bold text-green-600">{systemHealth.errorRate}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <i className="fas fa-save text-purple-600"></i>
                        Backup Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Last Backup</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(systemHealth.lastBackup).toLocaleString()}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 w-full justify-center">
                        <i className="fas fa-check mr-2"></i>
                        Backup Successful
                      </Badge>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-list text-gray-600"></i>
                  Recent Activity Logs
                </CardTitle>
                <CardDescription>Monitor platform activity and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityLogs?.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="outline" 
                          className={
                            log.type === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            log.type === 'user' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            log.type === 'system' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }
                        >
                          {log.type}
                        </Badge>
                        <div>
                          <div className="font-medium text-sm">{log.action}</div>
                          <div className="text-xs text-muted-foreground">{log.details}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.userEmail} • {log.ipAddress}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-inbox text-2xl mb-2"></i>
                      <p>No activity logs available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Portfolio Management Tab */}
          <TabsContent value="portfolios" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Manage Portfolios</h3>
              
              <Dialog open={createPortfolioOpen} onOpenChange={setCreatePortfolioOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <i className="fas fa-plus mr-2"></i>
                    Create Portfolio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Portfolio</DialogTitle>
                    <DialogDescription>
                      Add a new investment portfolio to the platform
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="portfolioName">Portfolio Name</Label>
                      <Input
                        id="portfolioName"
                        placeholder="AI Revolution Portfolio"
                        value={newPortfolio.name}
                        onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="portfolioDescription">Description</Label>
                      <Textarea
                        id="portfolioDescription"
                        placeholder="Describe the portfolio strategy"
                        value={newPortfolio.description}
                        onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="strategyTag">Strategy Tag</Label>
                      <Select value={newPortfolio.strategyTag} onValueChange={(value) => setNewPortfolio({ ...newPortfolio, strategyTag: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AI">AI & Innovation</SelectItem>
                          <SelectItem value="DeFi">DeFi</SelectItem>
                          <SelectItem value="Layer2">Layer 2</SelectItem>
                          <SelectItem value="Gaming">Gaming</SelectItem>
                          <SelectItem value="Metaverse">Metaverse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="minInvestment">Minimum Investment ($)</Label>
                      <Input
                        id="minInvestment"
                        type="number"
                        placeholder="100"
                        value={newPortfolio.minInvestment}
                        onChange={(e) => setNewPortfolio({ ...newPortfolio, minInvestment: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label>Risk Level</Label>
                      <Select value={newPortfolio.riskLevel} onValueChange={(value: "low" | "medium" | "high") => setNewPortfolio({ ...newPortfolio, riskLevel: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Risk</SelectItem>
                          <SelectItem value="medium">Medium Risk</SelectItem>
                          <SelectItem value="high">High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={handleCreatePortfolio}
                      disabled={createPortfolioMutation.isPending || !newPortfolio.name || !newPortfolio.minInvestment}
                    >
                      {createPortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* User Portfolio Management */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-briefcase text-purple-600"></i>
                  User Portfolio Management
                </CardTitle>
                <CardDescription>Manage and edit user portfolio investments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allUserPortfolios?.map((userPortfolio) => (
                    <div key={userPortfolio.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium">{userPortfolio.user?.email || userPortfolio.userId}</div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {userPortfolio.portfolio?.name || 'Unknown Portfolio'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="font-medium">Invested:</span> ${parseFloat(userPortfolio.investedAmount || '0').toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Current Value:</span> ${parseFloat(userPortfolio.currentValue || '0').toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Returns:</span> ${parseFloat(userPortfolio.returns || '0').toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Invested Date:</span> {new Date(userPortfolio.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-edit-portfolio-${userPortfolio.id}`}
                            >
                              <i className="fas fa-edit mr-1"></i>
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User Portfolio</DialogTitle>
                              <DialogDescription>
                                Update portfolio investment details for {userPortfolio.user?.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor={`invested-${userPortfolio.id}`}>Invested Amount ($)</Label>
                                <Input
                                  id={`invested-${userPortfolio.id}`}
                                  type="number"
                                  step="0.01"
                                  defaultValue={userPortfolio.investedAmount}
                                  onBlur={(e) => {
                                    if (e.target.value !== userPortfolio.investedAmount) {
                                      updatePortfolioMutation.mutate({
                                        portfolioId: userPortfolio.id,
                                        updates: { investedAmount: e.target.value }
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`current-${userPortfolio.id}`}>Current Value ($)</Label>
                                <Input
                                  id={`current-${userPortfolio.id}`}
                                  type="number"
                                  step="0.01"
                                  defaultValue={userPortfolio.currentValue}
                                  onBlur={(e) => {
                                    if (e.target.value !== userPortfolio.currentValue) {
                                      updatePortfolioMutation.mutate({
                                        portfolioId: userPortfolio.id,
                                        updates: { currentValue: e.target.value }
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`returns-${userPortfolio.id}`}>Returns ($)</Label>
                                <Input
                                  id={`returns-${userPortfolio.id}`}
                                  type="number"
                                  step="0.01"
                                  defaultValue={userPortfolio.returns}
                                  onBlur={(e) => {
                                    if (e.target.value !== userPortfolio.returns) {
                                      updatePortfolioMutation.mutate({
                                        portfolioId: userPortfolio.id,
                                        updates: { returns: e.target.value }
                                      });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-inbox text-2xl mb-2"></i>
                      <p>No user portfolios found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios?.map((portfolio) => (
                <Card key={portfolio.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-primary/10 text-primary">
                        {portfolio.strategyTag}
                      </Badge>
                      <Badge className={portfolio.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                        {portfolio.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold mb-2">{portfolio.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {portfolio.description}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Investment</span>
                        <span>${parseFloat(portfolio.minInvestment).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Level</span>
                        <span className="capitalize">{portfolio.riskLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Return</span>
                        <span className="text-green-500">+{portfolio.currentReturn}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || []}
            </div>
          </TabsContent>

          {/* Staking Management Tab */}
          <TabsContent value="staking" className="space-y-6">
            {/* User Staking Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-users text-blue-600"></i>
                  User Staking Management
                </CardTitle>
                <CardDescription>Manage and control user staking positions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allUserStaking?.map((staking) => (
                    <div key={staking.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium">{staking.user?.email || staking.userId}</div>
                          <Badge variant="outline" className={
                            staking.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            staking.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }>
                            {staking.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="font-medium">Plan:</span> {staking.stakingPlan?.name || 'Unknown'}
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span> ${parseFloat(staking.amountLocked || '0').toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">APY:</span> {staking.stakingPlan?.apy || '0'}%
                          </div>
                          <div>
                            <span className="font-medium">End Date:</span> {new Date(staking.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {staking.status === 'active' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateStakingStatusMutation.mutate({ stakingId: staking.id, status: 'completed' })}
                              disabled={updateStakingStatusMutation.isPending}
                              data-testid={`button-complete-staking-${staking.id}`}
                            >
                              <i className="fas fa-check mr-1"></i>
                              Complete
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateStakingStatusMutation.mutate({ stakingId: staking.id, status: 'cancelled' })}
                              disabled={updateStakingStatusMutation.isPending}
                              data-testid={`button-cancel-staking-${staking.id}`}
                            >
                              <i className="fas fa-times mr-1"></i>
                              Cancel
                            </Button>
                          </>
                        )}
                        {staking.status !== 'active' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStakingStatusMutation.mutate({ stakingId: staking.id, status: 'active' })}
                            disabled={updateStakingStatusMutation.isPending}
                            data-testid={`button-reactivate-staking-${staking.id}`}
                          >
                            <i className="fas fa-play mr-1"></i>
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-inbox text-2xl mb-2"></i>
                      <p>No user staking positions found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Manage Staking Plans</h3>
              
              <Dialog open={createStakingPlanOpen} onOpenChange={setCreateStakingPlanOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <i className="fas fa-plus mr-2"></i>
                    Create Staking Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Staking Plan</DialogTitle>
                    <DialogDescription>
                      Add a new staking plan with specific terms and rewards
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="stakingPlanName">Plan Name</Label>
                      <Input
                        id="stakingPlanName"
                        placeholder="1 Year Premium Stake"
                        value={newStakingPlan.name}
                        onChange={(e) => setNewStakingPlan({ ...newStakingPlan, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="duration">Duration (months)</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="12"
                        value={newStakingPlan.duration}
                        onChange={(e) => setNewStakingPlan({ ...newStakingPlan, duration: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="apy">APY (%)</Label>
                      <Input
                        id="apy"
                        type="number"
                        step="0.1"
                        placeholder="8.5"
                        value={newStakingPlan.apy}
                        onChange={(e) => setNewStakingPlan({ ...newStakingPlan, apy: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="minAmount">Minimum Amount ($)</Label>
                      <Input
                        id="minAmount"
                        type="number"
                        placeholder="1000"
                        value={newStakingPlan.minAmount}
                        onChange={(e) => setNewStakingPlan({ ...newStakingPlan, minAmount: e.target.value })}
                      />
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={handleCreateStakingPlan}
                      disabled={createStakingPlanMutation.isPending || !newStakingPlan.name || !newStakingPlan.duration || !newStakingPlan.apy}
                    >
                      {createStakingPlanMutation.isPending ? "Creating..." : "Create Staking Plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stakingPlans?.map((plan) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={plan.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="text-primary font-bold text-lg">
                        {plan.apy}% APY
                      </div>
                    </div>
                    
                    <h3 className="font-semibold mb-2">{plan.name}</h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{plan.duration} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Amount</span>
                        <span>${parseFloat(plan.minAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || []}
            </div>
          </TabsContent>

          {/* Challenges Management Tab */}
          <TabsContent value="challenges" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Challenge Management</h3>
              
              <Dialog open={createChallengeOpen} onOpenChange={setCreateChallengeOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-challenge">
                    <i className="fas fa-plus mr-2"></i>
                    Create Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Challenge</DialogTitle>
                    <DialogDescription>
                      Create a new investment challenge for the community
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="challengeName">Challenge Name</Label>
                      <Input
                        id="challengeName"
                        placeholder="Community Investment Challenge"
                        value={newChallenge.name}
                        onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="challengeDescription">Description</Label>
                      <Input
                        id="challengeDescription"
                        placeholder="Reach the target investment amount together"
                        value={newChallenge.description}
                        onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="targetAmount">Target Amount ($)</Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        placeholder="10000"
                        value={newChallenge.targetAmount}
                        onChange={(e) => setNewChallenge({ ...newChallenge, targetAmount: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Challenge Type</Label>
                      <Select value={newChallenge.type} onValueChange={(value: "solo" | "group") => setNewChallenge({ ...newChallenge, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solo">Solo Challenge</SelectItem>
                          <SelectItem value="group">Group Challenge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newChallenge.endDate}
                        onChange={(e) => setNewChallenge({ ...newChallenge, endDate: e.target.value })}
                      />
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={handleCreateChallenge}
                      disabled={createChallengeMutation.isPending || !newChallenge.name || !newChallenge.targetAmount}
                      data-testid="button-submit-challenge"
                    >
                      {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challenges?.map((challenge) => (
                <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={challenge.type === 'group' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}>
                        {challenge.type}
                      </Badge>
                      <Badge className={
                        challenge.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        challenge.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }>
                        {challenge.status}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold mb-2">{challenge.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {challenge.description}
                    </p>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target</span>
                        <span>${parseFloat(challenge.targetAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current</span>
                        <span>${parseFloat(challenge.currentAmount || '0').toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{Math.round((parseFloat(challenge.currentAmount || '0') / parseFloat(challenge.targetAmount)) * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date</span>
                        <span>{new Date(challenge.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid={`button-edit-challenge-${challenge.id}`}>
                            <i className="fas fa-edit mr-1"></i>
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Challenge</DialogTitle>
                            <DialogDescription>
                              Update challenge details and settings
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor={`edit-name-${challenge.id}`}>Challenge Name</Label>
                              <Input
                                id={`edit-name-${challenge.id}`}
                                defaultValue={challenge.name}
                                onBlur={(e) => {
                                  if (e.target.value !== challenge.name) {
                                    updateChallengeMutation.mutate({
                                      challengeId: challenge.id,
                                      updates: { name: e.target.value }
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-description-${challenge.id}`}>Description</Label>
                              <Input
                                id={`edit-description-${challenge.id}`}
                                defaultValue={challenge.description}
                                onBlur={(e) => {
                                  if (e.target.value !== challenge.description) {
                                    updateChallengeMutation.mutate({
                                      challengeId: challenge.id,
                                      updates: { description: e.target.value }
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-target-${challenge.id}`}>Target Amount ($)</Label>
                              <Input
                                id={`edit-target-${challenge.id}`}
                                type="number"
                                defaultValue={challenge.targetAmount || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== challenge.targetAmount) {
                                    updateChallengeMutation.mutate({
                                      challengeId: challenge.id,
                                      updates: { targetAmount: e.target.value }
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Label>Status</Label>
                              <Select 
                                defaultValue={challenge.status || "active"} 
                                onValueChange={(value) => {
                                  updateChallengeMutation.mutate({
                                    challengeId: challenge.id,
                                    updates: { status: value }
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
                            deleteChallengeMutation.mutate(challenge.id);
                          }
                        }}
                        disabled={deleteChallengeMutation.isPending}
                        data-testid={`button-delete-challenge-${challenge.id}`}
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )) || []}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}