import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AppPage from "./pages/AppPage";
import AdminUploadPage from "./pages/AdminUploadPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTemplates from "./pages/AdminTemplates";
import AdminDesigners from "./pages/AdminDesigners";
import DesignerRegistration from "./pages/DesignerRegistration";
import DesignerDashboard from "./pages/DesignerDashboard";
import DesignerUpload from "./pages/DesignerUpload";
import DesignerProfile from "./pages/DesignerProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster position="top-right" richColors />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/admin/upload" element={<AdminUploadPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/templates" element={<AdminTemplates />} />
        <Route path="/admin/designers" element={<AdminDesigners />} />
        <Route path="/designer/register" element={<DesignerRegistration />} />
        <Route path="/designer/dashboard" element={<DesignerDashboard />} />
        <Route path="/designer/upload" element={<DesignerUpload />} />
        <Route path="/designer/profile" element={<DesignerProfile />} />
        <Route path="/designer/:designerId" element={<DesignerProfile />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
