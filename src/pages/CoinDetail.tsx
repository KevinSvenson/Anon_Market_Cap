import { useMemo, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { 
  fetchCoinDetail, 
  RateLimitError, 
  NetworkError,
  type CoinDetail as CoinDetailType 
} from "@/services/coingecko";
import { ArrowLeft, Loader2, AlertCircle, WifiOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (num: number | null | undefined) => {
  if (num == null) return "N/A";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatSupply = (num: number | null | undefined) => {
  if (num == null) return "N/A";
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatPercentage = (num: number | null | undefined) => {
  if (num == null) return "N/A";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
};

const stripHtml = (html: string | undefined) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

const CoinDetail = () => {
  const { coinId } = useParams<{ coinId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, isError } = useQuery<CoinDetailType>({
    queryKey: ["coinDetail", coinId],
    queryFn: () => {
      if (!coinId) {
        throw new Error("Coin ID is required");
      }
      return fetchCoinDetail(coinId);
    },
    enabled: Boolean(coinId),
    staleTime: 300000, // Consider data fresh for 5 minutes (coin details change less frequently)
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: (failureCount, error) => {
      if (error instanceof RateLimitError) {
        return false;
      }
      if (error instanceof NetworkError) {
        return failureCount < 3;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const description = useMemo(() => {
    const raw = data?.description?.en ?? "";
    const sanitized = stripHtml(raw).trim();
    if (!sanitized) return "No description available.";
    return sanitized.length > 500 ? `${sanitized.slice(0, 500)}...` : sanitized;
  }, [data]);

  const handleBack = () => {
    navigate(-1);
  };

  const renderErrorState = (message: string, IconComponent: typeof AlertCircle): ReactNode => (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <IconComponent className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">{message}</p>
      </div>
    </div>
  );

  let content: React.ReactNode = null;

  if (isLoading) {
    content = (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading coin details...</p>
        </div>
      </div>
    );
  } else if (isError && error instanceof RateLimitError) {
    content = renderErrorState(
      error.message || "Rate limit exceeded. Please try again later.",
      Clock
    );
  } else if (isError && error instanceof NetworkError) {
    content = renderErrorState(
      "Network error. Please check your connection and try again.",
      WifiOff
    );
  } else if (isError && error instanceof Error) {
    content = renderErrorState(error.message, AlertCircle);
  } else if (!data) {
    content = renderErrorState("Coin details not available.", AlertCircle);
  } else {
    const marketData = data.market_data;
    content = (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {data.image?.large && (
              <img
                src={data.image.large}
                alt={data.name}
                className="h-16 w-16 rounded-full"
                loading="lazy"
              />
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-foreground">
                  {data.name}
                </h1>
                <span className="text-lg uppercase text-muted-foreground">
                  {data.symbol}
                </span>
                {data.market_cap_rank && (
                  <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                    Rank #{data.market_cap_rank}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Hashing Algorithm: {data.hashing_algorithm ?? "N/A"} • Genesis Date:{" "}
                {data.genesis_date ?? "N/A"}
              </p>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Price Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(marketData?.current_price?.usd ?? null)}
            </p>
            <p
              className={cn(
                "text-sm mt-2",
                (marketData?.price_change_percentage_24h ?? 0) >= 0
                  ? "text-positive"
                  : "text-negative"
              )}
            >
              {formatPercentage(marketData?.price_change_percentage_24h ?? null)} (24h)
            </p>
          </div>

          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(marketData?.market_cap?.usd ?? null)}
            </p>
          </div>

          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">24h Volume</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(marketData?.total_volume?.usd ?? null)}
            </p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">High (24h)</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(marketData?.high_24h?.usd ?? null)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Low (24h)</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(marketData?.low_24h?.usd ?? null)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Circulating Supply</p>
            <p className="text-xl font-semibold text-foreground">
              {formatSupply(marketData?.circulating_supply)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Total Supply</p>
            <p className="text-xl font-semibold text-foreground">
              {formatSupply(marketData?.total_supply)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Max Supply</p>
            <p className="text-xl font-semibold text-foreground">
              {formatSupply(marketData?.max_supply)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
            <p className="text-xl font-semibold text-foreground">
              {data.last_updated
                ? new Date(data.last_updated).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            About {data.name}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        {content}
      </main>
    </div>
  );
};

export default CoinDetail;


