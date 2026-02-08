import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Image,
  Palette,
  LogOut,
  Loader2,
  Shield,
  Crown,
  UserCog,
  MessageSquare,
  CreditCard,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const navItems = [
  { id: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, path: "/admin/dashboard", permission: "view_dashboard" },
  { id: "templates", label: "Templates", icon: Image, path: "/admin/templates", permission: "manage_templates" },
  { id: "marquee", label: "Marquee", icon: Palette, path: "/admin/marquee", permission: "manage_templates" },
  { id: "showcase", label: "Showcase", icon: Palette, path: "/admin/showcase", permission: "manage_templates" },
  { id: "feedback", label: "Feedbacks", icon: MessageSquare, path: "/admin/feedback", permission: "view_dashboard" },
  { id: "subscriptions", label: "Abonnements", icon: CreditCard, path: "/admin/subscriptions", permission: "manage_users" },
  { id: "designers", label: "Graphistes", icon: Users, path: "/admin/designers", permission: "manage_designers" },
  { id: "roles", label: "Rôles", icon: Shield, path: "/admin/roles", permission: "manage_admins" },
];

export default function AdminLayout({ children, requiredPermission = "view_dashboard" }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { userRole, isLoading: roleLoading, hasPermission, getRoleLabel, isSuperAdmin, isAdmin } = useAdmin();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth", { state: { redirectTo: location.pathname } });
        return;
      }
      if (!userRole || !hasPermission(requiredPermission)) {
        toast.error("Accès refusé - Vous n'avez pas les permissions nécessaires");
        navigate("/");
      }
    }
  }, [user, authLoading, roleLoading, userRole, navigate, hasPermission, requiredPermission, location.pathname]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole || !hasPermission(requiredPermission)) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getRoleIcon = () => {
    if (isSuperAdmin) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (isAdmin) return <Shield className="w-4 h-4 text-primary" />;
    return <UserCog className="w-4 h-4 text-muted-foreground" />;
  };

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col z-50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            {getRoleIcon()}
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            if (!hasPermission(item.permission)) return null;
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => navigate(item.path)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="space-y-2 pt-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => navigate("/app")}
          >
            <Sparkles className="w-4 h-4" />
            Créer une affiche
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ChevronRight className="w-4 h-4" />
            Retour au site
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">{children}</div>
    </div>
  );
}
