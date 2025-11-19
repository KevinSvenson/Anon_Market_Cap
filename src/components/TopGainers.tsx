import { Cryptocurrency } from "@/services/coingecko";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopGainersProps {
  coins: Cryptocurrency[];
}

/**
 * Formats a price value
 */
const formatPrice = (num: number): string => {
  if (num >= 1) return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${num.toFixed(6)}`;
};

/**
 * TopGainers component showing top 7 gainers and top 7 losers by 24h change
 */
const TopGainers = ({ coins }: TopGainersProps) => {
  // Get top 7 gainers by 24h price change
  const topGainers = [...coins]
    .filter((coin) => coin.price_change_percentage_24h != null && coin.price_change_percentage_24h > 0)
    .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
    .slice(0, 7);

  // Get top 7 losers by 24h price change
  const topLosers = [...coins]
    .filter((coin) => coin.price_change_percentage_24h != null && coin.price_change_percentage_24h < 0)
    .sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
    .slice(0, 7);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-positive" />
            <h3 className="text-sm font-semibold text-foreground">Top Gainers</h3>
          </div>
          
          {topGainers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No gainers today</p>
          ) : (
            <div className="space-y-2">
              {topGainers.map((coin) => (
                <div key={coin.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      loading="lazy"
                    />
                    <span className="text-xs font-medium text-foreground truncate">
                      {coin.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-xs text-foreground">
                      {formatPrice(coin.current_price)}
                    </span>
                    <span className="text-xs font-medium text-positive">
                      ▲ {coin.price_change_percentage_24h?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-negative" />
            <h3 className="text-sm font-semibold text-foreground">Top Losers</h3>
          </div>
          
          {topLosers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No losers today</p>
          ) : (
            <div className="space-y-2">
              {topLosers.map((coin) => (
                <div key={coin.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      loading="lazy"
                    />
                    <span className="text-xs font-medium text-foreground truncate">
                      {coin.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-xs text-foreground">
                      {formatPrice(coin.current_price)}
                    </span>
                    <span className="text-xs font-medium text-negative">
                      ▼ {Math.abs(coin.price_change_percentage_24h || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopGainers;

