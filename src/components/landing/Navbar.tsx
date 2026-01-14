import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/LogoIcon";

interface NavbarProps {
  onGetStarted: () => void;
}

export function Navbar({ onGetStarted }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#", label: "Accueil", active: true },
    { href: "#showcase", label: "Réalisations" },
    { href: "#templates", label: "Templates" },
    { href: "#features", label: "Services" },
    { href: "#pricing", label: "Tarifs" },
    { href: "#contact", label: "Contact" },
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
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
                <LogoIcon size={40} />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">
                Graphiste <span className="gradient-text">GPT</span>
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">Graphistes + IA</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="hover:bg-primary/10 text-muted-foreground hover:text-foreground">
                Se connecter
              </Button>
            </Link>
            <Button 
              onClick={onGetStarted} 
              className="glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Commencer
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-primary/10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
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
                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-primary/30">Se connecter</Button>
                </Link>
                <Button 
                  onClick={() => { onGetStarted(); setIsMobileMenuOpen(false); }} 
                  className="w-full glow-orange bg-gradient-to-r from-primary to-accent"
                >
                  Commencer
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
