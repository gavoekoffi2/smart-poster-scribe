import { Domain, DomainInfo } from "@/types/generation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const domains: DomainInfo[] = [
  { id: "church", label: "Affiche d'église" },
  { id: "event", label: "Affiche événementielle" },
  { id: "education", label: "Affiche éducation" },
  { id: "restaurant", label: "Affiche restaurant" },
  { id: "fashion", label: "Affiche mode" },
  { id: "music", label: "Affiche musique" },
  { id: "sport", label: "Affiche sport" },
  { id: "technology", label: "Affiche technologie" },
  { id: "health", label: "Affiche santé" },
  { id: "realestate", label: "Affiche immobilier" },
  { id: "other", label: "Autre" },
];

interface DomainSelectProps {
  value?: Domain;
  onSelect: (domain: Domain) => void;
  disabled?: boolean;
}

export function DomainSelect({ value, onSelect, disabled }: DomainSelectProps) {
  return (
    <div className="w-full max-w-xs">
      <Select
        value={value}
        onValueChange={(val) => onSelect(val as Domain)}
        disabled={disabled}
      >
        <SelectTrigger className="bg-card/50 border-border/50">
          <SelectValue placeholder="Choisir un domaine..." />
        </SelectTrigger>
        <SelectContent>
          {domains.map((domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {domain.label}
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
