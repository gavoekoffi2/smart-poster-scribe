import { Domain, DomainInfo } from "@/types/generation";
import { cn } from "@/lib/utils";
import { Briefcase, Palette, User, PartyPopper, ShoppingBag } from "lucide-react";

interface DomainSelectorProps {
  selectedDomain: Domain | null;
  onDomainChange: (domain: Domain) => void;
  disabled?: boolean;
}

const domains: DomainInfo[] = [
  {
    id: "professional",
    label: "Professionnel",
    description: "Entreprise, corporate, B2B",
    icon: "briefcase",
    questions: [
      { id: "company", question: "Nom de l'entreprise ou marque ?", placeholder: "Ex: TechCorp, Studio Design..." },
      { id: "industry", question: "Secteur d'activité ?", placeholder: "Ex: Tech, Finance, Santé..." },
      { id: "tone", question: "Ton souhaité ?", placeholder: "Ex: Formel, moderne, innovant..." },
    ],
  },
  {
    id: "creative",
    label: "Créatif",
    description: "Art, musique, cinéma",
    icon: "palette",
    questions: [
      { id: "style", question: "Style artistique souhaité ?", placeholder: "Ex: Cyberpunk, minimaliste, rétro..." },
      { id: "mood", question: "Ambiance recherchée ?", placeholder: "Ex: Mystérieux, énergique, serein..." },
      { id: "inspiration", question: "Références ou inspirations ?", placeholder: "Ex: Blade Runner, Bauhaus..." },
    ],
  },
  {
    id: "personal",
    label: "Personnel",
    description: "Projets personnels, portfolio",
    icon: "user",
    questions: [
      { id: "purpose", question: "Objectif de l'affiche ?", placeholder: "Ex: Portfolio, cadeau, décoration..." },
      { id: "theme", question: "Thème principal ?", placeholder: "Ex: Voyage, famille, passion..." },
    ],
  },
  {
    id: "event",
    label: "Événement",
    description: "Concert, festival, soirée",
    icon: "party",
    questions: [
      { id: "eventName", question: "Nom de l'événement ?", placeholder: "Ex: Festival Electro 2024..." },
      { id: "date", question: "Date et lieu ?", placeholder: "Ex: 15 Mars 2024, Paris..." },
      { id: "artists", question: "Artistes ou intervenants ?", placeholder: "Ex: DJ Snake, David Guetta..." },
      { id: "vibe", question: "Ambiance de l'événement ?", placeholder: "Ex: Festif, intime, grandiose..." },
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    description: "Publicité, marketing, promo",
    icon: "shopping",
    questions: [
      { id: "product", question: "Produit ou service promu ?", placeholder: "Ex: Nouvelle collection, app mobile..." },
      { id: "target", question: "Cible principale ?", placeholder: "Ex: Jeunes 18-25, professionnels..." },
      { id: "cta", question: "Message principal / CTA ?", placeholder: "Ex: -50% aujourd'hui seulement..." },
    ],
  },
];

const IconComponent = ({ icon, className }: { icon: string; className?: string }) => {
  switch (icon) {
    case "briefcase":
      return <Briefcase className={className} />;
    case "palette":
      return <Palette className={className} />;
    case "user":
      return <User className={className} />;
    case "party":
      return <PartyPopper className={className} />;
    case "shopping":
      return <ShoppingBag className={className} />;
    default:
      return null;
  }
};

export function DomainSelector({ selectedDomain, onDomainChange, disabled }: DomainSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        Domaine <span className="text-destructive">*</span>
        <span className="text-xs text-muted-foreground">(obligatoire)</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {domains.map((domain) => (
          <button
            key={domain.id}
            onClick={() => onDomainChange(domain.id)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 text-center",
              selectedDomain === domain.id
                ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:bg-card/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <IconComponent icon={domain.icon} className="w-5 h-5 mb-2" />
            <span className="text-xs font-medium">{domain.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function getDomainInfo(domain: Domain): DomainInfo | undefined {
  return domains.find((d) => d.id === domain);
}

export { domains };
