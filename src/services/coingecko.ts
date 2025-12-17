/**
 * CoinGecko API Service
 * 
 * This service provides functions to fetch cryptocurrency market data
 * from the CoinGecko public API (no API key required for basic endpoints).
 * 
 * API Documentation: https://www.coingecko.com/api/documentation
 * Rate Limits: Free tier allows 10-50 calls/minute
 */

// Use proxy in development to avoid CORS issues, direct API in production
// Fallback to direct API if proxy fails
const getApiBase = () => {
  if (import.meta.env.DEV) {
    // Try proxy first, but we'll handle fallback in fetchWithRetry
    return "/api/coingecko";
  }
  return "https://api.coingecko.com/api/v3";
};

const COINGECKO_API_BASE = getApiBase();
const COINGECKO_DIRECT_API = "https://api.coingecko.com/api/v3";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Fetch with automatic retry logic for transient errors
 * Falls back to direct API if proxy fails in development
 */
const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {},
  retries = MAX_RETRIES,
  useDirectApi = false
): Promise<Response> => {
  try {
    // If proxy failed and we're in dev, try direct API
    let fetchUrl = url;
    if (useDirectApi && import.meta.env.DEV && url.startsWith('/api/coingecko')) {
      fetchUrl = url.replace('/api/coingecko', COINGECKO_DIRECT_API);
      console.log('Falling back to direct API:', fetchUrl);
    }
    
    const response = await fetch(fetchUrl, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      // Retry on transient errors
      if (retries > 0 && (response.status === 504 || response.status === 500 || response.status === 429 || response.status === 503)) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY;
        
        console.log(`API error ${response.status}, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, useDirectApi);
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new RateLimitError(`API rate limit exceeded. Please wait before making another request.`, retrySeconds);
      }
      
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    // Retry on network errors, try direct API if proxy fails in dev
    if (retries > 0) {
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
        // If proxy failed and we haven't tried direct API yet, try it
        if (import.meta.env.DEV && !useDirectApi && url.startsWith('/api/coingecko')) {
          console.log('Proxy failed, trying direct API...');
          return fetchWithRetry(url, options, retries, true);
        }
        
        console.log(`Network error, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1, useDirectApi);
      }
    }
    throw error;
  }
};

/**
 * Custom error class for API rate limit errors
 */
export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Custom error class for network errors
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Global market data response structure
 */
export interface GlobalMarketData {
  data: {
    total_market_cap: {
      usd: number;
    };
    total_volume: {
      usd: number;
    };
    market_cap_percentage: {
      [key: string]: number;
    };
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
    markets: number;
  };
}

/**
 * Individual cryptocurrency market data
 */
export interface Cryptocurrency {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  sparkline_in_7d?: {
    price: number[];
  };
}

/**
 * Category data from CoinGecko API
 */
export interface CategoryData {
  id: string;
  name: string;
  market_cap: number | null;
  market_cap_change_24h: number | null;
  content: string;
  top_3_coins_id: string[];
  top_3_coins: string[];
  volume_24h: number | null;
  updated_at: string | null;
}

/**
 * Privacy coin category statistics
 */
export interface PrivacyCoinCategoryStats {
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
}

/**
 * Detailed coin data response structure
 */
export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  hashing_algorithm: string | null;
  genesis_date: string | null;
  market_cap_rank: number | null;
  description: {
    en: string;
  };
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: {
      usd: number | null;
    };
    market_cap: {
      usd: number | null;
    };
    total_volume: {
      usd: number | null;
    };
    circulating_supply: number | null;
    total_supply: number | null;
    max_supply: number | null;
    price_change_percentage_24h: number | null;
    high_24h: {
      usd: number | null;
    };
    low_24h: {
      usd: number | null;
    };
  };
  last_updated: string | null;
}

/**
 * Fetches global cryptocurrency market data
 * 
 * @returns Promise resolving to global market data
 * @throws Error if the API request fails
 */
