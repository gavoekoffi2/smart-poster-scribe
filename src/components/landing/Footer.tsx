import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { LogoIcon } from "@/components/LogoIcon";

export function Footer() {
  const footerLinks = {
    product: [
      { label: "Fonctionnalités", href: "/#features" },
      { label: "Tarifs", href: "/#pricing" },
      { label: "Templates", href: "/#templates" },
    ],
    company: [
      { label: "À propos", href: "/#about" },
      { label: "Contact", href: "/#contact" },
    ],
    legal: [
      { label: "Confidentialité", href: "/privacy" },
      { label: "CGU", href: "/terms" },
      { label: "Mentions légales", href: "/legal" },
    ],
  };

  return (
    <footer className="relative border-t border-border/30 bg-card/30 overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto max-w-7xl px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
                <LogoIcon size={40} />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Graphiste <span className="gradient-text">GPT</span>
                </h3>
                <p className="text-xs text-muted-foreground">Graphistes + IA = Visuels Pro</p>
              </div>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              La plateforme où les graphistes créent des templates et gagnent des royalties. L'IA génère vos affiches personnalisées en quelques secondes.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span>contact@graphistegpt.pro</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                <span>+228 93708178</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Lomé, quartier Hédranawoé à côté de la radio Zéphyr-Togo</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Produit</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Entreprise</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Légal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Graphiste GPT. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
