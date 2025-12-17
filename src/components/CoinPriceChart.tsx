import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";

interface ChartDataPoint {
  timestamp: number;
  price: number;
  date: string;
}

interface CoinPriceChartProps {
  chartData: ChartDataPoint[];
  timeframe: '1h' | '24h' | '7d';
  timeframeChange: number | null;
  coinName: string;
}

/**
 * Formats a price value for display
 */
const formatPriceValue = (num: number): string => {
  if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (num >= 1) return `$${num.toFixed(2)}`;
  if (num >= 0.01) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(6)}`;
};

/**
 * Price chart component showing price trend with multiple timeframes
 */
const CoinPriceChart = ({ 
  chartData,
  timeframe,
  timeframeChange,
  coinName 
}: CoinPriceChartProps) => {
  // Calculate high and low from chart data
  const { high, low } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { high: null, low: null };
    }
    const prices = chartData.map(d => d.price);
    return {
      high: Math.max(...prices),
      low: Math.min(...prices),
    };
  }, [chartData]);
  
  // Determine line color based on timeframe change
  const lineColor = useMemo(() => {
    if (timeframeChange == null) return "hsl(var(--muted-foreground))";
    return timeframeChange >= 0 
      ? "hsl(var(--chart-1))" 
      : "hsl(var(--chart-2))";
  }, [timeframeChange]);

  // Calculate Y-axis domain with padding and nice round ticks
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    if (!chartData || chartData.length === 0) return { yAxisDomain: [0, 0], yAxisTicks: [] };
    
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // If all values are identical, add 5% padding above and below
    if (minPrice === maxPrice) {
      const padding = minPrice * 0.05;
      const minDomain = Math.max(0, minPrice - padding);
      const maxDomain = maxPrice + padding;
      const midDomain = (minDomain + maxDomain) / 2;
      return { 
        yAxisDomain: [minDomain, maxDomain], 
        yAxisTicks: [minDomain, midDomain, maxDomain]
      };
    }
    
    // Calculate range and add 10% padding above and below
    const range = maxPrice - minPrice;
    const padding = range * 0.1;
    
    const minDomain = Math.max(0, minPrice - padding);
    const maxDomain = maxPrice + padding;
    const domainRange = maxDomain - minDomain;
    
    // Calculate nice round ticks (5 ticks total)
    const tickCount = 5;
    const rawStep = domainRange / (tickCount - 1);
    
    // Round to nice numbers (1, 2, 5, 10, 20, 50, 100, etc.)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;
    let niceStep;
    
    if (normalizedStep <= 1) niceStep = 1;
    else if (normalizedStep <= 2) niceStep = 2;
    else if (normalizedStep <= 5) niceStep = 5;
    else niceStep = 10;
    
    niceStep = niceStep * magnitude;
    
    // Calculate nice min (round down to nearest nice step)
    const niceMin = Math.floor(minDomain / niceStep) * niceStep;
    
    // Calculate nice max (round up to nearest nice step)
    const niceMax = Math.ceil(maxDomain / niceStep) * niceStep;
    
    // Generate evenly spaced ticks
    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      const tick = niceMin + (niceStep * i);
      if (tick <= niceMax) {
        ticks.push(tick);
      }
    }
    
    // Ensure we have at least 3 ticks
    if (ticks.length < 3) {
      ticks.length = 0;
      ticks.push(niceMin, (niceMin + niceMax) / 2, niceMax);
    }
    
    return {
      yAxisDomain: [ticks[0], ticks[ticks.length - 1]],
      yAxisTicks: ticks
    };
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.timestamp);
      return (
        <div className="bg-background border border-border rounded-md p-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{date.toLocaleString()}</p>
          <p className="text-sm font-semibold text-foreground">
            {formatPriceValue(data.price)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Chart title based on timeframe
  const chartTitle = useMemo(() => {
    const titles: Record<'1h' | '24h' | '7d', string> = {
      '1h': `${coinName} - 1 Hour Price Chart`,
      '24h': `${coinName} - 24 Hour Price Chart`,
      '7d': `${coinName} - 7 Day Price Chart`,
    };
    return titles[timeframe];
  }, [coinName, timeframe]);

  // Determine X-axis interval based on timeframe
  const xAxisInterval = useMemo(() => {
    if (timeframe === '1h') return 10;
    if (timeframe === '24h') return 15;
    return 24; // 7d
  }, [timeframe]);

  // If no data, show message (AFTER all hooks)
  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-sm text-muted-foreground">
          No price chart data available
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {timeframeChange != null && (
        <div className="px-4 mb-2">
          <p className={cn(
            "text-xs",
            timeframeChange >= 0 ? "text-positive" : "text-negative"
          )}>
            {timeframeChange >= 0 ? "+" : ""}{timeframeChange.toFixed(2)}% ({timeframe.toUpperCase()})
          </p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 80, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '11px' }}
            interval={xAxisInterval}
            angle={timeframe === '1h' ? -45 : timeframe === '24h' ? -45 : 0}
            textAnchor={timeframe === '1h' || timeframe === '24h' ? "end" : "middle"}
            height={timeframe === '1h' || timeframe === '24h' ? 60 : 30}
            tickMargin={8}
          />
          <YAxis 
            domain={yAxisDomain}
            ticks={yAxisTicks.length > 0 ? yAxisTicks : undefined}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => {
              // Format with appropriate decimal places based on value
              if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
              if (value >= 1) return `$${value.toFixed(0)}`;
              if (value >= 0.01) return `$${value.toFixed(2)}`;
              return `$${value.toFixed(4)}`;
            }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* High Reference Line */}
          {high != null && (
            <ReferenceLine
              y={high}
              label={{ 
                value: `High: ${formatPriceValue(high)}`, 
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11,
                offset: 5
              }}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          )}
          {/* Low Reference Line */}
          {low != null && (
            <ReferenceLine
              y={low}
              label={{ 
                value: `Low: ${formatPriceValue(low)}`, 
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11,
                offset: 5
              }}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          )}
          <Line
            type="linear"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CoinPriceChart;

