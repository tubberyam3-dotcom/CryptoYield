import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Ticket, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Coupon } from "@shared/schema";

export function CouponManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    rewardAmount: "",
    maxUses: "",
    validUntil: "",
  });
  const { toast } = useToast();

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/coupons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Success",
        description: "Coupon created successfully!",
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/admin/coupons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Success",
        description: "Coupon updated successfully!",
      });
      setEditingCoupon(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/coupons/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Success",
        description: "Coupon deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coupon",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      rewardAmount: "",
      maxUses: "",
      validUntil: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build data object with all form fields
    const data = {
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      rewardAmount: parseFloat(formData.rewardAmount).toString(),
      maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
      expiresAt: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
    };

    if (editingCoupon) {
      // For updates, send all current form values (which were pre-populated with existing values)
      // This preserves unchanged fields and allows clearing optional fields
      updateMutation.mutate({ id: editingCoupon.id, data });
    } else {
      // For new coupons, add isActive: true
      createMutation.mutate({ ...data, isActive: true });
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      rewardAmount: coupon.rewardAmount,
      maxUses: coupon.maxUses?.toString() || "",
      validUntil: coupon.expiresAt ? format(new Date(coupon.expiresAt), "yyyy-MM-dd") : "",
    });
    setCreateDialogOpen(true);
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/coupons/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      // Close edit dialog if open to prevent stale data
      if (createDialogOpen) {
        setCreateDialogOpen(false);
        setEditingCoupon(null);
        resetForm();
      }
      toast({
        title: "Success",
        description: "Coupon status updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon status",
        variant: "destructive",
      });
    },
  });

  const handleToggleActive = (coupon: Coupon) => {
    toggleActiveMutation.mutate({
      id: coupon.id,
      isActive: !coupon.isActive,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-coupons">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-muted-foreground">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Coupon Management</h3>
          <p className="text-muted-foreground">Create and manage promotional coupons</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCoupon(null); resetForm(); }} data-testid="button-create-coupon">
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit" : "Create"} Coupon</DialogTitle>
              <DialogDescription>
                {editingCoupon ? "Update" : "Create a new"} promotional coupon with custom rewards
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Coupon Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME2024"
                  required
                  data-testid="input-coupon-code-form"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Welcome bonus for new users"
                  data-testid="input-coupon-description"
                />
              </div>
              <div>
                <Label htmlFor="rewardAmount">Reward Amount ($)</Label>
                <Input
                  id="rewardAmount"
                  type="number"
                  step="0.01"
                  value={formData.rewardAmount}
                  onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                  placeholder="100.00"
                  required
                  data-testid="input-coupon-reward"
                />
              </div>
              <div>
                <Label htmlFor="maxUses">Max Uses (optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  data-testid="input-coupon-maxuses"
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Valid Until (optional)</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  data-testid="input-coupon-expiry"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-coupon">
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (editingCoupon ? "Update" : "Create")}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons?.map((coupon) => (
          <Card key={coupon.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-mono" data-testid={`text-coupon-code-${coupon.id}`}>
                    {coupon.code}
                  </CardTitle>
                </div>
                <Badge variant={coupon.isActive ? "default" : "secondary"} data-testid={`badge-coupon-status-${coupon.id}`}>
                  {coupon.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {coupon.description && (
                <CardDescription className="mt-2">{coupon.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reward</span>
                <span className="font-semibold text-green-600 dark:text-green-500">
                  ${parseFloat(coupon.rewardAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {coupon.maxUses && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uses</span>
                  <span>{coupon.currentUses || 0} / {coupon.maxUses}</span>
                </div>
              )}
              {coupon.expiresAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span>{format(new Date(coupon.expiresAt), "MMM dd, yyyy")}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={coupon.isActive || false}
                    onCheckedChange={() => handleToggleActive(coupon)}
                    data-testid={`switch-coupon-active-${coupon.id}`}
                  />
                  <Label className="text-xs">{coupon.isActive ? "Active" : "Inactive"}</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(coupon)}
                    data-testid={`button-edit-coupon-${coupon.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(coupon.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-coupon-${coupon.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) || []}
        {!coupons?.length && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coupons created yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setEditingCoupon(null); resetForm(); setCreateDialogOpen(true); }}
              >
                Create Your First Coupon
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
