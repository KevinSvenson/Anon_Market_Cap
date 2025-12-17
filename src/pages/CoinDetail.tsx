import { useMemo, ReactNode, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { TradingViewChart } from "@/components/TradingViewChart";
import { 
  fetchCoinDetail,
  fetchPrivacyCoins,
  fetchMarketChart,
  RateLimitError, 
  NetworkError,
  type CoinDetail as CoinDetailType 
} from "@/services/coingecko";
import { ArrowLeft, Loader2, AlertCircle, WifiOff, Clock, Shield, Check, X, Star, Share2 } from "lucide-react";
import { ShareModal } from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPrivacyMetadata, getTechnologyColor, getPrivacyLevelColor, getSecurityRatingColor } from "@/data/privacyMetadata";

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
  const [activeTab, setActiveTab] = useState<"overview" | "privacy" | "trade">("overview");
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d'>('7d');
  const [shareModalOpen, setShareModalOpen] = useState(false);

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

  // Fetch market chart data based on selected timeframe
  const { data: chartDataRaw, isLoading: isChartLoading } = useQuery({
    queryKey: ["marketChart", coinId, selectedTimeframe],
    queryFn: () => {
      if (!coinId) throw new Error("Coin ID is required");
      return fetchMarketChart(coinId, selectedTimeframe);
    },
    enabled: Boolean(coinId),
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Fetch coin from privacy coins list for sharing
  const { data: privacyCoins } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // Process chart data with consistent data points
  // Always return an array, never undefined
  const chartData = useMemo(() => {
    if (!chartDataRaw?.prices || !Array.isArray(chartDataRaw.prices) || chartDataRaw.prices.length === 0) {
      return [];
    }

    // First, filter by time range based on timeframe
    const now = Date.now();
    let filteredPrices = chartDataRaw.prices;

    if (selectedTimeframe === '1h') {
      // Only keep last 1 hour of data
      const oneHourAgo = now - (60 * 60 * 1000);
      filteredPrices = chartDataRaw.prices.filter(([timestamp]) => timestamp >= oneHourAgo);
    }
    // For '24h' and '7d', keep all data (already correct from API)

    if (filteredPrices.length === 0) {
      return [];
    }

    // Target data points per timeframe
    const targetPointsMap: Record<'1h' | '24h' | '7d', number> = {
      '1h': 60,    // 60 data points = 1 per minute
      '24h': 96,   // 96 data points = 1 per 15 minutes
      '7d': 168,   // 168 data points = 1 per hour
    };

    const targetPoints = targetPointsMap[selectedTimeframe];

    // Sample data evenly
    const step = Math.max(1, Math.floor(filteredPrices.length / targetPoints));
    const sampledData: Array<{ timestamp: number; price: number; date: string }> = [];

    for (let i = 0; i < filteredPrices.length; i += step) {
      const [timestamp, price] = filteredPrices[i];
      const date = new Date(timestamp);
      
      let dateLabel: string;
      if (selectedTimeframe === '1h') {
        // For 1H, show only time (hour:minute)
        dateLabel = date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
      } else if (selectedTimeframe === '24h') {
        // For 24H, show date and hour
        dateLabel = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
        });
      } else {
        // For 7D, show only date
        dateLabel = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }

      sampledData.push({
        timestamp,
        price: parseFloat(price.toFixed(2)),
        date: dateLabel,
      });
    }

    // Debug logging - see what data is being processed
    console.log('📈 CoinDetail chartData processing:');
    console.log('Timeframe:', selectedTimeframe);
    console.log('Raw data length:', chartDataRaw?.prices?.length || 0);
    console.log('Filtered length:', filteredPrices.length);
    console.log('Sampled length:', sampledData.length);
    if (sampledData.length > 0) {
      console.log('First point:', {
        timestamp: sampledData[0].timestamp,
        price: sampledData[0].price,
        date: sampledData[0].date
      });
      console.log('Last point:', {
        timestamp: sampledData[sampledData.length - 1].timestamp,
        price: sampledData[sampledData.length - 1].price,
        date: sampledData[sampledData.length - 1].date
      });
      console.log('Is sorted?', sampledData.every((point, i) => 
        i === 0 || point.timestamp >= sampledData[i-1].timestamp
      ));
    }

    return sampledData;
  }, [chartDataRaw, selectedTimeframe]);

  // Calculate performance change for selected timeframe
  const timeframeChange = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    if (firstPrice > 0) {
      return ((lastPrice - firstPrice) / firstPrice) * 100;
    }
    return null;
  }, [chartData]);

  // Get privacy metadata for this coin
  const privacyMetadata = useMemo(() => {
    if (!coinId) return null;
    return getPrivacyMetadata(coinId);
  }, [coinId]);

  const description = useMemo(() => {
    // Use privacySolutionSummary if available, otherwise fall back to CoinGecko description
    if (privacyMetadata?.privacySolutionSummary) {
      return privacyMetadata.privacySolutionSummary;
    }
    const raw = data?.description?.en ?? "";
    const sanitized = stripHtml(raw).trim();
    if (!sanitized) return "No description available.";
    return sanitized.length > 500 ? `${sanitized.slice(0, 500)}...` : sanitized;
  }, [data, privacyMetadata]);

  // Convert CoinDetail to Cryptocurrency format for sharing
  // This must be at the top level to follow Rules of Hooks
  const coinForShare = useMemo(() => {
    if (!data) return null;
    const coinMarketData = data.market_data;
    // First try to find in privacy coins list
    if (privacyCoins) {
      const coin = privacyCoins.find(c => c.id === coinId);
      if (coin) return coin;
    }
    // Fallback: create from CoinDetail data
    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol || '',
      image: data.image?.large || data.image?.small || '',
      current_price: coinMarketData?.current_price?.usd || 0,
      price_change_percentage_24h: coinMarketData?.price_change_percentage_24h || 0,
      market_cap: coinMarketData?.market_cap?.usd || 0,
      total_volume: coinMarketData?.total_volume?.usd || 0,
    } as any;
  }, [data, privacyCoins, coinId]);

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
    const coinMarketData = data.market_data;
    
    content = (
      <div className="space-y-6">
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
                {privacyMetadata && (
                  <>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border",
                      getTechnologyColor(privacyMetadata.technology)
                    )}>
                      <Shield className="h-3.5 w-3.5" />
                      {privacyMetadata.specificTechnology || privacyMetadata.technology}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border",
                      getPrivacyLevelColor(privacyMetadata.privacyLevel)
                    )}
                      title="Privacy Strength: How anonymous your transactions are"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {privacyMetadata.privacyLevel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                      Privacy: {privacyMetadata.privacyScore}/100
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Hashing Algorithm: {data.hashing_algorithm ?? "N/A"} • Genesis Date:{" "}
                {data.genesis_date ?? "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShareModalOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-border">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "privacy"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Privacy Features
            </button>
            <button
              onClick={() => setActiveTab("trade")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "trade"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Trade {data.symbol?.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Implementation Quality - Moved to Top */}
            {privacyMetadata?.securityRating && (
              <div className="rounded-lg border border-border bg-card shadow-sm mb-6">
                <div className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold text-foreground">Implementation Quality</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-3xl font-bold",
                        getSecurityRatingColor(privacyMetadata.securityRating)
                      )}>
                        {privacyMetadata.securityRating}/10
                      </span>
                      <div className="flex gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-2 h-8 rounded-sm",
                              i < privacyMetadata.securityRating
                                ? privacyMetadata.securityRating >= 8
                                  ? "bg-green-500"
                                  : privacyMetadata.securityRating >= 6
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                                : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    How secure and well-tested the code is - Overall implementation quality, battle-testing, and vulnerability resistance
                  </p>
                </div>
              </div>
            )}

            {/* Privacy Solution - Moved to Top */}
            <div className="rounded-lg border border-border bg-card shadow-sm mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-3">Privacy Solution</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {/* Key Metrics Grid - Compact 3 columns */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="p-4 pb-2">
                  <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(coinMarketData?.current_price?.usd ?? null)}
                  </p>
                  <p
                    className={cn(
                      "text-sm mt-1",
                      (coinMarketData?.price_change_percentage_24h ?? 0) >= 0
                        ? "text-positive"
                        : "text-negative"
                    )}
                  >
                    {formatPercentage(coinMarketData?.price_change_percentage_24h ?? null)} (24h)
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="p-4 pb-2">
                  <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(coinMarketData?.market_cap?.usd ?? null)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="p-4 pb-2">
                  <p className="text-sm text-muted-foreground mb-1">24h Volume</p>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(coinMarketData?.total_volume?.usd ?? null)}
                  </p>
                </div>
              </div>
            </div>

            {/* Supply Metrics Grid - Compact 3 columns */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="p-4 pb-2">
                  <p className="text-sm text-muted-foreground mb-1">Circulating Supply</p>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-lg font-semibold text-foreground">
                    {formatSupply(coinMarketData?.circulating_supply)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="p-4 pb-2">
                  <p className="text-sm text-muted-foreground mb-1">Total Supply</p>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-lg font-semibold text-foreground">
                    {formatSupply(coinMarketData?.total_supply)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="p-4 pb-2">
                  <p className="text-sm text-muted-foreground mb-1">Max Supply</p>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-lg font-semibold text-foreground">
                    {formatSupply(coinMarketData?.max_supply)}
                  </p>
                </div>
              </div>
            </div>

            {/* Price Chart - Moved to Bottom */}
            <div className="rounded-lg border border-border bg-card shadow-sm">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    {data.name} - Price Chart
                  </h2>
                  <div className="text-sm text-muted-foreground">
                    Last Updated: {data.last_updated
                      ? new Date(data.last_updated).toLocaleString()
                      : "N/A"}
                  </div>
                </div>
                {/* Timeframe Selector */}
                <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
                  <button
                    onClick={() => setSelectedTimeframe('1h')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                      selectedTimeframe === '1h'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    1H
                  </button>
                  <button
                    onClick={() => setSelectedTimeframe('24h')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                      selectedTimeframe === '24h'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    24H
                  </button>
                  <button
                    onClick={() => setSelectedTimeframe('7d')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                      selectedTimeframe === '7d'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    7D
                  </button>
                </div>
              </div>
              <div className="px-6 pb-6">
                {isChartLoading ? (
                  <div className="w-full h-80 flex items-center justify-center rounded-lg border border-border bg-card">
                    <p className="text-sm text-muted-foreground">
                      Loading chart data...
                    </p>
                  </div>
                ) : (
                  <>
                    {timeframeChange != null && (
                      <div className="mb-2">
                        <p className={cn(
                          "text-xs",
                          timeframeChange >= 0 ? "text-positive" : "text-negative"
                        )}>
                          {timeframeChange >= 0 ? "+" : ""}{timeframeChange.toFixed(2)}% ({selectedTimeframe.toUpperCase()})
                        </p>
                      </div>
                    )}
                    <TradingViewChart
                      data={chartData}
                      timeframe={selectedTimeframe}
                      height={400}
                      color={timeframeChange != null && timeframeChange >= 0 ? '#10b981' : '#ef4444'} // green or red
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Privacy Features Tab */}
        {activeTab === "privacy" && privacyMetadata && (
          <div className="space-y-6">
            {privacyMetadata.technology === "Unknown" ? (
              /* Unknown Technology Message */
              <div className="rounded-lg border border-border p-8 bg-card shadow-sm text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  Privacy Technology Classification Pending
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-4">
                  This coin is listed in CoinGecko's privacy-coins category but hasn't been fully researched yet. 
                  Privacy features and technology details will be added after manual verification.
                </p>
                <p className="text-xs text-muted-foreground">
                  Estimated privacy score: {privacyMetadata.privacyScore}/100
                </p>
              </div>
            ) : (
              <>
                {/* Privacy Score Card */}
                <div className="rounded-lg border border-border p-6 bg-card shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">
                      Privacy Score: {privacyMetadata.privacyScore}/100
                    </h2>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 mb-4">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${privacyMetadata.privacyScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {privacyMetadata.privacyScore >= 90 && "Excellent privacy protection with comprehensive features."}
                    {privacyMetadata.privacyScore >= 75 && privacyMetadata.privacyScore < 90 && "Strong privacy features with good protection."}
                    {privacyMetadata.privacyScore >= 60 && privacyMetadata.privacyScore < 75 && "Moderate privacy features with some limitations."}
                    {privacyMetadata.privacyScore < 60 && "Basic privacy features - consider stronger alternatives for maximum privacy."}
                  </p>
                </div>

                {/* Full Description */}
                {privacyMetadata.fullDescription && (
                  <div className="rounded-lg border border-border p-6 bg-card shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                      About {data.name}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {privacyMetadata.fullDescription}
                    </p>
                  </div>
                )}

                {/* Privacy Strength Explanation */}
                {privacyMetadata.privacyLevelExplanation && (
                  <div className="rounded-lg border border-border p-6 bg-card shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className={cn(
                        "px-3 py-1 rounded-md text-sm font-medium border",
                        getPrivacyLevelColor(privacyMetadata.privacyLevel)
                      )}>
                        {privacyMetadata.privacyLevel} Privacy Strength
                      </span>
                      <span>- Why This Rating?</span>
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {privacyMetadata.privacyLevelExplanation}
                    </p>
                  </div>
                )}

            {/* Technology Card */}
            <div className="rounded-lg border border-border p-6 bg-card shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Privacy Technology
              </h2>
              <div className="mb-4">
                <span className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border",
                  getTechnologyColor(privacyMetadata.technology)
                )}>
                  {privacyMetadata.specificTechnology || privacyMetadata.technology}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {privacyMetadata.technologyDescription}
              </p>
            </div>

            {/* Privacy Features Grid */}
            <div className="rounded-lg border border-border p-6 bg-card shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Privacy Features
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  {privacyMetadata.features.hiddenAmounts ? (
                    <Check className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-negative flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">Hidden Amounts</p>
                    <p className="text-xs text-muted-foreground">Transaction amounts are concealed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {privacyMetadata.features.hiddenSender ? (
                    <Check className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-negative flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">Hidden Sender</p>
                    <p className="text-xs text-muted-foreground">Sender address is obfuscated</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {privacyMetadata.features.hiddenRecipient ? (
                    <Check className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-negative flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">Hidden Recipient</p>
                    <p className="text-xs text-muted-foreground">Recipient address is concealed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {privacyMetadata.features.defaultPrivacy ? (
                    <Check className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-negative flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">Default Privacy</p>
                    <p className="text-xs text-muted-foreground">
                      {privacyMetadata.features.defaultPrivacy ? "Privacy is mandatory" : "Privacy is optional"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {privacyMetadata.features.ipObfuscation ? (
                    <Check className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-negative flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">IP Obfuscation</p>
                    <p className="text-xs text-muted-foreground">Network-level privacy protection</p>
                  </div>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Trade Tab */}
        {activeTab === "trade" && (
          <div className="rounded-lg border border-border bg-card shadow-sm p-12 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Trade {data.symbol?.toUpperCase()}
            </h2>
            <p className="text-muted-foreground">
              Exchange listings and trading information coming soon.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        {content}
      </main>
      {/* Share Modal */}
      {coinForShare && (
        <ShareModal
          coin={coinForShare}
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CoinDetail;


