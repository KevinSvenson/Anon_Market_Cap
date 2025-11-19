import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

interface CoinPriceChartProps {
  sparklineData?: number[];
  priceChange24h?: number | null;
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
 * Price chart component showing 7-day trend from sparkline data
 */
const CoinPriceChart = ({ 
  sparklineData, 
  priceChange24h,
  coinName 
}: CoinPriceChartProps) => {
  // Transform sparkline data for chart
  const chartData = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return [];
    
    // CoinGecko provides ~168 data points (7 days * 24 hours)
    // We'll sample every 6th point to get ~28 points for better visibility
    const samplingRate = Math.max(1, Math.floor(sparklineData.length / 28));
    
    return sparklineData
      .map((price, index) => {
        // Calculate approximate timestamp (7 days ago to now)
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const timestamp = sevenDaysAgo + (index / sparklineData.length) * (7 * 24 * 60 * 60 * 1000);
        const date = new Date(timestamp);
        
        return {
          time: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          price: price,
          fullTime: date.toLocaleString(),
          timestamp: timestamp,
        };
      })
      .filter((_, index) => index % samplingRate === 0);
  }, [sparklineData]);

  // Determine line color based on 24h change
  const lineColor = useMemo(() => {
    if (priceChange24h == null) return "hsl(var(--muted-foreground))";
    return priceChange24h >= 0 
      ? "hsl(var(--chart-1))" 
      : "hsl(var(--chart-2))";
  }, [priceChange24h]);

  // Calculate Y-axis domain with padding
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 0];
    
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // If all values are identical, add 5% padding above and below
    if (minPrice === maxPrice) {
      const padding = minPrice * 0.05;
      return [Math.max(0, minPrice - padding), maxPrice + padding];
    }
    
    // Calculate range and add 10% padding above and below
    const range = maxPrice - minPrice;
    const padding = range * 0.1;
    
    const minDomain = Math.max(0, minPrice - padding);
    const maxDomain = maxPrice + padding;
    
    return [minDomain, maxDomain];
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{data.fullTime}</p>
          <p className="text-sm font-semibold text-foreground">
            {formatPriceValue(data.price)}
          </p>
        </div>
      );
    }
    return null;
  };

  // If no data, show message
  if (!sparklineData || chartData.length === 0) {
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
      <div className="px-4 mb-2">
        <h3 className="text-sm font-semibold text-foreground">
          {coinName} - 7 Day Price Chart
        </h3>
        {priceChange24h != null && (
          <p className={cn(
            "text-xs mt-1",
            priceChange24h >= 0 ? "text-positive" : "text-negative"
          )}>
            {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}% (24h)
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '11px' }}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            domain={yAxisDomain}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '11px' }}
            tickFormatter={formatPriceValue}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CoinPriceChart;

