import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Sparkles, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fetchPrivacyCoins } from '@/services/coingecko';
import { getPrivacyMetadata } from '@/data/privacyMetadata';
import Header from '@/components/Header';

export default function Highlights() {
  const { data: coins, isLoading } = useQuery({
    queryKey: ['privacyCoins'],
    queryFn: () => fetchPrivacyCoins(100, 1),
    staleTime: 60 * 1000,
  });

  // Top Gainers (top 15 by 24h change)
  const topGainers = useMemo(() => {
    if (!coins || coins.length === 0) return [];
    return [...coins]
      .filter(coin => coin.price_change_percentage_24h != null && coin.price_change_percentage_24h > 0)
      .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
      .slice(0, 15);
  }, [coins]);

  // Top Losers (bottom 15 by 24h change)
  const topLosers = useMemo(() => {
    if (!coins || coins.length === 0) return [];
    return [...coins]
      .filter(coin => coin.price_change_percentage_24h != null && coin.price_change_percentage_24h < 0)
      .sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
      .slice(0, 15);
  }, [coins]);

  // Newest coins (top 15 by release year or market cap rank)
  const newestCoins = useMemo(() => {
    if (!coins || coins.length === 0) return [];
    
    const coinsWithDates = coins.filter(coin => {
      const metadata = getPrivacyMetadata(coin.id);
      return metadata?.releaseYear;
    });
    
    if (coinsWithDates.length === 0) {
      // Fallback: return coins with highest market cap rank (newer coins often have higher ranks)
      return [...coins]
        .sort((a, b) => (b.market_cap_rank || 999) - (a.market_cap_rank || 999))
        .slice(0, 15);
    }
    
    return coinsWithDates
      .sort((a, b) => {
        const yearA = getPrivacyMetadata(a.id)?.releaseYear || 0;
        const yearB = getPrivacyMetadata(b.id)?.releaseYear || 0;
        return yearB - yearA; // Newest first
      })
      .slice(0, 15);
  }, [coins]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading highlights...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </Link>
          
          <h1 className="text-3xl font-bold mb-2">Privacy Crypto Highlights</h1>
          <p className="text-muted-foreground">
            Track the most interesting privacy-focused cryptocurrencies based on market activity
          </p>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Top Gainers (Left) */}
          <Card id="gainers">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
                🚀 Top Gainers
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Highest 24h price increases
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {topGainers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No gainers available</p>
              ) : (
                topGainers.map((coin, index) => (
                  <Link
                    key={coin.id}
                    to={`/coin/${coin.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <img 
                        src={coin.image} 
                        alt={coin.name} 
                        className="w-8 h-8 rounded-full"
                        loading="lazy"
                      />
                      <div>
                        <div className="font-medium text-sm">{coin.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {coin.symbol.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${coin.current_price < 1 
                          ? coin.current_price.toFixed(6) 
                          : coin.current_price.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-500 font-medium">
                        ▲ {coin.price_change_percentage_24h?.toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* NEW Coins (Center) */}
          <Card id="new">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                ✨ NEW Coins
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Recently launched privacy coins
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {newestCoins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No new coins available</p>
              ) : (
                newestCoins.map((coin, index) => {
                  const metadata = getPrivacyMetadata(coin.id);
                  const releaseYear = metadata?.releaseYear 
                    ? metadata.releaseYear.toString()
                    : 'Unknown';
                  
                  return (
                    <Link
                      key={coin.id}
                      to={`/coin/${coin.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6">
                          {index + 1}
                        </span>
                        <img 
                          src={coin.image} 
                          alt={coin.name} 
                          className="w-8 h-8 rounded-full"
                          loading="lazy"
                        />
                        <div>
                          <div className="font-medium text-sm">{coin.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {releaseYear}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${coin.current_price < 1 
                            ? coin.current_price.toFixed(6) 
                            : coin.current_price.toFixed(2)}
                        </div>
                        <div className={cn(
                          "text-xs font-medium",
                          (coin.price_change_percentage_24h || 0) >= 0 
                            ? "text-green-500" 
                            : "text-red-500"
                        )}>
                          {(coin.price_change_percentage_24h || 0) >= 0 ? "▲" : "▼"} 
                          {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Top Losers (Right) */}
          <Card id="losers">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-red-500" />
                📉 Top Losers
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Largest 24h price decreases
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {topLosers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No losers available</p>
              ) : (
                topLosers.map((coin, index) => (
                  <Link
                    key={coin.id}
                    to={`/coin/${coin.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <img 
                        src={coin.image} 
                        alt={coin.name} 
                        className="w-8 h-8 rounded-full"
                        loading="lazy"
                      />
                      <div>
                        <div className="font-medium text-sm">{coin.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {coin.symbol.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${coin.current_price < 1 
                          ? coin.current_price.toFixed(6) 
                          : coin.current_price.toFixed(2)}
                      </div>
                      <div className="text-xs text-red-500 font-medium">
                        ▼ {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

