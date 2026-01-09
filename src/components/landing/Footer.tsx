import { Sparkles, Mail, Phone, MapPin, Github, Twitter, Linkedin, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  const footerLinks = {
    product: [
      { label: "Fonctionnalités", href: "#features" },
      { label: "Tarifs", href: "#pricing" },
      { label: "Templates", href: "#templates" },
      { label: "API", href: "#api" },
    ],
    company: [
      { label: "À propos", href: "#about" },
      { label: "Blog", href: "#blog" },
      { label: "Carrières", href: "#careers" },
      { label: "Contact", href: "#contact" },
    ],
    legal: [
      { label: "Confidentialité", href: "#privacy" },
      { label: "CGU", href: "#terms" },
      { label: "Cookies", href: "#cookies" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "#" },
    { icon: Linkedin, href: "#" },
    { icon: Instagram, href: "#" },
    { icon: Github, href: "#" },
  ];

  return (
    <footer className="relative border-t border-border/30 bg-card/30 overflow-hidden">
      {/* Background effects */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      
      <div className="container mx-auto max-w-7xl px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Graphiste <span className="gradient-text">GPT</span>
                </h3>
                <p className="text-xs text-muted-foreground">IA Design Premium</p>
              </div>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Transformez vos idées en visuels professionnels grâce à l'intelligence artificielle. Design sans limites.
            </p>
            
            {/* Contact info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span>contact@graphistegpt.com</span>
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
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
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
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
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
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
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
          
          {/* Social links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social, index) => (
              <a 
                key={index}
                href={social.href}
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 border border-border/40 hover:border-primary/40 flex items-center justify-center transition-all duration-300"
              >
                <social.icon className="w-4 h-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
