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
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-users text-primary text-lg"></i>
                  <div>
                    <div className="text-2xl font-bold">{userStats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-chart-line text-green-600 text-lg"></i>
                  <div>
                    <div className="text-2xl font-bold">{portfolios?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Portfolios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-lock text-yellow-600 text-lg"></i>
                  <div>
                    <div className="text-2xl font-bold">{stakingPlans?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Staking Plans</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-trophy text-purple-600 text-lg"></i>
                  <div>
                    <div className="text-2xl font-bold">{challenges?.length || 0}</div>
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
                    <div className="text-2xl font-bold">{userStats.pendingKyc}</div>
                    <p className="text-xs text-muted-foreground">Pending KYC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Management Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl h-auto">
            <TabsTrigger value="users" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-users mr-1 sm:mr-2"></i>
              <span className="hidden xs:inline">Users</span>
              <span className="xs:hidden">👥</span>
            </TabsTrigger>
            <TabsTrigger value="portfolios" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-chart-pie mr-1 sm:mr-2"></i>
              <span className="hidden xs:inline">Portfolios</span>
              <span className="xs:hidden">📊</span>
            </TabsTrigger>
            <TabsTrigger value="staking" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-lock mr-1 sm:mr-2"></i>
              <span className="hidden xs:inline">Staking</span>
              <span className="xs:hidden">🔒</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <i className="fas fa-trophy mr-1 sm:mr-2"></i>
              <span className="hidden xs:inline">Challenges</span>
              <span className="xs:hidden">🏆</span>
            </TabsTrigger>
          </TabsList>

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
            <h3 className="text-xl font-semibold">Active Challenges</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challenges?.map((challenge) => (
                <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={challenge.type === 'group' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}>
                        {challenge.type}
                      </Badge>
                      <Badge className="bg-accent/10 text-accent">
                        {challenge.status}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold mb-2">{challenge.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {challenge.description}
                    </p>
                    
                    <div className="space-y-2 text-sm">
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