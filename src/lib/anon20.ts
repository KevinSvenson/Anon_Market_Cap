import type { Cryptocurrency } from "@/services/coingecko";
import { getPrivacyMetadata } from "@/data/privacyMetadata";

/**
 * ANON20 Index - Market-cap weighted index of top 20 high-privacy coins
 * 
 * Calculation Method: Direct Market Cap Normalization
 * Index Value = (MC_total_current / MC_total_base) × 20
 * 
 * Base Value: $20
 * Launch Date: September 28, 2025
 */

const BASE_VALUE = 20;
const LAUNCH_DATE = new Date('2025-09-28T00:00:00Z');

// LocalStorage keys
const ANON20_BASE_KEY = 'anon20_base_market_cap';
const ANON20_BASE_DATE_KEY = 'anon20_base_date';
const ANON20_HISTORY_KEY = 'anon20_historical_data';

/**
 * Filter coins eligible for ANON20 index
 * Criteria: High privacy rating (High privacy level)
 */
const filterHighPrivacyCoins = (coins: Cryptocurrency[]): Cryptocurrency[] => {
  return coins.filter(coin => {
    const metadata = getPrivacyMetadata(coin.id);
    if (!metadata) return false;
    
    // Only include coins with HIGH privacy level
    return metadata.privacyLevel === "High";
  });
};

/**
 * Get top 20 high-privacy coins by market cap
 */
const getTop20HighPrivacyCoins = (coins: Cryptocurrency[]): Cryptocurrency[] => {
  const highPrivacyCoins = filterHighPrivacyCoins(coins);
  
  // Sort by market cap, take top 20
  return highPrivacyCoins
    .filter(coin => coin.market_cap && coin.market_cap > 0)
    .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
    .slice(0, 20);
};

/**
 * Check if ANON20 has launched yet
 */
export const hasAnon20Launched = (): boolean => {
  const now = new Date();
  return now >= LAUNCH_DATE;
};

/**
 * Get days until launch (negative means already launched)
 */
