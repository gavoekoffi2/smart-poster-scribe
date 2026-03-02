import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AppPage from "./pages/AppPage";
import PricingPage from "./pages/PricingPage";
import AccountPage from "./pages/AccountPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsPage from "./pages/TermsPage";
import LegalPage from "./pages/LegalPage";
import PrivacyPage from "./pages/PrivacyPage";
import AdminRoute from "./components/routes/AdminRoute";
import DesignerRoute from "./components/routes/DesignerRoute";

// Lazy load admin pages
const AdminUploadPage = lazy(() => import("./pages/AdminUploadPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminTemplates = lazy(() => import("./pages/AdminTemplates"));
const AdminDesigners = lazy(() => import("./pages/AdminDesigners"));
const AdminSubscriptions = lazy(() => import("./pages/AdminSubscriptions"));
const AdminMarquee = lazy(() => import("./pages/AdminMarquee"));
const AdminShowcase = lazy(() => import("./pages/AdminShowcase"));
const AdminFeedback = lazy(() => import("./pages/AdminFeedback"));
const AdminRoles = lazy(() => import("./pages/AdminRoles"));

// Lazy load designer pages
const DesignerRegistration = lazy(() => import("./pages/DesignerRegistration"));
const DesignerDashboard = lazy(() => import("./pages/DesignerDashboard"));
const DesignerUpload = lazy(() => import("./pages/DesignerUpload"));
const DesignerProfile = lazy(() => import("./pages/DesignerProfile"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster position="top-right" richColors />
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/account" element={<AccountPage />} />

          {/* Admin routes with guard */}
          <Route path="/admin/upload" element={<AdminRoute><AdminUploadPage /></AdminRoute>} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/templates" element={<AdminRoute><AdminTemplates /></AdminRoute>} />
          <Route path="/admin/designers" element={<AdminRoute><AdminDesigners /></AdminRoute>} />
          <Route path="/admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
          <Route path="/admin/marquee" element={<AdminRoute><AdminMarquee /></AdminRoute>} />
          <Route path="/admin/showcase" element={<AdminRoute><AdminShowcase /></AdminRoute>} />
          <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />
          <Route path="/admin/roles" element={<AdminRoute><AdminRoles /></AdminRoute>} />

          {/* Designer routes with guard */}
          <Route path="/designer/register" element={<DesignerRoute><DesignerRegistration /></DesignerRoute>} />
          <Route path="/designer/dashboard" element={<DesignerRoute><DesignerDashboard /></DesignerRoute>} />
          <Route path="/designer/upload" element={<DesignerRoute><DesignerUpload /></DesignerRoute>} />
          <Route path="/designer/profile" element={<DesignerRoute><DesignerProfile /></DesignerRoute>} />
          <Route path="/designer/:designerId" element={<DesignerProfile />} />

          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
