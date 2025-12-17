import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as a full number with commas (no abbreviation)
 * Example: formatFullNumber(33448000000) → "33,448,000,000"
 */
export function formatFullNumber(num: number | null): string {
  if (num == null) return "N/A";
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * Format a number as abbreviated currency (for volume)
 * Example: formatLargeNumber(4120000000) → "$4.12B"
 */
export function formatLargeNumber(num: number | null): string {
  if (num == null) return "N/A";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}
