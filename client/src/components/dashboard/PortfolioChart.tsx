import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { useState } from "react";

const mockData = [
  { month: 'Jan', value: 100000 },
  { month: 'Feb', value: 105000 },
  { month: 'Mar', value: 112000 },
  { month: 'Apr', value: 108000 },
  { month: 'May', value: 118000 },
  { month: 'Jun', value: 127450 }
];

export function PortfolioChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('7D');

  const periods = ['7D', '1M', '3M', '1Y'];

  return (
    <Card className="p-6" data-testid="card-portfolio-chart">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Portfolio Performance</h2>
        <div className="flex items-center space-x-2">
          {periods.map((period) => (
            <button
              key={period}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSelectedPeriod(period)}
              data-testid={`button-period-${period.toLowerCase()}`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      
      <div className="chart-container" data-testid="chart-portfolio-performance">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--card-foreground))'
              }}
              formatter={(value: any) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
