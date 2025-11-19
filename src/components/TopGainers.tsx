import { useState } from "react";
import { Cryptocurrency } from "@/services/coingecko";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopGainersProps {
  coins: Cryptocurrency[];
}

type Timeframe = "1h" | "24h" | "7d";
type MarketCapFilter = "all" | "top25" | "top50" | "top100";

/**
 * Formats a price value
 */
const formatPrice = (num: number): string => {
  if (num >= 1) return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${num.toFixed(6)}`;
};

/**
 * Get the price change percentage for a coin based on timeframe
 */
const getChangePercentage = (coin: Cryptocurrency, timeframe: Timeframe): number | null => {
  switch (timeframe) {
    case "1h":
      return coin.price_change_percentage_1h_in_currency ?? null;
    case "24h":
      return coin.price_change_percentage_24h ?? null;
    case "7d":
      return coin.price_change_percentage_7d_in_currency ?? null;
    default:
      return null;
  }
};

/**
 * TopGainers component showing top 7 gainers and top 7 losers with timeframe and market cap filtering
 */
const TopGainers = ({ coins }: TopGainersProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [marketCapFilter, setMarketCapFilter] = useState<MarketCapFilter>("all");

  // Safety check: ensure coins is an array
  const safeCoins = coins || [];

  // Filter coins by list position (top privacy coins by market cap)
  // The coins are already sorted by market cap from the API
  const filteredCoins = (() => {
    switch (marketCapFilter) {
      case "top25":
        return safeCoins.slice(0, 25);   // Positions 1-25 in privacy list
      case "top50":
        return safeCoins.slice(0, 50);   // Positions 1-50 in privacy list
      case "top100":
        return safeCoins.slice(0, 100);  // Positions 1-100 in privacy list
      case "all":
      default:
        return safeCoins;                // All privacy coins
    }
  })();

  // Get top 7 gainers by selected timeframe
  const topGainers = [...filteredCoins]
    .filter((coin) => {
      const changePercentage = getChangePercentage(coin, timeframe);
      return changePercentage != null && changePercentage > 0;
    })
    .sort((a, b) => {
      const aChange = getChangePercentage(a, timeframe) || 0;
      const bChange = getChangePercentage(b, timeframe) || 0;
      return bChange - aChange;
    })
    .slice(0, 7);

  // Get top 7 losers by selected timeframe
  const topLosers = [...filteredCoins]
    .filter((coin) => {
      const changePercentage = getChangePercentage(coin, timeframe);
      return changePercentage != null && changePercentage < 0;
    })
    .sort((a, b) => {
      const aChange = getChangePercentage(a, timeframe) || 0;
      const bChange = getChangePercentage(b, timeframe) || 0;
      return aChange - bChange;
    })
    .slice(0, 7);

  // Debug logging (can be removed later)
  if (topGainers.length === 0 && filteredCoins.length > 0) {
    console.log(`[TopGainers Debug] No gainers found for ${timeframe}:`, {
      totalCoins: safeCoins.length,
      filteredCoins: filteredCoins.length,
      marketCapFilter,
      timeframe,
      sampleCoinData: filteredCoins.slice(0, 3).map(c => ({
        name: c.name,
        rank: c.market_cap_rank,
        change_1h: c.price_change_percentage_1h_in_currency,
        change_24h: c.price_change_percentage_24h,
        change_7d: c.price_change_percentage_7d_in_currency
      }))
    });
  }

  // Get timeframe label
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case "1h": return "1H";
      case "24h": return "24H";
      case "7d": return "7D";
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Filter Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Timeframe:</span>
          <div className="inline-flex rounded-md border border-border" role="group">
            <button
              type="button"
              onClick={() => setTimeframe("1h")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                "border-r border-border",
                timeframe === "1h" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background text-foreground hover:bg-muted"
              )}
            >
              1H
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("24h")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                "border-r border-border",
                timeframe === "24h" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background text-foreground hover:bg-muted"
              )}
            >
              24H
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("7d")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                timeframe === "7d" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background text-foreground hover:bg-muted"
              )}
            >
              7D
            </button>
          </div>
        </div>

        {/* Market Cap Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Range:</span>
          <select
            value={marketCapFilter}
            onChange={(e) => setMarketCapFilter(e.target.value as MarketCapFilter)}
            className="px-3 py-1 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="top25">Top 25</option>
            <option value="top50">Top 50</option>
            <option value="top100">Top 100</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-positive" />
            <h3 className="text-sm font-semibold text-foreground">Top Gainers ({getTimeframeLabel()})</h3>
          </div>
          
          {topGainers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No gainers in this period</p>
          ) : (
            <div className="space-y-2">
              {topGainers.map((coin) => {
                const changePercentage = getChangePercentage(coin, timeframe);
                return (
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
                        ▲ {changePercentage != null ? changePercentage.toFixed(1) : "N/A"}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-negative" />
            <h3 className="text-sm font-semibold text-foreground">Top Losers ({getTimeframeLabel()})</h3>
          </div>
          
          {topLosers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No losers in this period</p>
          ) : (
            <div className="space-y-2">
              {topLosers.map((coin) => {
                const changePercentage = getChangePercentage(coin, timeframe);
                return (
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
                        ▼ {changePercentage != null ? Math.abs(changePercentage).toFixed(1) : "N/A"}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopGainers;

