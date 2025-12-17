import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import CryptoTable from "@/components/CryptoTable";
import CompactStatsBar from "@/components/market/CompactStatsBar";
import DataFreshnessIndicator from "@/components/market/DataFreshnessIndicator";
import { useAnon20DailyTracker } from "@/hooks/useAnon20DailyTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Search, TrendingUp, TrendingDown, Sparkles, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import { 
  fetchPrivacyCoinCategoryStats,
  fetchPrivacyCoins,
  RateLimitError,
  NetworkError 
} from "@/services/coingecko";
import { getPrivacyMetadata, getAllTechnologies, getAllPrivacyLevels, type PrivacyTechnology, type PrivacyLevel } from "@/data/privacyMetadata";
import { calculateAnon20Value, calculateAnon20Change } from "@/lib/anon20";
import { cn } from "@/lib/utils";

const Index = () => {
  const [technologyFilter, setTechnologyFilter] = useState<PrivacyTechnology | "all">("all");
  const [privacyLevelFilter, setPrivacyLevelFilter] = useState<PrivacyLevel | "all">("all");
  const [displayTechFilter, setDisplayTechFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [rankingMode, setRankingMode] = useState<'global' | 'privacy'>('global');

  const { data: privacyStats, error: privacyError } = useQuery({
    queryKey: ["privacyCoinCategoryStats"],
    queryFn: fetchPrivacyCoinCategoryStats,
    refetchInterval: (query) => {
      if (query.state.error instanceof RateLimitError) {
        const retryAfter = query.state.error.retryAfter || 60;
        return retryAfter * 1000;
      }
      return 180000; // Refetch every 3 minutes
    },
    staleTime: 120000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  const { data: privacyCoins, error: privacyCoinsError, refetch: refetchPrivacyCoins } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    refetchInterval: 185000,
    staleTime: 120000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  const marketCap = privacyStats?.market_cap;
  const marketCapChange = privacyStats?.market_cap_change_24h;
  const volume24h = privacyStats?.volume_24h;

  // Calculate ANON 20 index using market-cap weighted calculation
  const anon20Data = useMemo(() => {
    if (!privacyCoins || privacyCoins.length === 0) return { value: null, change: null };
    
    try {
      const value = calculateAnon20Value(privacyCoins);
      const change = calculateAnon20Change(privacyCoins);
      return { value, change };
    } catch (error) {
      console.error("Error calculating ANON20:", error);
      return { value: null, change: null };
    }
  }, [privacyCoins]);

  // Calculate top gainer (single coin with highest 24h change)
  const topGainer = useMemo(() => {
    if (!privacyCoins || privacyCoins.length === 0) return null;
    const sorted = [...privacyCoins].sort((a, b) => 
      (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    );
    return sorted[0] && sorted[0].price_change_percentage_24h != null ? sorted[0] : null;
  }, [privacyCoins]);

  // Calculate top loser (single coin with lowest 24h change)
  const topLoser = useMemo(() => {
    if (!privacyCoins || privacyCoins.length === 0) return null;
    const sorted = [...privacyCoins].sort((a, b) => 
      (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)
    );
    return sorted[0] && sorted[0].price_change_percentage_24h != null ? sorted[0] : null;
  }, [privacyCoins]);

  // Get newest coin (by genesis date)
  const newestCoin = useMemo(() => {
    if (!privacyCoins || privacyCoins.length === 0) return null;
    
    // Filter coins with genesis dates
    const coinsWithDates = privacyCoins.filter(coin => {
      const metadata = getPrivacyMetadata(coin.id);
      return metadata?.releaseYear;
    });
    
    if (coinsWithDates.length === 0) {
      // Fallback: return coin with lowest market cap rank (newer coins often have higher ranks)
      return [...privacyCoins].sort((a, b) => 
        (b.market_cap_rank || 999) - (a.market_cap_rank || 999)
      )[0];
    }
    
    // Sort by release year (newest first)
    return coinsWithDates.sort((a, b) => {
      const yearA = getPrivacyMetadata(a.id)?.releaseYear || 0;
      const yearB = getPrivacyMetadata(b.id)?.releaseYear || 0;
      return yearB - yearA;
    })[0];
  }, [privacyCoins]);

  // Calculate top gainers (top 3 by 24h change)
  const topGainers = useMemo(() => {
    if (!privacyCoins || privacyCoins.length === 0) return [];
    return [...privacyCoins]
      .filter(coin => coin.price_change_percentage_24h != null && coin.price_change_percentage_24h > 0)
      .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
      .slice(0, 3);
  }, [privacyCoins]);

  // Calculate new coins (coins without enhanced metadata, sorted by market cap)
  const newCoins = useMemo(() => {
    if (!privacyCoins || privacyCoins.length === 0) return [];
    return [...privacyCoins]
      .filter(coin => {
        const metadata = getPrivacyMetadata(coin.id);
        return !metadata.isEnhanced; // New coins are those without enhanced metadata
      })
      .sort((a, b) => (a.market_cap_rank || 999) - (b.market_cap_rank || 999))
      .slice(0, 3);
  }, [privacyCoins]);

  // Calculate privacy sector rankings (sorted by market cap within privacy coins only)
  const coinsWithPrivacyRank = useMemo(() => {
    if (!privacyCoins || privacyCoins.length === 0) return [];
    
    // Sort by market cap (highest first)
    const sorted = [...privacyCoins].sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    
    // Assign privacy ranks
    return sorted.map((coin, index) => ({
      ...coin,
      privacy_rank: index + 1, // 1, 2, 3, etc.
    }));
  }, [privacyCoins]);

  // Calculate filtered coin count
  const filteredCoinCount = useMemo(() => {
    if (!privacyCoins) return 0;
    
    return privacyCoins.filter(coin => {
      const metadata = getPrivacyMetadata(coin.id);
      
      // Technology filter
      if (technologyFilter !== 'all' && !displayTechFilter) {
        if (metadata.technology !== technologyFilter) return false;
      }
      
      // DisplayTech filter
      if (displayTechFilter) {
        if (metadata.displayTech !== displayTechFilter) return false;
      }
      
      // Privacy level filter
      if (privacyLevelFilter !== 'all') {
        const coinLevel = metadata.privacyLevel || 'Minimal';
        if (coinLevel !== privacyLevelFilter) return false;
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = coin.name.toLowerCase().includes(query);
        const symbolMatch = coin.symbol.toLowerCase().includes(query);
        if (!nameMatch && !symbolMatch) return false;
      }
      
      return true;
    }).length;
  }, [privacyCoins, technologyFilter, privacyLevelFilter, displayTechFilter, searchQuery]);

  // Calculate next update time (3 minutes from now)
  // Update these when data actually refreshes
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const nextUpdate = useMemo(() => new Date(lastUpdate.getTime() + 180000), [lastUpdate]);

  // Update lastUpdate when data refreshes
  useEffect(() => {
    if (privacyCoins && privacyCoins.length > 0) {
      setLastUpdate(new Date());
    }
  }, [privacyCoins]);

  // Track ANON20 daily values
  useAnon20DailyTracker(privacyCoins);

  // Show error state if both queries fail
  if (privacyError && privacyCoinsError && !privacyCoins) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="rounded-lg border border-destructive bg-card p-6 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-destructive mb-2">
                  Failed to Load Cryptocurrency Data
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {privacyError instanceof Error ? privacyError.message : 'Unable to connect to CoinGecko API'}
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => {
                    refetchPrivacyCoins();
                    if (privacyError) {
                      // Refetch privacy stats if possible
                      window.location.reload();
                    }
                  }} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Reload Page
                  </Button>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p className="font-medium mb-2">Possible causes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>CoinGecko API rate limit reached</li>
                    <li>Network connectivity issue</li>
                    <li>Proxy server not running</li>
                    <li>API temporarily unavailable</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Section 1: Title + Understanding Dropdown */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2">Privacy Cryptocurrency Prices</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Real-time data for 100+ privacy-focused cryptocurrencies
        </p>
        
        {/* Understanding Privacy Technologies - Collapsible */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors [&[data-state=open]>svg:last-child]:rotate-180">
            <Info className="h-4 w-4" />
            <span>Understanding Privacy Technologies</span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
              
              {/* Left Column: Technology Types */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Privacy Technology Categories</h4>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        zk-SNARKs
                      </Badge>
                    </span>
                    <p className="text-muted-foreground mt-1 ml-1">
                      Zero-knowledge proofs that verify transactions without revealing details. Used by Zcash.
                    </p>
                  </div>
                  
                  <div>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                        Ring Signatures
                      </Badge>
                    </span>
                    <p className="text-muted-foreground mt-1 ml-1">
                      Mix your transaction with others to obscure the sender. Used by Monero.
                    </p>
                  </div>
                  
                  <div>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                        Mimblewimble
                      </Badge>
                    </span>
                    <p className="text-muted-foreground mt-1 ml-1">
                      Confidential transactions with no addresses or amounts visible on-chain.
                    </p>
                  </div>
                  
                  <div>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                        CoinJoin
                      </Badge>
                    </span>
                    <p className="text-muted-foreground mt-1 ml-1">
                      Combine multiple transactions into one to obscure ownership. Used by Dash.
                    </p>
                  </div>
                  
                  <div>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20">
                        TEE
                      </Badge>
                    </span>
                    <p className="text-muted-foreground mt-1 ml-1">
                      Trusted Execution Environments - hardware-based privacy protection.
                    </p>
                  </div>
                  
                  <div>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                        Other
                      </Badge>
                    </span>
                    <p className="text-muted-foreground mt-1 ml-1">
                      Unique or hybrid approaches. Hover over badges in the table for specifics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Privacy Strength */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Privacy Strength Rating</h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <div className="flex gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <span>High Privacy</span>
                    </div>
                    <p className="text-muted-foreground ml-1">
                      Privacy by default. All transactions are private with strong cryptographic protection. 
                      Examples: Monero, Zcash (shielded).
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <div className="flex gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-muted"></div>
                      </div>
                      <span>Medium Privacy</span>
                    </div>
                    <p className="text-muted-foreground ml-1">
                      Optional privacy features or mixing services. Users must opt-in to privacy. 
                      Examples: Dash, Zcash (transparent).
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <div className="flex gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                        <div className="w-2 h-2 rounded-full bg-muted"></div>
                        <div className="w-2 h-2 rounded-full bg-muted"></div>
                      </div>
                      <span>Minimal Privacy</span>
                    </div>
                    <p className="text-muted-foreground ml-1">
                      Limited privacy features or network-level privacy (Tor/I2P) without on-chain obfuscation.
                      Examples: Verge, Bitcoin (with Lightning).
                    </p>
                  </div>
                  
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong>Tip:</strong> Click any technology badge in the legend above the table to filter by that type. 
                      Click privacy dots to filter by strength level.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Section 2: Stats Cards */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <CompactStatsBar
            marketCap={marketCap}
            marketCapChange24h={marketCapChange}
            anon20Value={anon20Data.value}
            anon20Change={anon20Data.change}
            volume24h={volume24h}
            volumeChange24h={null}
            coins={privacyCoins}
          />
        </div>
      </section>

      {/* Section 3: Horizontal Ticker-Style Section */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Top Gainer (Left) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Link 
                  to="/highlights#gainers"
                  className="text-sm font-semibold flex items-center gap-2 hover:text-accent-foreground transition-colors"
                >
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top Gainer
                </Link>
                <Link 
                  to="/highlights#gainers" 
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View more →
                </Link>
              </div>
              
              {topGainer ? (
                <Link
                  to={`/coin/${topGainer.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={topGainer.image} 
                      alt={topGainer.name} 
                      className="w-6 h-6 rounded-full" 
                      loading="lazy"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{topGainer.name}</div>
                      <div className="text-xs text-muted-foreground">{topGainer.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${topGainer.current_price < 1 
                        ? topGainer.current_price.toFixed(6) 
                        : topGainer.current_price.toFixed(2)}
                    </div>
                    <div className="text-xs text-green-500 font-medium">
                      ▲ {topGainer.price_change_percentage_24h?.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>

            {/* NEW (Center) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Link 
                  to="/highlights#new"
                  className="text-sm font-semibold flex items-center gap-2 hover:text-accent-foreground transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  NEW
                </Link>
                <Link 
                  to="/highlights#new" 
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View more →
                </Link>
              </div>
              
              {newestCoin ? (
                <Link
                  to={`/coin/${newestCoin.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={newestCoin.image} 
                      alt={newestCoin.name} 
                      className="w-6 h-6 rounded-full" 
                      loading="lazy"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{newestCoin.name}</div>
                      <div className="text-xs text-muted-foreground">{newestCoin.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${newestCoin.current_price < 1 
                        ? newestCoin.current_price.toFixed(6) 
                        : newestCoin.current_price.toFixed(2)}
                    </div>
                    <div className={cn(
                      "text-xs font-medium",
                      (newestCoin.price_change_percentage_24h || 0) >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {(newestCoin.price_change_percentage_24h || 0) >= 0 ? "▲" : "▼"} 
                      {Math.abs(newestCoin.price_change_percentage_24h || 0).toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>

            {/* Top Losers (Right) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Link 
                  to="/highlights#losers"
                  className="text-sm font-semibold flex items-center gap-2 hover:text-accent-foreground transition-colors"
                >
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Top Losers (24H)
                </Link>
                <Link 
                  to="/highlights#losers" 
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View more →
                </Link>
              </div>
              
              {topLoser ? (
                <Link
                  to={`/coin/${topLoser.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={topLoser.image} 
                      alt={topLoser.name} 
                      className="w-6 h-6 rounded-full" 
                      loading="lazy"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{topLoser.name}</div>
                      <div className="text-xs text-muted-foreground">{topLoser.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${topLoser.current_price < 1 
                        ? topLoser.current_price.toFixed(6) 
                        : topLoser.current_price.toFixed(2)}
                    </div>
                    <div className="text-xs text-red-500 font-medium">
                      ▼ {Math.abs(topLoser.price_change_percentage_24h || 0).toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Mode Toggle + Filter Bar */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          {/* Ranking Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{filteredCoinCount} coins</span>
              
              {/* Ranking Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ranked by:</span>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setRankingMode('global')}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      rankingMode === 'global'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Global Rank
                  </button>
                  <button
                    onClick={() => setRankingMode('privacy')}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      rankingMode === 'privacy'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Privacy Rank
                  </button>
                </div>
              </div>
            </div>
            
            {/* Explanation tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    <strong>Global Rank:</strong> Position among all 10,000+ cryptocurrencies<br/>
                    <strong>Privacy Rank:</strong> Position among the 100 privacy-focused coins on this site
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Left side: Filters and Search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Technology Filter */}
              <Select 
                value={technologyFilter} 
                onValueChange={(value) => {
                  setTechnologyFilter(value as PrivacyTechnology | "all");
                  setDisplayTechFilter(null); // Clear displayTech when main tech changes
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Technologies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Technologies</SelectItem>
                  {getAllTechnologies().map((tech) => (
                    <SelectItem key={tech} value={tech}>
                      {tech}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Privacy Level Filter */}
              <Select 
                value={privacyLevelFilter} 
                onValueChange={(value) => setPrivacyLevelFilter(value as PrivacyLevel | "all")}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Privacy Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Privacy Levels</SelectItem>
                  {getAllPrivacyLevels().map((level) => (
                    <SelectItem key={level} value={level}>
                      {level} Privacy
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Right side: Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(val) => setItemsPerPage(Number(val))}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="container mx-auto px-4 pb-8">
        <CryptoTable
          technologyFilter={technologyFilter}
          privacyLevelFilter={privacyLevelFilter}
          displayTechFilter={displayTechFilter}
          searchQuery={searchQuery}
          itemsPerPage={itemsPerPage}
          rankingMode={rankingMode}
          coinsWithPrivacyRank={coinsWithPrivacyRank}
          onTechnologyFilterChange={setTechnologyFilter}
          onPrivacyLevelFilterChange={setPrivacyLevelFilter}
          onDisplayTechFilterChange={setDisplayTechFilter}
          onSearchQueryChange={setSearchQuery}
        />
      </div>

      {/* Data Freshness Indicator */}
      <DataFreshnessIndicator
        lastUpdate={lastUpdate}
        nextUpdate={nextUpdate}
        isLive={true}
      />
    </div>
  );
};

export default Index;
