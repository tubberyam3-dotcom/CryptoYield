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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiBitcoin, SiEthereum, SiTether, SiBinance, SiSolana, SiRipple, SiCardano, SiDogecoin, SiPolygon, SiLitecoin } from "react-icons/si";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Building2, CreditCard, Globe, Users } from "lucide-react";

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

  // Bank transfer multi-step flow
  const [bankStep, setBankStep] = useState(1); // 1=amount, 2=loading, 3=details
  const [bankAmount, setBankAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  // Card payment multi-step flow
  const [cardStep, setCardStep] = useState(1); // 1=amount, 2=card form, 3=processing, 4=unavailable message
  const [cardAmount, setCardAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [stripeTransactionId, setStripeTransactionId] = useState("");

  // Merchant Pay multi-step flow
  const [merchantStep, setMerchantStep] = useState(1); // 1=amount, 2=pairing animation, 3=bank details, 4=countdown
  const [merchantAmount, setMerchantAmount] = useState("");
  const [merchantDepositCreatedAt, setMerchantDepositCreatedAt] = useState<Date | null>(null);
  const [, setMerchantCountdownTick] = useState(0);

  const [couponCode, setCouponCode] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch admin-configured crypto wallet addresses
  const { data: cryptoWallets } = useQuery<{
    BTC: string;
    ETH: string;
    USDT: string;
    USDT_network: string;
    LTC: string;
    XRP: string;
    SOL: string;
  }>({
    queryKey: ['/api/settings/crypto-wallets'],
  });

  // Fetch bank transfer settings
  const { data: bankSettings } = useQuery<{
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

  // Fetch which deposit methods are enabled by admin
  const { data: enabledMethods } = useQuery<{
    crypto: boolean; bank: boolean; card: boolean; merchant: boolean; coupon: boolean; merchantNoMatch: boolean;
  }>({
    queryKey: ['/api/settings/deposit-methods'],
  });

  // Fetch merchant pay settings
  const { data: merchantSettings } = useQuery<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode: string;
    iban: string;
    bankAddress: string;
    instructions: string;
    feePercent: string;
  }>({
    queryKey: ['/api/settings/merchant-pay'],
  });

  // Check for existing pending merchant pay deposit
  const { data: userDeposits } = useQuery<Array<{ depositMethod: string; status: string; createdAt: string }>>({
    queryKey: ['/api/deposits'],
  });
  const pendingMerchantDeposit = userDeposits?.find(
    (d) => d.depositMethod === 'merchant_pay' && d.status === 'pending'
  );
  const hasPendingMerchantPay = !!pendingMerchantDeposit;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
  };

  const cryptoCoins = [
    { id: "BTC", name: "Bitcoin", icon: SiBitcoin, color: "text-orange-500", address: cryptoWallets?.BTC || '', network: "Bitcoin Network", priceUsd: 97842.50 },
    { id: "ETH", name: "Ethereum", icon: SiEthereum, color: "text-blue-500", address: cryptoWallets?.ETH || '', network: "ERC-20", priceUsd: 3456.78 },
    { id: "USDT", name: "Tether", icon: SiTether, color: "text-green-500", address: cryptoWallets?.USDT || '', network: cryptoWallets?.USDT_network || 'ERC-20', priceUsd: 1.00 },
    { id: "BNB", name: "Binance Coin", icon: SiBinance, color: "text-yellow-500", address: '', network: "BEP-20", priceUsd: 623.45 },
    { id: "SOL", name: "Solana", icon: SiSolana, color: "text-purple-500", address: cryptoWallets?.SOL || '', network: "Solana Network", priceUsd: 234.67 },
    { id: "XRP", name: "Ripple", icon: SiRipple, color: "text-blue-400", address: cryptoWallets?.XRP || '', network: "XRP Ledger", priceUsd: 1.42 },
    { id: "ADA", name: "Cardano", icon: SiCardano, color: "text-cyan-500", address: '', network: "Cardano Network", priceUsd: 1.05 },
    { id: "DOGE", name: "Dogecoin", icon: SiDogecoin, color: "text-yellow-600", address: '', network: "Dogecoin Network", priceUsd: 0.38 },
    { id: "MATIC", name: "Polygon", icon: SiPolygon, color: "text-purple-600", address: '', network: "Polygon Network", priceUsd: 0.52 },
    { id: "LTC", name: "Litecoin", icon: SiLitecoin, color: "text-gray-500", address: cryptoWallets?.LTC || '', network: "Litecoin Network", priceUsd: 102.34 },
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

  // Merchant Pay 2-day countdown ticker
  useEffect(() => {
    const active = merchantStep === 4 || (merchantStep === 1 && hasPendingMerchantPay);
    if (!active) return;
    const timer = setInterval(() => setMerchantCountdownTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [merchantStep, hasPendingMerchantPay]);

  const getMerchantTimeLeft = (from: Date | string | null) => {
    if (!from) return { days: 2, hours: 0, minutes: 0, seconds: 0 };
    const deadline = new Date(from).getTime() + 2 * 24 * 60 * 60 * 1000;
    const total = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  };

  const allDepositMethods = [
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
    {
      id: "merchant",
      name: "Merchant Pay",
      icon: "fas fa-handshake",
      iconBg: "bg-emerald-500",
      description: "Pair with a merchant and transfer directly",
    },
  ];

  const depositMethods = enabledMethods
    ? allDepositMethods.filter((m) => enabledMethods[m.id as keyof typeof enabledMethods] !== false)
    : allDepositMethods;

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

  const merchantPayDepositMutation = useMutation({
    mutationFn: async (data: { amount: string }) => {
      const res = await apiRequest("POST", "/api/deposits/merchant-pay", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (error: Error) => {
      setMerchantStep(1);
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
                  setBankStep(1);
                  setBankAmount("");
                  setCardStep(1);
                  setCardAmount("");
                  setCardNumber("");
                  setCardExpiry("");
                  setCardCvv("");
                  setCardName("");
                  setMerchantStep(1);
                  setMerchantAmount("");
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
                        {cryptoCoins.filter(c => c.address).map((coin) => (
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
                              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{coin.network}</span>
                            </div>
                          </Card>
                        ))}
                        {cryptoCoins.filter(c => c.address).length === 0 && (
                          <div className="col-span-2 md:col-span-3 text-center py-8 text-muted-foreground">
                            <p className="text-sm">No crypto wallets have been configured yet. Please contact support.</p>
                          </div>
                        )}
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
                            type="text"
                            inputMode="decimal"
                            placeholder="Enter amount"
                            value={cryptoAmount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              const parts = value.split('.');
                              if (parts.length > 2) return;
                              const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                              const formatted = parts.length === 2 ? `${integerPart}.${parts[1].slice(0, 2)}` : integerPart;
                              setCryptoAmount(formatted);
                            }}
                            className="font-['Archivo'] text-lg"
                            data-testid="input-crypto-amount"
                          />
                          {cryptoAmount && selectedCoin && (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <span className="text-xs md:text-sm text-muted-foreground">You will send:</span>
                                <div className="flex items-center space-x-2">
                                  {CoinIcon && <CoinIcon className={`${selectedCoin.color} text-base md:text-lg`} />}
                                  <span className="text-sm md:text-lg font-bold break-all" data-testid="text-crypto-equivalent">
                                    {(parseFloat(cryptoAmount.replace(/,/g, '')) / selectedCoin.priceUsd).toFixed(8)} {selectedCoin.id}
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
                          <p className="text-xs md:text-sm text-muted-foreground">{selectedCoin?.name} deposit instructions</p>
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <i className="fas fa-clock text-yellow-500"></i>
                            <span className="text-sm font-medium">Time Remaining:</span>
                          </div>
                          <span className="text-lg font-bold text-yellow-500" data-testid="text-timer">
                            {formatTime(timeRemaining)}
                          </span>
                        </div>
                      </div>

                      {/* Bold send-amount banner */}
                      <div className="bg-primary/10 border-2 border-primary rounded-xl p-5 mb-4 text-center">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Exact amount to send</p>
                        <div className="flex items-center justify-center gap-3">
                          {CoinIcon && <CoinIcon className={`${selectedCoin?.color} text-3xl`} />}
                          <span className="text-3xl md:text-4xl font-extrabold tracking-tight" data-testid="text-send-amount">
                            {selectedCoin && (parseFloat(cryptoAmount.replace(/,/g, '')) / selectedCoin.priceUsd).toFixed(8)}
                          </span>
                          <span className="text-2xl font-bold text-muted-foreground">{selectedCrypto}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">≈ ${parseFloat(cryptoAmount.replace(/,/g, '')).toLocaleString()} USD</p>
                        {selectedCoin && (
                          <div className="mt-2 inline-flex items-center gap-1.5 bg-background border border-border rounded-full px-3 py-1">
                            <i className="fas fa-network-wired text-xs text-muted-foreground"></i>
                            <span className="text-xs font-semibold">{selectedCoin.network}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="bg-white p-4 rounded-lg">
                            <QRCodeSVG 
                              value={cryptoAddress} 
                              size={176}
                              level="H"
                              includeMargin={false}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold">
                            Deposit Address
                            {selectedCoin && (
                              <span className="ml-2 text-xs font-normal bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                {selectedCoin.network}
                              </span>
                            )}
                          </Label>
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
                            Send exactly the amount shown above to the address. Only send on the <strong>{selectedCoin?.network}</strong> network. Your deposit will be credited after the transaction is confirmed on the blockchain.
                          </p>
                        </div>

                        <Button
                          onClick={() => {
                            cryptoDepositMutation.mutate({ 
                              amount: cryptoAmount.replace(/,/g, ''), 
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
                  {/* Step 1: Enter Amount */}
                  {bankStep === 1 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Building2 className="text-white h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold">Bank Transfer</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Enter the amount you want to deposit</p>
                        </div>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!bankAmount || parseFloat(bankAmount.replace(/,/g, '')) <= 0) {
                          toast({
                            title: "Error",
                            description: "Please enter a valid amount",
                            variant: "destructive",
                          });
                          return;
                        }
                        setBankStep(2);
                        setTimeout(() => {
                          setBankStep(3);
                        }, 3500);
                      }} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="bank-amount" className="text-base">Deposit Amount (USD)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-medium text-muted-foreground">$</span>
                            <Input
                              id="bank-amount"
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={bankAmount}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                const parts = value.split('.');
                                if (parts.length > 2) return;
                                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                const formatted = parts.length === 2 ? `${integerPart}.${parts[1].slice(0, 2)}` : integerPart;
                                setBankAmount(formatted);
                              }}
                              className="pl-8 text-2xl font-bold h-16 font-['Archivo']"
                              data-testid="input-bank-amount"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Minimum deposit: $10.00</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[100, 500, 1000, 5000].map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              variant="outline"
                              onClick={() => setBankAmount(amount.toLocaleString())}
                              className="text-sm"
                              data-testid={`button-quick-amount-${amount}`}
                            >
                              ${amount.toLocaleString()}
                            </Button>
                          ))}
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          data-testid="button-continue-bank"
                        >
                          Continue
                        </Button>
                      </form>
                    </>
                  )}

                  {/* Step 2: Loading Animation - Pairing with Merchant */}
                  {bankStep === 2 && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-6">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-blue-500/20 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <Building2 className="h-10 w-10 text-blue-500" />
                        </div>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold">Pairing Your Deposit</h3>
                        <p className="text-muted-foreground animate-pulse">
                          Finding an accredited merchant nearby...
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Secure connection established</span>
                      </div>

                      <div className="w-full max-w-xs bg-muted/50 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-[loading_3s_ease-in-out_forwards]" 
                          style={{
                            animation: 'loading 3s ease-in-out forwards',
                          }}
                        ></div>
                      </div>
                      
                      <style>{`
                        @keyframes loading {
                          0% { width: 0%; }
                          100% { width: 100%; }
                        }
                      `}</style>
                    </div>
                  )}

                  {/* Step 3: Bank Account Details */}
                  {bankStep === 3 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setBankStep(1)}
                          data-testid="button-back-to-amount"
                        >
                          <i className="fas fa-arrow-left"></i>
                        </Button>
                        <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                          <Check className="text-white h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Merchant Paired!</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Transfer ${parseFloat(bankAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to complete your deposit</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Deposit Amount</span>
                          <span className="text-2xl font-bold text-green-500">
                            ${parseFloat(bankAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <CreditCard className="h-5 w-5 text-blue-400" />
                          <h3 className="font-semibold text-lg">Transfer to This Account</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Name</p>
                              <p className="font-medium" data-testid="text-bank-name">{bankSettings?.bankName || 'Loading...'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(bankSettings?.bankName || '', 'Bank Name')}
                              data-testid="button-copy-bank-name"
                            >
                              {copiedField === 'Bank Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Name</p>
                              <p className="font-medium" data-testid="text-account-name">{bankSettings?.accountName || 'Loading...'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(bankSettings?.accountName || '', 'Account Name')}
                              data-testid="button-copy-account-name"
                            >
                              {copiedField === 'Account Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Number</p>
                              <p className="font-mono font-bold text-lg" data-testid="text-account-number">{bankSettings?.accountNumber || 'Loading...'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(bankSettings?.accountNumber || '', 'Account Number')}
                              data-testid="button-copy-account-number"
                            >
                              {copiedField === 'Account Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Routing Number (ACH)</p>
                              <p className="font-mono font-bold text-lg" data-testid="text-routing-number">{bankSettings?.routingNumber || 'Loading...'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(bankSettings?.routingNumber || '', 'Routing Number')}
                              data-testid="button-copy-routing-number"
                            >
                              {copiedField === 'Routing Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">SWIFT/BIC Code</p>
                                <p className="font-mono font-bold" data-testid="text-swift-code">{bankSettings?.swiftCode || 'Loading...'}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(bankSettings?.swiftCode || '', 'SWIFT Code')}
                              data-testid="button-copy-swift-code"
                            >
                              {copiedField === 'SWIFT Code' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>

                          <div className="py-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Address</p>
                            <p className="text-sm" data-testid="text-bank-address">{bankSettings?.bankAddress || 'Loading...'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                        <p className="text-sm text-amber-400">
                          <i className="fas fa-info-circle mr-2"></i>
                          {bankSettings?.instructions || 'Please include your account email as the payment reference. Deposits are typically processed within 1-2 business days.'}
                        </p>
                      </div>

                      <form onSubmit={handleBankDeposit} className="space-y-4">
                        <div className="border-t border-border pt-4">
                          <h3 className="font-semibold mb-4">Confirm Your Transfer Details</h3>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="account-holder">Your Name (as it appears on your bank account)</Label>
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
                          <Label htmlFor="account-number">Your Account Number</Label>
                          <Input
                            id="account-number"
                            type="text"
                            placeholder="Your account number"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            data-testid="input-account-number"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          disabled={bankDepositMutation.isPending}
                          data-testid="button-submit-bank"
                        >
                          {bankDepositMutation.isPending ? "Processing..." : "I've Completed the Transfer"}
                        </Button>
                      </form>
                    </>
                  )}
                </Card>
              )}

              {selectedMethod === "card" && (
                <Card className="p-6">
                  {/* Step 1: Enter Amount */}
                  {cardStep === 1 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                          <CreditCard className="text-white h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold">Card Payment</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Enter the amount you want to deposit</p>
                        </div>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!cardAmount || parseFloat(cardAmount.replace(/,/g, '')) <= 0) {
                          toast({
                            title: "Error",
                            description: "Please enter a valid amount",
                            variant: "destructive",
                          });
                          return;
                        }
                        setCardStep(2);
                      }} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="card-amount" className="text-base">Deposit Amount (USD)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-medium text-muted-foreground">$</span>
                            <Input
                              id="card-amount"
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={cardAmount}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                const parts = value.split('.');
                                if (parts.length > 2) return;
                                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                const formatted = parts.length === 2 ? `${integerPart}.${parts[1].slice(0, 2)}` : integerPart;
                                setCardAmount(formatted);
                              }}
                              className="pl-8 text-2xl font-bold h-16 font-['Archivo']"
                              data-testid="input-card-amount"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Minimum deposit: $10.00</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[100, 500, 1000, 5000].map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              variant="outline"
                              onClick={() => setCardAmount(amount.toLocaleString())}
                              className="text-sm"
                              data-testid={`button-card-quick-amount-${amount}`}
                            >
                              ${amount.toLocaleString()}
                            </Button>
                          ))}
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          data-testid="button-continue-card"
                        >
                          Continue
                        </Button>
                      </form>
                    </>
                  )}

                  {/* Step 2: Card Form */}
                  {cardStep === 2 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCardStep(1)}
                          data-testid="button-back-to-card-amount"
                        >
                          <i className="fas fa-arrow-left"></i>
                        </Button>
                        <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                          <CreditCard className="text-white h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Enter Card Details</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Deposit ${parseFloat(cardAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Deposit Amount</span>
                          <span className="text-2xl font-bold text-green-500">
                            ${parseFloat(cardAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Card Form */}
                      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 mb-6 text-white">
                        <div className="flex justify-between items-start mb-8">
                          <div className="w-12 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded"></div>
                          <div className="flex gap-1">
                            <div className="w-6 h-6 bg-red-500 rounded-full opacity-80"></div>
                            <div className="w-6 h-6 bg-orange-400 rounded-full opacity-80 -ml-3"></div>
                          </div>
                        </div>
                        <div className="font-mono text-xl tracking-widest mb-6">
                          {cardNumber ? cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim() : '**** **** **** ****'}
                        </div>
                        <div className="flex justify-between text-sm">
                          <div>
                            <p className="text-slate-400 text-xs uppercase">Card Holder</p>
                            <p className="font-medium">{cardName || 'YOUR NAME'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs uppercase">Expires</p>
                            <p className="font-medium">{cardExpiry || 'MM/YY'}</p>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
                          toast({
                            title: "Error",
                            description: "Please fill in all card details",
                            variant: "destructive",
                          });
                          return;
                        }
                        setCardStep(3);
                        setTimeout(() => {
                          setCardStep(4);
                        }, 5000);
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="card-name">Cardholder Name</Label>
                          <Input
                            id="card-name"
                            type="text"
                            placeholder="Name on card"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            className="uppercase"
                            data-testid="input-card-name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="card-number">Card Number</Label>
                          <Input
                            id="card-number"
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                              setCardNumber(value);
                            }}
                            maxLength={19}
                            data-testid="input-card-number"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="card-expiry">Expiry Date</Label>
                            <Input
                              id="card-expiry"
                              type="text"
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                if (value.length >= 2) {
                                  value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                }
                                setCardExpiry(value);
                              }}
                              maxLength={5}
                              data-testid="input-card-expiry"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="card-cvv">CVV</Label>
                            <Input
                              id="card-cvv"
                              type="password"
                              placeholder="***"
                              value={cardCvv}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setCardCvv(value);
                              }}
                              maxLength={4}
                              data-testid="input-card-cvv"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <i className="fas fa-lock"></i>
                          <span>Your payment information is encrypted and secure</span>
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          data-testid="button-proceed-to-pay"
                        >
                          Proceed to Pay ${parseFloat(cardAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Button>
                      </form>
                    </>
                  )}

                  {/* Step 3: Processing Animation */}
                  {cardStep === 3 && (
                    <div className="py-12 text-center space-y-6">
                      <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-green-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CreditCard className="h-10 w-10 text-green-500" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Processing Payment</h3>
                        <p className="text-muted-foreground">
                          Verifying your card details...
                        </p>
                      </div>

                      <div className="flex justify-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 max-w-sm mx-auto">
                        <p className="text-sm text-green-400">
                          <i className="fas fa-shield-alt mr-2"></i>
                          Your payment is being processed securely
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Unavailable Message */}
                  {cardStep === 4 && (
                    <div className="py-8 text-center space-y-6">
                      <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                        <i className="fas fa-map-marker-alt text-3xl text-amber-500"></i>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Card Deposit Not Available</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                          Card deposits are not currently available for your location. You will be updated once this service becomes available in your region.
                        </p>
                      </div>

                      <div className="pt-4 space-y-3">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setSelectedMethod("bank");
                            setBankStep(1);
                          }}
                          data-testid="button-try-bank-transfer"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Try Bank Transfer Instead
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setSelectedMethod(null);
                            setCardStep(1);
                            setCardAmount("");
                            setCardNumber("");
                            setCardExpiry("");
                            setCardCvv("");
                            setCardName("");
                          }}
                          data-testid="button-back-to-deposit-methods"
                        >
                          Back to Deposit Methods
                        </Button>
                      </div>
                    </div>
                  )}
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

              {selectedMethod === "merchant" && (
                <Card className="p-6">
                  {/* No merchant available message */}
                  {enabledMethods?.merchantNoMatch && (
                    <div className="flex flex-col items-center text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-amber-500" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold">No Merchants Available</h2>
                        <p className="text-muted-foreground max-w-sm">
                          Sorry, we could not match you with any merchant in your region at this time. Please try a different deposit method or check back later.
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedMethod(null)}
                        className="mt-4 text-sm text-primary underline underline-offset-2"
                      >
                        Choose another method
                      </button>
                    </div>
                  )}

                  {/* Step 1: Enter Amount */}
                  {!enabledMethods?.merchantNoMatch && merchantStep === 1 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <Users className="text-white h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold">Merchant Pay</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Enter the amount you want to deposit</p>
                        </div>
                      </div>

                      {hasPendingMerchantPay ? (
                        <div className="space-y-6">
                          {/* Countdown banner */}
                          {(() => {
                            const tl = getMerchantTimeLeft(pendingMerchantDeposit?.createdAt ?? null);
                            return (
                              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 text-center space-y-4">
                                <div className="flex items-center justify-center gap-2 text-amber-400">
                                  <i className="fas fa-clock text-lg"></i>
                                  <span className="font-semibold text-sm uppercase tracking-wide">Transfer Window</span>
                                </div>
                                <div className="flex justify-center gap-3">
                                  {[
                                    { v: tl.days, l: 'Days' },
                                    { v: tl.hours, l: 'Hrs' },
                                    { v: tl.minutes, l: 'Min' },
                                    { v: tl.seconds, l: 'Sec' },
                                  ].map(({ v, l }) => (
                                    <div key={l} className="flex flex-col items-center bg-background rounded-lg px-3 py-2 min-w-[52px] border border-border">
                                      <span className="text-2xl font-bold font-mono">{String(v).padStart(2, '0')}</span>
                                      <span className="text-xs text-muted-foreground">{l}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  You have a pending Merchant Pay deposit. Complete your bank transfer using the details below.
                                </p>
                              </div>
                            );
                          })()}
                          {/* Merchant bank details */}
                          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                              <Users className="h-5 w-5 text-emerald-400" />
                              <h3 className="font-semibold text-lg">Transfer to This Account</h3>
                            </div>
                            <div className="space-y-4">
                              {merchantSettings?.bankName && (
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Name</p>
                                    <p className="font-medium">{merchantSettings.bankName}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.bankName, 'Bank Name')}>
                                    {copiedField === 'Bank Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                              {merchantSettings?.accountName && (
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Name</p>
                                    <p className="font-medium">{merchantSettings.accountName}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.accountName, 'Account Name')}>
                                    {copiedField === 'Account Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                              {merchantSettings?.accountNumber && (
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Number</p>
                                    <p className="font-mono font-bold text-lg">{merchantSettings.accountNumber}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.accountNumber, 'Account Number')}>
                                    {copiedField === 'Account Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                              {merchantSettings?.routingNumber && (
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Routing Number (ACH)</p>
                                    <p className="font-mono font-bold text-lg">{merchantSettings.routingNumber}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.routingNumber, 'Routing Number')}>
                                    {copiedField === 'Routing Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                              {merchantSettings?.swiftCode && (
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wide">SWIFT/BIC Code</p>
                                      <p className="font-mono font-bold">{merchantSettings.swiftCode}</p>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.swiftCode, 'SWIFT Code')}>
                                    {copiedField === 'SWIFT Code' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                              {merchantSettings?.iban && (
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">IBAN</p>
                                    <p className="font-mono font-bold">{merchantSettings.iban}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.iban, 'IBAN')}>
                                    {copiedField === 'IBAN' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                              {merchantSettings?.bankAddress && (
                                <div className="py-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Address</p>
                                  <p className="text-sm">{merchantSettings.bankAddress}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {merchantSettings?.instructions && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                              <p className="text-sm text-amber-400">
                                <i className="fas fa-info-circle mr-2"></i>
                                {merchantSettings.instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                      <>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6">
                        <p className="text-sm text-emerald-400">
                          <i className="fas fa-handshake mr-2"></i>
                          You'll be paired with the next available merchant who will provide their bank details for a direct transfer.
                        </p>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!merchantAmount || parseFloat(merchantAmount.replace(/,/g, '')) <= 0) {
                          toast({
                            title: "Error",
                            description: "Please enter a valid amount",
                            variant: "destructive",
                          });
                          return;
                        }
                        setMerchantStep(2);
                        // Fire API call and 4-second animation in parallel.
                        // Step 3 (bank details + email) shows only when BOTH are done.
                        Promise.all([
                          merchantPayDepositMutation.mutateAsync({ amount: merchantAmount.replace(/,/g, '') }),
                          new Promise(resolve => setTimeout(resolve, 4000)),
                        ]).then(([result]) => {
                          const createdAt = result?.deposit?.createdAt
                            ? new Date(result.deposit.createdAt)
                            : new Date();
                          setMerchantDepositCreatedAt(createdAt);
                          setMerchantStep(3);
                        }).catch(() => {
                          // error toast + step reset handled inside mutation onError
                        });
                      }} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="merchant-amount" className="text-base">Deposit Amount (USD)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-medium text-muted-foreground">$</span>
                            <Input
                              id="merchant-amount"
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={merchantAmount}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                const parts = value.split('.');
                                if (parts.length > 2) return;
                                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                const formatted = parts.length === 2 ? `${integerPart}.${parts[1].slice(0, 2)}` : integerPart;
                                setMerchantAmount(formatted);
                              }}
                              className="pl-8 text-2xl font-bold h-16 font-['Archivo']"
                              data-testid="input-merchant-amount"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Minimum deposit: $10.00</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[100, 500, 1000, 5000].map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              variant="outline"
                              onClick={() => setMerchantAmount(amount.toLocaleString())}
                              className="text-sm"
                              data-testid={`button-merchant-quick-${amount}`}
                            >
                              ${amount.toLocaleString()}
                            </Button>
                          ))}
                        </div>

                        {/* Fee breakdown — only shown when amount is entered and fee > 0 */}
                        {merchantAmount && parseFloat(merchantAmount.replace(/,/g, '')) > 0 && parseFloat(merchantSettings?.feePercent || '0') > 0 && (() => {
                          const raw = parseFloat(merchantAmount.replace(/,/g, ''));
                          const feeRate = parseFloat(merchantSettings!.feePercent) / 100;
                          const feeAmt = raw * feeRate;
                          const total = raw + feeAmt;
                          return (
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border border-border">
                              <div className="flex justify-between text-muted-foreground">
                                <span>Deposit amount</span>
                                <span>${raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-amber-500">
                                <span>Merchant fee ({merchantSettings!.feePercent}%)</span>
                                <span>+${feeAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between font-bold border-t border-border pt-2">
                                <span>Total to transfer</span>
                                <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          );
                        })()}

                        <Button
                          type="submit"
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                          size="lg"
                          data-testid="button-continue-merchant"
                        >
                          Find a Merchant
                        </Button>
                      </form>
                      </>
                    )}
                    </>
                  )}

                  {/* Step 2: Pairing Animation */}
                  {!enabledMethods?.merchantNoMatch && merchantStep === 2 && (
                    <div className="py-14 flex flex-col items-center justify-center space-y-8">
                      {/* Animated rings */}
                      <div className="relative w-32 h-32">
                        <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full"></div>
                        <div className="absolute inset-2 border-4 border-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }}></div>
                        <div className="absolute inset-0 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" style={{ animationDuration: '1.2s' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                            <Users className="h-8 w-8 text-emerald-500" />
                          </div>
                        </div>
                      </div>

                      <div className="text-center space-y-3">
                        <h3 className="text-2xl font-bold">Pairing to Next Available Merchant</h3>
                        <p className="text-muted-foreground animate-pulse">
                          Searching for a verified merchant near you...
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span>Scanning available merchants</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          <span>Verifying merchant credentials</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.8s' }}></div>
                          <span>Establishing secure connection</span>
                        </div>
                      </div>

                      <div className="w-full max-w-xs">
                        <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ animation: 'merchantLoading 4s ease-in-out forwards' }}
                          ></div>
                        </div>
                      </div>

                      <style>{`
                        @keyframes merchantLoading {
                          0% { width: 0%; }
                          60% { width: 75%; }
                          90% { width: 92%; }
                          100% { width: 100%; }
                        }
                      `}</style>
                    </div>
                  )}

                  {/* Step 3: Merchant Bank Details */}
                  {!enabledMethods?.merchantNoMatch && merchantStep === 3 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMerchantStep(1)}
                          data-testid="button-merchant-back-to-amount"
                        >
                          <i className="fas fa-arrow-left"></i>
                        </Button>
                        <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <Check className="text-white h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Merchant Paired!</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Transfer ${parseFloat(merchantAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to complete your deposit
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Deposit Amount</span>
                          <span className="text-2xl font-bold text-emerald-500">
                            ${parseFloat(merchantAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="h-5 w-5 text-emerald-400" />
                          <h3 className="font-semibold text-lg">Transfer to This Account</h3>
                        </div>

                        <div className="space-y-4">
                          {merchantSettings?.bankName && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Name</p>
                                <p className="font-medium" data-testid="text-merchant-bank-name">{merchantSettings.bankName}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.bankName, 'Bank Name')}>
                                {copiedField === 'Bank Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}

                          {merchantSettings?.accountName && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Name</p>
                                <p className="font-medium" data-testid="text-merchant-account-name">{merchantSettings.accountName}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.accountName, 'Account Name')}>
                                {copiedField === 'Account Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}

                          {merchantSettings?.accountNumber && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Number</p>
                                <p className="font-mono font-bold text-lg" data-testid="text-merchant-account-number">{merchantSettings.accountNumber}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.accountNumber, 'Account Number')}>
                                {copiedField === 'Account Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}

                          {merchantSettings?.routingNumber && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Routing Number (ACH)</p>
                                <p className="font-mono font-bold text-lg" data-testid="text-merchant-routing-number">{merchantSettings.routingNumber}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.routingNumber, 'Routing Number')}>
                                {copiedField === 'Routing Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}

                          {merchantSettings?.swiftCode && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">SWIFT/BIC Code</p>
                                  <p className="font-mono font-bold" data-testid="text-merchant-swift">{merchantSettings.swiftCode}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.swiftCode, 'SWIFT Code')}>
                                {copiedField === 'SWIFT Code' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}

                          {merchantSettings?.iban && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">IBAN</p>
                                <p className="font-mono font-bold" data-testid="text-merchant-iban">{merchantSettings.iban}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.iban, 'IBAN')}>
                                {copiedField === 'IBAN' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}

                          {merchantSettings?.bankAddress && (
                            <div className="py-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Address</p>
                              <p className="text-sm" data-testid="text-merchant-bank-address">{merchantSettings.bankAddress}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                        <p className="text-sm text-amber-400">
                          <i className="fas fa-info-circle mr-2"></i>
                          {merchantSettings?.instructions || 'Please include your account email as the payment reference. Deposits are typically processed within 1-2 business days.'}
                        </p>
                      </div>

                      <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                        size="lg"
                        onClick={() => {
                          if (!merchantDepositCreatedAt) setMerchantDepositCreatedAt(new Date());
                          setMerchantStep(4);
                        }}
                        data-testid="button-confirm-merchant-pay"
                      >
                        Proceed with Transfer
                      </Button>
                    </>
                  )}

                  {/* Step 4: Countdown + bank details */}
                  {!enabledMethods?.merchantNoMatch && merchantStep === 4 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <i className="fas fa-university text-white text-lg"></i>
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Complete Your Transfer</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Send your payment within the window below</p>
                        </div>
                      </div>

                      {/* Countdown */}
                      {(() => {
                        const tl = getMerchantTimeLeft(merchantDepositCreatedAt);
                        return (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 text-center space-y-4 mb-6">
                            <div className="flex items-center justify-center gap-2 text-amber-400">
                              <i className="fas fa-clock text-lg"></i>
                              <span className="font-semibold text-sm uppercase tracking-wide">Transfer Window</span>
                            </div>
                            <div className="flex justify-center gap-3">
                              {[
                                { v: tl.days, l: 'Days' },
                                { v: tl.hours, l: 'Hrs' },
                                { v: tl.minutes, l: 'Min' },
                                { v: tl.seconds, l: 'Sec' },
                              ].map(({ v, l }) => (
                                <div key={l} className="flex flex-col items-center bg-background rounded-lg px-3 py-2 min-w-[52px] border border-border">
                                  <span className="text-2xl font-bold font-mono">{String(v).padStart(2, '0')}</span>
                                  <span className="text-xs text-muted-foreground">{l}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Transfer <span className="font-semibold text-foreground">${parseFloat(merchantAmount.replace(/,/g, '') || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> to the account below before the window closes.
                            </p>
                          </div>
                        );
                      })()}

                      {/* Bank details */}
                      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="h-5 w-5 text-emerald-400" />
                          <h3 className="font-semibold text-lg">Transfer to This Account</h3>
                        </div>
                        <div className="space-y-4">
                          {merchantSettings?.bankName && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Name</p>
                                <p className="font-medium">{merchantSettings.bankName}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.bankName, 'Bank Name')}>
                                {copiedField === 'Bank Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                          {merchantSettings?.accountName && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Name</p>
                                <p className="font-medium">{merchantSettings.accountName}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.accountName, 'Account Name')}>
                                {copiedField === 'Account Name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                          {merchantSettings?.accountNumber && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Number</p>
                                <p className="font-mono font-bold text-lg">{merchantSettings.accountNumber}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.accountNumber, 'Account Number')}>
                                {copiedField === 'Account Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                          {merchantSettings?.routingNumber && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Routing Number (ACH)</p>
                                <p className="font-mono font-bold text-lg">{merchantSettings.routingNumber}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.routingNumber, 'Routing Number')}>
                                {copiedField === 'Routing Number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                          {merchantSettings?.swiftCode && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">SWIFT/BIC Code</p>
                                  <p className="font-mono font-bold">{merchantSettings.swiftCode}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.swiftCode, 'SWIFT Code')}>
                                {copiedField === 'SWIFT Code' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                          {merchantSettings?.iban && (
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">IBAN</p>
                                <p className="font-mono font-bold">{merchantSettings.iban}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(merchantSettings.iban, 'IBAN')}>
                                {copiedField === 'IBAN' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                          {merchantSettings?.bankAddress && (
                            <div className="py-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Address</p>
                              <p className="text-sm">{merchantSettings.bankAddress}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {merchantSettings?.instructions && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                          <p className="text-sm text-amber-400">
                            <i className="fas fa-info-circle mr-2"></i>
                            {merchantSettings.instructions}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation("/wallet")}
                      >
                        View in Wallet
                      </Button>
                    </>
                  )}
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
