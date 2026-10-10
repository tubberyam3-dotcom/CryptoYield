import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, DollarSign, Zap, Target } from "lucide-react";

interface PortfolioInvestment {
  id: string;
  portfolioId: string;
  investedAmount: string;
  currentValue: string;
  returns?: string;
  totalAccruedProfit?: string;
  status: string;
  investmentStartDate?: string;
  investmentEndDate?: string;
  portfolio: {
    id: string;
    name: string;
    interestRate?: string;
    interestPeriod?: string;
    riskLevel?: string;
    currentReturn?: string;
  };
}

interface ActivePortfolioChartProps {
  investments: PortfolioInvestment[];
}

const COLORS = ['#e4fe7b', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" className="text-lg font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="#9ca3af" className="text-sm">
        ${parseFloat(payload.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </text>
      <text x={cx} y={cy + 35} textAnchor="middle" fill="#22c55e" className="text-xs">
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 0 8px rgba(228, 254, 123, 0.5))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

function CountdownTimer({ targetDate, period }: { targetDate: Date; period: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let nextPayout = new Date(targetDate);
      
      while (nextPayout <= now) {
        switch (period) {
          case 'hourly':
            nextPayout.setHours(nextPayout.getHours() + 1);
            break;
          case 'daily':
            nextPayout.setDate(nextPayout.getDate() + 1);
            break;
          case 'weekly':
            nextPayout.setDate(nextPayout.getDate() + 7);
            break;
          case 'monthly':
            nextPayout.setMonth(nextPayout.getMonth() + 1);
            break;
          default:
            nextPayout.setDate(nextPayout.getDate() + 1);
        }
      }

      const diff = nextPayout.getTime() - now.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let totalPeriodSeconds = 86400;
      switch (period) {
        case 'hourly': totalPeriodSeconds = 3600; break;
        case 'daily': totalPeriodSeconds = 86400; break;
        case 'weekly': totalPeriodSeconds = 604800; break;
        case 'monthly': totalPeriodSeconds = 2592000; break;
      }

      const progressPercent = ((totalPeriodSeconds - totalSeconds) / totalPeriodSeconds) * 100;

      setTimeLeft({ hours, minutes, seconds });
      setProgress(Math.min(100, Math.max(0, progressPercent)));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetDate, period]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Next {period} earning
        </span>
        <span className="font-mono font-bold text-accent">
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-gradient-to-r from-accent to-green-500 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute h-full w-1 bg-white rounded-full animate-pulse"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  );
}

export function ActivePortfolioChart({ investments }: ActivePortfolioChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  const activeInvestments = investments.filter(inv => inv.status === 'approved');

  const chartData = useMemo(() => {
    return activeInvestments.map((inv) => ({
      name: inv.portfolio.name,
      value: parseFloat(inv.currentValue || inv.investedAmount),
      invested: parseFloat(inv.investedAmount),
      earnings: parseFloat(inv.totalAccruedProfit || inv.returns || '0'),
      interestRate: parseFloat(inv.portfolio.interestRate || '0'),
      interestPeriod: inv.portfolio.interestPeriod || 'daily',
      investmentStartDate: inv.investmentStartDate,
    }));
  }, [activeInvestments]);

  const totals = useMemo(() => {
    return activeInvestments.reduce((acc, inv) => ({
      invested: acc.invested + parseFloat(inv.investedAmount),
      currentValue: acc.currentValue + parseFloat(inv.currentValue || inv.investedAmount),
      earnings: acc.earnings + parseFloat(inv.totalAccruedProfit || inv.returns || '0'),
    }), { invested: 0, currentValue: 0, earnings: 0 });
  }, [activeInvestments]);

  useEffect(() => {
    if (chartData.length > 1) {
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % chartData.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [chartData.length]);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, []);

  if (activeInvestments.length === 0) {
    return null;
  }

  const currentInvestment = activeInvestments[activeIndex];
  const estimatedNextEarning = currentInvestment 
    ? (parseFloat(currentInvestment.currentValue || currentInvestment.investedAmount) * 
       parseFloat(currentInvestment.portfolio.interestRate || '0.01')).toFixed(2)
    : '0.00';

  return (
    <Card className="p-6 bg-gradient-to-br from-card via-card to-accent/5 border-accent/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Active Portfolio Overview
          </h3>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
            <Zap className="w-3 h-3 mr-1" />
            {activeInvestments.length} Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key={animationKey}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  animationBegin={0}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {chartData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeIndex 
                      ? 'bg-accent w-6' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <DollarSign className="w-3 h-3" />
                  Total Invested
                </div>
                <div className="text-xl font-bold">
                  ${totals.invested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div className="bg-card border border-border/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Current Value
                </div>
                <div className="text-xl font-bold text-green-500">
                  ${totals.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/10 to-accent/10 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-500 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  Total Earnings
                </div>
                <div className="text-lg font-bold text-green-500">
                  +${totals.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              {totals.invested > 0 && (
                <div className="text-xs text-green-500/70 mt-1">
                  {((totals.earnings / totals.invested) * 100).toFixed(2)}% ROI
                </div>
              )}
            </div>

            {currentInvestment && (
              <>
                <div className="bg-card border border-accent/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Est. Next Earning</span>
                    <span className="text-accent font-bold">+${estimatedNextEarning}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(parseFloat(currentInvestment.portfolio.interestRate || '0') * 100).toFixed(2)}% {currentInvestment.portfolio.interestPeriod || 'daily'}
                  </div>
                </div>

                <CountdownTimer 
                  targetDate={new Date(currentInvestment.investmentStartDate || Date.now())}
                  period={currentInvestment.portfolio.interestPeriod || 'daily'}
                />
              </>
            )}
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chartData.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all duration-300 ${
                  index === activeIndex
                    ? 'bg-accent/20 border border-accent/50 text-accent'
                    : 'bg-muted/50 border border-border hover:bg-muted'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