export async function fetchGlobalMarketData(): Promise<GlobalMarketData["data"]> {
  try {
    const response = await fetchWithRetry(`${COINGECKO_API_BASE}/global`);

    const data: GlobalMarketData = await response.json();
    
    // Validate data structure
    if (!data || !data.data) {
      throw new Error("Invalid response format from CoinGecko API");
    }

    return data.data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        "Network error: Unable to connect to CoinGecko API. Please check your internet connection."
      );
    }

    // Re-throw custom errors
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch global market data: ${error.message}`);
    }
    throw new Error("Failed to fetch global market data: Unknown error");
  }
}

/**
 * Fetches top cryptocurrencies by market cap
 * 
 * @param limit - Number of cryptocurrencies to fetch (default: 100)
 * @param page - Page number for pagination (default: 1)
 * @returns Promise resolving to array of cryptocurrency data
 * @throws Error if the API request fails
 */
export async function fetchTopCryptocurrencies(
  limit: number = 100,
  page: number = 1
): Promise<Cryptocurrency[]> {
  try {
    // Validate parameters
    if (limit < 1 || limit > 250) {
      throw new Error("Limit must be between 1 and 250");
    }
    if (page < 1) {
      throw new Error("Page must be greater than 0");
    }

    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=${page}&sparkline=false&price_change_percentage=24h`
    );

    const data: Cryptocurrency[] = await response.json();
    
    // Validate data
    if (!Array.isArray(data)) {
      throw new Error("Invalid response format from CoinGecko API");
    }

    // Filter out any invalid entries
    return data.filter((crypto) => 
      crypto && 
      crypto.id && 
      crypto.name && 
      typeof crypto.current_price === "number"
    );
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        "Network error: Unable to connect to CoinGecko API. Please check your internet connection."
      );
    }

    // Re-throw custom errors
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch cryptocurrency data: ${error.message}`
      );
    }
    throw new Error("Failed to fetch cryptocurrency data: Unknown error");
  }
}

/**
 * Fetches privacy coin category statistics
 * 
 * @returns Promise resolving to privacy coin category statistics
 * @throws Error if the API request fails
 */
export async function fetchPrivacyCoinCategoryStats(): Promise<PrivacyCoinCategoryStats> {
  try {
    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/categories?per_page=250&page=1`
    );

    const categories: CategoryData[] = await response.json();
    
    // Validate data
    if (!Array.isArray(categories)) {
      throw new Error("Invalid response format from CoinGecko API");
    }

    // Find privacy coins category
    const privacyCategory = categories.find(
      (cat) => cat.id === "privacy-coins"
    );

    if (!privacyCategory) {
      throw new Error("Privacy coins category not found in CoinGecko API");
    }

    // Validate that we have the required data
    if (
      privacyCategory.market_cap === null ||
      privacyCategory.market_cap_change_24h === null ||
      privacyCategory.volume_24h === null
    ) {
      throw new Error("Privacy coin category statistics are not available");
    }

    return {
      market_cap: privacyCategory.market_cap,
      market_cap_change_24h: privacyCategory.market_cap_change_24h,
      volume_24h: privacyCategory.volume_24h,
    };
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        "Network error: Unable to connect to CoinGecko API. Please check your internet connection."
      );
    }

    // Re-throw custom errors
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch privacy coin category statistics: ${error.message}`
      );
    }
    throw new Error(
      "Failed to fetch privacy coin category statistics: Unknown error"
    );
  }
}

/**
 * Fetches privacy coins by market cap
 * 
 * @param limit - Number of privacy coins to fetch (default: 100)
 * @param page - Page number for pagination (default: 1)
 * @returns Promise resolving to array of privacy coin data
 * @throws Error if the API request fails
 */
export async function fetchPrivacyCoins(
  limit: number = 100,
  page: number = 1
): Promise<Cryptocurrency[]> {
  try {
    // Validate parameters
    if (limit < 1 || limit > 250) {
      throw new Error("Limit must be between 1 and 250");
    }
    if (page < 1) {
      throw new Error("Page must be greater than 0");
    }

    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&category=privacy-coins&order=market_cap_desc&per_page=${limit}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`
    );

    const data: Cryptocurrency[] = await response.json();
    
    // Validate data
    if (!Array.isArray(data)) {
      throw new Error("Invalid response format from CoinGecko API");
    }

    // Filter out any invalid entries
    return data.filter((crypto) => 
      crypto && 
      crypto.id && 
      crypto.name && 
      typeof crypto.current_price === "number"
    );
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        "Network error: Unable to connect to CoinGecko API. Please check your internet connection."
      );
    }

    // Re-throw custom errors
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch privacy coins: ${error.message}`
      );
    }
    throw new Error("Failed to fetch privacy coins: Unknown error");
  }
}

/**
 * Market chart data response structure
 */
export interface MarketChartData {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

/**
 * Fetches market chart data for a specific coin by timeframe
 * 
 * @param coinId - CoinGecko ID of the coin (e.g., "monero")
 * @param timeframe - Timeframe: '1h', '24h', or '7d'
 * @returns Promise resolving to market chart data
 * @throws Error if the API request fails
 */
export async function fetchMarketChart(
  coinId: string,
  timeframe: '1h' | '24h' | '7d'
): Promise<MarketChartData> {
  if (!coinId) {
    throw new Error("Coin ID is required to fetch market chart");
  }

  try {
    // Map timeframes to CoinGecko API days parameter
    const daysMap: Record<'1h' | '24h' | '7d', string> = {
      '1h': '1',   // 1 day with hourly granularity
      '24h': '1',  // 1 day with 5-min granularity
      '7d': '7',   // 7 days with hourly granularity
    };

    const days = daysMap[timeframe];
    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    const data: MarketChartData = await response.json();

    if (!data || !data.prices || !Array.isArray(data.prices)) {
      throw new Error("Invalid market chart response from CoinGecko API");
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        "Network error: Unable to connect to CoinGecko API. Please check your internet connection."
      );
    }

    // Re-throw custom errors
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch market chart: ${error.message}`);
    }
    throw new Error("Failed to fetch market chart: Unknown error");
  }
}

