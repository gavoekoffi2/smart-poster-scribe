import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled 
        ? "bg-background/80 backdrop-blur-xl border-b border-border/30" 
        : "bg-transparent"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-lg font-bold gradient-text leading-tight">Graphiste GPT</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Assistant design premium</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Fonctionnalités
            </a>
            <a href="#domains" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Domaines
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="hover:bg-primary/10">
                Se connecter
              </Button>
            </Link>
            <Button onClick={onGetStarted} className="glow-gold">
              Commencer
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/30 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <a 
                href="#features" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Fonctionnalités
              </a>
              <a 
                href="#domains" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Domaines
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/30">
                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Se connecter</Button>
                </Link>
                <Button onClick={() => { onGetStarted(); setIsMobileMenuOpen(false); }} className="w-full glow-gold">
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
