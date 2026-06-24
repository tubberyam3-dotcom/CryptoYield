import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Deposit, Withdrawal } from "@shared/schema";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Wallet as WalletIcon,
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

interface DashboardStats {
  availableBalance: string;
}

const fmt = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const StatusBadge = ({ status }: { status: string }) => {
  const cls =
    status === "completed"
      ? "bg-green-500/10 text-green-600 dark:text-green-400"
      : status === "pending" || status === "approved"
      ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
      : "bg-red-500/10 text-red-600 dark:text-red-400";
  return <Badge className={`${cls} border-0 text-xs`}>{status}</Badge>;
};

export default function Wallet() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: deposits = [], isLoading: depositsLoading } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/withdrawals"],
    enabled: !!user,
  });

  const availableBalance = parseFloat(stats?.availableBalance || "0");

  const pendingWithdrawals = withdrawals
    .filter(w => w.status === "pending" || w.status === "approved")
    .reduce((s, w) => s + parseFloat(w.amount), 0);

  const totalDeposited = deposits
    .filter(d => d.status === "completed")
    .reduce((s, d) => s + parseFloat(d.amount), 0);

  const totalWithdrawn = withdrawals
    .filter(w => w.status === "completed")
    .reduce((s, w) => s + parseFloat(w.amount), 0);

  const allTransactions = [
    ...deposits.map(d => ({ ...d, txType: "deposit" as const })),
    ...withdrawals.map(w => ({ ...w, txType: "withdrawal" as const })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt!.toString()).getTime() -
      new Date(a.createdAt!.toString()).getTime()
  );

  const isLoading = authLoading || statsLoading;

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

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="wallet-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Wallet" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />

        <main className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 lg:pb-6">

          {/* ── Available Balance hero ─────────────────────────── */}
          <Card className="overflow-hidden" data-testid="card-balance-summary">
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5 sm:p-6">

              {/* header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/15">
                    <WalletIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      Available Balance
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Uninvested funds ready to use
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                    onClick={() => setShowBalance(v => !v)}>
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                    onClick={() => refetchStats()} disabled={statsLoading}>
                    <RefreshCw className={`w-4 h-4 ${statsLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* balance figure */}
              <div className="mb-5">
                {isLoading ? (
                  <div className="h-12 w-48 bg-muted/50 animate-pulse rounded-lg" />
                ) : (
                  <p
                    className="text-4xl sm:text-5xl font-bold text-primary tracking-tight"
                    data-testid="text-wallet-balance"
                  >
                    {showBalance ? `$${fmt(availableBalance)}` : "••••••"}
                  </p>
                )}
                {pendingWithdrawals > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-2">
                    <Lock className="w-3 h-3" />
                    ${fmt(pendingWithdrawals)} pending withdrawal
                  </p>
                )}
              </div>

              {/* action buttons */}
              <div className="flex gap-3">
                <Button onClick={() => setLocation("/deposit")} data-testid="button-deposit"
                  className="flex-1 h-11 text-sm font-semibold">
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
                <Button variant="outline" onClick={() => setLocation("/withdrawal")} data-testid="button-withdraw"
                  className="flex-1 h-11 text-sm font-semibold">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
                <Button variant="outline" onClick={() => setLocation("/portfolios")} data-testid="button-invest"
                  className="flex-1 h-11 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Invest
                </Button>
              </div>
            </div>

            {/* stats strip */}
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
              <div className="p-3 sm:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide">Total Deposited</p>
                <p className="font-semibold text-green-500 text-sm">
                  {showBalance ? `+$${fmt(totalDeposited)}` : "••••"}
                </p>
              </div>
              <div className="p-3 sm:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide">Total Withdrawn</p>
                <p className="font-semibold text-orange-500 text-sm">
                  {showBalance ? `-$${fmt(totalWithdrawn)}` : "••••"}
                </p>
              </div>
            </div>
          </Card>

          {/* ── Transaction history ──────────────────────────────── */}
          <Tabs defaultValue="deposits" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="deposits" data-testid="tab-deposits">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="tab-transactions">All</TabsTrigger>
            </TabsList>

            {/* Deposits */}
            <TabsContent value="deposits">
              <Card className="p-4 sm:p-6" data-testid="card-deposit-history">
                <h3 className="text-base font-semibold mb-4">Deposit History</h3>
                {depositsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <ArrowDownLeft className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-sm">No deposits yet. Make your first deposit to get started!</p>
                    <Button size="sm" onClick={() => setLocation("/deposit")} className="mt-2">Deposit Now</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deposits.slice(0, 20).map(deposit => (
                      <div key={deposit.id}
                        className="flex items-center gap-3 p-3 sm:p-4 border rounded-xl hover:bg-muted/40 transition-colors"
                        data-testid={`deposit-${deposit.id}`}>
                        <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <ArrowDownLeft className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                            <span className="font-medium text-sm capitalize" data-testid={`text-deposit-method-${deposit.id}`}>
                              {deposit.depositMethod.replace(/_/g, " ")}
                            </span>
                            <StatusBadge status={deposit.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {deposit.createdAt && fmtDate(deposit.createdAt.toString())}
                          </p>
                          {deposit.status === "pending" && (
                            <p className="text-xs text-yellow-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> Awaiting approval
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-sm sm:text-base text-green-500 flex-shrink-0"
                          data-testid={`text-deposit-amount-${deposit.id}`}>
                          +${fmt(parseFloat(deposit.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Withdrawals */}
            <TabsContent value="withdrawals">
              <Card className="p-4 sm:p-6" data-testid="card-withdrawal-history">
                <h3 className="text-base font-semibold mb-4">Withdrawal History</h3>
                {withdrawalsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <ArrowUpRight className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-sm">No withdrawals yet</p>
                    <Button size="sm" variant="outline" onClick={() => setLocation("/withdrawal")} className="mt-2">Withdraw Funds</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawals.map(withdrawal => (
                      <div key={withdrawal.id}
                        className="flex items-center gap-3 p-3 sm:p-4 border rounded-xl hover:bg-muted/40 transition-colors"
                        data-testid={`withdrawal-${withdrawal.id}`}>
                        <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <ArrowUpRight className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                            <span className="font-medium text-sm capitalize" data-testid={`text-withdrawal-method-${withdrawal.id}`}>
                              {withdrawal.withdrawMethod.replace(/_/g, " ")}
                            </span>
                            <StatusBadge status={withdrawal.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {withdrawal.createdAt && fmtDate(withdrawal.createdAt.toString())}
                          </p>
                          {(withdrawal.status === "pending" || withdrawal.status === "approved") && (
                            <p className="text-xs text-yellow-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> Processing
                            </p>
                          )}
                          {withdrawal.status === "rejected" && (
                            <p className="text-xs text-red-500 mt-0.5">Rejected — funds returned to balance</p>
                          )}
                        </div>
                        <p className="font-semibold text-sm sm:text-base text-orange-500 flex-shrink-0"
                          data-testid={`text-withdrawal-amount-${withdrawal.id}`}>
                          -${fmt(parseFloat(withdrawal.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* All */}
            <TabsContent value="transactions">
              <Card className="p-4 sm:p-6" data-testid="card-transaction-history">
                <h3 className="text-base font-semibold mb-4">All Transactions</h3>
                {allTransactions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allTransactions.map(tx => {
                      const isDeposit = tx.txType === "deposit";
                      const d = tx as Deposit & { txType: "deposit" };
                      const w = tx as Withdrawal & { txType: "withdrawal" };
                      const method = isDeposit ? d.depositMethod : w.withdrawMethod;
                      const amount = isDeposit ? d.amount : w.amount;
                      const status = isDeposit ? d.status : w.status;
                      return (
                        <div key={`${tx.txType}-${tx.id}`}
                          className="flex items-center gap-3 p-3 sm:p-4 border rounded-xl hover:bg-muted/40 transition-colors"
                          data-testid={`transaction-${tx.id}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDeposit ? "bg-green-500/10" : "bg-orange-500/10"}`}>
                            {isDeposit
                              ? <ArrowDownLeft className="w-4 h-4 text-green-500" />
                              : <ArrowUpRight className="w-4 h-4 text-orange-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                              <span className="font-medium text-sm capitalize">
                                {isDeposit ? "Deposit" : "Withdrawal"} — {method.replace(/_/g, " ")}
                              </span>
                              <StatusBadge status={status} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {tx.createdAt && fmtDate(tx.createdAt.toString())}
                            </p>
                          </div>
                          <p className={`font-semibold text-sm flex-shrink-0 ${isDeposit ? "text-green-500" : "text-orange-500"}`}>
                            {isDeposit ? "+" : "-"}${fmt(parseFloat(amount))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
