import { useState, useEffect } from "react";
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
import { SiBitcoin, SiEthereum, SiTether, SiBinance, SiSolana, SiRipple, SiCardano, SiDogecoin, SiPolygon, SiLitecoin } from "react-icons/si";

export default function Deposit() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [cryptoStep, setCryptoStep] = useState(1);
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(900);

  const [bankAmount, setBankAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  const [cardAmount, setCardAmount] = useState("");
  const [stripeTransactionId, setStripeTransactionId] = useState("");

  const [couponCode, setCouponCode] = useState("");

  const cryptoCoins = [
    { id: "BTC", name: "Bitcoin", icon: SiBitcoin, color: "text-orange-500", address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", priceUsd: 97842.50 },
    { id: "ETH", name: "Ethereum", icon: SiEthereum, color: "text-blue-500", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", priceUsd: 3456.78 },
    { id: "USDT", name: "Tether", icon: SiTether, color: "text-green-500", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", priceUsd: 1.00 },
    { id: "BNB", name: "Binance Coin", icon: SiBinance, color: "text-yellow-500", address: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2", priceUsd: 623.45 },
    { id: "SOL", name: "Solana", icon: SiSolana, color: "text-purple-500", address: "SoLEao8wTzSfqhuou8rcYsVoLjthVmiXuEjzdNPMnCz", priceUsd: 234.67 },
    { id: "XRP", name: "Ripple", icon: SiRipple, color: "text-blue-400", address: "rN7n7otQDd6FczFgLdzmFgFgWv4NJpRkBP", priceUsd: 1.42 },
    { id: "ADA", name: "Cardano", icon: SiCardano, color: "text-cyan-500", address: "addr1qxy3v9ackjr98vxl7k8sfykj3dcxl8f8e6vnr8xf", priceUsd: 1.05 },
    { id: "DOGE", name: "Dogecoin", icon: SiDogecoin, color: "text-yellow-600", address: "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L", priceUsd: 0.38 },
    { id: "MATIC", name: "Polygon", icon: SiPolygon, color: "text-purple-600", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", priceUsd: 0.52 },
    { id: "LTC", name: "Litecoin", icon: SiLitecoin, color: "text-gray-500", address: "LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL", priceUsd: 102.34 },
  ];

  useEffect(() => {
    if (cryptoStep === 3 && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cryptoStep, timeRemaining]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const depositMethods = [
    {
      id: "crypto",
      name: "Crypto Deposit",
      icon: "fab fa-bitcoin",
      iconBg: "bg-orange-500",
      description: "Deposit using your cryptocurrency wallet",
    },
    {
      id: "bank",
      name: "Bank Transfer",
      icon: "fas fa-university",
      iconBg: "bg-blue-500",
      description: "Direct transfer from your bank account",
    },
    {
      id: "card",
      name: "Card Payment",
      icon: "fas fa-credit-card",
      iconBg: "bg-green-500",
      description: "Pay with your credit or debit card",
    },
    {
      id: "coupon",
      name: "Deposit Coupon",
      icon: "fas fa-gift",
      iconBg: "bg-purple-500",
      description: "Redeem a promotional deposit coupon",
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
          {!selectedMethod && (
            <div className="flex justify-end mb-4">
              <Button variant="outline" onClick={() => setLocation("/wallet")} data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Wallet
              </Button>
            </div>
          )}

          {!selectedMethod ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              {depositMethods.map((method) => (
                <Card
                  key={method.id}
                  className="p-2 md:p-4 hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                  onClick={() => setSelectedMethod(method.id)}
                  data-testid={`card-method-${method.id}`}
                >
                  <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
                    <div className={`w-8 h-8 md:w-12 md:h-12 ${method.iconBg} rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <i className={`${method.icon} text-white text-sm md:text-xl`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-lg font-semibold truncate">{method.name}</h3>
                      <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">{method.description}</p>
                    </div>
                    <i className="fas fa-chevron-right text-muted-foreground text-xs md:text-sm flex-shrink-0"></i>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedMethod(null);
                  setCryptoStep(1);
                  setSelectedCrypto(null);
                  setCryptoAmount("");
                }}
                className="mb-4"
                data-testid="button-back-to-methods"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Methods
              </Button>

              {selectedMethod === "crypto" && (() => {
                const selectedCoin = cryptoCoins.find(c => c.id === selectedCrypto);
                const CoinIcon = selectedCoin?.icon;
                
                return (
                <Card className="p-6">
                  {cryptoStep === 1 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                          <i className="fab fa-bitcoin text-white text-xl"></i>
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Select Cryptocurrency</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Choose which crypto you want to deposit</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {cryptoCoins.map((coin) => (
                          <Card
                            key={coin.id}
                            className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                              selectedCrypto === coin.id ? "border-2 border-primary" : ""
                            }`}
                            onClick={() => {
                              setSelectedCrypto(coin.id);
                              setCryptoAddress(coin.address);
                              setCryptoStep(2);
                            }}
                            data-testid={`card-crypto-${coin.id}`}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <coin.icon className={`${coin.color} text-4xl`} />
                              <span className="font-semibold text-sm text-center">{coin.name}</span>
                              <span className="text-xs text-muted-foreground">{coin.id}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}

                  {cryptoStep === 2 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCryptoStep(1)}
                          data-testid="button-back-to-coins"
                        >
                          <i className="fas fa-arrow-left"></i>
                        </Button>
                        <div className={`w-12 h-12 ${CoinIcon ? 'bg-white' : 'bg-orange-500'} rounded-lg flex items-center justify-center`}>
                          {CoinIcon ? (
                            <CoinIcon className={`${selectedCoin?.color} text-2xl`} />
                          ) : (
                            <i className="fab fa-bitcoin text-white text-xl"></i>
                          )}
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Enter Amount</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">How much USD would you like to deposit?</p>
                        </div>
                      </div>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!cryptoAmount) {
                          toast({
                            title: "Error",
                            description: "Please enter an amount",
                            variant: "destructive",
                          });
                          return;
                        }
                        setTimeRemaining(900);
                        setCryptoStep(3);
                      }} className="space-y-4">
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
                          {cryptoAmount && selectedCoin && (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <span className="text-xs md:text-sm text-muted-foreground">You will send:</span>
                                <div className="flex items-center space-x-2">
                                  {CoinIcon && <CoinIcon className={`${selectedCoin.color} text-base md:text-lg`} />}
                                  <span className="text-sm md:text-lg font-bold break-all" data-testid="text-crypto-equivalent">
                                    {(parseFloat(cryptoAmount) / selectedCoin.priceUsd).toFixed(8)} {selectedCoin.id}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1 text-[10px] md:text-xs text-muted-foreground text-left md:text-right">
                                @ ${selectedCoin.priceUsd.toLocaleString()} per {selectedCoin.id}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          data-testid="button-continue-to-payment"
                        >
                          Continue to Payment
                        </Button>
                      </form>
                    </>
                  )}

                  {cryptoStep === 3 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCryptoStep(2)}
                          data-testid="button-back-to-amount"
                        >
                          <i className="fas fa-arrow-left"></i>
                        </Button>
                        <div className={`w-12 h-12 ${CoinIcon ? 'bg-white' : 'bg-orange-500'} rounded-lg flex items-center justify-center`}>
                          {CoinIcon ? (
                            <CoinIcon className={`${selectedCoin?.color} text-2xl`} />
                          ) : (
                            <i className="fab fa-bitcoin text-white text-xl"></i>
                          )}
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Send Payment</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Transfer ${cryptoAmount} worth of {selectedCrypto}</p>
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <i className="fas fa-clock text-yellow-500"></i>
                            <span className="text-sm font-medium">Transaction Time Remaining:</span>
                          </div>
                          <span className="text-lg font-bold text-yellow-500" data-testid="text-timer">
                            {formatTime(timeRemaining)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-center">
                          <div className="bg-white p-4 rounded-lg">
                            <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                              <i className="fas fa-qrcode text-gray-400 text-6xl"></i>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Deposit Address</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              value={cryptoAddress}
                              readOnly
                              className="font-mono text-sm"
                              data-testid="input-crypto-address-display"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(cryptoAddress);
                                toast({
                                  title: "Copied!",
                                  description: "Address copied to clipboard",
                                });
                              }}
                              data-testid="button-copy-address"
                            >
                              <i className="fas fa-copy"></i>
                            </Button>
                          </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <p className="text-sm text-blue-400">
                            <i className="fas fa-info-circle mr-2"></i>
                            Send exactly ${cryptoAmount} USD worth of {selectedCrypto} to the address above. 
                            Your deposit will be credited after admin approval.
                          </p>
                        </div>

                        <Button
                          onClick={() => {
                            cryptoDepositMutation.mutate({ 
                              amount: cryptoAmount, 
                              cryptoAddress: `${selectedCrypto}:${cryptoAddress}` 
                            });
                          }}
                          className="w-full"
                          size="lg"
                          disabled={cryptoDepositMutation.isPending}
                          data-testid="button-submit-crypto"
                        >
                          {cryptoDepositMutation.isPending ? "Processing..." : "I've Sent the Payment"}
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
                );
              })()}

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
