import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DataFreshnessIndicatorProps {
  lastUpdate: Date;
  nextUpdate: Date;
  isLive: boolean;
}

const DataFreshnessIndicator = ({
  lastUpdate,
  nextUpdate,
  isLive,
}: DataFreshnessIndicatorProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeUntilNext, setTimeUntilNext] = useState(0);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
      const untilNext = Math.max(0, Math.floor((nextUpdate.getTime() - now.getTime()) / 1000));
      
      setTimeElapsed(elapsed);
      setTimeUntilNext(untilNext);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate, nextUpdate]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isLive && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
        <span className="font-medium">Live data</span>
        <span>•</span>
        <span>Updated {formatTime(timeElapsed)} ago</span>
        {timeUntilNext > 0 && (
          <>
            <span>•</span>
            <span>Next update in {formatTime(timeUntilNext)}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default DataFreshnessIndicator;

