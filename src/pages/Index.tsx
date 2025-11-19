import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import CryptoTable from "@/components/CryptoTable";
import MarketCapCard from "@/components/MarketCapCard";
import TopGainers from "@/components/TopGainers";
import { 
  fetchPrivacyCoinCategoryStats,
  fetchPrivacyCoins,
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

  const { data: privacyCoins } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    refetchInterval: 185000, // Refetch every 3 minutes 5 seconds
    staleTime: 120000, // Consider data fresh for 2 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const marketCap = privacyStats?.market_cap;
  const marketCapChange = privacyStats?.market_cap_change_24h;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Privacy Cryptocurrency Prices by Market Cap
          </h1>
        </div>

        {/* Market Cap Card and Top Gainers/Losers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <MarketCapCard
            marketCap={marketCap}
            marketCapChange24h={marketCapChange}
          />
          {privacyCoins && privacyCoins.length > 0 && (
            <TopGainers coins={privacyCoins} />
          )}
        </div>

        <CryptoTable />
      </main>
    </div>
  );
};

export default Index;
