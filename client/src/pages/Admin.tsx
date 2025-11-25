import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { UserManagement } from "@/components/admin/UserManagement";
import { StockManagement } from "@/components/admin/StockManagement";
import { StockPurchaseApprovals } from "@/components/admin/StockPurchaseApprovals";
import { Building2, Save } from "lucide-react";
import type { Portfolio, StakingPlan, CommunityChallenge } from "@shared/schema";

export default function Admin() {
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
  const [bankSettings, setBankSettings] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingNumber: "",
    swiftCode: "",
    bankAddress: "",
    instructions: "",
  });
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const { data: stakingPlans } = useQuery<StakingPlan[]>({
    queryKey: ["/api/staking/plans"],
  });

  const { data: challenges } = useQuery<CommunityChallenge[]>({
    queryKey: ["/api/challenges"],
  });

  // Bank transfer settings query
  const { data: fetchedBankSettings } = useQuery<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode: string;
    bankAddress: string;
    instructions: string;
  }>({
    queryKey: ['/api/settings/bank-transfer'],
  });

  // Populate bank settings when data is fetched
  useEffect(() => {
    if (fetchedBankSettings) {
      setBankSettings(fetchedBankSettings);
    }
  }, [fetchedBankSettings]);

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

  // Bank transfer settings mutation
  const updateBankSettingsMutation = useMutation({
    mutationFn: async (settings: typeof bankSettings) => {
      const response = await apiRequest("PUT", "/api/admin/settings/bank-transfer", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Bank transfer settings have been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/bank-transfer'] });
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
        title: "Failed to Update Settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateBankSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateBankSettingsMutation.mutate(bankSettings);
  };

  // Authentication and admin access is handled by App component routing
  // Admin role check could be added to the route protection level

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="admin-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Admin Panel" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-24 lg:pb-6">
          
          {/* Admin Header */}
          <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-4 sm:p-6 rounded-xl border border-accent/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Platform Administration</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Manage portfolios, staking plans, and platform settings</p>
              </div>
              <Badge className="bg-accent text-accent-foreground self-start sm:self-auto">
                Admin Access
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
            <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full max-w-5xl h-auto gap-1">
              <TabsTrigger value="users" data-testid="tab-users" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <span className="hidden xs:inline">Users</span>
                <span className="xs:hidden">👥</span>
              </TabsTrigger>
              <TabsTrigger value="portfolios" data-testid="tab-portfolios" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <span className="hidden xs:inline">Portfolios</span>
                <span className="xs:hidden">📊</span>
              </TabsTrigger>
              <TabsTrigger value="stocks" data-testid="tab-stocks" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <span className="hidden xs:inline">Stocks</span>
                <span className="xs:hidden">📈</span>
              </TabsTrigger>
              <TabsTrigger value="approvals" data-testid="tab-approvals" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <span className="hidden xs:inline">Approvals</span>
                <span className="xs:hidden">✅</span>
              </TabsTrigger>
              <TabsTrigger value="staking" data-testid="tab-staking" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <span className="hidden xs:inline">Bonds</span>
                <span className="xs:hidden">🔒</span>
              </TabsTrigger>
              <TabsTrigger value="challenges" data-testid="tab-challenges" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <span className="hidden xs:inline">Challenges</span>
                <span className="xs:hidden">🏆</span>
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <span className="hidden xs:inline">Settings</span>
                <span className="xs:hidden">⚙️</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="portfolios" className="space-y-4 sm:space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Manage Portfolios</h3>
                
                <Dialog open={createPortfolioOpen} onOpenChange={setCreatePortfolioOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-portfolio">
                      <i className="fas fa-plus mr-2"></i>
                      Create Portfolio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" data-testid="dialog-create-portfolio">
                    <DialogHeader>
                      <DialogTitle>Create New Portfolio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="portfolioName">Portfolio Name</Label>
                        <Input
                          id="portfolioName"
                          placeholder="AI Revolution Portfolio"
                          value={newPortfolio.name}
                          onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                          data-testid="input-portfolio-name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="portfolioDescription">Description</Label>
                        <Textarea
                          id="portfolioDescription"
                          placeholder="Describe the portfolio strategy"
                          value={newPortfolio.description}
                          onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                          data-testid="textarea-portfolio-description"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="strategyTag">Strategy Tag</Label>
                        <Select value={newPortfolio.strategyTag} onValueChange={(value) => setNewPortfolio({ ...newPortfolio, strategyTag: value })}>
                          <SelectTrigger data-testid="select-strategy-tag">
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
                          data-testid="input-min-investment"
                        />
                      </div>
                      
                      <div>
                        <Label>Risk Level</Label>
                        <Select value={newPortfolio.riskLevel} onValueChange={(value: "low" | "medium" | "high") => setNewPortfolio({ ...newPortfolio, riskLevel: value })}>
                          <SelectTrigger data-testid="select-risk-level">
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
                        data-testid="button-confirm-create-portfolio"
                      >
                        {createPortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolios?.map((portfolio) => (
                  <Card key={portfolio.id} className="p-6" data-testid={`card-admin-portfolio-${portfolio.id}`}>
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
                  </Card>
                )) || []}
              </div>
            </TabsContent>
            
            <TabsContent value="stocks" className="space-y-4 sm:space-y-6 mt-4">
              <StockManagement />
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4 sm:space-y-6 mt-4">
              <StockPurchaseApprovals />
            </TabsContent>
            
            <TabsContent value="staking" className="space-y-4 sm:space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Manage Bond Products</h3>
                
                <Dialog open={createStakingPlanOpen} onOpenChange={setCreateStakingPlanOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-staking-plan">
                      <i className="fas fa-plus mr-2"></i>
                      Create Staking Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-create-staking-plan">
                    <DialogHeader>
                      <DialogTitle>Create New Staking Plan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="stakingPlanName">Plan Name</Label>
                        <Input
                          id="stakingPlanName"
                          placeholder="1 Year Premium Stake"
                          value={newStakingPlan.name}
                          onChange={(e) => setNewStakingPlan({ ...newStakingPlan, name: e.target.value })}
                          data-testid="input-staking-plan-name"
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
                          data-testid="input-duration"
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
                          data-testid="input-apy"
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
                          data-testid="input-min-amount"
                        />
                      </div>
                      
                      <Button 
                        className="w-full"
                        onClick={handleCreateStakingPlan}
                        disabled={createStakingPlanMutation.isPending || !newStakingPlan.name || !newStakingPlan.duration || !newStakingPlan.apy}
                        data-testid="button-confirm-create-staking-plan"
                      >
                        {createStakingPlanMutation.isPending ? "Creating..." : "Create Staking Plan"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stakingPlans?.map((plan) => (
                  <Card key={plan.id} className="p-6" data-testid={`card-admin-staking-plan-${plan.id}`}>
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
                  </Card>
                )) || []}
              </div>
            </TabsContent>
            
            <TabsContent value="challenges" className="space-y-4 sm:space-y-6 mt-4">
              <h3 className="text-xl font-semibold">Active Challenges</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {challenges?.map((challenge) => (
                  <Card key={challenge.id} className="p-6" data-testid={`card-admin-challenge-${challenge.id}`}>
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
                  </Card>
                )) || []}
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4 sm:space-y-6 mt-4">
              <UserManagement />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 sm:space-y-6 mt-4">
              <h3 className="text-xl font-semibold">Platform Settings</h3>
              
              {/* Bank Transfer Settings */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Bank Transfer Settings</h4>
                    <p className="text-sm text-muted-foreground">Configure the bank account details shown to users for deposits</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateBankSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Bank Name</Label>
                      <Input
                        id="bank-name"
                        placeholder="e.g., Chase Bank"
                        value={bankSettings.bankName}
                        onChange={(e) => setBankSettings({ ...bankSettings, bankName: e.target.value })}
                        data-testid="input-admin-bank-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-name">Account Name</Label>
                      <Input
                        id="account-name"
                        placeholder="e.g., Reflux Capital LLC"
                        value={bankSettings.accountName}
                        onChange={(e) => setBankSettings({ ...bankSettings, accountName: e.target.value })}
                        data-testid="input-admin-account-name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-number">Account Number</Label>
                      <Input
                        id="account-number"
                        placeholder="e.g., 8827364519"
                        value={bankSettings.accountNumber}
                        onChange={(e) => setBankSettings({ ...bankSettings, accountNumber: e.target.value })}
                        data-testid="input-admin-account-number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routing-number">Routing Number (ACH)</Label>
                      <Input
                        id="routing-number"
                        placeholder="e.g., 021000021"
                        value={bankSettings.routingNumber}
                        onChange={(e) => setBankSettings({ ...bankSettings, routingNumber: e.target.value })}
                        data-testid="input-admin-routing-number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="swift-code">SWIFT/BIC Code (International)</Label>
                      <Input
                        id="swift-code"
                        placeholder="e.g., CHASUS33"
                        value={bankSettings.swiftCode}
                        onChange={(e) => setBankSettings({ ...bankSettings, swiftCode: e.target.value })}
                        data-testid="input-admin-swift-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-address">Bank Address</Label>
                      <Input
                        id="bank-address"
                        placeholder="e.g., 270 Park Avenue, New York, NY 10017"
                        value={bankSettings.bankAddress}
                        onChange={(e) => setBankSettings({ ...bankSettings, bankAddress: e.target.value })}
                        data-testid="input-admin-bank-address"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Transfer Instructions</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Instructions for users making bank transfers..."
                      value={bankSettings.instructions}
                      onChange={(e) => setBankSettings({ ...bankSettings, instructions: e.target.value })}
                      className="min-h-[80px]"
                      data-testid="input-admin-instructions"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateBankSettingsMutation.isPending}
                      data-testid="button-save-bank-settings"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateBankSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>
          </Tabs>

        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
