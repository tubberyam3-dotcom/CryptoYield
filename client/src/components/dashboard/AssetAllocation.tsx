import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const allocations = [
  { name: "Stocks & Shares", percentage: 40, color: "bg-chart-1" },
  { name: "Investment Portfolios", percentage: 30, color: "bg-chart-2" },
  { name: "Bonds", percentage: 20, color: "bg-chart-3" },
  { name: "Rewards & XP", percentage: 10, color: "bg-chart-4" },
];

export function AssetAllocation() {
  return (
    <Card className="p-6 card-hover animate-fade-in-scale bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-blue-200 dark:border-blue-800" data-testid="card-asset-allocation">
      <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
      <div className="space-y-4">
        {allocations.map((asset, index) => (
          <motion.div 
            key={asset.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 card-transition" 
            data-testid={`allocation-${index}`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 ${asset.color} rounded-full shadow-sm`}></div>
              <span className="text-sm font-medium">{asset.name}</span>
            </div>
            <span className="text-sm font-bold" data-testid={`text-allocation-percentage-${index}`}>
              {asset.percentage}%
            </span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
