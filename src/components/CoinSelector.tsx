import { useQuery } from "@tanstack/react-query";
import { fetchPrivacyCoins, type Cryptocurrency } from "@/services/coingecko";
import { cn } from "@/lib/utils";

interface CoinSelectorProps {
  selectedCoinId: string | null;
  onSelect: (coinId: string) => void;
  label: string;
  excludeCoinIds?: string[];
}

/**
 * Dropdown component for selecting a privacy coin
 */
const CoinSelector = ({ selectedCoinId, onSelect, label, excludeCoinIds = [] }: CoinSelectorProps) => {
  const { data: coins, isLoading } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // Filter out excluded coins
  const availableCoins = coins?.filter(coin => !excludeCoinIds.includes(coin.id)) || [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        value={selectedCoinId || ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={isLoading}
        className={cn(
          "w-full px-3 py-2 text-sm bg-background border border-border rounded-md",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          "text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <option value="">Select a coin...</option>
        {availableCoins.map((coin: Cryptocurrency) => (
          <option key={coin.id} value={coin.id}>
            {coin.name} ({coin.symbol.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
};

export default CoinSelector;

