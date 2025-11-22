import { Card } from "@/components/ui/card";

const allocations = [
  { name: "Bitcoin (BTC)", percentage: 35, color: "bg-chart-1" },
  { name: "Ethereum (ETH)", percentage: 28, color: "bg-chart-2" },
  { name: "DeFi Portfolio", percentage: 22, color: "bg-chart-3" },
  { name: "Layer 2 Tokens", percentage: 15, color: "bg-chart-4" },
];

export function AssetAllocation() {
  return (
    <Card className="p-6 card-hover animate-fade-in-scale nude-gradient-warm border-nude-medium/20" data-testid="card-asset-allocation">
      <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
      <div className="space-y-4">
        {allocations.map((asset, index) => (
          <div key={asset.name} className="flex items-center justify-between" data-testid={`allocation-${index}`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 ${asset.color} rounded-full`}></div>
              <span className="text-sm">{asset.name}</span>
            </div>
            <span className="text-sm font-medium" data-testid={`text-allocation-percentage-${index}`}>
              {asset.percentage}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
