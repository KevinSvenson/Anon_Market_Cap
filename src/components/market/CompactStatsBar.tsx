import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn, formatFullNumber, formatLargeNumber } from "@/lib/utils";
import { calculateAnon20Value, calculateAnon20Change, hasAnon20Launched } from "@/lib/anon20";
import { getPrivacyMetadata } from "@/data/privacyMetadata";
import type { Cryptocurrency } from "@/services/coingecko";

interface CompactStatsBarProps {
  marketCap: number | null;
  marketCapChange24h: number | null;
  anon20Value: number | null;
  anon20Change: number | null;
  volume24h: number | null;
  volumeChange24h: number | null;
  coins?: Cryptocurrency[];
}

const CompactStatsBar = ({
  marketCap,
  marketCapChange24h,
  anon20Value,
  anon20Change,
  volume24h,
  volumeChange24h,
  coins,
}: CompactStatsBarProps) => {
  // Calculate current totals from coins if provided
  const totalMarketCap = useMemo(() => {
    if (coins && coins.length > 0) {
      return coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
    }
    return marketCap || 0;
  }, [coins, marketCap]);

  const total24hVolume = useMemo(() => {
    if (coins && coins.length > 0) {
      return coins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
    }
    return volume24h || 0;
  }, [coins, volume24h]);

  // Calculate 24h changes
  const marketCapChange = useMemo(() => {
    if (coins && coins.length > 0 && totalMarketCap > 0) {
      const totalChange = coins.reduce((sum, coin) => {
        const weight = (coin.market_cap || 0) / totalMarketCap;
        return sum + (weight * (coin.price_change_percentage_24h || 0));
      }, 0);
      return totalChange;
    }
    return marketCapChange24h || 0;
  }, [coins, totalMarketCap, marketCapChange24h]);

  const volumeChange = useMemo(() => {
    if (coins && coins.length > 0) {
      const changes = coins
        .filter(coin => coin.price_change_percentage_24h !== null && coin.price_change_percentage_24h !== undefined)
        .map(coin => coin.price_change_percentage_24h || 0);
      return changes.length > 0 
        ? changes.reduce((a, b) => a + b, 0) / changes.length 
        : (volumeChange24h || 0);
    }
    return volumeChange24h || 0;
  }, [coins, volumeChange24h]);

  // ANON20 calculations
  const calculatedAnon20Value = useMemo(() => {
    if (!coins || coins.length === 0) return anon20Value || 20;
    try {
      return calculateAnon20Value(coins);
    } catch (error) {
      console.error('ANON20 calculation error:', error);
      return anon20Value || 20;
    }
  }, [coins, anon20Value]);

  const calculatedAnon20Change = useMemo(() => {
    if (!coins || coins.length === 0) return anon20Change || 0;
    try {
      return calculateAnon20Change(coins);
    } catch (error) {
      console.error('ANON20 change calculation error:', error);
      return anon20Change || 0;
    }
  }, [coins, anon20Change]);

  // Generate 24-hour sparkline data (last 24 hours only)
  const get24HourSparklineData = (
    coins: Cryptocurrency[],
    type: 'marketCap' | 'volume' | 'anon20'
  ) => {
    if (!coins || coins.length === 0) return [];

    const top = type === 'anon20'
      ? coins.filter(coin => {
          const metadata = getPrivacyMetadata(coin.id);
          return metadata?.privacyLevel === 'High';
        })
          .filter(coin => coin.market_cap && coin.market_cap > 0)
          .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
          .slice(0, 20)
      : [...coins]
          .filter(coin => coin.market_cap && coin.market_cap > 0)
          .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
          .slice(0, 10);

    const hasSparklines = top.length > 0 && top.every(coin =>
      coin.sparkline_in_7d?.price && coin.sparkline_in_7d.price.length > 0
    );

    if (!hasSparklines) return [];

    // Get last 24 hours (24 data points from 168-point 7-day sparkline)
    const sparklineLength = 24;
    const totalLength = top[0].sparkline_in_7d!.price.length;
    const startIndex = Math.max(0, totalLength - sparklineLength);
    const history = [];

    if (type === 'anon20') {
      const BASE_VALUE = 20;
      const totalMarketCap = top.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);

      if (totalMarketCap === 0) return [];

      for (let i = startIndex; i < totalLength; i++) {
        let weightedChange = 0;

        top.forEach(coin => {
          const weight = (coin.market_cap || 0) / totalMarketCap;
          const priceAtPoint = coin.sparkline_in_7d!.price[i];
          const basePrice = coin.sparkline_in_7d!.price[startIndex];

          if (basePrice > 0 && priceAtPoint > 0) {
            const percentageChange = ((priceAtPoint - basePrice) / basePrice) * 100;
            weightedChange += percentageChange * weight;
          }
        });

        const indexValue = BASE_VALUE * (1 + weightedChange / 100);
        history.push({ value: indexValue });
      }
    } else {
      for (let i = startIndex; i < totalLength; i++) {
        let totalAtPoint = 0;

        top.forEach(coin => {
          const priceAtPoint = coin.sparkline_in_7d!.price[i];
          const currentPrice = coin.current_price;
          const currentValue = type === 'marketCap' ? (coin.market_cap || 0) : (coin.total_volume || 0);

          if (currentPrice > 0 && priceAtPoint > 0) {
            const priceRatio = priceAtPoint / currentPrice;
            const valueAtPoint = currentValue * priceRatio;
            totalAtPoint += valueAtPoint;
          }
        });

        history.push({ value: totalAtPoint });
      }
    }

    return history;
  };

  const marketCapHistory = useMemo(() =>
    get24HourSparklineData(coins || [], 'marketCap'),
    [coins]
  );

  const volumeHistory = useMemo(() =>
    get24HourSparklineData(coins || [], 'volume'),
    [coins]
  );

  const anon20History = useMemo(() =>
    get24HourSparklineData(coins || [], 'anon20'),
    [coins]
  );

  return (
    <div className="border-b border-border bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* 1. Market Cap */}
          <Link
            to="/privacy-market"
            className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-5 hover:bg-accent/50 transition-all hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">
                Market Cap
              </span>
              {marketCapChange != null && (
                <span className={cn(
                  "text-xs font-medium",
                  marketCapChange >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {marketCapChange >= 0 ? "▲" : "▼"} {Math.abs(marketCapChange).toFixed(2)}%
                </span>
              )}
            </div>

            <div className="text-2xl font-bold mb-2 break-words">
              {totalMarketCap != null ? `$${formatFullNumber(totalMarketCap)}` : "Loading..."}
            </div>

            <div className="w-full h-16">
              {marketCapHistory.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">No data</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={marketCapHistory}
                    margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
                  >
                    <YAxis
                      hide
                      domain={['dataMin * 0.98', 'dataMax * 1.02']}
                    />
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke={marketCapChange >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Link>

          {/* 2. 24h Trading Volume */}
          <Link
            to="/privacy-market"
            className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-5 hover:bg-accent/50 transition-all hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">
                24h Trading Volume
              </span>
              {volumeChange != null && (
                <span className={cn(
                  "text-xs font-medium",
                  volumeChange >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {volumeChange >= 0 ? "▲" : "▼"} {Math.abs(volumeChange).toFixed(2)}%
                </span>
              )}
            </div>

            <div className="text-2xl font-bold mb-2 break-words">
              {total24hVolume != null ? formatLargeNumber(total24hVolume) : "N/A"}
            </div>

            <div className="w-full h-16">
              {volumeHistory.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">No data</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={volumeHistory}
                    margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
                  >
                    <YAxis
                      hide
                      domain={['dataMin * 0.98', 'dataMax * 1.02']}
                    />
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke={volumeChange >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Link>

          {/* 3. ANON20 */}
          <Link
            to="/anon20"
            className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-5 hover:bg-accent/50 transition-all hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">
                ANON20
              </span>
              {hasAnon20Launched() && calculatedAnon20Change != null && (
                <span className={cn(
                  "text-xs font-medium",
                  calculatedAnon20Change >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {calculatedAnon20Change >= 0 ? "▲" : "▼"} {Math.abs(calculatedAnon20Change).toFixed(2)}%
                </span>
              )}
            </div>

            <div className="text-2xl font-bold mb-2">
              {calculatedAnon20Value > 0 ? `$${calculatedAnon20Value.toFixed(2)}` : '$20.00'}
            </div>

            <div className="w-full h-16">
              {!hasAnon20Launched() ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">Launches Sept 28, 2025</div>
                </div>
              ) : anon20History.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">No data</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={anon20History}
                    margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
                  >
                    <YAxis
                      hide
                      domain={['dataMin * 0.98', 'dataMax * 1.02']}
                    />
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke={calculatedAnon20Change >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompactStatsBar;
