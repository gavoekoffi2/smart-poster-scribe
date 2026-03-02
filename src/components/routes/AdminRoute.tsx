import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading: authLoading } = useAuthContext();
  const { userRole, isLoading: roleLoading } = useAdmin();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ redirectTo: location.pathname }} replace />;
  }

  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