export const getDaysUntilLaunch = (): number => {
  const now = new Date();
  const diffTime = LAUNCH_DATE.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get or initialize the ANON20 base market cap
 * Stores in localStorage to persist across sessions
 * Baseline date: September 28, 2025
 */
const getAnon20Base = (coins: Cryptocurrency[]): { baseMarketCap: number; baseDate: string } => {
  // Try to get existing base from localStorage
  const storedBase = localStorage.getItem(ANON20_BASE_KEY);
  const storedDate = localStorage.getItem(ANON20_BASE_DATE_KEY);
  
  if (storedBase && storedDate) {
    // Use existing base
    const baseMarketCap = parseFloat(storedBase);
    if (!isNaN(baseMarketCap) && baseMarketCap > 0) {
      return {
        baseMarketCap,
        baseDate: storedDate,
      };
    }
  }
  
  // No base exists or invalid - calculate and store new base
  const top20 = getTop20HighPrivacyCoins(coins);
  
  if (top20.length === 0) {
    // Fallback if no coins available
    return {
      baseMarketCap: 1,
      baseDate: LAUNCH_DATE.toISOString(),
    };
  }
  
  const totalMarketCap = top20.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  
  // Set baseline date to September 28, 2025
  const baselineDate = LAUNCH_DATE.toISOString();
  
  // Store in localStorage
  localStorage.setItem(ANON20_BASE_KEY, totalMarketCap.toString());
  localStorage.setItem(ANON20_BASE_DATE_KEY, baselineDate);
  
  console.log('📊 ANON20 base initialized:', {
    baseValue: BASE_VALUE,
    baseMarketCap: totalMarketCap,
    launchDate: baselineDate,
    constituents: top20.length,
  });
  
  return {
    baseMarketCap: totalMarketCap,
    baseDate: baselineDate,
  };
};

export interface ANON20Coin {
  id: string;
  name: string;
  symbol: string;
  marketCap: number;
  price: number;
  priceChange24h: number;
  weight: number;
}

/**
 * Get top 20 high-privacy coins by market cap
 */
export const getAnon20Constituents = (coins: Cryptocurrency[]): ANON20Coin[] => {
  const top20 = getTop20HighPrivacyCoins(coins);
  
  // Calculate total market cap
  const totalMarketCap = top20.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  
  if (totalMarketCap === 0) return [];
  
  // Calculate weights
  return top20.map(coin => ({
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol.toUpperCase(),
    marketCap: coin.market_cap || 0,
    price: coin.current_price || 0,
    priceChange24h: coin.price_change_percentage_24h || 0,
    weight: (coin.market_cap || 0) / totalMarketCap,
  }));
};

/**
 * Calculate ANON20 index value
 * Method: Direct market cap normalization
 * Base value: $20
 * Formula: 20 * (current_total_market_cap / base_market_cap)
 */
export const calculateAnon20Value = (coins: Cryptocurrency[]): number => {
  if (!coins || coins.length === 0) return BASE_VALUE;
  
  // If not launched yet, return base value
  if (!hasAnon20Launched()) {
    return BASE_VALUE;
  }
  
  // Get base market cap (from localStorage or initialize)
  const { baseMarketCap } = getAnon20Base(coins);
  
  // Get current high-privacy coins
  const top20 = getTop20HighPrivacyCoins(coins);
  
  if (top20.length === 0) return BASE_VALUE;
  
  // Calculate current total market cap
  const currentMarketCap = top20.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  
  // Prevent division by zero
  if (baseMarketCap === 0) return BASE_VALUE;
  
  // Calculate index value
  const indexValue = BASE_VALUE * (currentMarketCap / baseMarketCap);
  
  return indexValue;
};

/**
 * Calculate 24h change in ANON20 index
 * Uses weighted average of constituent coins' 24h changes
 */
export const calculateAnon20Change = (coins: Cryptocurrency[]): number => {
  if (!coins || coins.length === 0) return 0;
  if (!hasAnon20Launched()) return 0;
  
  // Get high-privacy coins
  const top20 = getTop20HighPrivacyCoins(coins);
  
  if (top20.length === 0) return 0;
  
  // Calculate total market cap for weights
  const totalMarketCap = top20.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  
  if (totalMarketCap === 0) return 0;
  
  // Calculate weighted average change
  const weightedChange = top20.reduce((sum, coin) => {
    const weight = (coin.market_cap || 0) / totalMarketCap;
    const change = coin.price_change_percentage_24h || 0;
    return sum + (weight * change);
  }, 0);
  
  return weightedChange;
};

/**
 * Store daily ANON20 value for historical tracking
 * Should be called once per day after launch
 */
export const storeAnon20DailyValue = (coins: Cryptocurrency[]) => {
  if (!hasAnon20Launched()) {
    console.log('⏰ ANON20 has not launched yet. Launch date: Sept 28, 2025');
    return;
  }
  
  const value = calculateAnon20Value(coins);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Get existing history
  const historyJson = localStorage.getItem(ANON20_HISTORY_KEY);
  const history = historyJson ? JSON.parse(historyJson) : {};
  
  // Don't overwrite existing data for today
  if (history[today]) {
    console.log('📊 ANON20 value already recorded for today');
    return;
  }
  
  // Store today's value
  history[today] = {
    value,
    timestamp: new Date().toISOString(),
    constituents: getTop20HighPrivacyCoins(coins).length,
  };
  
  localStorage.setItem(ANON20_HISTORY_KEY, JSON.stringify(history));
  
  console.log('📊 ANON20 daily value stored:', { date: today, value });
};

/**
 * Get ANON20 historical data
 * Returns array of { date, value, timestamp }
 */
export const getAnon20History = (): Array<{ date: string; value: number; timestamp: string }> => {
  const historyJson = localStorage.getItem(ANON20_HISTORY_KEY);
  if (!historyJson) return [];
  
  const history = JSON.parse(historyJson);
  return Object.entries(history)
    .map(([date, data]: [string, any]) => ({
      date,
      value: data.value,
      timestamp: data.timestamp,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Get ANON20 base information
 * Returns base market cap, date established, and days since baseline
 */
export const getAnon20BaseInfo = (coins: Cryptocurrency[]) => {
  const { baseMarketCap, baseDate } = getAnon20Base(coins);
  const baseDateObj = new Date(baseDate);
  const now = new Date();
  const daysSinceBase = Math.floor((now.getTime() - baseDateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    baseValue: BASE_VALUE,
    baseMarketCap,
    launchDate: baseDateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    daysSinceLaunch: daysSinceBase,
    hasLaunched: hasAnon20Launched(),
    daysUntilLaunch: getDaysUntilLaunch(),
  };
};

/**
 * Reset ANON20 base (admin function)
 * Call this to recalibrate the index
 */
export const resetAnon20Base = () => {
  localStorage.removeItem(ANON20_BASE_KEY);
  localStorage.removeItem(ANON20_BASE_DATE_KEY);
  localStorage.removeItem(ANON20_HISTORY_KEY);
  console.log('🔄 ANON20 base and history reset.');
};

