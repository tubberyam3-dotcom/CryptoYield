import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Slider } from "@/components/ui/slider";
import { 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  Users, 
  DollarSign,
  Percent,
  Package,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ImageIcon,
  Gauge
} from "lucide-react";
import type { Portfolio } from "@shared/schema";
import { portfolioReturns, formatReturnPercent, portfolioPercentToRate, portfolioRateToPercent } from "@shared/portfolioCalculations";

interface PortfolioFormData {
  name: string;
  description: string;
  detailedDescription: string;
  imageUrl: string;
  strategyTag: string;
  minInvestment: string;
  riskLevel: "low" | "medium" | "high";
  interestRate: string;
  interestPeriod: "hourly" | "daily" | "weekly" | "monthly";
  payoutTerm: "term_based" | "after_maturity" | "profit_only" | "capital_and_interest";
  termDuration: string;
  maxUnitsPerUser: string;
  unitPrice: string;
  totalUnitsAvailable: string;
  isActive: boolean;
  meterReduction: string;
}

const defaultFormData: PortfolioFormData = {
  name: "",
  description: "",
  detailedDescription: "",
  imageUrl: "",
  strategyTag: "",
  minInvestment: "100",
  riskLevel: "medium",
  interestRate: "1",
  interestPeriod: "daily",
  payoutTerm: "profit_only",
  termDuration: "30",
  maxUnitsPerUser: "100",
  unitPrice: "100",
  totalUnitsAvailable: "1000",
  isActive: true,
  meterReduction: "0",
};

