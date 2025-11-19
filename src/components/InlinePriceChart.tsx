import { useMemo } from "react";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface InlinePriceChartProps {
  sparklineData?: number[];
  priceChange24h?: number | null;
  className?: string;
}

/**
 * Compact inline price chart component for table rows
 * Shows 7-day price movement with proportional scaling
 */
const InlinePriceChart = ({ 
  sparklineData, 
  priceChange24h,
  className 
}: InlinePriceChartProps) => {
  // Use full 7-day sparkline data to match CoinGecko behavior
  // Sparkline typically has ~168 data points (7 days * 24 hours)
  const chartData = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) {
      return [];
    }
    
    // Transform to format needed by Recharts
    return sparklineData.map((price, index) => ({
      time: index,
      price: price,
    }));
  }, [sparklineData]);

  // Calculate price range for Y-axis domain
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 1 };
    
    const prices = chartData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return { min, max };
  }, [chartData]);

  // Determine color based on price change
  // Use chart-1 (green) for positive, chart-2 (red) for negative
  const lineColor = useMemo(() => {
    if (priceChange24h == null) return "hsl(var(--muted-foreground))";
    return priceChange24h >= 0 
      ? "hsl(var(--chart-1))" 
      : "hsl(var(--chart-2))";
  }, [priceChange24h]);

  // If no data, show placeholder
  if (!sparklineData || sparklineData.length === 0 || chartData.length === 0) {
    return (
      <div 
        className={cn(
          "w-20 h-8 flex items-center justify-center text-xs text-muted-foreground",
          className
        )}
      >
        N/A
      </div>
    );
  }

  return (
    <div className={cn("w-20 h-8", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis 
            domain={[
              (dataMin: number) => dataMin * 0.95,
              (dataMax: number) => dataMax * 1.05
            ]}
            hide={true}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InlinePriceChart;

