import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/LogoIcon";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";

interface NavbarProps {
  onGetStarted: () => void;
}

export function Navbar({ onGetStarted }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: adminLoading } = useAdmin();

  const canAccessAdmin = !authLoading && !adminLoading && user && hasPermission('view_dashboard');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/#", label: t("nav.home"), active: true },
    { href: "/#showcase", label: t("nav.showcase") },
    { href: "/#templates", label: t("nav.templates") },
    { href: "/#features", label: t("nav.features") },
    { href: "/#pricing", label: t("nav.pricing") },
    { href: "/docs/api", label: t("nav.api") },
    { href: "/#contact", label: t("nav.contact") },
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      isScrolled
        ? "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-2xl shadow-primary/5"
        : "bg-transparent"
    )}>
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden border border-border/30">
                <LogoIcon size={48} />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">
                Graphiste <span className="gradient-text">GPT</span>
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">Designers + AI</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  link.active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            {canAccessAdmin && (
              <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => navigate("/admin/dashboard")}>
                <Shield className="w-4 h-4 mr-2" />
                {t("nav.admin")}
              </Button>
            )}
            {user ? (
              <Button onClick={() => navigate("/app")} className="glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {t("nav.createPoster")}
              </Button>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="hover:bg-primary/10 text-muted-foreground hover:text-foreground">
                    {t("nav.signIn")}
                  </Button>
                </Link>
                <Button onClick={onGetStarted} className="glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  {t("nav.getStarted")}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher compact />
            <Link
              to="/docs/api"
              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 transition-colors"
            >
              API
            </Link>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden py-6 border-t border-border/40 animate-fade-up bg-background/95 backdrop-blur-xl -mx-4 px-4">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    link.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-border/40">
                {canAccessAdmin && (
                  <Button variant="outline" className="w-full border-primary/30 text-primary" onClick={() => { navigate("/admin/dashboard"); setIsMobileMenuOpen(false); }}>
                    <Shield className="w-4 h-4 mr-2" />
                    {t("nav.adminDashboard")}
                  </Button>
                )}
                {user ? (
                  <Button onClick={() => { navigate("/app"); setIsMobileMenuOpen(false); }} className="w-full glow-orange bg-gradient-to-r from-primary to-accent">
                    {t("nav.createPoster")}
                  </Button>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-primary/30">{t("nav.signIn")}</Button>
                    </Link>
                    <Button onClick={() => { onGetStarted(); setIsMobileMenuOpen(false); }} className="w-full glow-orange bg-gradient-to-r from-primary to-accent">
                      {t("nav.getStarted")}
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