export function PortfolioManagement() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [formData, setFormData] = useState<PortfolioFormData>(defaultFormData);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portfolios, isLoading, refetch: refetchPortfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: pendingInvestments } = useQuery<any[]>({
    queryKey: ["/api/admin/user-portfolios/pending"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: PortfolioFormData) => {
      const response = await apiRequest("POST", "/api/portfolios", {
        ...data,
        interestRate: portfolioPercentToRate(data.interestRate),
        termDuration: Number(data.termDuration),
        maxUnitsPerUser: Number(data.maxUnitsPerUser),
        totalUnitsAvailable: Number(data.totalUnitsAvailable),
        assets: { description: "Portfolio asset allocation" },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Portfolio created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setCreateOpen(false);
      setFormData(defaultFormData);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PortfolioFormData> }) => {
      console.log('[Portfolio Update] Sending update for:', id, data);
      const response = await apiRequest("PATCH", `/api/admin/portfolios/${id}`, {
        ...data,
        ...(data.interestRate !== undefined ? { interestRate: portfolioPercentToRate(data.interestRate) } : {}),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Update failed');
      }
      const result = await response.json();
      console.log('[Portfolio Update] Response:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('[Portfolio Update] Success, invalidating cache');
      toast({ title: "Success", description: "Portfolio updated successfully!" });
      await queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      await refetchPortfolios();
      setFormData(defaultFormData);
      setEditOpen(false);
      setSelectedPortfolio(null);
    },
    onError: (error: any) => {
      console.error('[Portfolio Update] Error:', error);
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to update portfolio", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/portfolios/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Portfolio deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setDeleteOpen(false);
      setSelectedPortfolio(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveInvestmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const response = await apiRequest("PATCH", `/api/admin/user-portfolios/${id}/status`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: "Success", 
        description: `Investment ${variables.status === 'approved' ? 'approved' : 'rejected'} successfully!` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-portfolios/pending"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const accrueInterestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/portfolios/accrue-interest", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Interest Accrued", 
        description: `Processed ${data.processed} portfolios. Total interest: $${data.totalInterestAdded}` 
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    setFormData({
      name: portfolio.name,
      description: portfolio.description || "",
      detailedDescription: portfolio.detailedDescription || "",
      imageUrl: portfolio.imageUrl || "",
      strategyTag: portfolio.strategyTag || "",
      minInvestment: portfolio.minInvestment?.toString() || "100",
      riskLevel: portfolio.riskLevel as "low" | "medium" | "high",
      interestRate: portfolioRateToPercent(portfolio.interestRate ?? portfolio.dailyInterestRate ?? "0"),
      interestPeriod: (portfolio.interestPeriod as "hourly" | "daily" | "weekly" | "monthly") || "daily",
      payoutTerm: (portfolio.payoutTerm as "term_based" | "after_maturity" | "profit_only" | "capital_and_interest") || "profit_only",
      termDuration: portfolio.termDuration?.toString() || "30",
      maxUnitsPerUser: portfolio.maxUnitsPerUser?.toString() || "100",
      unitPrice: portfolio.unitPrice?.toString() || "100",
      totalUnitsAvailable: portfolio.totalUnitsAvailable?.toString() || "1000",
      isActive: portfolio.isActive ?? true,
      meterReduction: (portfolio as any).meterReduction?.toString() || "0",
    });
    setEditOpen(true);
  };

  const handleDelete = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    setDeleteOpen(true);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'high': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Portfolio Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage investment portfolios</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => accrueInterestMutation.mutate()}
            disabled={accrueInterestMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${accrueInterestMutation.isPending ? 'animate-spin' : ''}`} />
            Accrue Interest
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl !flex flex-col max-h-[90vh]">
              <DialogHeader className="shrink-0">
                <DialogTitle>Create New Portfolio</DialogTitle>
                <DialogDescription>Set up a new investment portfolio with interest rates and unit limits</DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-1">
                <PortfolioForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={() => createMutation.mutate(formData)}
                  isLoading={createMutation.isPending}
                  submitLabel="Create Portfolio"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {pendingInvestments && pendingInvestments.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Pending Investment Approvals ({pendingInvestments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvestments.map((investment: any) => (
                <div key={investment.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">{investment.portfolio?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {investment.user?.firstName} {investment.user?.lastName} ({investment.user?.email})
                    </p>
                    <p className="text-sm">
                      Amount: <span className="font-medium">${parseFloat(investment.investedAmount).toLocaleString()}</span>
                      {investment.unitsPurchased && ` • ${investment.unitsPurchased} units`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-green-500 border-green-500 hover:bg-green-500/10"
                      onClick={() => approveInvestmentMutation.mutate({ id: investment.id, status: 'approved' })}
                      disabled={approveInvestmentMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-500 border-red-500 hover:bg-red-500/10"
                      onClick={() => approveInvestmentMutation.mutate({ id: investment.id, status: 'rejected' })}
                      disabled={approveInvestmentMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios?.map((portfolio) => (
          <Card key={portfolio.id} className="relative overflow-hidden">
            {portfolio.imageUrl && (
              <div className="w-full h-32 overflow-hidden bg-muted">
                <img 
                  src={portfolio.imageUrl} 
                  alt={portfolio.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  }}
                />
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-primary/10 text-primary">
                  {portfolio.strategyTag || 'General'}
                </Badge>
                <div className="flex items-center gap-2">
                  <Badge className={portfolio.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                    {portfolio.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge className={getRiskColor(portfolio.riskLevel)}>
                    {portfolio.riskLevel}
                  </Badge>
                </div>
              </div>

              <h4 className="font-semibold text-lg mb-2">{portfolio.name}</h4>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {portfolio.description}
              </p>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Min Investment</p>
                    <p className="font-medium">${parseFloat(portfolio.minInvestment || '0').toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Daily Interest</p>
                    <p className="font-medium">{formatReturnPercent(portfolioReturns(portfolio).dailyRate * 100)}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Period</p>
                    <p className="font-medium">{portfolioReturns(portfolio).durationDays.toLocaleString()} days</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Max Units/User</p>
                    <p className="font-medium">{portfolio.maxUnitsPerUser || 100}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Unit Price</p>
                    <p className="font-medium">${parseFloat(portfolio.unitPrice?.toString() || '100').toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Units Sold</p>
                    <p className="font-medium">{portfolio.unitsSold || 0}/{portfolio.totalUnitsAvailable || 1000}</p>
                  </div>
                </div>
              </div>

              {parseFloat((portfolio as any).meterReduction?.toString() || '0') > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs">
                  <Gauge className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    Meter: {(portfolio as any).meterReduction}% reduction
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    Eff. {formatReturnPercent(portfolioReturns(portfolio).effectiveRate * 100)}%/{portfolio.interestPeriod || 'daily'}
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(portfolio)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(portfolio)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl !flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Portfolio</DialogTitle>
            <DialogDescription>Update portfolio settings and parameters</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            <PortfolioForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={() => selectedPortfolio && updateMutation.mutate({ id: selectedPortfolio.id, data: formData })}
              isLoading={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPortfolio?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPortfolio && deleteMutation.mutate(selectedPortfolio.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Portfolio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PortfolioForm({
  formData,
  setFormData,
  onSubmit,
  isLoading,
  submitLabel,
}: {
  formData: PortfolioFormData;
  setFormData: (data: PortfolioFormData) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  let rate = "0";
  let rateError = "";
  try { rate = portfolioPercentToRate(formData.interestRate); }
  catch (error) { rateError = error instanceof Error ? error.message : "Enter a valid interest percentage."; }
  const returnPreview = portfolioReturns({
    interestRate: rate,
    dailyInterestRate: null,
    interestPeriod: formData.interestPeriod,
    meterReduction: formData.meterReduction || "0",
    termDuration: Number(formData.termDuration || 0),
  });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name">Portfolio Name *</Label>
          <Input
            id="name"
            placeholder="Growth Portfolio"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Short Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the portfolio"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="detailedDescription">Detailed Description</Label>
          <Textarea
            id="detailedDescription"
            placeholder="Full details about portfolio strategy, assets, and investment approach..."
            value={formData.detailedDescription}
            onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
            rows={4}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="imageUrl">Portfolio Image URL</Label>
          <Input
            id="imageUrl"
            placeholder="https://example.com/portfolio-image.jpg"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Recommended size: 400x200px (2:1 aspect ratio). Images will be cropped to fit.
          </p>
          {formData.imageUrl && (
            <div className="mt-3 relative">
              <div className="w-full h-32 rounded-lg overflow-hidden border bg-muted">
                <img 
                  src={formData.imageUrl} 
                  alt="Portfolio preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Image preview (cropped to fit card)</p>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="strategyTag">Strategy Tag</Label>
          <Select value={formData.strategyTag} onValueChange={(value) => setFormData({ ...formData, strategyTag: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="dividend">Dividend</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="AI">AI & Tech</SelectItem>
              <SelectItem value="ESG">ESG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Risk Level</Label>
          <Select value={formData.riskLevel} onValueChange={(value: "low" | "medium" | "high") => setFormData({ ...formData, riskLevel: value })}>
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
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Investment Parameters</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minInvestment">Minimum Investment ($)</Label>
            <Input
              id="minInvestment"
              type="number"
              placeholder="100"
              value={formData.minInvestment}
              onChange={(e) => setFormData({ ...formData, minInvestment: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="unitPrice">Unit Price ($)</Label>
            <Input
              id="unitPrice"
              type="number"
              placeholder="100"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="totalUnitsAvailable">Total Units Available</Label>
            <Input
              id="totalUnitsAvailable"
              type="number"
              placeholder="1000"
              value={formData.totalUnitsAvailable}
              onChange={(e) => setFormData({ ...formData, totalUnitsAvailable: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="maxUnitsPerUser">Max Units Per User</Label>
            <Input
              id="maxUnitsPerUser"
              type="number"
              placeholder="100"
              value={formData.maxUnitsPerUser}
              onChange={(e) => setFormData({ ...formData, maxUnitsPerUser: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Interest & Returns (Automated)</h4>
        <p className="text-sm text-muted-foreground mb-4" data-testid="portfolio-return-preview">
          Daily equivalent: {formatReturnPercent(returnPreview.dailyRate * 100)}%.
          {" "}Expected annual return: {formatReturnPercent(returnPreview.annualPercent)}% (annualized simple rate).
          {" "}Term: {returnPreview.durationDays.toLocaleString()} days. Includes any configured meter reduction.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="interestRate">Interest Rate per Period (%)</Label>
            <Input
              id="interestRate"
              type="number"
              step="0.0001"
              min="0"
              max="9999.9999"
              placeholder="0.1"
              aria-invalid={!!rateError}
              aria-describedby="interest-rate-help"
              value={formData.interestRate}
              onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
            />
            <p id="interest-rate-help" className="text-xs text-muted-foreground mt-1">
              Enter the percentage directly: 0.1 = 0.1% per period, 1 = 1% per period.
            </p>
            {rateError && <p className="text-xs text-destructive mt-1" role="alert">{rateError}</p>}
          </div>

          <div>
            <Label>Interest Period</Label>
            <Select value={formData.interestPeriod} onValueChange={(value: "hourly" | "daily" | "weekly" | "monthly") => setFormData({ ...formData, interestPeriod: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              How often interest is calculated and applied
            </p>
          </div>

          <div>
            <Label>Payout Term</Label>
            <Select value={formData.payoutTerm} onValueChange={(value: "term_based" | "after_maturity" | "profit_only" | "capital_and_interest") => setFormData({ ...formData, payoutTerm: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit_only">Profit Only (capital returned at end)</SelectItem>
                <SelectItem value="capital_and_interest">Capital + Interest (paid together each period)</SelectItem>
                <SelectItem value="term_based">Term Based (legacy - pay each period)</SelectItem>
                <SelectItem value="after_maturity">After Maturity (legacy - pay at end)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Profit Only: Interest paid each period, capital returned at maturity. Capital + Interest: Both paid together proportionally.
            </p>
          </div>

          <div>
            <Label htmlFor="termDuration">Term Duration (number of periods)</Label>
            <Input
              id="termDuration"
              type="number"
              placeholder="30"
              value={formData.termDuration}
              onChange={(e) => setFormData({ ...formData, termDuration: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total number of interest periods for full investment term
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-1 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-orange-500" />
          Investment Meter (Optional)
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Reduce the effective interest rate by a percentage. Set to 0 to use the full rate.
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Slider
                min={0}
                max={100}
                step={0.5}
                value={[parseFloat(formData.meterReduction) || 0]}
                onValueChange={([val]) => setFormData({ ...formData, meterReduction: val.toString() })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0% (no reduction)</span>
                <span>100% (full reduction)</span>
              </div>
            </div>
            <div className="w-24">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.meterReduction}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                  setFormData({ ...formData, meterReduction: val.toString() });
                }}
                className="text-center font-medium"
              />
              <p className="text-xs text-center text-muted-foreground mt-1">% reduction</p>
            </div>
          </div>
          {parseFloat(formData.meterReduction) > 0 && (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-sm">
              <p className="font-medium text-orange-600 dark:text-orange-400">Effective Rate Preview</p>
              <p className="text-muted-foreground mt-1">
                Base rate: <span className="font-sans tabular-nums font-medium">{formatReturnPercent(Number(formData.interestRate || '0'))}%</span> per {formData.interestPeriod}
              </p>
              <p className="text-muted-foreground">
                After {formData.meterReduction}% reduction: <span className="font-sans tabular-nums font-medium text-foreground">
                  {formatReturnPercent(returnPreview.effectiveRate * 100)}%
                </span> per {formData.interestPeriod}
              </p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label htmlFor="isActive">Portfolio is Active</Label>
        </div>

        <Button 
          onClick={onSubmit}
          disabled={isLoading || !formData.name || !formData.minInvestment || !!rateError}
        >
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
