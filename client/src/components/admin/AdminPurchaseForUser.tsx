import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, DollarSign, TrendingUp, ShoppingCart, User, Briefcase } from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: string;
}

interface Portfolio {
  id: string;
  name: string;
  description: string;
  minInvestment: string;
  unitPrice: string;
  interestRate: string;
  riskLevel: string;
}

interface StockProduct {
  id: string;
  symbol: string;
  name: string;
  currentPrice: string;
}

export function AdminPurchaseForUser() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [autoApproveInvestment, setAutoApproveInvestment] = useState(true);
  
  const [selectedStock, setSelectedStock] = useState<string>("custom");
  const [stockSymbol, setStockSymbol] = useState("");
  const [stockName, setStockName] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockPrice, setStockPrice] = useState("");
  const [autoApproveStock, setAutoApproveStock] = useState(true);

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: portfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const { data: stockProducts } = useQuery<StockProduct[]>({
    queryKey: ["/api/stocks/products"],
  });

  const investMutation = useMutation({
    mutationFn: async (data: { userId: string; portfolioId: string; investedAmount: string; autoApprove: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${data.userId}/invest-portfolio`, {
        portfolioId: data.portfolioId,
        investedAmount: data.investedAmount,
        autoApprove: data.autoApprove,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Investment Created",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedPortfolio("");
      setInvestmentAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create investment",
        variant: "destructive",
      });
    },
  });

  const buyStockMutation = useMutation({
    mutationFn: async (data: { 
      userId: string; 
      stockProductId?: string;
      symbol?: string;
      name?: string;
      quantity: string; 
      purchasePrice: string;
      autoApprove: boolean;
    }) => {
      const res = await apiRequest("POST", `/api/admin/users/${data.userId}/buy-stock`, {
        stockProductId: data.stockProductId,
        symbol: data.symbol,
        name: data.name,
        quantity: data.quantity,
        purchasePrice: data.purchasePrice,
        autoApprove: data.autoApprove,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Stock Purchase Created",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stock-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedStock("custom");
      setStockSymbol("");
      setStockName("");
      setStockQuantity("");
      setStockPrice("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create stock purchase",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  }) || [];

  const handleInvestSubmit = () => {
    if (!selectedUser || !selectedPortfolio || !investmentAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a user, portfolio, and enter an investment amount",
        variant: "destructive",
      });
      return;
    }

    investMutation.mutate({
      userId: selectedUser.id,
      portfolioId: selectedPortfolio,
      investedAmount: investmentAmount,
      autoApprove: autoApproveInvestment,
    });
  };

  const handleStockSubmit = () => {
    if (!selectedUser || !stockQuantity || !stockPrice) {
      toast({
        title: "Missing Information",
        description: "Please select a user, enter quantity, and price",
        variant: "destructive",
      });
      return;
    }

    if (selectedStock === "custom" && (!stockSymbol || !stockName)) {
      toast({
        title: "Missing Information",
        description: "Please select a stock or enter symbol and name",
        variant: "destructive",
      });
      return;
    }

    buyStockMutation.mutate({
      userId: selectedUser.id,
      stockProductId: selectedStock !== "custom" ? selectedStock : undefined,
      symbol: stockSymbol || undefined,
      name: stockName || undefined,
      quantity: stockQuantity,
      purchasePrice: stockPrice,
      autoApprove: autoApproveStock,
    });
  };

  const selectedPortfolioDetails = portfolios?.find(p => p.id === selectedPortfolio);
  const selectedStockDetails = selectedStock !== "custom" ? stockProducts?.find(s => s.id === selectedStock) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Purchase for User</h2>
        <p className="text-muted-foreground">Create investments or stock purchases on behalf of users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Select User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredUsers.slice(0, 20).map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUser?.id === user.id 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-green-500 font-medium">
                    Balance: ${parseFloat(user.balance || '0').toLocaleString()}
                  </p>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Create Purchase
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a user to create a purchase</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Selected User: {selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-sm text-green-500 font-medium">
                    Available Balance: ${parseFloat(selectedUser.balance || '0').toLocaleString()}
                  </p>
                </div>

                <Tabs defaultValue="portfolio" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="portfolio" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Portfolio Investment
                    </TabsTrigger>
                    <TabsTrigger value="stock" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Stock Purchase
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="portfolio" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Portfolio</Label>
                      <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a portfolio" />
                        </SelectTrigger>
                        <SelectContent>
                          {portfolios?.map((portfolio) => (
                            <SelectItem key={portfolio.id} value={portfolio.id}>
                              {portfolio.name} - Min: ${parseFloat(portfolio.minInvestment || '0').toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPortfolioDetails && (
                      <div className="p-3 bg-muted/30 rounded-lg text-sm">
                        <p><strong>Unit Price:</strong> ${parseFloat(selectedPortfolioDetails.unitPrice || '100').toLocaleString()}</p>
                        <p><strong>Interest Rate:</strong> {(parseFloat(selectedPortfolioDetails.interestRate || '0') * 100).toFixed(2)}%</p>
                        <p><strong>Risk Level:</strong> {selectedPortfolioDetails.riskLevel}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Investment Amount ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Auto-approve investment</Label>
                      <Switch
                        checked={autoApproveInvestment}
                        onCheckedChange={setAutoApproveInvestment}
                      />
                    </div>

                    <Button 
                      onClick={handleInvestSubmit} 
                      className="w-full"
                      disabled={investMutation.isPending}
                    >
                      {investMutation.isPending ? "Processing..." : "Create Investment"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="stock" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Existing Stock (Optional)</Label>
                      <Select value={selectedStock} onValueChange={(value) => {
                        setSelectedStock(value);
                        const stock = stockProducts?.find(s => s.id === value);
                        if (stock) {
                          setStockPrice(stock.currentPrice);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a stock or enter custom below" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Stock</SelectItem>
                          {stockProducts?.map((stock) => (
                            <SelectItem key={stock.id} value={stock.id}>
                              {stock.symbol} - {stock.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedStock === "custom" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Stock Symbol</Label>
                          <Input
                            placeholder="e.g., AAPL"
                            value={stockSymbol}
                            onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Stock Name</Label>
                          <Input
                            placeholder="e.g., Apple Inc."
                            value={stockName}
                            onChange={(e) => setStockName(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="Number of shares"
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price per Share ($)</Label>
                        <Input
                          type="number"
                          placeholder="Price"
                          value={stockPrice}
                          onChange={(e) => setStockPrice(e.target.value)}
                        />
                      </div>
                    </div>

                    {stockQuantity && stockPrice && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-medium">
                          Total: ${(parseFloat(stockQuantity || '0') * parseFloat(stockPrice || '0')).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label>Auto-approve purchase</Label>
                      <Switch
                        checked={autoApproveStock}
                        onCheckedChange={setAutoApproveStock}
                      />
                    </div>

                    <Button 
                      onClick={handleStockSubmit} 
                      className="w-full"
                      disabled={buyStockMutation.isPending}
                    >
                      {buyStockMutation.isPending ? "Processing..." : "Create Stock Purchase"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
