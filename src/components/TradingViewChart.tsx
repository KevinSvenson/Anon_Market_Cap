import { useEffect, useRef } from 'react';
import { 
  createChart, 
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  ISeriesApi,
  Time,
  AreaSeriesPartialOptions,
  AreaSeries
} from 'lightweight-charts';

interface TradingViewChartProps {
  data: Array<{
    timestamp: number;
    price: number;
  }>;
  timeframe: '1h' | '24h' | '7d';
  height?: number;
  color?: string;
}

export const TradingViewChart = ({ 
  data, 
  timeframe, 
  height = 400,
  color = '#10b981' // green-500
}: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (!data || data.length === 0) return;

    let chart: IChartApi | null = null;
    let areaSeries: ISeriesApi<'Area'> | null = null;

    try {
      // Validate and format data
      const formattedData = data
        .filter(point => {
          // Filter out invalid data
          return (
            point.timestamp > 0 &&
            point.price > 0 &&
            !isNaN(point.price) &&
            isFinite(point.price)
          );
        })
        .map(point => ({
          time: Math.floor(point.timestamp / 1000) as Time,
          value: parseFloat(point.price.toFixed(2))
        }))
        .sort((a, b) => (a.time as number) - (b.time as number)); // CRITICAL: Must be sorted

      // Remove duplicates (same timestamp)
      const uniqueData = formattedData.filter((point, index, array) => {
        if (index === 0) return true;
        return point.time !== array[index - 1].time;
      });

      if (uniqueData.length === 0) {
        console.error('No valid data points after filtering');
        return;
      }

      // Create chart
      chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9CA3AF',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: timeframe === '1h' || timeframe === '24h',
          secondsVisible: false,
        },
      });

      // Debug: Check what methods are available
      console.log('🔍 Chart methods available:');
      console.log('Has addAreaSeries?', typeof (chart as any).addAreaSeries);
      console.log('Has addSeries?', typeof chart.addSeries);
      console.log('Chart methods:', Object.keys(chart).filter(k => k.includes('Series') || k.includes('Area')));
      
      // Try v4 API first (addAreaSeries), fallback to v5 if needed
      console.log('🔧 Attempting to create area series...');
      try {
        if (typeof (chart as any).addAreaSeries === 'function') {
          console.log('Using v4 API: addAreaSeries');
          // v4 API - preferred
          areaSeries = (chart as any).addAreaSeries({
            lineColor: color,
            topColor: color + '33',
            bottomColor: 'transparent',
            lineWidth: 2,
          });
          console.log('✅ v4 API succeeded');
        } else {
          console.log('Using v5 API: addSeries(AreaSeries, options)');
          // v5 API - use AreaSeries import
          areaSeries = chart.addSeries(AreaSeries, {
            lineColor: color,
            topColor: color + '33',
            bottomColor: 'transparent',
            lineWidth: 2,
          } as AreaSeriesPartialOptions);
          console.log('✅ v5 API succeeded');
        }
      } catch (seriesError) {
        console.error('❌ Series creation failed:', seriesError);
        throw seriesError;
      }

      // Debug logging - see exact data being passed
      console.log('📊 About to set TradingView data:');
      console.log('Timeframe:', timeframe);
      console.log('Total points:', uniqueData.length);
      console.log('First 5 points:', uniqueData.slice(0, 5));
      console.log('Last 5 points:', uniqueData.slice(-5));
      console.log('Data sorted?', uniqueData.every((point, i) => 
        i === 0 || (point.time as number) >= (uniqueData[i-1].time as number)
      ));
      console.log('Any duplicates?', uniqueData.some((point, i) => 
        i > 0 && point.time === uniqueData[i-1].time
      ));
      console.log('Any invalid times?', uniqueData.some(point => 
        !point.time || (point.time as number) <= 0
      ));
      console.log('Any invalid prices?', uniqueData.some(point => 
        !point.value || point.value <= 0 || isNaN(point.value)
      ));
      console.log('Time range:', {
        first: uniqueData[0]?.time,
        last: uniqueData[uniqueData.length - 1]?.time,
        span: uniqueData.length > 0 ? (uniqueData[uniqueData.length - 1].time as number) - (uniqueData[0].time as number) : 0
      });
      console.log('Price range:', {
        min: Math.min(...uniqueData.map(d => d.value)),
        max: Math.max(...uniqueData.map(d => d.value))
      });

      // Set data
      areaSeries.setData(uniqueData);

      // Calculate and add High/Low lines
      const prices = uniqueData.map(d => d.value);
      const high = Math.max(...prices);
      const low = Math.min(...prices);

      areaSeries.createPriceLine({
        price: high,
        color: '#6B7280',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'High',
      });

      areaSeries.createPriceLine({
        price: low,
        color: '#6B7280',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Low',
      });

      // Fit content
      chart.timeScale().fitContent();

      // Handle resize
      const handleResize = () => {
        if (chart && chartContainerRef.current) {
          chart.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        
        // Remove chart if it exists
        if (chart) {
          chart.remove();
          chart = null;
        }
      };

    } catch (error) {
      console.error('Error creating TradingView chart:', error);
      
      // Log data for debugging
      console.error('Data that caused error:', {
        dataLength: data?.length,
        firstPoint: data?.[0],
        lastPoint: data?.[data.length - 1],
        timeframe
      });
      
      if (chart) {
        chart.remove();
      }
    }
  }, [data, timeframe, height, color]);

  return (
    <div 
      ref={chartContainerRef} 
      className="relative w-full"
      style={{ height: `${height}px` }}
    />
  );
};

