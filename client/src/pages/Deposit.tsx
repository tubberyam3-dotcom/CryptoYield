import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Deposit() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");

  const [bankAmount, setBankAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  const [cardAmount, setCardAmount] = useState("");
  const [stripeTransactionId, setStripeTransactionId] = useState("");

  const [couponCode, setCouponCode] = useState("");

  const depositMethods = [
    {
      id: "crypto",
      name: "Crypto Deposit",
      icon: "fab fa-bitcoin",
      iconBg: "bg-orange-500",
      description: "Deposit using your cryptocurrency wallet",
      features: ["Instant processing", "Low fees", "Secure blockchain"],
    },
    {
      id: "bank",
      name: "Bank Transfer",
      icon: "fas fa-university",
      iconBg: "bg-blue-500",
      description: "Direct transfer from your bank account",
      features: ["Secure transfer", "No fees", "2-3 business days"],
    },
    {
      id: "card",
      name: "Card Payment",
      icon: "fas fa-credit-card",
      iconBg: "bg-green-500",
      description: "Pay with your credit or debit card",
      features: ["Instant deposit", "All major cards", "Secure payment"],
    },
    {
      id: "coupon",
      name: "Deposit Coupon",
      icon: "fas fa-gift",
      iconBg: "bg-purple-500",
      description: "Redeem a promotional deposit coupon",
      features: ["Instant credit", "No fees", "Special offers"],
    },
  ];

  const cryptoDepositMutation = useMutation({
    mutationFn: async (data: { amount: string; cryptoAddress: string }) => {
      const res = await apiRequest("POST", "/api/deposits/crypto", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Submitted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      setLocation("/wallet");
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
        title: "Deposit Submitted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      setLocation("/wallet");
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
        title: "Deposit Submitted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      setLocation("/wallet");
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
      setLocation("/wallet");
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
    <div className="min-h-screen bg-background text-foreground" data-testid="deposit-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Deposit Funds" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Choose Deposit Method</h1>
              <p className="text-muted-foreground">Select how you'd like to add funds to your wallet</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/wallet")} data-testid="button-back">
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Wallet
            </Button>
          </div>

          {!selectedMethod ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depositMethods.map((method) => (
                <Card
                  key={method.id}
                  className="p-4 hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                  onClick={() => setSelectedMethod(method.id)}
                  data-testid={`card-method-${method.id}`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-12 h-12 ${method.iconBg} rounded-lg flex items-center justify-center`}>
                      <i className={`${method.icon} text-white text-xl`}></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{method.name}</h3>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                    <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
                  </div>
                  <div className="space-y-1.5">
                    {method.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-xs">
                        <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <Button
                variant="ghost"
                onClick={() => setSelectedMethod(null)}
                className="mb-4"
                data-testid="button-back-to-methods"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Methods
              </Button>

              {selectedMethod === "crypto" && (
                <Card className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <i className="fab fa-bitcoin text-white text-xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Crypto Deposit</h2>
                      <p className="text-muted-foreground">Deposit funds using cryptocurrency</p>
                    </div>
                  </div>
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
                      size="lg"
                      disabled={cryptoDepositMutation.isPending}
                      data-testid="button-submit-crypto"
                    >
                      {cryptoDepositMutation.isPending ? "Processing..." : "Submit Deposit"}
                    </Button>
                  </form>
                </Card>
              )}

              {selectedMethod === "bank" && (
                <Card className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-university text-white text-xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Bank Transfer</h2>
                      <p className="text-muted-foreground">Deposit via bank account transfer</p>
                    </div>
                  </div>
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
                      size="lg"
                      disabled={bankDepositMutation.isPending}
                      data-testid="button-submit-bank"
                    >
                      {bankDepositMutation.isPending ? "Processing..." : "Submit Deposit"}
                    </Button>
                  </form>
                </Card>
              )}

              {selectedMethod === "card" && (
                <Card className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-credit-card text-white text-xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Card Payment</h2>
                      <p className="text-muted-foreground">Pay with credit or debit card</p>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-400">
                      <i className="fas fa-info-circle mr-2"></i>
                      Card payments require Stripe integration. For demo purposes, you can use a simulated transaction ID.
                    </p>
                  </div>
                  <form onSubmit={handleCardDeposit} className="space-y-4">
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
                      size="lg"
                      disabled={cardDepositMutation.isPending}
                      data-testid="button-submit-card"
                    >
                      {cardDepositMutation.isPending ? "Processing..." : "Submit Payment"}
                    </Button>
                  </form>
                </Card>
              )}

              {selectedMethod === "coupon" && (
                <Card className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-gift text-white text-xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Deposit Coupon</h2>
                      <p className="text-muted-foreground">Redeem promotional coupon</p>
                    </div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-400">
                      <i className="fas fa-gift mr-2"></i>
                      Enter a deposit coupon code to instantly add funds to your wallet
                    </p>
                  </div>
                  <form onSubmit={handleCouponDeposit} className="space-y-4">
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
                      size="lg"
                      disabled={couponDepositMutation.isPending}
                      data-testid="button-submit-coupon"
                    >
                      {couponDepositMutation.isPending ? "Processing..." : "Redeem Coupon"}
                    </Button>
                  </form>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
