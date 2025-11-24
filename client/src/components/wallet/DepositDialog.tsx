import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositDialog({ open, onOpenChange }: DepositDialogProps) {
  const [activeTab, setActiveTab] = useState("crypto");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");

  const [bankAmount, setBankAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  const [cardAmount, setCardAmount] = useState("");
  const [stripeTransactionId, setStripeTransactionId] = useState("");

  const [couponCode, setCouponCode] = useState("");

  const cryptoDepositMutation = useMutation({
    mutationFn: async (data: { amount: string; cryptoAddress: string }) => {
      const res = await apiRequest("POST", "/api/deposits/crypto", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      setCryptoAmount("");
      setCryptoAddress("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bankDepositMutation = useMutation({
    mutationFn: async (data: {
      amount: string;
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    }) => {
      const res = await apiRequest("POST", "/api/deposits/bank-transfer", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      setBankAmount("");
      setAccountNumber("");
      setRoutingNumber("");
      setAccountHolderName("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cardDepositMutation = useMutation({
    mutationFn: async (data: { amount: string; stripeTransactionId: string }) => {
      const res = await apiRequest("POST", "/api/deposits/card-payment", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      setCardAmount("");
      setStripeTransactionId("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const couponDepositMutation = useMutation({
    mutationFn: async (data: { couponCode: string }) => {
      const res = await apiRequest("POST", "/api/deposits/coupon", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      setCouponCode("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCryptoDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoAmount || !cryptoAddress) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    cryptoDepositMutation.mutate({ amount: cryptoAmount, cryptoAddress });
  };

  const handleBankDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAmount || !accountNumber || !routingNumber || !accountHolderName) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    bankDepositMutation.mutate({
      amount: bankAmount,
      accountNumber,
      routingNumber,
      accountHolderName,
    });
  };

  const handleCardDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardAmount || !stripeTransactionId) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    cardDepositMutation.mutate({ amount: cardAmount, stripeTransactionId });
  };

  const handleCouponDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }
    couponDepositMutation.mutate({ couponCode });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Choose a deposit method to add funds to your wallet
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="crypto" data-testid="tab-crypto">Crypto</TabsTrigger>
            <TabsTrigger value="bank" data-testid="tab-bank">Bank</TabsTrigger>
            <TabsTrigger value="card" data-testid="tab-card">Card</TabsTrigger>
            <TabsTrigger value="coupon" data-testid="tab-coupon">Coupon</TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="space-y-4">
            <form onSubmit={handleCryptoDeposit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="crypto-amount">Amount (USD)</Label>
                <Input
                  id="crypto-amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  data-testid="input-crypto-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crypto-address">Crypto Wallet Address</Label>
                <Input
                  id="crypto-address"
                  type="text"
                  placeholder="Enter your wallet address"
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  data-testid="input-crypto-address"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={cryptoDepositMutation.isPending}
                data-testid="button-submit-crypto"
              >
                {cryptoDepositMutation.isPending ? "Processing..." : "Deposit with Crypto"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bank" className="space-y-4">
            <form onSubmit={handleBankDeposit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank-amount">Amount (USD)</Label>
                <Input
                  id="bank-amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value)}
                  data-testid="input-bank-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-holder">Account Holder Name</Label>
                <Input
                  id="account-holder"
                  type="text"
                  placeholder="Full name"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  data-testid="input-account-holder"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input
                  id="account-number"
                  type="text"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  data-testid="input-account-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routing-number">Routing Number</Label>
                <Input
                  id="routing-number"
                  type="text"
                  placeholder="Enter routing number"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  data-testid="input-routing-number"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={bankDepositMutation.isPending}
                data-testid="button-submit-bank"
              >
                {bankDepositMutation.isPending ? "Processing..." : "Deposit via Bank Transfer"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="card" className="space-y-4">
            <form onSubmit={handleCardDeposit} className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-400">
                  <i className="fas fa-info-circle mr-2"></i>
                  Card payments require Stripe integration. For demo purposes, you can use a simulated transaction ID.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-amount">Amount (USD)</Label>
                <Input
                  id="card-amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  data-testid="input-card-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-txn">Stripe Transaction ID</Label>
                <Input
                  id="stripe-txn"
                  type="text"
                  placeholder="tx_demo_123456789"
                  value={stripeTransactionId}
                  onChange={(e) => setStripeTransactionId(e.target.value)}
                  data-testid="input-stripe-txn"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={cardDepositMutation.isPending}
                data-testid="button-submit-card"
              >
                {cardDepositMutation.isPending ? "Processing..." : "Deposit with Card"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="coupon" className="space-y-4">
            <form onSubmit={handleCouponDeposit} className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-400">
                  <i className="fas fa-gift mr-2"></i>
                  Enter a deposit coupon code to add funds to your wallet
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Coupon Code</Label>
                <Input
                  id="coupon-code"
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  data-testid="input-coupon-code"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={couponDepositMutation.isPending}
                data-testid="button-submit-coupon"
              >
                {couponDepositMutation.isPending ? "Processing..." : "Redeem Deposit Coupon"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
