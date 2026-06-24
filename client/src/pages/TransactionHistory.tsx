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
import { TransactionDetailModal, type TxRecord } from "@/components/transactions/TransactionDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Loader,
  RefreshCw,
  Ban,
  CheckCheck,
} from "lucide-react";

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":  return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "approved":   return <CheckCheck className="w-4 h-4 text-blue-500" />;
    case "pending":    return <Loader className="w-4 h-4 text-yellow-600 animate-spin" />;
    case "rejected":
    case "failed":     return <XCircle className="w-4 h-4 text-red-600" />;
    case "cancelled":  return <Ban className="w-4 h-4 text-gray-500" />;
    default:           return <Clock className="w-4 h-4 text-gray-600" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    approved:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
  };
  return (
    <Badge className={`${cls[status] ?? "bg-gray-100 text-gray-700"} border-0 text-xs py-0 px-1.5`}>
      {status}
    </Badge>
  );
}

function TransactionRow({ tx, onClick }: { tx: TxRecord; onClick: () => void }) {
  const isDeposit = tx.type === "deposit";
  const Icon = isDeposit ? ArrowDownRight : ArrowUpRight;
  const iconBg = isDeposit ? "bg-green-500/10" : "bg-red-500/10";
  const iconColor = isDeposit ? "text-green-500" : "text-red-500";
  const amountColor = isDeposit ? "text-green-600" : "text-red-500";
  const amountPrefix = isDeposit ? "+" : "-";

  return (
    <div
      className="flex items-center gap-3 p-3 sm:p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
      data-testid={`transaction-${tx.id}`}
    >
      <div className={`p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{tx.refId}</p>
        <p className="text-xs text-muted-foreground truncate">{tx.methodLabel}</p>
        {tx.date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(tx.date), "MMM dd, yyyy • HH:mm")}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
        <p className={`font-semibold text-sm ${amountColor}`}>
          {amountPrefix}${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-1">
          <StatusIcon status={tx.status} />
          <StatusBadge status={tx.status} />
        </div>
      </div>
    </div>
  );
}

export default function TransactionHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState<TxRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const { user, isLoading: authLoading } = useAuth();

  const { data: transactions = [], isLoading: txLoading, refetch } = useQuery<TxRecord[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const isLoading = authLoading || txLoading;

  const filtered = transactions
    .filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          tx.refId.toLowerCase().includes(q) ||
          tx.methodLabel.toLowerCase().includes(q) ||
          (tx.destination?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.date!).getTime() - new Date(a.date!).getTime();
      if (sortBy === "oldest") return new Date(a.date!).getTime() - new Date(b.date!).getTime();
      if (sortBy === "amount_high") return b.amount - a.amount;
      if (sortBy === "amount_low") return a.amount - b.amount;
      return 0;
    });

  const deposits    = filtered.filter((tx) => tx.type === "deposit");
  const withdrawals = filtered.filter((tx) => tx.type === "withdrawal");

  const totalDeposited   = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn   = transactions.filter(t => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  const EmptyState = ({ label }: { label: string }) => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
        <DollarSign className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="transaction-history-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Transaction History" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />

        <main className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 lg:pb-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
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
                    <p className="text-sm text-muted-foreground">Deposited</p>
                    <p className="text-xl font-bold">
                      ${totalDeposited.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Withdrawn</p>
                    <p className="text-xl font-bold">
                      ${totalWithdrawn.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold">
                      {transactions.filter(t => t.status === "pending" || t.status === "approved").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters + List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transaction History</span>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>Deposits and withdrawals on your account</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search + Filters */}
              <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by reference, method…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-transactions"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="amount_high">Amount (High)</SelectItem>
                    <SelectItem value="amount_low">Amount (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
                  <TabsTrigger value="deposit">Deposits ({deposits.length})</TabsTrigger>
                  <TabsTrigger value="withdrawal">Withdrawals ({withdrawals.length})</TabsTrigger>
                </TabsList>

                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <TabsContent value="all" className="mt-0">
                      {filtered.length === 0 ? (
                        <EmptyState label="Try adjusting your search or filters" />
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {filtered.map((tx) => (
                            <TransactionRow key={tx.id} tx={tx} onClick={() => setSelected(tx)} />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="deposit" className="mt-0">
                      {deposits.length === 0 ? (
                        <EmptyState label="No deposit transactions found" />
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {deposits.map((tx) => (
                            <TransactionRow key={tx.id} tx={tx} onClick={() => setSelected(tx)} />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="withdrawal" className="mt-0">
                      {withdrawals.length === 0 ? (
                        <EmptyState label="No withdrawal transactions found" />
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {withdrawals.map((tx) => (
                            <TransactionRow key={tx.id} tx={tx} onClick={() => setSelected(tx)} />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>

      <MobileNav />

      <TransactionDetailModal
        transaction={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
