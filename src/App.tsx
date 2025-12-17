import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CoinDetail from "./pages/CoinDetail";
import Compare from "./pages/Compare";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Security from "./pages/Security";
import PrivacyMarket from "./pages/PrivacyMarket";
import Anon20 from "./pages/Anon20";
import Highlights from "./pages/Highlights";
import Dominance from "./pages/Dominance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        basename={import.meta.env.BASE_URL}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/coin/:coinId" element={<CoinDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/security" element={<Security />} />
          <Route path="/privacy-market" element={<PrivacyMarket />} />
          <Route path="/anon20" element={<Anon20 />} />
          <Route path="/highlights" element={<Highlights />} />
          <Route path="/dominance" element={<Dominance />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
