import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign } from "lucide-react";
import { InvestmentWizard } from "./InvestmentWizard";
import type { Portfolio } from "@shared/schema";

interface QuickInvestButtonProps {
  portfolio: Portfolio;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  showDetails?: boolean;
}

export function QuickInvestButton({ 
  portfolio, 
  variant = "default", 
  size = "default", 
  className = "",
  showDetails = false 
}: QuickInvestButtonProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  if (showDetails) {
    return (
      <>
        <div 
          className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer group ${className}`}
          onClick={() => setWizardOpen(true)}
          data-testid={`quick-invest-card-${portfolio.id}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium group-hover:text-primary transition-colors">
              {portfolio.name}
            </h4>
            <Badge variant="outline" className="text-xs">
              {portfolio.strategyTag}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">Min. ${parseFloat(portfolio.minInvestment).toLocaleString()}</span>
            <span className="text-green-600 font-medium">+{portfolio.currentReturn}%</span>
          </div>
          
          <Button 
            size="sm" 
            className="w-full group-hover:shadow-sm transition-shadow"
            data-testid={`button-invest-${portfolio.id}`}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Invest Now
          </Button>
        </div>

        <InvestmentWizard
          portfolio={portfolio}
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Button 
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => setWizardOpen(true)}
        data-testid={`button-invest-${portfolio.id}`}
      >
        <TrendingUp className="w-4 h-4" />
        Invest Now
      </Button>

      <InvestmentWizard
        portfolio={portfolio}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}