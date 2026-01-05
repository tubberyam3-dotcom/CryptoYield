import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { BondProduct, InsertBondProduct } from "@shared/schema";
import { insertBondProductSchema } from "@shared/schema";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

const bondFormSchema = insertBondProductSchema.extend({
  yield: z.string().min(1, "Yield is required"),
  maturityMonths: z.number().min(1, "Maturity period is required"),
  minInvestment: z.string().min(1, "Minimum investment is required"),
});

type BondFormData = z.infer<typeof bondFormSchema>;

export function BondManagement() {
  const [createBondOpen, setCreateBondOpen] = useState(false);
  const [editBond, setEditBond] = useState<BondProduct | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<BondFormData>({
    resolver: zodResolver(bondFormSchema),
    defaultValues: {
      name: "",
      bondType: "government",
      maturityMonths: 12,
      yield: "",
      minInvestment: "",
      description: "",
      riskLevel: "low",
      isActive: true,
    },
  });

  const editForm = useForm<BondFormData>({
    resolver: zodResolver(bondFormSchema),
    defaultValues: {
      name: "",
      bondType: "government",
      maturityMonths: 12,
      yield: "",
      minInvestment: "",
      description: "",
      riskLevel: "low",
      isActive: true,
    },
  });

  const { data: bondProducts } = useQuery<BondProduct[]>({
    queryKey: ["/api/bonds/products"],
  });

  const createBondMutation = useMutation({
    mutationFn: async (bondData: BondFormData) => {
      const response = await apiRequest("POST", "/api/bonds/products", bondData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bond Created",
        description: "New bond has been added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bonds/products"] });
      setCreateBondOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to Create Bond",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBondMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BondFormData> }) => {
      const response = await apiRequest("PATCH", `/api/bonds/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bond Updated",
        description: "Bond has been updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bonds/products"] });
      setEditBond(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Bond",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBondMutation = useMutation({
    mutationFn: async (bondId: string) => {
      const response = await apiRequest("DELETE", `/api/bonds/products/${bondId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bond Deleted",
        description: "Bond has been removed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bonds/products"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Bond",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateBond = form.handleSubmit((data) => {
    createBondMutation.mutate(data);
  });

  const handleEditBond = editForm.handleSubmit((data) => {
    if (editBond) {
      updateBondMutation.mutate({ id: editBond.id, data });
    }
  });

  const openEditDialog = (bond: BondProduct) => {
    setEditBond(bond);
    editForm.reset({
      name: bond.name,
      bondType: bond.bondType as "government" | "corporate" | "municipal",
      maturityMonths: bond.maturityMonths,
      yield: bond.yield,
      minInvestment: bond.minInvestment,
      description: bond.description || "",
      riskLevel: bond.riskLevel as "low" | "medium" | "high",
      isActive: bond.isActive ?? true,
    });
  };

  const getBondTypeLabel = (type: string | null) => {
    switch (type) {
      case "government": return "Government";
      case "corporate": return "Corporate";
      case "municipal": return "Municipal";
      default: return "Government";
    }
  };

  const getRiskLabel = (level: string | null) => {
    switch (level) {
      case "low": return "Low Risk";
      case "medium": return "Medium Risk";
      case "high": return "High Risk";
      default: return "Low Risk";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Manage Bond Products</h3>
        
        <Dialog open={createBondOpen} onOpenChange={setCreateBondOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-bond">
              <Plus className="w-4 h-4 mr-2" />
              Add Bond
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-create-bond">
            <DialogHeader>
              <DialogTitle>Add New Bond Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBond} className="space-y-4">
              <div>
                <Label htmlFor="bondName">Bond Name *</Label>
                <Input
                  id="bondName"
                  placeholder="US Treasury 10-Year"
                  {...form.register("name")}
                  data-testid="input-bond-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="bondType">Bond Type *</Label>
                <Select
                  value={form.watch("bondType") || "government"}
                  onValueChange={(value: "government" | "corporate" | "municipal") => form.setValue("bondType", value)}
                >
                  <SelectTrigger data-testid="select-bond-type">
                    <SelectValue placeholder="Select bond type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bondYield">Yield (%) *</Label>
                <Input
                  id="bondYield"
                  placeholder="4.5"
                  {...form.register("yield")}
                  data-testid="input-bond-yield"
                />
                {form.formState.errors.yield && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.yield.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="maturityMonths">Maturity Period (months) *</Label>
                <Input
                  id="maturityMonths"
                  type="number"
                  placeholder="12"
                  {...form.register("maturityMonths", {
                    setValueAs: (value) => parseInt(value) || 12,
                  })}
                  data-testid="input-maturity-months"
                />
                {form.formState.errors.maturityMonths && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.maturityMonths.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="minInvestment">Minimum Investment ($) *</Label>
                <Input
                  id="minInvestment"
                  placeholder="1000"
                  {...form.register("minInvestment")}
                  data-testid="input-min-investment"
                />
                {form.formState.errors.minInvestment && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.minInvestment.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select
                  value={form.watch("riskLevel") || "low"}
                  onValueChange={(value: "low" | "medium" | "high") => form.setValue("riskLevel", value)}
                >
                  <SelectTrigger data-testid="select-risk-level">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bondDescription">Description</Label>
                <Textarea
                  id="bondDescription"
                  placeholder="Brief description of the bond"
                  {...form.register("description")}
                  data-testid="textarea-bond-description"
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full"
                disabled={createBondMutation.isPending}
                data-testid="button-confirm-create-bond"
              >
                {createBondMutation.isPending ? "Creating..." : "Add Bond"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bondProducts?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No bond products available. Add your first bond to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bondProducts?.map((bond) => (
            <Card key={bond.id} className="p-6" data-testid={`card-admin-bond-${bond.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold" data-testid={`text-bond-name-${bond.id}`}>
                      {bond.name}
                    </h4>
                    {bond.isActive ? (
                      <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-gray-500/10 text-gray-500 rounded-full">Inactive</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-500 rounded-full">
                      {getBondTypeLabel(bond.bondType)}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-500 rounded-full">
                      {getRiskLabel(bond.riskLevel)}
                    </span>
                  </div>
                  {bond.description && (
                    <p className="text-sm text-muted-foreground mb-2">{bond.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-muted-foreground">Yield: <span className="text-foreground font-medium">{bond.yield}%</span></p>
                    <p className="text-muted-foreground">Maturity: <span className="text-foreground font-medium">{bond.maturityMonths} months</span></p>
                    <p className="text-muted-foreground col-span-2">Min. Investment: <span className="text-foreground font-medium">${parseFloat(bond.minInvestment).toLocaleString()}</span></p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(bond)}
                    data-testid={`button-edit-bond-${bond.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBondMutation.mutate(bond.id)}
                    disabled={deleteBondMutation.isPending}
                    data-testid={`button-delete-bond-${bond.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editBond} onOpenChange={(open) => !open && setEditBond(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-bond">
          <DialogHeader>
            <DialogTitle>Edit Bond Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditBond} className="space-y-4">
            <div>
              <Label htmlFor="editBondName">Bond Name *</Label>
              <Input
                id="editBondName"
                placeholder="US Treasury 10-Year"
                {...editForm.register("name")}
                data-testid="input-edit-bond-name"
              />
            </div>
            
            <div>
              <Label htmlFor="editBondType">Bond Type *</Label>
              <Select
                value={editForm.watch("bondType") || "government"}
                onValueChange={(value: "government" | "corporate" | "municipal") => editForm.setValue("bondType", value)}
              >
                <SelectTrigger data-testid="select-edit-bond-type">
                  <SelectValue placeholder="Select bond type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="editBondYield">Yield (%) *</Label>
              <Input
                id="editBondYield"
                placeholder="4.5"
                {...editForm.register("yield")}
                data-testid="input-edit-bond-yield"
              />
            </div>
            
            <div>
              <Label htmlFor="editMaturityMonths">Maturity Period (months) *</Label>
              <Input
                id="editMaturityMonths"
                type="number"
                placeholder="12"
                {...editForm.register("maturityMonths", {
                  setValueAs: (value) => parseInt(value) || 12,
                })}
                data-testid="input-edit-maturity-months"
              />
            </div>
            
            <div>
              <Label htmlFor="editMinInvestment">Minimum Investment ($) *</Label>
              <Input
                id="editMinInvestment"
                placeholder="1000"
                {...editForm.register("minInvestment")}
                data-testid="input-edit-min-investment"
              />
            </div>
            
            <div>
              <Label htmlFor="editRiskLevel">Risk Level</Label>
              <Select
                value={editForm.watch("riskLevel") || "low"}
                onValueChange={(value: "low" | "medium" | "high") => editForm.setValue("riskLevel", value)}
              >
                <SelectTrigger data-testid="select-edit-risk-level">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="editBondDescription">Description</Label>
              <Textarea
                id="editBondDescription"
                placeholder="Brief description of the bond"
                {...editForm.register("description")}
                data-testid="textarea-edit-bond-description"
              />
            </div>
            
            <Button 
              type="submit"
              className="w-full"
              disabled={updateBondMutation.isPending}
              data-testid="button-confirm-edit-bond"
            >
              {updateBondMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
