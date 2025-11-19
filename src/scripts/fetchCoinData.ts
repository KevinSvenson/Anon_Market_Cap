/**
 * Utility to fetch coin data from CoinPaprika API
 * CoinPaprika provides: tags, whitepaper links, detailed metadata
 * Free tier: 20,000 calls/month, no API key required
 */

interface CoinPaprikaData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  tags: Array<{ id: string; name: string }>;
  whitepaper?: { link: string };
  links?: {
    website?: string[];
    source_code?: string[];
  };
  started_at?: string;
  org_structure?: string;
  hash_algorithm?: string;
}

interface CoinGeckoMapping {
  coingeckoId: string;
  coinpaprikaId: string;
}

// Mapping between CoinGecko IDs and CoinPaprika IDs
// CoinPaprika format: {symbol}-{name} (e.g., "xmr-monero")
const ID_MAPPINGS: CoinGeckoMapping[] = [
  { coingeckoId: "monero", coinpaprikaId: "xmr-monero" },
  { coingeckoId: "zcash", coinpaprikaId: "zec-zcash" },
  { coingeckoId: "dash", coinpaprikaId: "dash-dash" },
  { coingeckoId: "pirate-chain", coinpaprikaId: "arrr-pirate-chain" },
  { coingeckoId: "firo", coinpaprikaId: "firo-firo" },
  { coingeckoId: "secret", coinpaprikaId: "scrt-secret" },
  { coingeckoId: "beam", coinpaprikaId: "beam-beam" },
  { coingeckoId: "grin", coinpaprikaId: "grin-grin" },
  { coingeckoId: "horizen", coinpaprikaId: "zen-horizen" },
  { coingeckoId: "verge", coinpaprikaId: "xvg-verge" },
  { coingeckoId: "decred", coinpaprikaId: "dcr-decred" },
  { coingeckoId: "pivx", coinpaprikaId: "pivx-pivx" },
  { coingeckoId: "nav-coin", coinpaprikaId: "nav-navcoin" },
  { coingeckoId: "oasis-network", coinpaprikaId: "rose-oasis-network" },
  { coingeckoId: "dero", coinpaprikaId: "dero-dero" },
  { coingeckoId: "beldex", coinpaprikaId: "bdx-beldex" },
  { coingeckoId: "particl", coinpaprikaId: "part-particl" },
  { coingeckoId: "haven", coinpaprikaId: "xhv-haven-protocol" },
  { coingeckoId: "litecoin", coinpaprikaId: "ltc-litecoin" },
  { coingeckoId: "zano", coinpaprikaId: "zano-zano" },
  { coingeckoId: "aleo", coinpaprikaId: "aleo-aleo" },
  { coingeckoId: "railgun", coinpaprikaId: "rail-railgun" },
  { coingeckoId: "aleph-zero", coinpaprikaId: "azero-aleph-zero" },
  { coingeckoId: "nym", coinpaprikaId: "nym-nym" },
  { coingeckoId: "super-zero", coinpaprikaId: "sero-super-zero" },
  { coingeckoId: "concordium", coinpaprikaId: "ccd-concordium" },
  { coingeckoId: "keep-network", coinpaprikaId: "keep-keep-network" },
  { coingeckoId: "nucypher", coinpaprikaId: "nu-nucypher" },
  { coingeckoId: "mobilecoin", coinpaprikaId: "mob-mobilecoin" },
  { coingeckoId: "findora", coinpaprikaId: "fra-findora" },
  { coingeckoId: "oxen", coinpaprikaId: "oxen-oxen" },
  { coingeckoId: "raptoreum", coinpaprikaId: "rtm-raptoreum" },
  { coingeckoId: "wownero", coinpaprikaId: "wow-wownero" },
  { coingeckoId: "ergo", coinpaprikaId: "erg-ergo" },
  { coingeckoId: "scala", coinpaprikaId: "xla-scala" },
  { coingeckoId: "nillion", coinpaprikaId: "nil-nillion" },
];

/**
 * Fetch coin data from CoinPaprika
 */
export async function fetchCoinPaprikaData(coinpaprikaId: string): Promise<CoinPaprikaData | null> {
  try {
    const response = await fetch(`https://api.coinpaprika.com/v1/coins/${coinpaprikaId}`);
    
    if (!response.ok) {
      console.warn(`CoinPaprika API error for ${coinpaprikaId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching CoinPaprika data for ${coinpaprikaId}:`, error);
    return null;
  }
}

/**
 * Get CoinPaprika ID from CoinGecko ID
 */
export function getCoinPaprikaId(coingeckoId: string): string | null {
  const mapping = ID_MAPPINGS.find(m => m.coingeckoId === coingeckoId);
  return mapping?.coinpaprikaId || null;
}

/**
 * Fetch coin description from CoinGecko (more detailed than CoinPaprika)
 */
export async function fetchCoinGeckoDescription(coingeckoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`);
    
    if (!response.ok) {
      console.warn(`CoinGecko API error for ${coingeckoId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    // Strip HTML tags from description
    const description = data.description?.en || "";
    return description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error(`Error fetching CoinGecko description for ${coingeckoId}:`, error);
    return null;
  }
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

