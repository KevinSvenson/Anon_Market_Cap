import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, Info } from "lucide-react";
import Header from "@/components/Header";
import { fetchPrivacyCoins } from "@/services/coingecko";
import { formatFullNumber, formatLargeNumber, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getPrivacyMetadata, getAllPrivacyLevels } from "@/data/privacyMetadata";

type Timeframe = '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

const PrivacyMarket = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>('7D');
  const [chartType, setChartType] = useState<'marketCap' | 'volume'>('marketCap');

  const { data: coins, isLoading } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    staleTime: 120000,
  });

  // Calculate total privacy market metrics
  const totalMarketCap = useMemo(() => {
    return coins?.reduce((sum, coin) => sum + (coin.market_cap || 0), 0) || 0;
  }, [coins]);

  const total24hVolume = useMemo(() => {
    return coins?.reduce((sum, coin) => sum + (coin.total_volume || 0), 0) || 0;
  }, [coins]);

  // Calculate weighted market cap change (market-cap weighted average)
  const marketCapChange = useMemo(() => {
    if (!coins || coins.length === 0 || totalMarketCap === 0) return 0;
    const weightedChange = coins.reduce((sum, coin) => {
      const weight = (coin.market_cap || 0) / totalMarketCap;
      return sum + (weight * (coin.price_change_percentage_24h || 0));
    }, 0);
    return weightedChange;
  }, [coins, totalMarketCap]);

  // Generate chart data from sparklines - FIXED VERSION
  const chartData = useMemo(() => {
    if (!coins || coins.length === 0) return [];

    // Get top coins with valid sparkline data
    const topCoins = [...coins]
      .filter(coin => 
        coin.sparkline_in_7d?.price && 
        coin.sparkline_in_7d.price.length > 0 &&
        coin.current_price > 0 &&
        coin.market_cap > 0
      )
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 10); // Top 10 coins for better aggregation

    if (topCoins.length === 0) return [];

    // Find minimum sparkline length (use shortest to avoid index errors)
    const minSparklineLength = Math.min(
      ...topCoins.map(coin => coin.sparkline_in_7d!.price.length)
    );

    if (minSparklineLength === 0) return [];

    // Determine data slice based on timeframe
    let dataPoints: number;
    switch (timeframe) {
      case '1D': dataPoints = Math.min(24, minSparklineLength); break;
      case '7D': dataPoints = minSparklineLength; break;
      default: dataPoints = minSparklineLength;
    }

    const startIndex = Math.max(0, minSparklineLength - dataPoints);
    const history: Array<{ time: string; timestamp: number; marketCap: number; volume: number }> = [];

    for (let i = startIndex; i < minSparklineLength; i++) {
      let totalMarketCapAtPoint = 0;
      let totalVolumeAtPoint = 0;
      let validCoins = 0;

      topCoins.forEach(coin => {
        const sparkline = coin.sparkline_in_7d!.price;

        // Safety check for index bounds
        if (i >= sparkline.length) return;

        const priceAtPoint = sparkline[i];
        const currentPrice = coin.current_price;

        // Skip if invalid data
        if (!priceAtPoint || !currentPrice || currentPrice === 0) return;

        const priceRatio = priceAtPoint / currentPrice;

        // Skip if ratio seems wrong (sanity check)
        if (priceRatio <= 0 || priceRatio > 10 || isNaN(priceRatio) || !isFinite(priceRatio)) return;

        totalMarketCapAtPoint += (coin.market_cap || 0) * priceRatio;
        totalVolumeAtPoint += (coin.total_volume || 0) * priceRatio;
        validCoins++;
      });

      // Only add point if we have valid data
      if (validCoins > 0 && totalMarketCapAtPoint > 0) {
        // Calculate time label
        const hoursAgo = minSparklineLength - i;
        const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

        history.push({
          time: date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
          }),
          timestamp: date.getTime(),
          marketCap: totalMarketCapAtPoint,
          volume: totalVolumeAtPoint,
        });
      }
    }

    // Filter out any outliers (data points that are >50% different from neighbors)
    const filtered = history.filter((point, index) => {
      if (index === 0 || index === history.length - 1) return true;

      const prev = history[index - 1].marketCap;
      const next = history[index + 1].marketCap;
      const current = point.marketCap;
      const avg = (prev + next) / 2;

      // If current is more than 50% different from average of neighbors, skip it
      if (avg === 0) return true;
      const diff = Math.abs(current - avg) / avg;
      return diff < 0.5;
    });

    return filtered;
  }, [coins, timeframe]);

  // Stats breakdown by privacy level
  const statsByPrivacyLevel = useMemo(() => {
    if (!coins) return { high: 0, medium: 0, minimal: 0 };

    const stats = { high: 0, medium: 0, minimal: 0 };

    coins.forEach(coin => {
      const metadata = getPrivacyMetadata(coin.id);
      const level = metadata?.privacyLevel?.toLowerCase() || 'minimal';
      if (level === 'high') stats.high += coin.market_cap || 0;
      else if (level === 'medium') stats.medium += coin.market_cap || 0;
      else stats.minimal += coin.market_cap || 0;
    });

    return stats;
  }, [coins]);

  const timeframes: Timeframe[] = ['1D', '7D', '30D', '90D', '1Y', 'ALL'];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Cryptocurrency Market</h1>
        <p className="text-muted-foreground mb-8">
          Total market overview for {coins?.length || 0} privacy-focused cryptocurrencies
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              chartType === 'marketCap' && "ring-2 ring-primary"
            )}
            onClick={() => setChartType('marketCap')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Market Cap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${formatFullNumber(totalMarketCap)}
              </div>
              <div className={cn(
                "text-sm font-medium flex items-center gap-1 mt-1",
                marketCapChange >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {marketCapChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {marketCapChange >= 0 ? "+" : ""}{marketCapChange.toFixed(2)}% (24h)
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              chartType === 'volume' && "ring-2 ring-primary"
            )}
            onClick={() => setChartType('volume')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Trading Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${formatLargeNumber(total24hVolume)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Across all privacy coins
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Coins Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coins?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Privacy cryptocurrencies
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>
                {chartType === 'marketCap' ? 'Market Cap' : '24h Volume'} History
              </CardTitle>

              {/* Timeframe Buttons */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {timeframes.map(tf => (
                  <Button
                    key={tf}
                    variant={timeframe === tf ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      "px-3 py-1 text-xs",
                      timeframe === tf && "bg-background shadow-sm"
                    )}
                    disabled={!['1D', '7D'].includes(tf)} // Only 1D and 7D have sparkline data
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading chart data...</div>
                </div>
              ) : chartData.length < 2 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    Insufficient data for chart. Try refreshing.
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={marketCapChange >= 0 ? "#10b981" : "#ef4444"}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={marketCapChange >= 0 ? "#10b981" : "#ef4444"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 11 }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 11 }}
                      tickFormatter={(value) => `$${formatLargeNumber(value)}`}
                      domain={[
                        (dataMin: number) => dataMin * 0.98,
                        (dataMax: number) => dataMax * 1.02
                      ]}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        padding: '12px',
                        color: 'hsl(var(--foreground))',
                      }}
                      formatter={(value: number) => [
                        `$${formatFullNumber(value)}`,
                        chartType === 'marketCap' ? 'Market Cap' : 'Volume'
                      ]}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartType}
                      stroke={marketCapChange >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      fill="url(#colorValue)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* By Privacy Level */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Cap by Privacy Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm font-medium">High Privacy</span>
                  </div>
                  <span className="text-sm font-bold">
                    ${formatLargeNumber(statsByPrivacyLevel.high)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${totalMarketCap > 0 ? (statsByPrivacyLevel.high / totalMarketCap) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <div className="w-2 h-2 rounded-full bg-muted"></div>
                    </div>
                    <span className="text-sm font-medium">Medium Privacy</span>
                  </div>
                  <span className="text-sm font-bold">
                    ${formatLargeNumber(statsByPrivacyLevel.medium)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${totalMarketCap > 0 ? (statsByPrivacyLevel.medium / totalMarketCap) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      <div className="w-2 h-2 rounded-full bg-muted"></div>
                      <div className="w-2 h-2 rounded-full bg-muted"></div>
                    </div>
                    <span className="text-sm font-medium">Minimal Privacy</span>
                  </div>
                  <span className="text-sm font-bold">
                    ${formatLargeNumber(statsByPrivacyLevel.minimal)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gray-500 h-2 rounded-full"
                    style={{ width: `${totalMarketCap > 0 ? (statsByPrivacyLevel.minimal / totalMarketCap) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Methodology */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-4 w-4" />
                Methodology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Market Cap Calculation:</strong> Sum of all tracked privacy cryptocurrency market capitalizations.
              </p>
              <p>
                <strong className="text-foreground">Volume Calculation:</strong> Sum of 24-hour trading volume across all tracked privacy coins.
              </p>
              <p>
                <strong className="text-foreground">Data Source:</strong> CoinGecko API with real-time updates every 3 minutes.
              </p>
              <p>
                <strong className="text-foreground">Inclusion Criteria:</strong> Cryptocurrencies with privacy-enhancing features including stealth addresses, ring signatures, zero-knowledge proofs, and more.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyMarket;

