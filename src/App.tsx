import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StarknetProvider } from "@/core/providers";
import { RealtimeProvider } from "@/core/providers/RealtimeProvider";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import HowItWorks from "./pages/HowItWorks";
import Roadmap from "./pages/Roadmap";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StarknetProvider>
      <RealtimeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="how-it-works" element={<HowItWorks />} />
                <Route path="roadmap" element={<Roadmap />} />
                <Route path="deposit" element={<Deposit />} />
                <Route path="withdraw" element={<Withdraw />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RealtimeProvider>
    </StarknetProvider>
  </QueryClientProvider>
);

export default App;