/**
 * Fetches detailed information for a specific coin
 * 
 * @param coinId - CoinGecko ID of the coin (e.g., "monero")
 * @returns Promise resolving to detailed coin information
 * @throws Error if the API request fails
 */
export async function fetchCoinDetail(coinId: string): Promise<CoinDetail> {
  if (!coinId) {
    throw new Error("Coin ID is required to fetch coin details");
  }

  try {
    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/${encodeURIComponent(
        coinId
      )}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    );

    const data: CoinDetail = await response.json();

    if (!data || !data.id) {
      throw new Error("Invalid coin detail response from CoinGecko API");
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        "Network error: Unable to connect to CoinGecko API. Please check your internet connection."
      );
    }

    // Re-throw custom errors
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch coin details: ${error.message}`);
    }
    throw new Error("Failed to fetch coin details: Unknown error");
  }
}

/**
 * Fetch 30-day price history for specific coins
 * Used for 30D timeframe in stats charts
 * 
 * @param coinIds - Array of CoinGecko coin IDs to fetch history for
 * @returns Promise resolving to a record mapping coinId to price history array
 */
export async function get30DayHistory(coinIds: string[]): Promise<Record<string, [number, number][]>> {
  if (!coinIds || coinIds.length === 0) {
    return {};
  }

  try {
    // Fetch 30-day data for each coin in parallel
    const promises = coinIds.map(async (coinId) => {
      try {
        const url = `${COINGECKO_API_BASE}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=30&interval=daily`;
        const response = await fetchWithRetry(url);
        const data: MarketChartData = await response.json();
        return { coinId, prices: data.prices || [] }; // [[timestamp, price], ...]
      } catch (error) {
        console.error(`Failed to fetch 30D data for ${coinId}:`, error);
        return { coinId, prices: [] };
      }
    });

    const results = await Promise.all(promises);

    // Convert to Record<coinId, prices>
    const historyMap: Record<string, [number, number][]> = {};
    results.forEach(({ coinId, prices }) => {
      historyMap[coinId] = prices;
    });

    return historyMap;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        "Network error: Unable to fetch 30-day history. Please check your internet connection."
      );
    }

    // Re-throw custom errors
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch 30-day history: ${error.message}`);
    }
    throw new Error("Failed to fetch 30-day history: Unknown error");
  }
}


