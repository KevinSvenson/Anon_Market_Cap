import { useMemo, useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface MarketCapChartProps {
  currentMarketCap: number | null | undefined;
  marketCapChange24h: number | null | undefined;
}

interface MarketCapDataPoint {
  timestamp: number;
  marketCap: number;
}

const STORAGE_KEY = "privacy_coin_market_cap_history";
const MAX_DATA_POINTS = 288; // Store last 24 hours of data (24 hours * 60 minutes / 5 minutes = 288)
const DATA_POINT_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds (increased frequency for better detail)

/**
 * Formats market cap for display
 */
const formatMarketCapValue = (num: number): string => {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
};

/**
 * Market cap chart component showing 24-hour trend
 * Uses client-side storage to track historical values
 */
const MarketCapChart = ({ 
  currentMarketCap, 
  marketCapChange24h 
}: MarketCapChartProps) => {
  const [historicalData, setHistoricalData] = useState<MarketCapDataPoint[]>([]);

  // Load and update historical data
  useEffect(() => {
    if (currentMarketCap == null) return;

    const now = Date.now();
    
    // Load existing data from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    let dataPoints: MarketCapDataPoint[] = stored ? JSON.parse(stored) : [];
    
    // Filter out data points older than 24 hours
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    dataPoints = dataPoints.filter(point => point.timestamp > twentyFourHoursAgo);
    
    // Check if we need to add a new data point
    const lastPoint = dataPoints[dataPoints.length - 1];
    const shouldAddPoint = !lastPoint || (now - lastPoint.timestamp) >= DATA_POINT_INTERVAL;
    
    if (shouldAddPoint) {
      // Add current market cap as new data point
      dataPoints.push({
        timestamp: now,
        marketCap: currentMarketCap,
      });
      
      // Keep only last MAX_DATA_POINTS
      if (dataPoints.length > MAX_DATA_POINTS) {
        dataPoints = dataPoints.slice(-MAX_DATA_POINTS);
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataPoints));
    }
    
    setHistoricalData(dataPoints);
  }, [currentMarketCap]);

  // Transform data for chart - always show full 24-hour range
  const chartData = useMemo(() => {
    if (currentMarketCap == null) return [];
    
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const SYNTHETIC_INTERVAL = 15 * 60 * 1000; // 15 minutes for synthetic points
    
    // Calculate starting market cap 24 hours ago using 24h change percentage
    const startMarketCap = marketCapChange24h != null
      ? currentMarketCap / (1 + marketCapChange24h / 100)
      : currentMarketCap;
    
    // Create a map of historical data by timestamp (rounded to nearest 15 minutes for matching)
    const historicalMap = new Map<number, number>();
    historicalData.forEach(point => {
      // Round timestamp to nearest 15 minutes for matching
      const roundedTime = Math.round(point.timestamp / SYNTHETIC_INTERVAL) * SYNTHETIC_INTERVAL;
      historicalMap.set(roundedTime, point.marketCap);
    });
    
    // Generate synthetic data points every 15 minutes for full 24-hour range
    const points: Array<{ time: string; marketCap: number; fullTime: string; timestamp: number }> = [];
    const numPoints = Math.ceil((24 * 60 * 60 * 1000) / SYNTHETIC_INTERVAL); // ~96 points for 24 hours
    
    for (let i = 0; i <= numPoints; i++) {
      const timestamp = twentyFourHoursAgo + (i * SYNTHETIC_INTERVAL);
      const date = new Date(timestamp);
      
      // Check if we have real historical data for this time (within 7.5 minutes)
      let marketCap: number;
      const roundedTime = Math.round(timestamp / SYNTHETIC_INTERVAL) * SYNTHETIC_INTERVAL;
      
      if (historicalMap.has(roundedTime)) {
        // Use real historical data
        marketCap = historicalMap.get(roundedTime)!;
      } else if (timestamp >= now - 5000) {
        // Use current market cap for the most recent point
        marketCap = currentMarketCap;
      } else {
        // Interpolate between start and current, or use linear interpolation between known points
        const progress = (timestamp - twentyFourHoursAgo) / (now - twentyFourHoursAgo);
        
        // Find nearest historical points for interpolation
        let beforePoint: { timestamp: number; marketCap: number } | null = null;
        let afterPoint: { timestamp: number; marketCap: number } | null = null;
        
        for (const point of historicalData) {
          if (point.timestamp <= timestamp && (!beforePoint || point.timestamp > beforePoint.timestamp)) {
            beforePoint = point;
          }
          if (point.timestamp >= timestamp && (!afterPoint || point.timestamp < afterPoint.timestamp)) {
            afterPoint = point;
          }
        }
        
        if (beforePoint && afterPoint) {
          // Linear interpolation between two known points
          const t = (timestamp - beforePoint.timestamp) / (afterPoint.timestamp - beforePoint.timestamp);
          marketCap = beforePoint.marketCap + (afterPoint.marketCap - beforePoint.marketCap) * t;
        } else if (beforePoint) {
          // Extrapolate from last known point to current
          const t = (timestamp - beforePoint.timestamp) / (now - beforePoint.timestamp);
          marketCap = beforePoint.marketCap + (currentMarketCap - beforePoint.marketCap) * t;
        } else if (afterPoint) {
          // Extrapolate from start to first known point
          const t = (timestamp - twentyFourHoursAgo) / (afterPoint.timestamp - twentyFourHoursAgo);
          marketCap = startMarketCap + (afterPoint.marketCap - startMarketCap) * t;
        } else {
          // No historical data, use linear interpolation from start to current
          marketCap = startMarketCap + (currentMarketCap - startMarketCap) * progress;
        }
      }
      
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      points.push({
        time: timeLabel,
        marketCap: marketCap,
        fullTime: date.toLocaleString(),
        timestamp: timestamp,
      });
    }
    
    return points;
  }, [historicalData, currentMarketCap, marketCapChange24h]);

  // Determine line color based on 24h change
  const lineColor = useMemo(() => {
    if (marketCapChange24h == null) return "hsl(var(--muted-foreground))";
    return marketCapChange24h >= 0 
      ? "hsl(var(--chart-1))" 
      : "hsl(var(--chart-2))";
  }, [marketCapChange24h]);

  // Calculate Y-axis domain with padding to prevent compression
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 0];
    
    const values = chartData.map(d => d.marketCap);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // If all values are identical, add 5% padding above and below
    if (minValue === maxValue) {
      const padding = minValue * 0.05;
      return [Math.max(0, minValue - padding), maxValue + padding];
    }
    
    // Calculate range and add 10% padding above and below
    const range = maxValue - minValue;
    const padding = range * 0.1;
    
    // For min value, use 0 as floor if it's close to 0, otherwise subtract padding
    const minDomain = minValue < range * 0.1 ? 0 : minValue - padding;
    const maxDomain = maxValue + padding;
    
    return [minDomain, maxDomain];
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-2 shadow-lg">
          <p className="text-sm text-muted-foreground">{data.fullTime}</p>
          <p className="text-sm font-semibold text-foreground">
            {formatMarketCapValue(data.marketCap)}
          </p>
        </div>
      );
    }
    return null;
  };

  // If no data yet, show loading
  if (chartData.length === 0 || currentMarketCap == null) {
    return (
      <div className="w-full h-64 flex items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-sm text-muted-foreground">
          Loading chart data...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="px-4 mb-2">
        <h3 className="text-sm font-semibold text-foreground">24-Hour Market Cap Trend</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '10px' }}
            interval={Math.floor(chartData.length / 8)} // Show ~8 labels for 24-hour range
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis 
            domain={yAxisDomain}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '10px' }}
            tickFormatter={(value) => {
              if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
              if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
              return `$${(value / 1e6).toFixed(0)}M`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="marketCap"
            stroke={lineColor}
            strokeWidth={2}
            dot={chartData.length <= 2}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketCapChart;

