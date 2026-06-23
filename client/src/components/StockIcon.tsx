import { useState } from "react";
import { Building2, Rocket, Landmark } from "lucide-react";

interface StockIconProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TICKER_LOGOS_BASE_URL = "https://raw.githubusercontent.com/davidepalazzo/ticker-logos/main/ticker_icons";

const sizeClasses = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-14 h-14" };
const iconSizeClasses = { sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-7 h-7" };
const textSizeClasses = { sm: "text-[8px]", md: "text-[10px]", lg: "text-xs" };

const CUSTOM_ICONS: Record<string, { bg: string; icon: React.FC<{ className?: string }> | null; label?: string }> = {
  SPACEX: { bg: "bg-slate-900 dark:bg-slate-800", icon: Rocket },
  "BRK-B": { bg: "bg-blue-900 dark:bg-blue-800", icon: Landmark },
};

export function StockIcon({ symbol, size = "md", className = "" }: StockIconProps) {
  const [hasError, setHasError] = useState(false);

  const upper = (symbol ?? "").toUpperCase();
  const custom = CUSTOM_ICONS[upper];

  const wrapBase = `${sizeClasses[size]} rounded-lg flex items-center justify-center flex-shrink-0 ${className}`;

  if (custom) {
    const Icon = custom.icon;
    return (
      <div className={`${wrapBase} ${custom.bg}`}>
        {Icon ? (
          <Icon className={`${iconSizeClasses[size]} text-white`} />
        ) : (
          <span className={`${textSizeClasses[size]} font-bold text-white`}>{upper.slice(0, 3)}</span>
        )}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${wrapBase} bg-muted`}>
        <Building2 className={`${iconSizeClasses[size]} text-muted-foreground`} />
      </div>
    );
  }

  return (
    <div className={`${wrapBase} bg-white dark:bg-zinc-800 overflow-hidden`}>
      <img
        src={`${TICKER_LOGOS_BASE_URL}/${upper}.png`}
        alt={`${symbol} logo`}
        className="w-full h-full object-contain p-1"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}
