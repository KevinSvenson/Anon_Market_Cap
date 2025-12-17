import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Filter {
  id: string;
  label: string;
  type: string;
}

interface ActiveFiltersProps {
  filters: Filter[];
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
}

const ActiveFilters = ({ filters, onRemove, onClearAll }: ActiveFiltersProps) => {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Active filters:</span>
      {filters.map((filter) => (
        <div
          key={filter.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-sm"
        >
          <span className="text-foreground">{filter.label}</span>
          <button
            onClick={() => onRemove(filter.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {filters.length >= 2 && (
        <Button
          onClick={onClearAll}
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
        >
          Clear All
        </Button>
      )}
    </div>
  );
};

export default ActiveFilters;

