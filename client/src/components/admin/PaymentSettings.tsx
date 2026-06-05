import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { SiBitcoin, SiEthereum, SiTether } from "react-icons/si";

interface PaymentConfig {
  // Deposit/Withdrawal toggles
  deposit_crypto_enabled?: string;
  deposit_bank_enabled?: string;
  deposit_card_enabled?: string;
  withdrawal_crypto_enabled?: string;
  withdrawal_wire_enabled?: string;
  withdrawal_merchant_enabled?: string;
  // Limits
  deposit_min_amount?: string;
  deposit_max_amount?: string;
  deposit_fee_percent?: string;
  withdrawal_min_amount?: string;
  withdrawal_max_amount?: string;
  withdrawal_fee_percent?: string;
  withdrawal_processing_time?: string;
  withdrawal_daily_limit?: string;
  // Crypto addresses
  crypto_btc_address?: string;
  crypto_eth_address?: string;
  crypto_usdt_address?: string;
  crypto_usdt_network?: string;
  crypto_ltc_address?: string;
  crypto_xrp_address?: string;
  crypto_sol_address?: string;
  // Bank details
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_swift_code?: string;
  bank_iban?: string;
  bank_address?: string;
  bank_instructions?: string;
  // Wire transfer details
  wire_bank_name?: string;
  wire_account_name?: string;
  wire_account_number?: string;
  wire_routing_number?: string;
  wire_swift_code?: string;
  wire_iban?: string;
  wire_address?: string;
  wire_instructions?: string;
  // Merchant Pay details
  deposit_merchant_enabled?: string;
  merchant_no_match_enabled?: string;
  merchant_bank_name?: string;
  merchant_account_name?: string;
  merchant_account_number?: string;
  merchant_routing_number?: string;
  merchant_swift_code?: string;
  merchant_iban?: string;
  merchant_bank_address?: string;
  merchant_instructions?: string;
  merchant_fee_percent?: string;
  // Supported currencies
  supported_currencies?: string;
  default_currency?: string;
}

