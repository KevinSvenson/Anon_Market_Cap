import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import CoinSelector from "@/components/CoinSelector";
import CoinPriceChart from "@/components/CoinPriceChart";
import { fetchPrivacyCoins } from "@/services/coingecko";
import { getPrivacyMetadata, getTechnologyColor } from "@/data/privacyMetadata";
import { ArrowLeft, Shield, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (num: number | null | undefined) => {
  if (num == null) return "N/A";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatPrice = (num: number | null | undefined) => {
  if (num == null) return "N/A";
  if (num >= 1) return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${num.toFixed(6)}`;
};

const Compare = () => {
  const navigate = useNavigate();
  const [coin1Id, setCoin1Id] = useState<string | null>(null);
  const [coin2Id, setCoin2Id] = useState<string | null>(null);
  const [coin3Id, setCoin3Id] = useState<string | null>(null);

  // Fetch all privacy coins
  const { data: allCoins } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // Get selected coins data
  const selectedCoins = useMemo(() => {
    if (!allCoins) return [];
    const ids = [coin1Id, coin2Id, coin3Id].filter(Boolean) as string[];
    return ids.map(id => allCoins.find(coin => coin.id === id)).filter(Boolean);
  }, [allCoins, coin1Id, coin2Id, coin3Id]);

  // Get privacy metadata for selected coins
  const coinsWithMetadata = useMemo(() => {
    return selectedCoins.map(coin => ({
      coin,
      metadata: getPrivacyMetadata(coin!.id)
    }));
  }, [selectedCoins]);

  const handleBack = () => {
    navigate(-1);
  };

  const hasAnySelection = coin1Id || coin2Id || coin3Id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Compare Privacy Coins
            </h1>
            <p className="text-sm text-muted-foreground">
              Select up to 3 privacy coins to compare their features side-by-side
            </p>
          </div>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Coin Selectors */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <CoinSelector
            selectedCoinId={coin1Id}
            onSelect={setCoin1Id}
            label="Coin 1"
            excludeCoinIds={[coin2Id, coin3Id].filter(Boolean) as string[]}
          />
          <CoinSelector
            selectedCoinId={coin2Id}
            onSelect={setCoin2Id}
            label="Coin 2"
            excludeCoinIds={[coin1Id, coin3Id].filter(Boolean) as string[]}
          />
          <CoinSelector
            selectedCoinId={coin3Id}
            onSelect={setCoin3Id}
            label="Coin 3 (Optional)"
            excludeCoinIds={[coin1Id, coin2Id].filter(Boolean) as string[]}
          />
        </div>

        {/* Comparison Table */}
        {hasAnySelection ? (
          <div className="space-y-6">
            {/* Coin Headers */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${coinsWithMetadata.length}, 1fr)` }}>
              <div></div>
              {coinsWithMetadata.map(({ coin }) => (
                <div key={coin!.id} className="rounded-lg border border-border p-4 bg-card shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={coin!.image}
                      alt={coin!.name}
                      className="h-10 w-10 rounded-full"
                      loading="lazy"
                    />
                    <div>
                      <h3 className="font-semibold text-foreground">{coin!.name}</h3>
                      <p className="text-xs uppercase text-muted-foreground">{coin!.symbol}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Privacy Score */}
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground w-48">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Privacy Metrics
                      </div>
                    </th>
                    {coinsWithMetadata.map(({ coin }) => (
                      <th key={coin!.id} className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                        {coin!.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Privacy Score */}
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Privacy Score</td>
                    {coinsWithMetadata.map(({ coin, metadata }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        {metadata ? (
                          <span className="text-lg font-semibold text-primary">
                            {metadata.privacyScore}/100
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Technology */}
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Technology</td>
                    {coinsWithMetadata.map(({ coin, metadata }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        {metadata ? (
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-md text-xs font-medium border",
                            getTechnologyColor(metadata.technology)
                          )}>
                            {metadata.technology}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unknown</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Price */}
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Current Price</td>
                    {coinsWithMetadata.map(({ coin }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                        {formatPrice(coin!.current_price)}
                      </td>
                    ))}
                  </tr>

                  {/* Market Cap */}
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Market Cap</td>
                    {coinsWithMetadata.map(({ coin }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center text-sm text-foreground">
                        {formatCurrency(coin!.market_cap)}
                      </td>
                    ))}
                  </tr>

                  {/* 24h Volume */}
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">24h Volume</td>
                    {coinsWithMetadata.map(({ coin }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center text-sm text-foreground">
                        {formatCurrency(coin!.total_volume)}
                      </td>
                    ))}
                  </tr>

                  {/* 24h Change */}
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">24h Change</td>
                    {coinsWithMetadata.map(({ coin }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        <span className={cn(
                          "text-sm font-medium",
                          (coin!.price_change_percentage_24h ?? 0) >= 0 ? "text-positive" : "text-negative"
                        )}>
                          {coin!.price_change_percentage_24h != null
                            ? `${coin!.price_change_percentage_24h >= 0 ? "+" : ""}${coin!.price_change_percentage_24h.toFixed(2)}%`
                            : "N/A"}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Privacy Features Comparison */}
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground w-48">
                      Privacy Features
                    </th>
                    {coinsWithMetadata.map(({ coin }) => (
                      <th key={coin!.id} className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                        {coin!.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Hidden Amounts</td>
                    {coinsWithMetadata.map(({ coin, metadata }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        {metadata?.features.hiddenAmounts ? (
                          <Check className="h-5 w-5 text-positive mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-negative mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Hidden Sender</td>
                    {coinsWithMetadata.map(({ coin, metadata }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        {metadata?.features.hiddenSender ? (
                          <Check className="h-5 w-5 text-positive mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-negative mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Hidden Recipient</td>
                    {coinsWithMetadata.map(({ coin, metadata }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        {metadata?.features.hiddenRecipient ? (
                          <Check className="h-5 w-5 text-positive mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-negative mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">Default Privacy</td>
                    {coinsWithMetadata.map(({ coin, metadata }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        {metadata?.features.defaultPrivacy ? (
                          <Check className="h-5 w-5 text-positive mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-negative mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">IP Obfuscation</td>
                    {coinsWithMetadata.map(({ coin, metadata }) => (
                      <td key={coin!.id} className="px-4 py-3 text-center">
                        {metadata?.features.ipObfuscation ? (
                          <Check className="h-5 w-5 text-positive mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-negative mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Price Charts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Price Charts (7 Days)</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${coinsWithMetadata.length}, 1fr)` }}>
                {coinsWithMetadata.map(({ coin }) => (
                  <div key={coin!.id} className="rounded-lg border border-border bg-card shadow-sm p-4">
                    <CoinPriceChart
                      sparklineData={coin!.sparkline_in_7d?.price}
                      priceChange24h={coin!.price_change_percentage_24h}
                      coinName={coin!.name}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Coins Selected
            </h3>
            <p className="text-sm text-muted-foreground">
              Select at least one coin from the dropdowns above to start comparing
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Compare;

