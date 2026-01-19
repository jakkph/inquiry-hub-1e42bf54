import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import PrivacyAudit from "./pages/PrivacyAudit";
import AuditTrail from "./pages/AuditTrail";
import Settings from "./pages/Settings";
import AdminRoles from "./pages/AdminRoles";
import ApiDocs from "./pages/ApiDocs";
import Webhooks from "./pages/Webhooks";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { useAnalytics } from "./hooks/useAnalytics";
import { AuthProvider } from "./contexts/AuthContext";
import { CommandPalette } from "./components/CommandPalette";

const queryClient = new QueryClient();

// Inner component to use hooks that require router context
const AppRoutes = () => {
  useAnalytics({ debug: import.meta.env.DEV });
  
  return (
    <>
      <CommandPalette />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/privacy-audit" element={<PrivacyAudit />} />
        <Route path="/audit-trail" element={<AuditTrail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/roles" element={<AdminRoles />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route path="/auth" element={<Auth />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