export function PaymentSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<PaymentConfig>({
    deposit_crypto_enabled: "true",
    deposit_bank_enabled: "true",
    deposit_card_enabled: "true",
    withdrawal_crypto_enabled: "true",
    withdrawal_wire_enabled: "true",
    withdrawal_merchant_enabled: "true",
    deposit_min_amount: "10",
    deposit_max_amount: "100000",
    deposit_fee_percent: "0",
    withdrawal_min_amount: "50",
    withdrawal_max_amount: "50000",
    withdrawal_fee_percent: "1",
    withdrawal_processing_time: "24",
    withdrawal_daily_limit: "10000",
    crypto_btc_address: "",
    crypto_eth_address: "",
    crypto_usdt_address: "",
    crypto_usdt_network: "ERC20",
    crypto_ltc_address: "",
    crypto_xrp_address: "",
    crypto_sol_address: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_routing_number: "",
    bank_swift_code: "",
    bank_iban: "",
    bank_address: "",
    bank_instructions: "",
    wire_bank_name: "",
    wire_account_name: "",
    wire_account_number: "",
    wire_routing_number: "",
    wire_swift_code: "",
    wire_iban: "",
    wire_address: "",
    wire_instructions: "",
    deposit_merchant_enabled: "true",
    merchant_no_match_enabled: "false",
    merchant_bank_name: "",
    merchant_account_name: "",
    merchant_account_number: "",
    merchant_routing_number: "",
    merchant_swift_code: "",
    merchant_iban: "",
    merchant_bank_address: "",
    merchant_instructions: "",
    merchant_fee_percent: "0",
    supported_currencies: "USD,EUR,GBP",
    default_currency: "USD",
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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
            Configure deposit and withdrawal options, crypto addresses, and bank details
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

      <Tabs defaultValue="methods" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="methods" data-testid="tab-payment-methods">Methods</TabsTrigger>
          <TabsTrigger value="crypto" data-testid="tab-crypto-addresses">Crypto</TabsTrigger>
          <TabsTrigger value="bank" data-testid="tab-bank-details">Bank</TabsTrigger>
          <TabsTrigger value="merchant" data-testid="tab-merchant-pay">Merchant</TabsTrigger>
          <TabsTrigger value="currency" data-testid="tab-currency">Currency</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-6">
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

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium">Merchant Pay</p>
                        <p className="text-xs text-muted-foreground">Peer-to-peer merchant transfers</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.deposit_merchant_enabled === "true"}
                      onCheckedChange={() => toggleField("deposit_merchant_enabled")}
                      data-testid="switch-deposit-merchant"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">No Merchant Available Mode</p>
                        <p className="text-xs text-muted-foreground">Show "no merchant in your region" message instead of the normal Merchant Pay flow</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.merchant_no_match_enabled === "true"}
                      onCheckedChange={() => toggleField("merchant_no_match_enabled")}
                      data-testid="switch-merchant-no-match"
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="crypto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-500" />
                Cryptocurrency Wallet Addresses
              </CardTitle>
              <CardDescription>
                Configure wallet addresses for receiving crypto deposits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <SiBitcoin className="w-4 h-4 text-orange-500" />
                    Bitcoin (BTC) Address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.crypto_btc_address}
                      onChange={(e) => updateField("crypto_btc_address", e.target.value)}
                      placeholder="bc1q..."
                      className="font-mono text-sm"
                      data-testid="input-crypto-btc"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(formData.crypto_btc_address || "", "btc")}
                      disabled={!formData.crypto_btc_address}
                    >
                      {copiedField === "btc" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <SiEthereum className="w-4 h-4 text-blue-500" />
                    Ethereum (ETH) Address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.crypto_eth_address}
                      onChange={(e) => updateField("crypto_eth_address", e.target.value)}
                      placeholder="0x..."
                      className="font-mono text-sm"
                      data-testid="input-crypto-eth"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(formData.crypto_eth_address || "", "eth")}
                      disabled={!formData.crypto_eth_address}
                    >
                      {copiedField === "eth" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <SiTether className="w-4 h-4 text-green-500" />
                    USDT Address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.crypto_usdt_address}
                      onChange={(e) => updateField("crypto_usdt_address", e.target.value)}
                      placeholder="0x... or T..."
                      className="font-mono text-sm"
                      data-testid="input-crypto-usdt"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(formData.crypto_usdt_address || "", "usdt")}
                      disabled={!formData.crypto_usdt_address}
                    >
                      {copiedField === "usdt" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>USDT Network</Label>
                  <Input
                    value={formData.crypto_usdt_network}
                    onChange={(e) => updateField("crypto_usdt_network", e.target.value)}
                    placeholder="ERC20, TRC20, BEP20"
                    data-testid="input-crypto-usdt-network"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Litecoin (LTC) Address</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.crypto_ltc_address}
                      onChange={(e) => updateField("crypto_ltc_address", e.target.value)}
                      placeholder="ltc1..."
                      className="font-mono text-sm"
                      data-testid="input-crypto-ltc"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(formData.crypto_ltc_address || "", "ltc")}
                      disabled={!formData.crypto_ltc_address}
                    >
                      {copiedField === "ltc" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>XRP (Ripple) Address</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.crypto_xrp_address}
                      onChange={(e) => updateField("crypto_xrp_address", e.target.value)}
                      placeholder="r..."
                      className="font-mono text-sm"
                      data-testid="input-crypto-xrp"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(formData.crypto_xrp_address || "", "xrp")}
                      disabled={!formData.crypto_xrp_address}
                    >
                      {copiedField === "xrp" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Solana (SOL) Address</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.crypto_sol_address}
                      onChange={(e) => updateField("crypto_sol_address", e.target.value)}
                      placeholder="..."
                      className="font-mono text-sm"
                      data-testid="input-crypto-sol"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(formData.crypto_sol_address || "", "sol")}
                      disabled={!formData.crypto_sol_address}
                    >
                      {copiedField === "sol" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
                <CardContent className="flex items-start gap-3 pt-6">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Security Notice</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      These addresses will be displayed to users for deposits. Ensure they are correct before saving.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  Bank Deposit Details
                </CardTitle>
                <CardDescription>
                  Bank account for receiving deposits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => updateField("bank_name", e.target.value)}
                    placeholder="e.g., Chase Bank"
                    data-testid="input-bank-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={formData.bank_account_name}
                    onChange={(e) => updateField("bank_account_name", e.target.value)}
                    placeholder="e.g., Reflux Capital LLC"
                    data-testid="input-bank-account-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={formData.bank_account_number}
                      onChange={(e) => updateField("bank_account_number", e.target.value)}
                      placeholder="8827364519"
                      data-testid="input-bank-account-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Routing Number (ACH)</Label>
                    <Input
                      value={formData.bank_routing_number}
                      onChange={(e) => updateField("bank_routing_number", e.target.value)}
                      placeholder="021000021"
                      data-testid="input-bank-routing-number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SWIFT/BIC Code</Label>
                    <Input
                      value={formData.bank_swift_code}
                      onChange={(e) => updateField("bank_swift_code", e.target.value)}
                      placeholder="CHASUS33"
                      data-testid="input-bank-swift"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN (Optional)</Label>
                    <Input
                      value={formData.bank_iban}
                      onChange={(e) => updateField("bank_iban", e.target.value)}
                      placeholder="US..."
                      data-testid="input-bank-iban"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bank Address</Label>
                  <Input
                    value={formData.bank_address}
                    onChange={(e) => updateField("bank_address", e.target.value)}
                    placeholder="270 Park Avenue, New York, NY 10017"
                    data-testid="input-bank-address"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deposit Instructions</Label>
                  <Textarea
                    value={formData.bank_instructions}
                    onChange={(e) => updateField("bank_instructions", e.target.value)}
                    placeholder="Instructions for users making bank transfers..."
                    className="min-h-[80px]"
                    data-testid="input-bank-instructions"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5 text-green-500" />
                  Wire Transfer Details
                </CardTitle>
                <CardDescription>
                  Bank account for outgoing wire transfers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.wire_bank_name}
                    onChange={(e) => updateField("wire_bank_name", e.target.value)}
                    placeholder="e.g., Chase Bank"
                    data-testid="input-wire-bank-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={formData.wire_account_name}
                    onChange={(e) => updateField("wire_account_name", e.target.value)}
                    placeholder="e.g., Reflux Capital LLC"
                    data-testid="input-wire-account-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={formData.wire_account_number}
                      onChange={(e) => updateField("wire_account_number", e.target.value)}
                      placeholder="8827364519"
                      data-testid="input-wire-account-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Routing Number</Label>
                    <Input
                      value={formData.wire_routing_number}
                      onChange={(e) => updateField("wire_routing_number", e.target.value)}
                      placeholder="021000021"
                      data-testid="input-wire-routing-number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SWIFT/BIC Code</Label>
                    <Input
                      value={formData.wire_swift_code}
                      onChange={(e) => updateField("wire_swift_code", e.target.value)}
                      placeholder="CHASUS33"
                      data-testid="input-wire-swift"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN (Optional)</Label>
                    <Input
                      value={formData.wire_iban}
                      onChange={(e) => updateField("wire_iban", e.target.value)}
                      placeholder="US..."
                      data-testid="input-wire-iban"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bank Address</Label>
                  <Input
                    value={formData.wire_address}
                    onChange={(e) => updateField("wire_address", e.target.value)}
                    placeholder="270 Park Avenue, New York, NY 10017"
                    data-testid="input-wire-address"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Wire Instructions</Label>
                  <Textarea
                    value={formData.wire_instructions}
                    onChange={(e) => updateField("wire_instructions", e.target.value)}
                    placeholder="Instructions for wire transfers..."
                    className="min-h-[80px]"
                    data-testid="input-wire-instructions"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="merchant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Merchant Pay — Bank Details
              </CardTitle>
              <CardDescription>
                Bank account users will send money to when using Merchant Pay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={formData.merchant_bank_name}
                  onChange={(e) => updateField("merchant_bank_name", e.target.value)}
                  placeholder="e.g., Chase Bank"
                  data-testid="input-merchant-bank-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  value={formData.merchant_account_name}
                  onChange={(e) => updateField("merchant_account_name", e.target.value)}
                  placeholder="e.g., Reflux Capital LLC"
                  data-testid="input-merchant-account-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={formData.merchant_account_number}
                    onChange={(e) => updateField("merchant_account_number", e.target.value)}
                    placeholder="8827364519"
                    data-testid="input-merchant-account-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Routing Number (ACH)</Label>
                  <Input
                    value={formData.merchant_routing_number}
                    onChange={(e) => updateField("merchant_routing_number", e.target.value)}
                    placeholder="021000021"
                    data-testid="input-merchant-routing-number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SWIFT/BIC Code</Label>
                  <Input
                    value={formData.merchant_swift_code}
                    onChange={(e) => updateField("merchant_swift_code", e.target.value)}
                    placeholder="CHASUS33"
                    data-testid="input-merchant-swift"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBAN (Optional)</Label>
                  <Input
                    value={formData.merchant_iban}
                    onChange={(e) => updateField("merchant_iban", e.target.value)}
                    placeholder="US..."
                    data-testid="input-merchant-iban"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bank Address</Label>
                <Input
                  value={formData.merchant_bank_address}
                  onChange={(e) => updateField("merchant_bank_address", e.target.value)}
                  placeholder="270 Park Avenue, New York, NY 10017"
                  data-testid="input-merchant-bank-address"
                />
              </div>

              <div className="space-y-2">
                <Label>Deposit Instructions</Label>
                <Textarea
                  value={formData.merchant_instructions}
                  onChange={(e) => updateField("merchant_instructions", e.target.value)}
                  placeholder="Instructions shown to users after being paired with a merchant..."
                  className="min-h-[80px]"
                  data-testid="input-merchant-instructions"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Merchant Fee (%)</Label>
                <div className="relative max-w-[180px]">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.merchant_fee_percent}
                    onChange={(e) => updateField("merchant_fee_percent", e.target.value)}
                    placeholder="0"
                    data-testid="input-merchant-fee-percent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fee applied to each Merchant Pay deposit. Set to 0 for no fee.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Currency Settings
              </CardTitle>
              <CardDescription>
                Configure supported currencies and default currency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Input
                    value={formData.default_currency}
                    onChange={(e) => updateField("default_currency", e.target.value)}
                    placeholder="USD"
                    data-testid="input-default-currency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Primary currency for displaying balances and transactions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Supported Currencies</Label>
                  <Input
                    value={formData.supported_currencies}
                    onChange={(e) => updateField("supported_currencies", e.target.value)}
                    placeholder="USD,EUR,GBP,CAD,AUD"
                    data-testid="input-supported-currencies"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of currency codes
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Common Currency Codes</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { code: "USD", name: "US Dollar", symbol: "$" },
                    { code: "EUR", name: "Euro", symbol: "€" },
                    { code: "GBP", name: "British Pound", symbol: "£" },
                    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
                    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
                    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
                    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
                    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
                  ].map((currency) => (
                    <div 
                      key={currency.code}
                      className="p-3 rounded-lg border bg-muted/30 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        const current = formData.supported_currencies || "";
                        if (!current.includes(currency.code)) {
                          updateField("supported_currencies", current ? `${current},${currency.code}` : currency.code);
                        }
                      }}
                    >
                      <p className="font-bold text-lg">{currency.symbol}</p>
                      <p className="font-medium text-sm">{currency.code}</p>
                      <p className="text-xs text-muted-foreground">{currency.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
