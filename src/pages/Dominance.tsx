import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Crown, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fetchPrivacyCoins, type Cryptocurrency } from '@/services/coingecko';
import { getPrivacyMetadata } from '@/data/privacyMetadata';
import Header from '@/components/Header';
import { formatLargeNumber } from '@/lib/utils';

// Colors for pie chart
const COLORS = [
  '#10b981', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

interface CoinWithDominance extends Cryptocurrency {
  dominance: number;
  metadata: ReturnType<typeof getPrivacyMetadata>;
}

export default function Dominance() {
  const { data: coins, isLoading } = useQuery({
    queryKey: ['privacy-coins'],
    queryFn: () => fetchPrivacyCoins(100, 1),
    staleTime: 3 * 60 * 1000,
  });

  // Calculate total market cap
  const totalMarketCap = useMemo(() => {
    return coins?.reduce((sum, coin) => sum + (coin.market_cap || 0), 0) || 0;
  }, [coins]);

  // Calculate market share for each coin
  const marketShareData = useMemo(() => {
    if (!coins || totalMarketCap === 0) return [];

    return coins
      .map(coin => ({
        ...coin,
        dominance: (coin.market_cap / totalMarketCap) * 100,
        metadata: getPrivacyMetadata(coin.id),
      }))
      .sort((a, b) => b.dominance - a.dominance) as CoinWithDominance[];
  }, [coins, totalMarketCap]);

  // Top coin (dominant)
  const dominantCoin = marketShareData[0];

  // Top 10 for pie chart
  const top10 = marketShareData.slice(0, 10);
  const othersShare = marketShareData
    .slice(10)
    .reduce((sum, coin) => sum + coin.dominance, 0);

  const pieData = [
    ...top10.map(coin => ({
      name: coin.name,
      value: coin.dominance,
      symbol: coin.symbol.toUpperCase(),
    })),
    ...(othersShare > 0 ? [{
      name: 'Others',
      value: othersShare,
      symbol: 'OTHER',
    } as const] : []),
  ];

  // Top 20 for table
  const top20 = marketShareData.slice(0, 20);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Privacy Coin Dominance</h1>
          <p className="text-muted-foreground">
            Market share distribution across all privacy-focused cryptocurrencies
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading dominance data...</div>
          </div>
        ) : (
          <>
            {/* Dominant Coin Showcase */}
            {dominantCoin && (
              <Card className="mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <CardTitle className="text-lg">Most Dominant Privacy Coin</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={dominantCoin.image}
                        alt={dominantCoin.name}
                        className="w-16 h-16 rounded-full"
                      />
                      <div>
                        <h3 className="text-2xl font-bold">{dominantCoin.name}</h3>
                        <p className="text-muted-foreground">
                          ${dominantCoin.symbol.toUpperCase()}
                        </p>
                        {dominantCoin.metadata?.displayTech && (
                          <Badge variant="outline" className="mt-2">
                            {dominantCoin.metadata.displayTech}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-4xl font-bold text-primary">
                        {dominantCoin.dominance.toFixed(2)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Market Share</div>
                      <div className="text-lg font-semibold mt-2">
                        {formatLargeNumber(dominantCoin.market_cap)}
                      </div>
                      <div className="text-xs text-muted-foreground">Market Cap</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pie Chart + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Share Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground">Top 10 coins + Others</p>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `${value.toFixed(2)}%`}
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Dominance Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Top 3 Combined</h4>
                    <div className="text-3xl font-bold text-primary mb-2">
                      {top10.slice(0, 3).reduce((sum, coin) => sum + coin.dominance, 0).toFixed(2)}%
                    </div>
                    <div className="space-y-1 text-sm">
                      {top10.slice(0, 3).map((coin, index) => (
                        <div key={coin.id} className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            #{index + 1} {coin.symbol.toUpperCase()}
                          </span>
                          <span className="font-medium">{coin.dominance.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">Top 10 Combined</h4>
                    <div className="text-3xl font-bold text-primary">
                      {top10.reduce((sum, coin) => sum + coin.dominance, 0).toFixed(2)}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Top 10 coins represent majority of privacy crypto market
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">Market Concentration</h4>
                    <div className="text-lg font-medium">
                      {top10.reduce((sum, coin) => sum + coin.dominance, 0) > 80
                        ? 'Highly Concentrated'
                        : top10.reduce((sum, coin) => sum + coin.dominance, 0) > 60
                        ? 'Moderately Concentrated'
                        : 'Well Distributed'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on top 10 market share
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dominance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top 20 by Market Dominance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ranked by percentage of total privacy crypto market cap
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Coin</TableHead>
                      <TableHead>Technology</TableHead>
                      <TableHead className="text-right">Market Cap</TableHead>
                      <TableHead className="text-right">Dominance</TableHead>
                      <TableHead className="text-right">24h Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top20.map((coin, index) => (
                      <TableRow key={coin.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <Link
                            to={`/coin/${coin.id}`}
                            className="flex items-center gap-3 hover:text-primary"
                          >
                            <img
                              src={coin.image}
                              alt={coin.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="font-medium">{coin.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {coin.symbol.toUpperCase()}
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          {coin.metadata?.displayTech && (
                            <Badge variant="outline">
                              {coin.metadata.displayTech}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatLargeNumber(coin.market_cap)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="font-bold text-lg"
                              style={{ color: COLORS[index % COLORS.length] }}
                            >
                              {coin.dominance.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'flex items-center justify-end gap-1 font-medium',
                              coin.price_change_percentage_24h >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            )}
                          >
                            {coin.price_change_percentage_24h >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Methodology */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">About Dominance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Market Dominance</strong> represents a
                  cryptocurrency's market capitalization as a percentage of the total privacy
                  cryptocurrency market cap.
                </p>
                <p>
                  <strong className="text-foreground">Formula:</strong> Coin Dominance = (Coin
                  Market Cap / Total Privacy Market Cap) × 100
                </p>
                <p>
                  <strong className="text-foreground">Interpretation:</strong> Higher dominance
                  indicates greater market share and influence within the privacy crypto sector.
                  The dominant coin is typically the most liquid and widely adopted.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

