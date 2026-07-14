import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogoIcon } from "@/components/LogoIcon";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Footer() {
  const { t } = useTranslation();
  const footerLinks = {
    product: [
      { label: t("footer.links.features"), href: "/#features" },
      { label: t("footer.links.pricing"), href: "/#pricing" },
      { label: t("footer.links.templates"), href: "/#templates" },
    ],
    developers: [
      { label: t("footer.links.apiDocs"), href: "/docs/api" },
      { label: t("footer.links.getApiKey"), href: "/account?tab=api" },
      { label: t("footer.links.quickstart"), href: "/docs/api#quickstart" },
    ],
    solutions: [
      { label: t("footer.links.church"), href: "/domaines/eglise" },
      { label: t("footer.links.wedding"), href: "/domaines/mariage" },
      { label: t("footer.links.restaurant"), href: "/domaines/restaurant" },
      { label: t("footer.links.ecommerce"), href: "/domaines/ecommerce" },
      { label: t("footer.links.youtube"), href: "/domaines/youtube" },
      { label: t("footer.links.events"), href: "/domaines/evenement" },
      { label: t("footer.links.realestate"), href: "/domaines/immobilier" },
      { label: t("footer.links.training"), href: "/domaines/formation" },
    ],
    company: [
      { label: t("footer.links.about"), href: "/#about" },
      { label: t("footer.links.contact"), href: "/#contact" },
      { label: t("footer.links.faq"), href: "/faq" },
    ],
    legal: [
      { label: t("footer.links.privacy"), href: "/privacy" },
      { label: t("footer.links.terms"), href: "/terms" },
      { label: t("footer.links.legalMentions"), href: "/legal" },
      { label: t("footer.links.status"), href: "/status" },
    ],
  };

  return (
    <footer className="relative border-t border-border/30 bg-card/30 overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto max-w-7xl px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
                <LogoIcon size={40} />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Graphiste <span className="gradient-text">GPT</span>
                </h3>
                <p className="text-xs text-muted-foreground">Designers + AI</p>
              </div>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {t("footer.tagline")}
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
                <span>Lomé, Togo</span>
              </div>
            </div>

            <div className="mt-6">
              <LanguageSwitcher variant="outline" />
            </div>
          </div>

          {[
            { title: t("footer.product"), links: footerLinks.product },
            { title: t("footer.developers"), links: footerLinks.developers },
            { title: t("footer.solutions"), links: footerLinks.solutions },
            { title: t("footer.company"), links: footerLinks.company },
            { title: t("footer.legal"), links: footerLinks.legal },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-semibold text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Graphiste GPT. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
