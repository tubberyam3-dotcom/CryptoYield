import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, 
  Building2, 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Save, 
  Loader2,
  DollarSign,
  Percent,
  Clock,
  AlertCircle
} from "lucide-react";
import { SiBitcoin } from "react-icons/si";

interface PaymentConfig {
  deposit_crypto_enabled?: string;
  deposit_bank_enabled?: string;
  deposit_card_enabled?: string;
  deposit_min_amount?: string;
  deposit_max_amount?: string;
  deposit_fee_percent?: string;
  withdrawal_crypto_enabled?: string;
  withdrawal_wire_enabled?: string;
  withdrawal_merchant_enabled?: string;
  withdrawal_min_amount?: string;
  withdrawal_max_amount?: string;
  withdrawal_fee_percent?: string;
  withdrawal_processing_time?: string;
  withdrawal_daily_limit?: string;
}

export function PaymentSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<PaymentConfig>({
    deposit_crypto_enabled: "true",
    deposit_bank_enabled: "true",
    deposit_card_enabled: "true",
    deposit_min_amount: "10",
    deposit_max_amount: "100000",
    deposit_fee_percent: "0",
    withdrawal_crypto_enabled: "true",
    withdrawal_wire_enabled: "true",
    withdrawal_merchant_enabled: "true",
    withdrawal_min_amount: "50",
    withdrawal_max_amount: "50000",
    withdrawal_fee_percent: "1",
    withdrawal_processing_time: "24",
    withdrawal_daily_limit: "10000",
  });

  const { data: config, isLoading } = useQuery<PaymentConfig>({
    queryKey: ["/api/admin/payment/config"],
  });

  useEffect(() => {
    if (config) {
      setFormData((prev) => ({
        ...prev,
        ...config,
      }));
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async (settings: PaymentConfig) => {
      const response = await apiRequest("POST", "/api/admin/payment/config", { settings });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Payment configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate(formData);
  };

  const updateField = (field: keyof PaymentConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleField = (field: keyof PaymentConfig) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] === "true" ? "false" : "true"
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payment-settings">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Payment Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure deposit and withdrawal options for users
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saveConfigMutation.isPending}
          className="bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
          data-testid="button-save-payment-settings"
        >
          {saveConfigMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-green-500" />
              Deposit Settings
            </CardTitle>
            <CardDescription>
              Configure deposit methods and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Payment Methods
              </h4>
              
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <SiBitcoin className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Cryptocurrency</p>
                    <p className="text-xs text-muted-foreground">BTC, ETH, USDT, etc.</p>
                  </div>
                </div>
                <Switch
                  checked={formData.deposit_crypto_enabled === "true"}
                  onCheckedChange={() => toggleField("deposit_crypto_enabled")}
                  data-testid="switch-deposit-crypto"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">Wire & ACH transfers</p>
                  </div>
                </div>
                <Switch
                  checked={formData.deposit_bank_enabled === "true"}
                  onCheckedChange={() => toggleField("deposit_bank_enabled")}
                  data-testid="switch-deposit-bank"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">Card Payment</p>
                    <p className="text-xs text-muted-foreground">Credit & Debit cards</p>
                  </div>
                </div>
                <Switch
                  checked={formData.deposit_card_enabled === "true"}
                  onCheckedChange={() => toggleField("deposit_card_enabled")}
                  data-testid="switch-deposit-card"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Limits & Fees
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Minimum Deposit
                  </Label>
                  <Input
                    type="number"
                    value={formData.deposit_min_amount}
                    onChange={(e) => updateField("deposit_min_amount", e.target.value)}
                    placeholder="10"
                    data-testid="input-deposit-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Maximum Deposit
                  </Label>
                  <Input
                    type="number"
                    value={formData.deposit_max_amount}
                    onChange={(e) => updateField("deposit_max_amount", e.target.value)}
                    placeholder="100000"
                    data-testid="input-deposit-max"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  Deposit Fee (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.deposit_fee_percent}
                  onChange={(e) => updateField("deposit_fee_percent", e.target.value)}
                  placeholder="0"
                  data-testid="input-deposit-fee"
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for no fees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-red-500" />
              Withdrawal Settings
            </CardTitle>
            <CardDescription>
              Configure withdrawal methods and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Payment Methods
              </h4>
              
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <SiBitcoin className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Cryptocurrency</p>
                    <p className="text-xs text-muted-foreground">BTC, ETH, USDT, etc.</p>
                  </div>
                </div>
                <Switch
                  checked={formData.withdrawal_crypto_enabled === "true"}
                  onCheckedChange={() => toggleField("withdrawal_crypto_enabled")}
                  data-testid="switch-withdrawal-crypto"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Wire Transfer</p>
                    <p className="text-xs text-muted-foreground">Bank wire transfers</p>
                  </div>
                </div>
                <Switch
                  checked={formData.withdrawal_wire_enabled === "true"}
                  onCheckedChange={() => toggleField("withdrawal_wire_enabled")}
                  data-testid="switch-withdrawal-wire"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Merchant Pay</p>
                    <p className="text-xs text-muted-foreground">PayPal, Wise, etc.</p>
                  </div>
                </div>
                <Switch
                  checked={formData.withdrawal_merchant_enabled === "true"}
                  onCheckedChange={() => toggleField("withdrawal_merchant_enabled")}
                  data-testid="switch-withdrawal-merchant"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Limits & Fees
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Minimum Withdrawal
                  </Label>
                  <Input
                    type="number"
                    value={formData.withdrawal_min_amount}
                    onChange={(e) => updateField("withdrawal_min_amount", e.target.value)}
                    placeholder="50"
                    data-testid="input-withdrawal-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Maximum Withdrawal
                  </Label>
                  <Input
                    type="number"
                    value={formData.withdrawal_max_amount}
                    onChange={(e) => updateField("withdrawal_max_amount", e.target.value)}
                    placeholder="50000"
                    data-testid="input-withdrawal-max"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    Withdrawal Fee (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.withdrawal_fee_percent}
                    onChange={(e) => updateField("withdrawal_fee_percent", e.target.value)}
                    placeholder="1"
                    data-testid="input-withdrawal-fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Daily Limit
                  </Label>
                  <Input
                    type="number"
                    value={formData.withdrawal_daily_limit}
                    onChange={(e) => updateField("withdrawal_daily_limit", e.target.value)}
                    placeholder="10000"
                    data-testid="input-withdrawal-daily-limit"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Processing Time (hours)
                </Label>
                <Input
                  type="number"
                  value={formData.withdrawal_processing_time}
                  onChange={(e) => updateField("withdrawal_processing_time", e.target.value)}
                  placeholder="24"
                  data-testid="input-withdrawal-processing-time"
                />
                <p className="text-xs text-muted-foreground">
                  Estimated time for withdrawal approval
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">Important Note</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Changes to payment settings will take effect immediately. Disabling a payment method will prevent users from using it for new transactions but won't affect pending transactions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
