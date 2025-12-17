import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Logo and main nav */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <img 
              src={`${import.meta.env.BASE_URL}anon-logo.png`}
              alt="AnonMarketCap Logo" 
              className="h-24 w-auto"
            />
            <span className="text-xl font-bold text-foreground">
              AnonMarketCap
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 sm:gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Markets
            </Link>
            <Link
              to="/compare"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Compare
            </Link>
            <Link
              to="/dominance"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Dominance
            </Link>
            <Link
              to="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/security"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </Link>
          </nav>
        </div>

        {/* Right: Auth buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden md:flex">
            <User className="h-4 w-4 mr-2" />
            Login
          </Button>
          <Button size="sm" className="hidden md:flex">
            Sign up
          </Button>
          
          {/* Mobile menu button */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;

