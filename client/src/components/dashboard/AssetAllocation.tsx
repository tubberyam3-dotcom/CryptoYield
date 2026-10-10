import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface UserStock {
  totalInvested: string;
  status: string;
}

interface UserPortfolio {
  investedAmount: string;
  status: string;
}

interface UserBond {
  investedAmount: string;
  status: string;
}

interface AuthUser {
  balance?: string;
  walletBalance?: string;
  xpBalance?: number;
}

const COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

export function AssetAllocation() {
  const { data: userStocks } = useQuery<UserStock[]>({ queryKey: ["/api/user/stocks"] });
  const { data: userPortfolios } = useQuery<UserPortfolio[]>({ queryKey: ["/api/user/portfolios"] });
  const { data: userBonds } = useQuery<UserBond[]>({ queryKey: ["/api/user/bonds"] });
  const { data: authUser } = useQuery<AuthUser>({ queryKey: ["/api/auth/user"] });

  const stocksValue = (userStocks ?? [])
    .filter(s => s.status === "approved" || s.status === "active")
    .reduce((sum, s) => sum + parseFloat(s.totalInvested || "0"), 0);

  const portfoliosValue = (userPortfolios ?? [])
    .filter(p => p.status === "approved")
    .reduce((sum, p) => sum + parseFloat(p.investedAmount || "0"), 0);

  const bondsValue = (userBonds ?? [])
    .filter(b => b.status === "active")
    .reduce((sum, b) => sum + parseFloat(b.investedAmount || "0"), 0);

  const cashBalance = parseFloat(authUser?.balance ?? authUser?.walletBalance ?? "0");

  const total = stocksValue + portfoliosValue + bondsValue + cashBalance;

  const rawAllocations = [
    { name: "Stocks & Shares", value: stocksValue },
    { name: "Portfolios", value: portfoliosValue },
    { name: "Bonds", value: bondsValue },
    { name: "Cash Balance", value: cashBalance },
  ].filter(a => a.value > 0);

  const allocations = rawAllocations.map(a => ({
    ...a,
    percentage: total > 0 ? Math.round((a.value / total) * 100) : 0,
  }));

  const isEmpty = total === 0;

  return (
    <Card
      className="p-4 md:p-6 animate-fade-in-scale bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-blue-200 dark:border-blue-800"
      data-testid="card-asset-allocation"
    >
      <h3 className="text-lg font-semibold mb-2 md:mb-4">Portfolio Allocation</h3>

      {isEmpty ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No assets yet. Start investing to see your allocation.
        </div>
      ) : (
        <>
          {/* Bar visual */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
            {allocations.map((a, i) => (
              <div
                key={a.name}
                className={`${COLORS[i % COLORS.length]} transition-all duration-700`}
                style={{ width: `${a.percentage}%` }}
                title={`${a.name}: ${a.percentage}%`}
              />
            ))}
          </div>

          <div className="space-y-1.5 md:space-y-3">
            {allocations.map((asset, index) => (
              <motion.div
                key={asset.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="flex items-center justify-between p-2 md:p-3 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 card-transition"
                data-testid={`allocation-${index}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${COLORS[index % COLORS.length]} rounded-full shadow-sm flex-shrink-0`} />
                  <span className="text-sm font-medium">{asset.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" data-testid={`text-allocation-percentage-${index}`}>
                    {asset.percentage}%
                  </span>
                  <p className="text-xs text-muted-foreground">
                    ${asset.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
            <span>Total Assets</span>
            <span className="font-semibold text-foreground">
              ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
