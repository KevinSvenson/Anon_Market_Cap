import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center space-x-2 transition-opacity hover:opacity-80"
        >
          <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-xl font-bold text-foreground">
            AnonMarketCap
          </span>
        </Link>

        <nav className="flex items-center space-x-4 sm:space-x-6">
          <Link
            to="/compare"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Compare
          </Link>
          <span className="hidden md:inline text-sm text-muted-foreground">
            Privacy-Focused Crypto Prices
          </span>
        </nav>
      </div>
    </header>
  );
};

export default Header;

