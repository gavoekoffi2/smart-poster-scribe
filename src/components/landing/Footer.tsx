import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/20 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold gradient-text">Graphiste GPT</h3>
              <p className="text-xs text-muted-foreground">Assistant design premium</p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Fonctionnalités
            </a>
            <a href="#domains" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Domaines
            </a>
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Connexion
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Graphiste GPT. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
