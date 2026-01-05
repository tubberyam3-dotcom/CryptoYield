import { useState } from "react";
import { Building2 } from "lucide-react";

interface StockIconProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TICKER_LOGOS_BASE_URL = "https://raw.githubusercontent.com/davidepalazzo/ticker-logos/main/ticker_icons";

export function StockIcon({ symbol, size = "md", className = "" }: StockIconProps) {
  const [hasError, setHasError] = useState(false);
  
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };
  
  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  if (hasError) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <Building2 className={`${iconSizeClasses[size]} text-muted-foreground`} />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-white dark:bg-zinc-800 flex items-center justify-center ${className}`}>
      <img
        src={`${TICKER_LOGOS_BASE_URL}/${symbol.toUpperCase()}.png`}
        alt={`${symbol} logo`}
        className="w-full h-full object-contain p-1"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}
