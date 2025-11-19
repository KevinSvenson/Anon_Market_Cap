import { cn } from "@/lib/utils";
import MarketCapChart from "./MarketCapChart";

interface MarketCapCardProps {
  marketCap: number | null | undefined;
  marketCapChange24h: number | null | undefined;
}

/**
 * Formats market cap as full number with commas
 */
const formatMarketCapFull = (num: number): string => {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

/**
 * MarketCapCard component showing total privacy coin market cap with detailed chart
 */
const MarketCapCard = ({ 
  marketCap, 
  marketCapChange24h
}: MarketCapCardProps) => {
  // Determine color based on 24h change
  const isPositive = marketCapChange24h != null && marketCapChange24h >= 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4">
        <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
          {marketCap != null ? formatMarketCapFull(marketCap) : "Loading..."}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Market Cap</span>
          {marketCapChange24h != null && (
            <span
              className={cn(
                "text-sm font-medium flex items-center gap-1",
                isPositive ? "text-positive" : "text-negative"
              )}
            >
              {isPositive ? "▲" : "▼"} {Math.abs(marketCapChange24h).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      
      {/* Integrated Market Cap Chart */}
      <div className="-mx-4 -mb-4">
        <MarketCapChart
          currentMarketCap={marketCap}
          marketCapChange24h={marketCapChange24h}
        />
      </div>
    </div>
  );
};

export default MarketCapCard;

