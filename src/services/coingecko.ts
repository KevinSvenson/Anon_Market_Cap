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
const COINGECKO_API_BASE = import.meta.env.DEV 
  ? "/api/coingecko" 
  : "https://api.coingecko.com/api/v3";

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
    const response = await fetch(`${COINGECKO_API_BASE}/global`);

    // Handle rate limiting (429 status)
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      throw new RateLimitError(
        "API rate limit exceeded. Please wait before making another request.",
        retrySeconds
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(
          `CoinGecko API server error (${response.status}). Please try again later.`
        );
      }
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

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

    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=${page}&sparkline=false&price_change_percentage=24h`
    );

    // Handle rate limiting (429 status)
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      throw new RateLimitError(
        "API rate limit exceeded. Please wait before making another request.",
        retrySeconds
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(
          `CoinGecko API server error (${response.status}). Please try again later.`
        );
      }
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

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
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/categories?per_page=250&page=1`
    );

    // Handle rate limiting (429 status)
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      throw new RateLimitError(
        "API rate limit exceeded. Please wait before making another request.",
        retrySeconds
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(
          `CoinGecko API server error (${response.status}). Please try again later.`
        );
      }
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

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

    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&category=privacy-coins&order=market_cap_desc&per_page=${limit}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`
    );

    // Handle rate limiting (429 status)
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      throw new RateLimitError(
        "API rate limit exceeded. Please wait before making another request.",
        retrySeconds
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(
          `CoinGecko API server error (${response.status}). Please try again later.`
        );
      }
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

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
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${encodeURIComponent(
        coinId
      )}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    );

    // Handle rate limiting (429 status)
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      throw new RateLimitError(
        "API rate limit exceeded. Please wait before making another request.",
        retrySeconds
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(
          `CoinGecko API server error (${response.status}). Please try again later.`
        );
      }
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

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

