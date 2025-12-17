import { SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  message?: string;
  action?: () => void;
  actionLabel?: string;
}

const EmptyState = ({ 
  message = "No coins match your filters",
  action,
  actionLabel = "Clear Filters"
}: EmptyStateProps) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <SearchX className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold text-foreground">
            {message}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search or filters to see more results.
          </p>
          {action && (
            <Button
              onClick={action}
              className="mt-4"
              variant="outline"
            >
              <X className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;

