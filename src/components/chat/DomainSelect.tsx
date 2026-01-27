import { Domain, DomainInfo } from "@/types/generation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const domains: DomainInfo[] = [
  { id: "youtube", label: "Miniature YouTube" },
  { id: "formation", label: "Formation" },
  { id: "church", label: "Église / Culte" },
  { id: "event", label: "Événement" },
  { id: "education", label: "Éducation" },
  { id: "restaurant", label: "Restaurant / Food" },
  { id: "fashion", label: "Mode" },
  { id: "music", label: "Musique" },
  { id: "sport", label: "Sport" },
  { id: "technology", label: "Technologie" },
  { id: "health", label: "Santé" },
  { id: "realestate", label: "Immobilier" },
  { id: "other", label: "Autre (préciser)" },
];

interface DomainSelectProps {
  value?: Domain;
  onSelect: (domain: Domain) => void;
  disabled?: boolean;
  suggestedDomain?: string | null;
}

export function DomainSelect({ value, onSelect, disabled, suggestedDomain }: DomainSelectProps) {
  // Find if suggested domain matches one of our domains
  const suggestion = suggestedDomain 
    ? domains.find((d) => d.id === suggestedDomain || d.id.includes(suggestedDomain.toLowerCase()))
    : null;

  return (
    <div className="w-full max-w-xs space-y-2">
      {suggestion && !value && (
        <p className="text-xs text-muted-foreground">
          Suggestion : <span className="font-medium text-primary">{suggestion.label}</span>
        </p>
      )}
      <Select
        value={value}
        onValueChange={(val) => onSelect(val as Domain)}
        disabled={disabled}
      >
        <SelectTrigger className="bg-card border-border">
          <SelectValue placeholder="Choisir un domaine..." />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50">
          {domains.map((domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {domain.label}
              {suggestion?.id === domain.id && " ✓"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function getDomainLabel(domain: Domain): string {
  return domains.find((d) => d.id === domain)?.label || domain;
}
