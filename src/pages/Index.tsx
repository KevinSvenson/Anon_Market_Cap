import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import CryptoTable from "@/components/CryptoTable";
import MarketCapChart from "@/components/MarketCapChart";
import { 
  fetchPrivacyCoinCategoryStats, 
  RateLimitError,
  NetworkError 
} from "@/services/coingecko";

const Index = () => {
  const { data: privacyStats, error: privacyError } = useQuery({
    queryKey: ["privacyCoinCategoryStats"],
    queryFn: fetchPrivacyCoinCategoryStats,
    refetchInterval: (query) => {
      // If we hit rate limit, wait longer before retrying
      if (query.state.error instanceof RateLimitError) {
        const retryAfter = query.state.error.retryAfter || 60;
        return retryAfter * 1000; // Convert seconds to milliseconds
      }
      return 180000; // Refetch every 3 minutes (increased from 2 minutes)
    },
    staleTime: 120000, // Consider data fresh for 2 minutes (increased from 1 minute)
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors
      if (error instanceof RateLimitError) {
        return false;
      }
      // Retry network errors up to 3 times
      if (error instanceof NetworkError) {
        return failureCount < 3;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const marketCap = privacyStats?.market_cap;
  const marketCapChange = privacyStats?.market_cap_change_24h;
  const volume24h = privacyStats?.volume_24h;

  const formatMarketCap = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    return `$${num.toLocaleString()}`;
  };

  const formatVolume = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Privacy Cryptocurrency Prices by Market Cap
          </h1>
          <div className="space-y-2">
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              {privacyError ? (
                <span className="text-destructive">
                  {privacyError instanceof RateLimitError 
                    ? "Rate limit exceeded. Data will refresh automatically."
                    : privacyError instanceof NetworkError
                    ? "Network error. Please check your connection."
                    : "Unable to load privacy coin data."}
                </span>
              ) : marketCap != null && marketCapChange != null ? (
                <>
                  The privacy coin market cap is {formatMarketCap(marketCap)}, a{" "}
                  <span
                    className={
                      marketCapChange >= 0 ? "text-positive" : "text-negative"
                    }
                  >
                    {marketCapChange >= 0 ? "+" : ""}
                    {marketCapChange.toFixed(1)}%
                  </span>{" "}
                  change over the last day.
                </>
              ) : (
                "Loading privacy coin data..."
              )}
            </p>
            {volume24h != null && !privacyError && (
              <p className="text-sm sm:text-base text-muted-foreground">
                24h Volume: {formatVolume(volume24h)}
              </p>
            )}
          </div>
        </div>

        {/* Market Cap Chart */}
        <div className="mb-6">
          <MarketCapChart
            currentMarketCap={marketCap}
            marketCapChange24h={marketCapChange}
          />
        </div>

        <CryptoTable />
      </main>
    </div>
  );
};

export default Index;
