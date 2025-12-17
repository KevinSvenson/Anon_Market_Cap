import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchPrivacyCoins, 
  type Cryptocurrency,
  RateLimitError,
  NetworkError 
} from "@/services/coingecko";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Shield, Info, Share2 } from "lucide-react";
import { ShareModal } from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import InlinePriceChart from "./InlinePriceChart";
import { getPrivacyMetadata, getTechnologyColor, getTechnologyDisplayName, getAllTechnologies, getAllPrivacyLevels, detectNewCoins, type PrivacyTechnology, type PrivacyLevel } from "@/data/privacyMetadata";
import TableSkeleton from "./table/TableSkeleton";
import ErrorState from "./table/ErrorState";
import EmptyState from "./table/EmptyState";
import ActiveFilters from "./filters/ActiveFilters";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Formats a number as abbreviated currency (for volume)
 */
const formatCurrency = (num: number): string => {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

/**
 * Formats market cap as full number with commas
 */
const formatMarketCapFull = (num: number): string => {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

/**
 * Formats a price value
 */
const formatPrice = (num: number): string => {
  if (num >= 1) return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${num.toFixed(6)}`;
};

type SortColumn = "market_cap_rank" | "name" | "current_price" | "market_cap" | "price_change_percentage_1h_in_currency" | "price_change_percentage_24h" | "price_change_percentage_7d_in_currency" | "total_volume";
type SortDirection = "asc" | "desc" | null;

interface CryptoTableProps {
  technologyFilter?: PrivacyTechnology | "all";
  privacyLevelFilter?: PrivacyLevel | "all";
  displayTechFilter?: string | null;
  searchQuery?: string;
  itemsPerPage?: number;
  rankingMode?: 'global' | 'privacy';
  coinsWithPrivacyRank?: Array<Cryptocurrency & { privacy_rank?: number }>;
  onTechnologyFilterChange?: (filter: PrivacyTechnology | "all") => void;
  onPrivacyLevelFilterChange?: (filter: PrivacyLevel | "all") => void;
  onDisplayTechFilterChange?: (filter: string | null) => void;
  onSearchQueryChange?: (query: string) => void;
}

const CryptoTable = ({
  technologyFilter: externalTechnologyFilter,
  privacyLevelFilter: externalPrivacyLevelFilter,
  displayTechFilter: externalDisplayTechFilter,
  searchQuery: externalSearchQuery,
  itemsPerPage: externalItemsPerPage,
  rankingMode = 'global',
  coinsWithPrivacyRank,
  onTechnologyFilterChange,
  onPrivacyLevelFilterChange,
  onDisplayTechFilterChange,
  onSearchQueryChange,
}: CryptoTableProps = {}) => {
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState<SortColumn>("market_cap");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc"); // desc = highest market cap first
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>("");
  const [internalTechnologyFilter, setInternalTechnologyFilter] = useState<PrivacyTechnology | "all">("all");
  const [internalPrivacyLevelFilter, setInternalPrivacyLevelFilter] = useState<PrivacyLevel | "all">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [internalItemsPerPage, setInternalItemsPerPage] = useState<number>(25);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Cryptocurrency | null>(null);

  // Use external filters if provided, otherwise use internal state
  const technologyFilter = externalTechnologyFilter !== undefined ? externalTechnologyFilter : internalTechnologyFilter;
  const privacyLevelFilter = externalPrivacyLevelFilter !== undefined ? externalPrivacyLevelFilter : internalPrivacyLevelFilter;
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const itemsPerPage = externalItemsPerPage !== undefined ? externalItemsPerPage : internalItemsPerPage;

  const setTechnologyFilter = (filter: PrivacyTechnology | "all") => {
    if (onTechnologyFilterChange) {
      onTechnologyFilterChange(filter);
    } else {
      setInternalTechnologyFilter(filter);
    }
  };

  const setPrivacyLevelFilter = (filter: PrivacyLevel | "all") => {
    if (onPrivacyLevelFilterChange) {
      onPrivacyLevelFilterChange(filter);
    } else {
      setInternalPrivacyLevelFilter(filter);
    }
  };

  const { data, isLoading, error, isError, refetch } = useQuery({
    queryKey: ["privacyCoins"],
    queryFn: () => fetchPrivacyCoins(100, 1),
    refetchInterval: (query) => {
      // If we hit rate limit, wait longer before retrying
      if (query.state.error instanceof RateLimitError) {
        const retryAfter = query.state.error.retryAfter || 60;
        return retryAfter * 1000; // Convert seconds to milliseconds
      }
      return 185000; // Refetch every 3 minutes 5 seconds (staggered, increased from 2 min 5s)
    },
    staleTime: 120000, // Consider data fresh for 2 minutes (increased from 1 minute)
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors - wait for the retry interval
      if (error instanceof RateLimitError) {
        return false;
      }
      // Retry network errors up to 3 times
      if (error instanceof NetworkError) {
        return failureCount < 3;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Active filter tracking
  const activeFilters = useMemo(() => {
    const filters: Array<{id: string, label: string, type: string}> = [];
    if (searchQuery.trim()) {
      filters.push({id: 'search', label: `Search: "${searchQuery}"`, type: 'search'});
    }
    if (technologyFilter !== 'all' && !externalDisplayTechFilter) {
      filters.push({id: 'tech', label: technologyFilter, type: 'technology'});
    }
    if (privacyLevelFilter !== 'all') {
      filters.push({id: 'privacy', label: `${privacyLevelFilter} Privacy`, type: 'privacy'});
    }
    if (externalDisplayTechFilter) {
      filters.push({id: 'displayTech', label: externalDisplayTechFilter, type: 'displayTech'});
    }
    return filters;
  }, [searchQuery, technologyFilter, privacyLevelFilter, externalDisplayTechFilter]);

  const clearAllFilters = () => {
    // Clear search (external or internal)
    if (onSearchQueryChange) {
      onSearchQueryChange("");
    } else if (externalSearchQuery === undefined) {
      setInternalSearchQuery("");
    }
    setTechnologyFilter("all");
    setPrivacyLevelFilter("all");
    if (onDisplayTechFilterChange) {
      onDisplayTechFilterChange(null);
    }
  };

  const handleRemoveFilter = (filterId: string) => {
    if (filterId === 'search') {
      // Clear search (external or internal)
      if (onSearchQueryChange) {
        onSearchQueryChange("");
      } else if (externalSearchQuery === undefined) {
        setInternalSearchQuery("");
      }
    } else if (filterId === 'tech') {
      setTechnologyFilter("all");
    } else if (filterId === 'privacy') {
      setPrivacyLevelFilter("all");
    } else if (filterId === 'displayTech' && onDisplayTechFilterChange) {
      onDisplayTechFilterChange(null);
    }
  };

  // Use coins with privacy rank if provided, otherwise use data from query
  const coinsData = coinsWithPrivacyRank || data || [];

  // Filter and sort data based on search query, technology filter, and sort settings
  const filteredAndSortedData = useMemo(() => {
    if (!coinsData || coinsData.length === 0) return [];

    // First, filter by search query
    let filtered = coinsData;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = data.filter((crypto) => {
        const name = (crypto.name || "").toLowerCase();
        const symbol = (crypto.symbol || "").toLowerCase();
        return name.includes(query) || symbol.includes(query);
      });
    }

    // Then, filter by technology
    if (technologyFilter !== "all") {
      filtered = filtered.filter((crypto) => {
        const metadata = getPrivacyMetadata(crypto.id);
        return metadata.technology === technologyFilter;
      });
    }

    // Then, filter by privacy level
    if (privacyLevelFilter !== "all") {
      filtered = filtered.filter((crypto) => {
        const metadata = getPrivacyMetadata(crypto.id);
        return metadata.privacyLevel === privacyLevelFilter;
      });
    }

    // Then, filter by displayTech (if specified)
    if (externalDisplayTechFilter) {
      filtered = filtered.filter((crypto) => {
        const metadata = getPrivacyMetadata(crypto.id);
        return metadata.displayTech === externalDisplayTechFilter;
      });
    }

    // Then, sort the filtered data
    const sorted = [...filtered].sort((a, b) => {
      if (sortDirection === null) return 0;

      let aValue: number | string | null;
      let bValue: number | string | null;

      switch (sortColumn) {
        case "market_cap_rank":
          aValue = a.market_cap_rank ?? 0;
          bValue = b.market_cap_rank ?? 0;
          break;
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "current_price":
          aValue = a.current_price ?? 0;
          bValue = b.current_price ?? 0;
          break;
        case "market_cap":
          aValue = a.market_cap ?? 0;
          bValue = b.market_cap ?? 0;
          break;
        case "price_change_percentage_1h_in_currency":
          aValue = a.price_change_percentage_1h_in_currency ?? 0;
          bValue = b.price_change_percentage_1h_in_currency ?? 0;
          break;
        case "price_change_percentage_24h":
          aValue = a.price_change_percentage_24h ?? 0;
          bValue = b.price_change_percentage_24h ?? 0;
          break;
        case "price_change_percentage_7d_in_currency":
          aValue = a.price_change_percentage_7d_in_currency ?? 0;
          bValue = b.price_change_percentage_7d_in_currency ?? 0;
          break;
        case "total_volume":
          aValue = a.total_volume ?? 0;
          bValue = b.total_volume ?? 0;
          break;
        default:
          return 0;
      }

      // Handle null values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue);
      const numB = Number(bValue);

      return sortDirection === "asc" ? numA - numB : numB - numA;
    });

    return sorted;
  }, [coinsData, sortColumn, sortDirection, searchQuery, technologyFilter, privacyLevelFilter]);

  // Pagination calculations
  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Reset to page 1 when search query or technology filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, technologyFilter, privacyLevelFilter]);

  // Detect new coins that need metadata
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const coinIds = data.map(coin => coin.id);
    const newCoins = detectNewCoins(coinIds);
    
    if (newCoins.length > 0) {
      console.log(
        `%c🆕 New privacy coins detected (${newCoins.length})`,
        'color: #10b981; font-weight: bold; font-size: 14px;'
      );
      console.table(newCoins);
      console.log(
        '%cThese coins need research. Check CoinGecko and their whitepapers to add metadata.',
        'color: #6b7280; font-style: italic;'
      );
      
      // Log helpful links
      newCoins.forEach((coinId) => {
        console.log(
          `📎 ${coinId}:`,
          `https://www.coingecko.com/en/coins/${coinId}`
        );
      });
    }
  }, [data]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const handleRowClick = (coinId: string) => {
    navigate(`/coin/${coinId}`);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, coinId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/coin/${coinId}`);
    }
  };

  const handleShare = (coin: Cryptocurrency, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCoin(coin);
    setShareModalOpen(true);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: desc -> asc -> default (market_cap_rank asc)
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortColumn("market_cap_rank"); // Reset to default
        setSortDirection("asc"); // Default is asc for market_cap_rank (rank 1,2,3...)
      }
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleSortKeyDown = (e: React.KeyboardEvent, column: SortColumn) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSort(column);
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-3 w-3 ml-1" />;
    }
    // This shouldn't happen, but handle null case
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  };

  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  if (isError && error) {
    return (
      <ErrorState
        error={error}
        action={() => refetch()}
        actionLabel="Try Again"
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        message="No cryptocurrency data available"
      />
    );
  }

  const hasFilters = searchQuery.trim() || technologyFilter !== "all" || privacyLevelFilter !== "all";
  
  if (filteredAndSortedData.length === 0 && hasFilters) {
    return (
      <EmptyState
        message="No coins match your filters"
        action={clearAllFilters}
        actionLabel="Clear Filters"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <ActiveFilters
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={clearAllFilters}
        />
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <TooltipProvider>
          <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th 
                className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("market_cap_rank")}
                onKeyDown={(e) => handleSortKeyDown(e, "market_cap_rank")}
                tabIndex={0}
                role="button"
                aria-label="Sort by rank"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      #
                      <Info className="h-3 w-3 opacity-50" />
                      {getSortIcon("market_cap_rank")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {rankingMode === 'global' 
                        ? 'Rank among all cryptocurrencies by market cap' 
                        : 'Rank among privacy coins by market cap'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("name")}
                onKeyDown={(e) => handleSortKeyDown(e, "name")}
                tabIndex={0}
                role="button"
                aria-label="Sort by name"
              >
                <div className="flex items-center">
                  Name
                  {getSortIcon("name")}
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-muted-foreground hidden md:table-cell">
                Technology
              </th>
              <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-muted-foreground hidden lg:table-cell">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-1 cursor-help">
                      <Shield className="h-3 w-3" />
                      <span>Privacy Strength</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>How anonymous your transactions are</p>
                    <p className="text-xs mt-1 opacity-80">Dots indicate level: 1 (Minimal), 2 (Medium), 3 (High)</p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("current_price")}
                onKeyDown={(e) => handleSortKeyDown(e, "current_price")}
                tabIndex={0}
                role="button"
                aria-label="Sort by price"
              >
                <div className="flex items-center justify-end">
                  Price
                  {getSortIcon("current_price")}
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-muted-foreground hidden lg:table-cell cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("market_cap")}
                onKeyDown={(e) => handleSortKeyDown(e, "market_cap")}
                tabIndex={0}
                role="button"
                aria-label="Sort by market cap"
              >
                <div className="flex items-center justify-end">
                  Market Cap
                  {getSortIcon("market_cap")}
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-muted-foreground hidden lg:table-cell cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("total_volume")}
                onKeyDown={(e) => handleSortKeyDown(e, "total_volume")}
                tabIndex={0}
                role="button"
                aria-label="Sort by volume"
              >
                <div className="flex items-center justify-end">
                  24h Volume
                  {getSortIcon("total_volume")}
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-muted-foreground hidden xl:table-cell cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("price_change_percentage_1h_in_currency")}
                onKeyDown={(e) => handleSortKeyDown(e, "price_change_percentage_1h_in_currency")}
                tabIndex={0}
                role="button"
                aria-label="Sort by 1h change"
              >
                <div className="flex items-center justify-end">
                  1h
                  {getSortIcon("price_change_percentage_1h_in_currency")}
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("price_change_percentage_24h")}
                onKeyDown={(e) => handleSortKeyDown(e, "price_change_percentage_24h")}
                tabIndex={0}
                role="button"
                aria-label="Sort by 24h change"
              >
                <div className="flex items-center justify-end">
                  24h
                  {getSortIcon("price_change_percentage_24h")}
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-muted-foreground hidden md:table-cell cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSort("price_change_percentage_7d_in_currency")}
                onKeyDown={(e) => handleSortKeyDown(e, "price_change_percentage_7d_in_currency")}
                tabIndex={0}
                role="button"
                aria-label="Sort by 7d change"
              >
                <div className="flex items-center justify-end">
                  7d
                  {getSortIcon("price_change_percentage_7d_in_currency")}
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-muted-foreground hidden sm:table-cell">
                Last 7 Days
              </th>
              <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-muted-foreground">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 sm:px-4 py-8 text-center text-muted-foreground">
                  {searchQuery ? "No coins found matching your search." : "No cryptocurrency data available"}
                </td>
              </tr>
            ) : (
              paginatedData.map((crypto: Cryptocurrency, index: number) => (
              <tr
                key={crypto.id}
                onClick={() => handleRowClick(crypto.id)}
                onKeyDown={(e) => handleRowKeyDown(e, crypto.id)}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${crypto.name}`}
                className={cn(
                  "border-b border-border",
                  "transition-all duration-200",
                  "cursor-pointer",
                  "hover:bg-muted/50",
                  "hover:border-l-4 hover:border-l-primary",
                  "group",
                  "last:border-b-0",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                )}
              >
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">
                  {(() => {
                    const displayRank = rankingMode === 'global' 
                      ? crypto.market_cap_rank 
                      : (crypto as any).privacy_rank;
                    
                    const secondaryRank = rankingMode === 'global' 
                      ? (crypto as any).privacy_rank 
                      : crypto.market_cap_rank;
                    
                    return (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground">
                          {displayRank ? `#${displayRank}` : '—'}
                        </span>
                        {secondaryRank && (
                          <span className="text-xs text-muted-foreground/60">
                            {rankingMode === 'global' ? `(#${secondaryRank} pvcy)` : `(#${secondaryRank} global)`}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img
                      src={crypto.image}
                      alt={crypto.name}
                      className="h-6 w-6 sm:h-8 sm:w-8 rounded-full flex-shrink-0"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to a placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground text-xs sm:text-sm truncate">
                        {crypto.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {crypto.symbol || "N/A"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-center hidden md:table-cell">
                  {(() => {
                    const metadata = getPrivacyMetadata(crypto.id);
                    const displayLabel = metadata.displayTech || getTechnologyDisplayName(metadata.technology);
                    const tooltipText = metadata.technology === "Unknown" 
                      ? "Privacy technology classification pending research" 
                      : metadata.displayTech 
                        ? `${metadata.displayTech} (${metadata.technology} category)`
                        : metadata.technologyDescription;
                    return (
                      <span 
                        className={cn(
                          "inline-block px-2 py-1 rounded-md text-xs font-medium border whitespace-nowrap",
                          getTechnologyColor(metadata.technology)
                        )}
                        title={tooltipText}
                      >
                        {displayLabel}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-center hidden lg:table-cell">
                  {(() => {
                    const metadata = getPrivacyMetadata(crypto.id);
                    const totalSegments = 3;
                    const filledSegments = metadata.privacyLevel === "High" ? 3 
                      : metadata.privacyLevel === "Medium" ? 2 : 1;
                    const activeColor = metadata.privacyLevel === "High" ? "bg-green-500" 
                      : metadata.privacyLevel === "Medium" ? "bg-yellow-500" : "bg-gray-500";
                    
                    return (
                      <div 
                        className="flex items-center justify-center gap-0.5" 
                        title={`Privacy Strength: ${metadata.privacyLevel}`}
                      >
                        {Array.from({ length: totalSegments }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-4 h-2 rounded-sm ${
                              i < filledSegments ? activeColor : "bg-black"
                            }`}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                  {crypto.current_price != null 
                    ? formatPrice(crypto.current_price)
                    : "N/A"}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-foreground hidden lg:table-cell whitespace-nowrap">
                  {crypto.market_cap != null 
                    ? formatMarketCapFull(crypto.market_cap)
                    : "N/A"}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                  {crypto.total_volume != null 
                    ? formatCurrency(crypto.total_volume)
                    : "N/A"}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right hidden xl:table-cell">
                  {crypto.price_change_percentage_1h_in_currency != null ? (
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-medium whitespace-nowrap",
                        crypto.price_change_percentage_1h_in_currency >= 0
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {crypto.price_change_percentage_1h_in_currency >= 0 ? "+" : ""}
                      {crypto.price_change_percentage_1h_in_currency.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                  {crypto.price_change_percentage_24h != null ? (
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-medium whitespace-nowrap",
                        crypto.price_change_percentage_24h >= 0
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {crypto.price_change_percentage_24h >= 0 ? "+" : ""}
                      {crypto.price_change_percentage_24h.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right hidden md:table-cell">
                  {crypto.price_change_percentage_7d_in_currency != null ? (
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-medium whitespace-nowrap",
                        crypto.price_change_percentage_7d_in_currency >= 0
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {crypto.price_change_percentage_7d_in_currency >= 0 ? "+" : ""}
                      {crypto.price_change_percentage_7d_in_currency.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-center hidden sm:table-cell">
                  <InlinePriceChart
                    sparklineData={crypto.sparkline_in_7d?.price}
                    priceChange24h={crypto.price_change_percentage_24h}
                  />
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleShare(crypto, e)}
                    className="h-8 w-8 p-0"
                    aria-label={`Share ${crypto.name}`}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
        </TooltipProvider>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} coins
          </div>
          
          <div className="flex items-center gap-2">
            {/* First Page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md border border-border bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md border border-border bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "min-w-[2rem] px-2 py-1 rounded-md border border-border text-sm transition-colors",
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md border border-border bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md border border-border bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {selectedCoin && (
        <ShareModal
          coin={selectedCoin}
          open={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedCoin(null);
          }}
        />
      )}
    </div>
  );
};

export default CryptoTable;

