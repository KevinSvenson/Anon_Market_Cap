import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, Info } from "lucide-react";
import Header from "@/components/Header";
import { fetchPrivacyCoins } from "@/services/coingecko";
import { getAnon20Constituents, calculateAnon20Value, calculateAnon20Change, getAnon20BaseInfo, hasAnon20Launched, getAnon20History } from "@/lib/anon20";
import { formatLargeNumber, formatFullNumber, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Timeframe = '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

const Anon20 = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>('7D');

  const { data: coins, isLoading } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    staleTime: 120000,
  });

  const constituents = useMemo(() => {
    if (!coins) return [];
    return getAnon20Constituents(coins);
  }, [coins]);

  const indexValue = useMemo(() => {
    if (!coins) return 0;
    return calculateAnon20Value(coins);
  }, [coins]);

  const indexChange = useMemo(() => {
    if (!coins) return 0;
    return calculateAnon20Change(coins);
  }, [coins]);

  const baseInfo = useMemo(() => {
    if (!coins || coins.length === 0) return null;
    return getAnon20BaseInfo(coins);
  }, [coins]);

  const launched = hasAnon20Launched();

  // Generate chart data from historical data and sparklines
  const chartData = useMemo(() => {
    if (!coins || coins.length === 0) return [];

    // Get historical data from localStorage
    const history = getAnon20History();
    
    // If we have historical data, use it
    if (history.length > 0) {
      // Filter by timeframe
      const now = Date.now();
      let filteredHistory = history;
      
      if (timeframe === '1D') {
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        filteredHistory = history.filter(h => new Date(h.timestamp).getTime() >= oneDayAgo);
      } else if (timeframe === '7D') {
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        filteredHistory = history.filter(h => new Date(h.timestamp).getTime() >= sevenDaysAgo);
      } else if (timeframe === '30D') {
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        filteredHistory = history.filter(h => new Date(h.timestamp).getTime() >= thirtyDaysAgo);
      } else if (timeframe === '90D') {
        const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
        filteredHistory = history.filter(h => new Date(h.timestamp).getTime() >= ninetyDaysAgo);
      } else if (timeframe === '1Y') {
        const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
        filteredHistory = history.filter(h => new Date(h.timestamp).getTime() >= oneYearAgo);
      }
      // 'ALL' uses all history

      if (filteredHistory.length > 0) {
        return filteredHistory.map(h => ({
          time: new Date(h.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          timestamp: new Date(h.timestamp).getTime(),
          value: h.value,
        }));
      }
    }

    // Fallback: Generate data from sparklines (similar to PrivacyMarket)
    const top20 = constituents.slice(0, 20);
    const hasSparklines = top20.some(coin => {
      const coinData = coins.find(c => c.id === coin.id);
      return coinData?.sparkline_in_7d?.price && coinData.sparkline_in_7d.price.length > 0;
    });

    if (!hasSparklines) return [];

    // Find max sparkline length
    const maxSparklineLength = Math.max(
      ...top20.map(coin => {
        const coinData = coins.find(c => c.id === coin.id);
        return coinData?.sparkline_in_7d?.price?.length || 0;
      })
    );

    if (maxSparklineLength === 0) return [];

    let dataPoints: number;
    switch (timeframe) {
      case '1D': dataPoints = 24; break;
      case '7D': dataPoints = 168; break;
      default: dataPoints = 168;
    }

    const startIndex = Math.max(0, maxSparklineLength - dataPoints);
    const sparklineHistory: Array<{ time: string; timestamp: number; value: number }> = [];

    for (let i = startIndex; i < maxSparklineLength; i++) {
      // Calculate weighted index value at this point
      let totalMarketCapAtPoint = 0;
      let totalBaseMarketCap = 0;

      top20.forEach(coin => {
        const coinData = coins.find(c => c.id === coin.id);
        if (!coinData) return;

        const sparkline = coinData.sparkline_in_7d?.price;
        if (!sparkline || sparkline.length <= i) {
          totalMarketCapAtPoint += coin.marketCap;
          return;
        }

        const priceAtPoint = sparkline[i];
        const currentPrice = coinData.current_price || 1;
        const priceRatio = priceAtPoint / currentPrice;

        totalMarketCapAtPoint += coin.marketCap * priceRatio;
      });

      // Get base market cap from localStorage
      const baseMarketCapStr = localStorage.getItem('anon20_base_market_cap');
      const baseMarketCap = baseMarketCapStr ? parseFloat(baseMarketCapStr) : 1;
      
      // Calculate index value: 20 * (current_market_cap / base_market_cap)
      const indexValueAtPoint = 20 * (totalMarketCapAtPoint / baseMarketCap);

      const hoursAgo = maxSparklineLength - i;
      const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      sparklineHistory.push({
        time: date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: date.getTime(),
        value: indexValueAtPoint,
      });
    }

    return sparklineHistory;
  }, [coins, constituents, timeframe]);

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

        <h1 className="text-3xl font-bold mb-2">ANON20 Index</h1>
        <p className="text-muted-foreground mb-8">
          Market-cap weighted index of the top 20 high-privacy cryptocurrencies
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Index Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {launched ? `$${indexValue.toFixed(2)}` : '$20.00'}
              </div>
              {launched ? (
                <div className={cn(
                  "text-sm font-medium flex items-center gap-1 mt-1",
                  indexChange >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {indexChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {indexChange >= 0 ? "+" : ""}{indexChange.toFixed(2)}% (24h)
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mt-1">
                  Launching September 28, 2025
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-bold",
                indexChange >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {indexChange >= 0 ? "+" : ""}{indexChange.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Weighted average
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Constituents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {constituents.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Top 20 high-privacy coins
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>ANON20 Index History</CardTitle>

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
                    disabled={!launched && tf !== 'ALL'}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {isLoading || chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {isLoading ? 'Loading chart data...' : launched ? 'No historical data available yet' : 'Index launches September 28, 2025'}
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAnon20" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={indexChange >= 0 ? "#10b981" : "#ef4444"}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={indexChange >= 0 ? "#10b981" : "#ef4444"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      domain={['dataMin * 0.95', 'dataMax * 1.05']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        'ANON20 Value'
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={indexChange >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      fill="url(#colorAnon20)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Holdings Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Index Constituents (Top 20 High-Privacy Coins)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {constituents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No constituents available</p>
              ) : (
                constituents.map((coin, index) => (
                  <Link
                    key={coin.id}
                    to={`/coin/${coin.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                      <div>
                        <div className="font-medium">{coin.name}</div>
                        <div className="text-sm text-muted-foreground">{coin.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Weight: {(coin.weight * 100).toFixed(2)}%
                      </div>
                      <div className="font-medium">
                        ${formatLargeNumber(coin.marketCap)}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Methodology */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Info className="h-4 w-4" />
              Index Methodology
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-2">Calculation Method</h4>
              <p className="text-sm text-muted-foreground">
                ANON20 is calculated as a market-cap weighted index of the top 20 high-privacy 
                cryptocurrencies. Base value: $20. Formula: 20 × (current_total_market_cap / base_market_cap)
              </p>
            </div>
            
            {baseInfo && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Baseline Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Value:</span>
                    <span className="font-medium">${baseInfo.baseValue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Launch Date:</span>
                    <span className="font-medium">{baseInfo.launchDate}</span>
                  </div>
                  {baseInfo.hasLaunched ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Days Since Launch:</span>
                        <span className="font-medium">{baseInfo.daysSinceLaunch} {baseInfo.daysSinceLaunch === 1 ? 'day' : 'days'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Market Cap:</span>
                        <span className="font-medium">
                          ${(baseInfo.baseMarketCap / 1e9).toFixed(2)}B
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days Until Launch:</span>
                      <span className="font-medium">{baseInfo.daysUntilLaunch} {baseInfo.daysUntilLaunch === 1 ? 'day' : 'days'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-semibold mb-2">Constituent Criteria</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Privacy Level: High only</li>
                <li>Selection: Top 20 by market capitalization</li>
                <li>Weighting: Market-cap weighted</li>
                <li>Rebalancing: Automatic based on current market caps</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Data Source</h4>
              <p className="text-sm text-muted-foreground">
                CoinGecko API with real-time updates every 3 minutes. Historical data is stored locally and updated daily.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Anon20;


