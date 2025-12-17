import { useEffect } from 'react';
import { storeAnon20DailyValue, hasAnon20Launched } from '@/lib/anon20';
import type { Cryptocurrency } from '@/services/coingecko';

/**
 * Hook to automatically store ANON20 daily values
 * Call this in Index.tsx to track data daily
 */
export const useAnon20DailyTracker = (coins: Cryptocurrency[] | undefined) => {
  useEffect(() => {
    if (!coins || coins.length === 0) return;
    if (!hasAnon20Launched()) return;
    
    // Check if we've already stored today's value
    const lastStoredDate = localStorage.getItem('anon20_last_stored_date');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastStoredDate === today) {
      // Already stored today
      return;
    }
    
    // Store today's value
    storeAnon20DailyValue(coins);
    localStorage.setItem('anon20_last_stored_date', today);
    
  }, [coins]);
};

