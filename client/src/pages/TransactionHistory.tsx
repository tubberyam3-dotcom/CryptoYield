import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionDetailModal } from "@/components/transactions/TransactionDetailModal";
import { ExportTransactions } from "@/components/transactions/ExportTransactions";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  Trophy,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader
} from "lucide-react";

function TransactionRow({ transaction, onClick, getTypeIcon, getStatusIcon, getStatusColor }: {
  transaction: any;
  onClick: () => void;
  getTypeIcon: (type: string) => JSX.Element;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div
      className="flex items-start gap-3 p-3 sm:p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
      data-testid={`transaction-${transaction.id}`}
    >
      <div className="p-2 bg-muted rounded-lg flex-shrink-0 mt-0.5">
        {getTypeIcon(transaction.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{transaction.title}</p>
        <p className="text-xs text-muted-foreground truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(transaction.timestamp, 'MMM dd, yyyy • HH:mm')}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
        <p className="font-semibold text-sm">${transaction.amount.toLocaleString()}</p>
        {transaction.returns && (
          <p className="text-xs text-green-600">+${transaction.returns.toLocaleString()}</p>
        )}
        <div className="flex items-center gap-1">
          {getStatusIcon(transaction.status)}
          <Badge className={`${getStatusColor(transaction.status)} text-xs py-0 px-1.5`}>
            {transaction.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Mock comprehensive transaction data
const mockTransactions = [
  {
    id: "tx-001",
    type: "investment",
    subtype: "buy",
    title: "Investment in AI Revolution Portfolio",
    description: "Purchased portfolio shares",
    amount: 2500.00,
    asset: "AI Portfolio",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    fee: 12.50,
    txHash: "0x1234...5678",
    portfolio: {
      name: "AI Revolution Portfolio",
      id: "ai-crypto-portfolio"
    },
    returns: +87.50,
    returnPercentage: 3.5
  },
  {
    id: "tx-002", 
    type: "staking",
    subtype: "stake",
    title: "Started Flexible Staking Plan",
    description: "Locked funds in staking protocol",
    amount: 5000.00,
    asset: "ETH",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    fee: 0,
    apy: 8.5,
    duration: "flexible",
    estimatedRewards: 425.00
  },
  {
    id: "tx-003",
    type: "challenge",
    subtype: "join",
    title: "Joined Solo Investment Marathon",
    description: "Contributed to community challenge",
    amount: 1000.00,
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    fee: 0,
    challenge: {
      name: "Solo Investment Marathon",
      target: 50000.00,
      reward: "Premium Features + $500 Bonus"
    }
  },
  {
    id: "tx-004",
    type: "deposit",
    subtype: "bank_transfer",
    title: "Bank Transfer Deposit",
    description: "USD deposit via bank transfer",
    amount: 10000.00,
    asset: "USD",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    fee: 0,
    txHash: "ACH-789123456"
  },
  {
    id: "tx-005",
    type: "withdrawal",
    subtype: "crypto",
    title: "BTC Withdrawal",
    description: "Withdrew Bitcoin to external wallet",
    amount: 3500.00,
    asset: "BTC",
    status: "pending",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    fee: 15.00,
    txHash: "0xabcd...efgh",
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
  },
  {
    id: "tx-006",
    type: "staking",
    subtype: "rewards",
    title: "Staking Rewards Received",
    description: "Monthly staking rewards payment",
    amount: 89.33,
    asset: "ETH",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    fee: 0,
    apy: 8.5,
    stakingPlan: "2-Year Lock Plan"
  },
  {
    id: "tx-007",
    type: "investment",
    subtype: "sell",
    title: "Partial Sale - DeFi Portfolio",
    description: "Sold 25% of portfolio position",
    amount: 1875.00,
    asset: "DeFi Portfolio",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96), // 4 days ago
    fee: 9.38,
    returns: +125.00,
    returnPercentage: 7.14,
    originalAmount: 1750.00
  }
];

export default function TransactionHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const { user, isLoading } = useAuth();

  // Mock query - in real app would fetch from API
  const { data: transactions = mockTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", { search: searchQuery, type: typeFilter, status: statusFilter }],
    queryFn: () => Promise.resolve(mockTransactions) // Mock implementation
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Loader className="w-4 h-4 text-yellow-600 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'investment': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'staking': return <Zap className="w-5 h-5 text-purple-600" />;
      case 'challenge': return <Trophy className="w-5 h-5 text-yellow-600" />;
      case 'deposit': return <ArrowDownRight className="w-5 h-5 text-green-600" />;
      case 'withdrawal': return <ArrowUpRight className="w-5 h-5 text-red-600" />;
      default: return <DollarSign className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredTransactions = transactions
    .filter(tx => {
      if (searchQuery && !tx.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== 'all' && tx.status !== statusFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp.getTime() - a.timestamp.getTime();
      if (sortBy === 'oldest') return a.timestamp.getTime() - b.timestamp.getTime();
      if (sortBy === 'amount_high') return b.amount - a.amount;
      if (sortBy === 'amount_low') return a.amount - b.amount;
      return 0;
    });

  const getTransactionsByType = (type: string) => {
    return transactions.filter(tx => tx.type === type);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="transaction-history-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Transaction History" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 lg:pb-6">
          {/* Header & Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-xl font-bold">{transactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deposits</p>
                    <p className="text-xl font-bold">
                      ${getTransactionsByType('deposit').reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Staking Active</p>
                    <p className="text-xl font-bold">
                      ${getTransactionsByType('staking').filter(tx => tx.subtype === 'stake').reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Challenges Joined</p>
                    <p className="text-xl font-bold">{getTransactionsByType('challenge').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transaction History</span>
                <div className="flex items-center gap-2">
                  <ExportTransactions transactions={filteredTransactions} />
                  <Button variant="outline" size="sm" disabled>
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced Filters
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Complete history of all your platform activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-transactions"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="investment">Investments</SelectItem>
                    <SelectItem value="staking">Staking</SelectItem>
                    <SelectItem value="challenge">Challenges</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="amount_high">Amount (High)</SelectItem>
                    <SelectItem value="amount_low">Amount (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction List */}
              <Tabs defaultValue="all" className="w-full">
                <div className="overflow-x-auto -mx-1 px-1 pb-1">
                  <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-6 gap-0">
                    <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">All</TabsTrigger>
                    <TabsTrigger value="investment" className="text-xs sm:text-sm px-2 sm:px-3">Investments</TabsTrigger>
                    <TabsTrigger value="staking" className="text-xs sm:text-sm px-2 sm:px-3">Staking</TabsTrigger>
                    <TabsTrigger value="challenge" className="text-xs sm:text-sm px-2 sm:px-3">Challenges</TabsTrigger>
                    <TabsTrigger value="deposit" className="text-xs sm:text-sm px-2 sm:px-3">Deposits</TabsTrigger>
                    <TabsTrigger value="withdrawal" className="text-xs sm:text-sm px-2 sm:px-3">Withdrawals</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="space-y-4 mt-4">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {filteredTransactions.map((transaction) => (
                        <TransactionRow
                          key={transaction.id}
                          transaction={transaction}
                          onClick={() => setSelectedTransaction(transaction)}
                          getTypeIcon={getTypeIcon}
                          getStatusIcon={getStatusIcon}
                          getStatusColor={getStatusColor}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {['investment', 'staking', 'challenge', 'deposit', 'withdrawal'].map(type => (
                  <TabsContent key={type} value={type} className="space-y-4 mt-4">
                    <div className="space-y-2 sm:space-y-3">
                      {filteredTransactions.filter(tx => tx.type === type).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">No {type} transactions found</div>
                      ) : filteredTransactions.filter(tx => tx.type === type).map((transaction) => (
                        <TransactionRow
                          key={transaction.id}
                          transaction={transaction}
                          onClick={() => setSelectedTransaction(transaction)}
                          getTypeIcon={getTypeIcon}
                          getStatusIcon={getStatusIcon}
                          getStatusColor={getStatusColor}
                        />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
      
      <MobileNav />

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          open={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}