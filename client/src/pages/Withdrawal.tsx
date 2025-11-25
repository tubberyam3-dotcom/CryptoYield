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
import { useAuth } from "@/hooks/useAuth";
import { SiBitcoin, SiEthereum, SiTether, SiBinance, SiSolana, SiRipple, SiCardano, SiDogecoin, SiPolygon, SiLitecoin } from "react-icons/si";
import { Copy, Check, Building2, Store, Wallet, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Withdrawal() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Crypto withdrawal state
  const [cryptoStep, setCryptoStep] = useState(1);
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");

  // Wire transfer state
  const [wireStep, setWireStep] = useState(1);
  const [wireAmount, setWireAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // Merchant pay state
  const [merchantStep, setMerchantStep] = useState(1);
  const [merchantAmount, setMerchantAmount] = useState("");
  const [merchantPlatform, setMerchantPlatform] = useState("");
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantNote, setMerchantNote] = useState("");

  const cryptoCoins = [
    { id: "BTC", name: "Bitcoin", icon: SiBitcoin, color: "text-orange-500", networks: ["Bitcoin", "Lightning Network"] },
    { id: "ETH", name: "Ethereum", icon: SiEthereum, color: "text-blue-500", networks: ["ERC-20", "Arbitrum", "Optimism"] },
    { id: "USDT", name: "Tether", icon: SiTether, color: "text-green-500", networks: ["ERC-20", "TRC-20", "BEP-20"] },
    { id: "BNB", name: "Binance Coin", icon: SiBinance, color: "text-yellow-500", networks: ["BEP-20", "BEP-2"] },
    { id: "SOL", name: "Solana", icon: SiSolana, color: "text-purple-500", networks: ["Solana"] },
    { id: "XRP", name: "Ripple", icon: SiRipple, color: "text-blue-400", networks: ["XRP Ledger"] },
    { id: "ADA", name: "Cardano", icon: SiCardano, color: "text-cyan-500", networks: ["Cardano"] },
    { id: "DOGE", name: "Dogecoin", icon: SiDogecoin, color: "text-yellow-600", networks: ["Dogecoin"] },
    { id: "MATIC", name: "Polygon", icon: SiPolygon, color: "text-purple-600", networks: ["Polygon", "Ethereum"] },
    { id: "LTC", name: "Litecoin", icon: SiLitecoin, color: "text-gray-500", networks: ["Litecoin"] },
  ];

  const merchantPlatforms = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", color: "text-blue-600" },
    { id: "venmo", name: "Venmo", icon: "fas fa-money-check-alt", color: "text-blue-400" },
    { id: "cashapp", name: "Cash App", icon: "fas fa-dollar-sign", color: "text-green-500" },
    { id: "zelle", name: "Zelle", icon: "fas fa-bolt", color: "text-purple-500" },
    { id: "wise", name: "Wise", icon: "fas fa-globe", color: "text-green-600" },
    { id: "skrill", name: "Skrill", icon: "fas fa-wallet", color: "text-purple-600" },
  ];

  const withdrawalMethods = [
    {
      id: "crypto",
      name: "Crypto Withdrawal",
      icon: "fab fa-bitcoin",
      iconBg: "bg-orange-500",
      description: "Withdraw to your cryptocurrency wallet",
      processingTime: "10-60 minutes",
    },
    {
      id: "wire",
      name: "Wire Transfer",
      icon: "fas fa-university",
      iconBg: "bg-blue-500",
      description: "Direct wire transfer to your bank account",
      processingTime: "1-3 business days",
    },
    {
      id: "merchant",
      name: "Merchant Pay",
      icon: "fas fa-store",
      iconBg: "bg-green-500",
      description: "Send to PayPal, Venmo, Cash App, etc.",
      processingTime: "1-24 hours",
    },
  ];

  const quickAmounts = [100, 500, 1000, 5000, 10000];

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) return value;
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length === 2 ? `${integerPart}.${parts[1].slice(0, 2)}` : integerPart;
  };

  const withdrawMutation = useMutation({
    mutationFn: async (data: { 
      amount: string; 
      withdrawMethod: 'crypto' | 'wire_transfer' | 'merchant_pay'; 
      destinationAddress: string;
      metadata?: any;
    }) => {
      const res = await apiRequest("POST", "/api/withdrawals", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Withdrawal Submitted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCryptoWithdraw = () => {
    if (!cryptoAmount || !cryptoWalletAddress || !selectedCrypto || !cryptoNetwork) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    setCryptoStep(4); // Processing step
    setTimeout(() => {
      withdrawMutation.mutate({
        amount: cryptoAmount.replace(/,/g, ''),
        withdrawMethod: 'crypto',
        destinationAddress: cryptoWalletAddress,
        metadata: { 
          crypto: selectedCrypto, 
          network: cryptoNetwork,
          walletAddress: cryptoWalletAddress
        }
      });
      setCryptoStep(5); // Success step
    }, 3000);
  };

  const handleWireWithdraw = () => {
    if (!wireAmount || !bankName || !accountHolderName || !accountNumber || !routingNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setWireStep(4); // Processing step
    setTimeout(() => {
      withdrawMutation.mutate({
        amount: wireAmount.replace(/,/g, ''),
        withdrawMethod: 'wire_transfer',
        destinationAddress: accountNumber,
        metadata: {
          bankName,
          accountHolderName,
          accountNumber,
          routingNumber,
          swiftCode,
          bankAddress
        }
      });
      setWireStep(5); // Success step
    }, 3000);
  };

  const handleMerchantWithdraw = () => {
    if (!merchantAmount || !merchantPlatform || !merchantEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setMerchantStep(4); // Processing step
    setTimeout(() => {
      withdrawMutation.mutate({
        amount: merchantAmount.replace(/,/g, ''),
        withdrawMethod: 'merchant_pay',
        destinationAddress: merchantEmail,
        metadata: {
          platform: merchantPlatform,
          email: merchantEmail,
          note: merchantNote
        }
      });
      setMerchantStep(5); // Success step
    }, 3000);
  };

  const resetAll = () => {
    setSelectedMethod(null);
    setCryptoStep(1);
    setSelectedCrypto(null);
    setCryptoAmount("");
    setCryptoWalletAddress("");
    setCryptoNetwork("");
    setWireStep(1);
    setWireAmount("");
    setBankName("");
    setAccountHolderName("");
    setAccountNumber("");
    setRoutingNumber("");
    setSwiftCode("");
    setBankAddress("");
    setMerchantStep(1);
    setMerchantAmount("");
    setMerchantPlatform("");
    setMerchantEmail("");
    setMerchantNote("");
  };

  const selectedCoin = cryptoCoins.find(c => c.id === selectedCrypto);
  const CoinIcon = selectedCoin?.icon;
  const selectedMerchant = merchantPlatforms.find(m => m.id === merchantPlatform);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="withdrawal-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Withdraw Funds" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          {!selectedMethod && (
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                Available Balance: <span className="font-semibold text-foreground">
                  ${user?.balance ? parseFloat(user.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
              <Button variant="outline" onClick={() => setLocation("/wallet")} data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Wallet
              </Button>
            </div>
          )}

          {!selectedMethod ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              {withdrawalMethods.map((method) => (
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
                      <span className="text-[8px] md:text-[10px] text-muted-foreground/70">
                        <i className="fas fa-clock mr-1"></i>{method.processingTime}
                      </span>
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
                onClick={resetAll}
                className="mb-4"
                data-testid="button-back-to-methods"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Methods
              </Button>

              {/* CRYPTO WITHDRAWAL FLOW */}
              {selectedMethod === "crypto" && (
                <Card className="p-6">
                  {/* Step 1: Select Crypto */}
                  {cryptoStep === 1 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                          <i className="fab fa-bitcoin text-white text-xl"></i>
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Select Cryptocurrency</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Choose which crypto you want to receive</p>
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
                              setCryptoNetwork(coin.networks[0]);
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

                  {/* Step 2: Enter Amount */}
                  {cryptoStep === 2 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => setCryptoStep(1)}>
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${CoinIcon ? 'bg-muted' : 'bg-orange-500'}`}>
                          {CoinIcon ? <CoinIcon className={`${selectedCoin?.color} text-2xl`} /> : <i className="fab fa-bitcoin text-white text-xl"></i>}
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Enter Amount</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">How much would you like to withdraw?</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Amount (USD)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={cryptoAmount}
                            onChange={(e) => setCryptoAmount(formatAmount(e.target.value))}
                            className="font-['Archivo'] text-2xl h-14 mt-2"
                            data-testid="input-crypto-amount"
                          />
                          <p className="text-sm text-muted-foreground mt-2">
                            Available: ${user?.balance ? parseFloat(user.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {quickAmounts.map((amount) => (
                            <Button
                              key={amount}
                              variant="outline"
                              size="sm"
                              onClick={() => setCryptoAmount(amount.toLocaleString())}
                              data-testid={`button-quick-${amount}`}
                            >
                              ${amount.toLocaleString()}
                            </Button>
                          ))}
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            if (!cryptoAmount) {
                              toast({ title: "Error", description: "Please enter an amount", variant: "destructive" });
                              return;
                            }
                            setCryptoStep(3);
                          }}
                          data-testid="button-continue"
                        >
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Step 3: Wallet Details */}
                  {cryptoStep === 3 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => setCryptoStep(2)}>
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${CoinIcon ? 'bg-muted' : 'bg-orange-500'}`}>
                          {CoinIcon ? <CoinIcon className={`${selectedCoin?.color} text-2xl`} /> : <i className="fab fa-bitcoin text-white text-xl"></i>}
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Wallet Details</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Enter your {selectedCrypto} wallet address</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg mb-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Withdrawal Amount</span>
                            <span className="font-bold text-xl">${cryptoAmount}</span>
                          </div>
                        </div>

                        <div>
                          <Label>Network</Label>
                          <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                            <SelectTrigger className="mt-2" data-testid="select-network">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedCoin?.networks.map((network) => (
                                <SelectItem key={network} value={network}>{network}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Wallet Address</Label>
                          <Input
                            type="text"
                            placeholder={`Enter your ${selectedCrypto} wallet address`}
                            value={cryptoWalletAddress}
                            onChange={(e) => setCryptoWalletAddress(e.target.value)}
                            className="font-mono mt-2"
                            data-testid="input-wallet-address"
                          />
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-600 dark:text-yellow-500">
                              <p className="font-medium">Important</p>
                              <p>Please verify your wallet address is correct. Withdrawals to wrong addresses cannot be recovered.</p>
                            </div>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleCryptoWithdraw}
                          data-testid="button-submit-withdrawal"
                        >
                          Submit Withdrawal Request
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Step 4: Processing */}
                  {cryptoStep === 4 && (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Processing Withdrawal</h2>
                      <p className="text-muted-foreground">Please wait while we process your request...</p>
                    </div>
                  )}

                  {/* Step 5: Success */}
                  {cryptoStep === 5 && (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Withdrawal Submitted!</h2>
                      <p className="text-muted-foreground mb-6">Your withdrawal request has been submitted for review.</p>
                      
                      <Card className="p-4 text-left mb-6">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">${cryptoAmount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cryptocurrency</span>
                            <span className="font-medium">{selectedCrypto}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Network</span>
                            <span className="font-medium">{cryptoNetwork}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span className="text-yellow-500 font-medium">Pending Review</span>
                          </div>
                        </div>
                      </Card>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setLocation("/wallet")} className="flex-1">
                          Back to Wallet
                        </Button>
                        <Button onClick={resetAll} className="flex-1">
                          New Withdrawal
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* WIRE TRANSFER FLOW */}
              {selectedMethod === "wire" && (
                <Card className="p-6">
                  {/* Step 1: Enter Amount */}
                  {wireStep === 1 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Wire Transfer</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Enter the amount you want to withdraw</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Amount (USD)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={wireAmount}
                            onChange={(e) => setWireAmount(formatAmount(e.target.value))}
                            className="font-['Archivo'] text-2xl h-14 mt-2"
                            data-testid="input-wire-amount"
                          />
                          <p className="text-sm text-muted-foreground mt-2">
                            Available: ${user?.balance ? parseFloat(user.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {quickAmounts.map((amount) => (
                            <Button
                              key={amount}
                              variant="outline"
                              size="sm"
                              onClick={() => setWireAmount(amount.toLocaleString())}
                            >
                              ${amount.toLocaleString()}
                            </Button>
                          ))}
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            if (!wireAmount) {
                              toast({ title: "Error", description: "Please enter an amount", variant: "destructive" });
                              return;
                            }
                            setWireStep(2);
                          }}
                        >
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Step 2: Loading Animation */}
                  {wireStep === 2 && (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Preparing Wire Transfer</h2>
                      <p className="text-muted-foreground">Setting up your transfer details...</p>
                      {setTimeout(() => setWireStep(3), 2000) && null}
                    </div>
                  )}

                  {/* Step 3: Bank Details Form */}
                  {wireStep === 3 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => setWireStep(1)}>
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Bank Details</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Enter your bank account information</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg mb-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Withdrawal Amount</span>
                            <span className="font-bold text-xl">${wireAmount}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Bank Name *</Label>
                            <Input
                              type="text"
                              placeholder="e.g., Chase Bank"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="mt-2"
                              data-testid="input-bank-name"
                            />
                          </div>
                          <div>
                            <Label>Account Holder Name *</Label>
                            <Input
                              type="text"
                              placeholder="Full name on account"
                              value={accountHolderName}
                              onChange={(e) => setAccountHolderName(e.target.value)}
                              className="mt-2"
                              data-testid="input-account-holder"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Account Number *</Label>
                            <Input
                              type="text"
                              placeholder="Account number"
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              className="mt-2"
                              data-testid="input-account-number"
                            />
                          </div>
                          <div>
                            <Label>Routing Number *</Label>
                            <Input
                              type="text"
                              placeholder="Routing number"
                              value={routingNumber}
                              onChange={(e) => setRoutingNumber(e.target.value)}
                              className="mt-2"
                              data-testid="input-routing-number"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>SWIFT Code (International)</Label>
                            <Input
                              type="text"
                              placeholder="SWIFT/BIC code"
                              value={swiftCode}
                              onChange={(e) => setSwiftCode(e.target.value)}
                              className="mt-2"
                              data-testid="input-swift-code"
                            />
                          </div>
                          <div>
                            <Label>Bank Address</Label>
                            <Input
                              type="text"
                              placeholder="Bank branch address"
                              value={bankAddress}
                              onChange={(e) => setBankAddress(e.target.value)}
                              className="mt-2"
                              data-testid="input-bank-address"
                            />
                          </div>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-600 dark:text-yellow-500">
                              <p className="font-medium">Processing Time</p>
                              <p>Wire transfers typically take 1-3 business days to complete.</p>
                            </div>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleWireWithdraw}
                          data-testid="button-submit-wire"
                        >
                          Submit Withdrawal Request
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Step 4: Processing */}
                  {wireStep === 4 && (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Processing Wire Transfer</h2>
                      <p className="text-muted-foreground">Please wait while we process your request...</p>
                    </div>
                  )}

                  {/* Step 5: Success */}
                  {wireStep === 5 && (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Withdrawal Submitted!</h2>
                      <p className="text-muted-foreground mb-6">Your wire transfer request has been submitted for review.</p>
                      
                      <Card className="p-4 text-left mb-6">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">${wireAmount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bank</span>
                            <span className="font-medium">{bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account</span>
                            <span className="font-medium">****{accountNumber.slice(-4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span className="text-yellow-500 font-medium">Pending Review</span>
                          </div>
                        </div>
                      </Card>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setLocation("/wallet")} className="flex-1">
                          Back to Wallet
                        </Button>
                        <Button onClick={resetAll} className="flex-1">
                          New Withdrawal
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* MERCHANT PAY FLOW */}
              {selectedMethod === "merchant" && (
                <Card className="p-6">
                  {/* Step 1: Select Platform */}
                  {merchantStep === 1 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                          <Store className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Select Payment Platform</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Choose where to receive your funds</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {merchantPlatforms.map((platform) => (
                          <Card
                            key={platform.id}
                            className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                              merchantPlatform === platform.id ? "border-2 border-primary" : ""
                            }`}
                            onClick={() => {
                              setMerchantPlatform(platform.id);
                              setMerchantStep(2);
                            }}
                            data-testid={`card-platform-${platform.id}`}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-muted`}>
                                <i className={`${platform.icon} ${platform.color} text-2xl`}></i>
                              </div>
                              <span className="font-semibold text-sm text-center">{platform.name}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Step 2: Enter Amount */}
                  {merchantStep === 2 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => setMerchantStep(1)}>
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <i className={`${selectedMerchant?.icon} ${selectedMerchant?.color} text-2xl`}></i>
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Enter Amount</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Send to {selectedMerchant?.name}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Amount (USD)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={merchantAmount}
                            onChange={(e) => setMerchantAmount(formatAmount(e.target.value))}
                            className="font-['Archivo'] text-2xl h-14 mt-2"
                            data-testid="input-merchant-amount"
                          />
                          <p className="text-sm text-muted-foreground mt-2">
                            Available: ${user?.balance ? parseFloat(user.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {quickAmounts.map((amount) => (
                            <Button
                              key={amount}
                              variant="outline"
                              size="sm"
                              onClick={() => setMerchantAmount(amount.toLocaleString())}
                            >
                              ${amount.toLocaleString()}
                            </Button>
                          ))}
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            if (!merchantAmount) {
                              toast({ title: "Error", description: "Please enter an amount", variant: "destructive" });
                              return;
                            }
                            setMerchantStep(3);
                          }}
                        >
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Step 3: Account Details */}
                  {merchantStep === 3 && (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => setMerchantStep(2)}>
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <i className={`${selectedMerchant?.icon} ${selectedMerchant?.color} text-2xl`}></i>
                        </div>
                        <div>
                          <h2 className="text-lg md:text-2xl font-bold">Account Details</h2>
                          <p className="text-xs md:text-sm text-muted-foreground">Enter your {selectedMerchant?.name} details</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg mb-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Withdrawal Amount</span>
                            <span className="font-bold text-xl">${merchantAmount}</span>
                          </div>
                        </div>

                        <div>
                          <Label>{selectedMerchant?.name} Email/Username *</Label>
                          <Input
                            type="text"
                            placeholder={`Enter your ${selectedMerchant?.name} email or username`}
                            value={merchantEmail}
                            onChange={(e) => setMerchantEmail(e.target.value)}
                            className="mt-2"
                            data-testid="input-merchant-email"
                          />
                        </div>

                        <div>
                          <Label>Note (Optional)</Label>
                          <Input
                            type="text"
                            placeholder="Add a note for this transfer"
                            value={merchantNote}
                            onChange={(e) => setMerchantNote(e.target.value)}
                            className="mt-2"
                            data-testid="input-merchant-note"
                          />
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <div className="flex items-start space-x-2">
                            <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                              <p className="font-medium">Processing Time</p>
                              <p>Merchant payments are typically processed within 1-24 hours.</p>
                            </div>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleMerchantWithdraw}
                          data-testid="button-submit-merchant"
                        >
                          Submit Withdrawal Request
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Step 4: Processing */}
                  {merchantStep === 4 && (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
                      <p className="text-muted-foreground">Please wait while we process your request...</p>
                    </div>
                  )}

                  {/* Step 5: Success */}
                  {merchantStep === 5 && (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Withdrawal Submitted!</h2>
                      <p className="text-muted-foreground mb-6">Your {selectedMerchant?.name} payment request has been submitted.</p>
                      
                      <Card className="p-4 text-left mb-6">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">${merchantAmount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform</span>
                            <span className="font-medium">{selectedMerchant?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account</span>
                            <span className="font-medium">{merchantEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span className="text-yellow-500 font-medium">Pending Review</span>
                          </div>
                        </div>
                      </Card>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setLocation("/wallet")} className="flex-1">
                          Back to Wallet
                        </Button>
                        <Button onClick={resetAll} className="flex-1">
                          New Withdrawal
                        </Button>
                      </div>
                    </div>
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
