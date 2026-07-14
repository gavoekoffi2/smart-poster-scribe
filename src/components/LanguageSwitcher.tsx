import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSwitcherProps {
  variant?: "ghost" | "outline";
  compact?: boolean;
}

export function LanguageSwitcher({ variant = "ghost", compact = false }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith("fr") ? "fr" : "en";
  const flag = current === "fr" ? "🇫🇷" : "🇬🇧";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={compact ? "icon" : "sm"} aria-label={t("language.label")} className="gap-2">
          <Languages className="w-4 h-4" />
          {!compact && <span className="text-sm">{flag} {current.toUpperCase()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px] bg-popover z-[100]">
        <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
          🇬🇧 {t("language.english")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => i18n.changeLanguage("fr")}>
          🇫🇷 {t("language.french")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
