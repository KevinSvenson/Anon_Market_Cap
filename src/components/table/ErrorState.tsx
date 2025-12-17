import { AlertCircle, WifiOff, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RateLimitError, NetworkError } from "@/services/coingecko";

interface ErrorStateProps {
  message?: string;
  error?: Error | null;
  action?: () => void;
  actionLabel?: string;
}

const ErrorState = ({ 
  message, 
  error, 
  action, 
  actionLabel = "Try Again" 
}: ErrorStateProps) => {
  let IconComponent = AlertCircle;
  let errorMessage = message || "Failed to load cryptocurrency data";
  let errorDetails = "";

  if (error instanceof RateLimitError) {
    IconComponent = Clock;
    errorMessage = "Rate Limit Exceeded";
    errorDetails = error.message;
    if (error.retryAfter) {
      errorDetails += ` Retry after ${error.retryAfter} seconds.`;
    }
  } else if (error instanceof NetworkError) {
    IconComponent = WifiOff;
    errorMessage = "Network Error";
    errorDetails = error.message;
  } else if (error instanceof Error) {
    errorDetails = error.message;
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <IconComponent className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold text-foreground">
            {errorMessage}
          </p>
          {errorDetails && (
            <p className="text-sm text-muted-foreground mt-2">
              {errorDetails}
            </p>
          )}
          {action && (
            <Button
              onClick={action}
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;

