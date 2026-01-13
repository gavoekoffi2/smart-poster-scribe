import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Monitor, 
  Smartphone, 
  Printer, 
  Settings2,
  Check,
  Sparkles
} from "lucide-react";
import { FormatPreset, UsageType } from "@/types/generation";

interface FormatSelectProps {
  onSelect: (format: FormatPreset) => void;
  disabled?: boolean;
}

// Presets pour réseaux sociaux
const SOCIAL_PRESETS: FormatPreset[] = [
  // Instagram
  { id: "instagram-post", name: "Post Instagram", aspectRatio: "1:1", width: 1080, height: 1080, platform: "Instagram", icon: "instagram", usage: "social" },
  { id: "instagram-story", name: "Story Instagram", aspectRatio: "9:16", width: 1080, height: 1920, platform: "Instagram", icon: "instagram", usage: "social" },
  { id: "instagram-portrait", name: "Portrait Instagram", aspectRatio: "4:5", width: 1080, height: 1350, platform: "Instagram", icon: "instagram", usage: "social" },
  
  // Facebook
  { id: "facebook-post", name: "Post Facebook", aspectRatio: "1:1", width: 1200, height: 1200, platform: "Facebook", icon: "facebook", usage: "social" },
  { id: "facebook-cover", name: "Couverture Facebook", aspectRatio: "16:9", width: 1640, height: 924, platform: "Facebook", icon: "facebook", usage: "social" },
  { id: "facebook-event", name: "Événement Facebook", aspectRatio: "16:9", width: 1920, height: 1080, platform: "Facebook", icon: "facebook", usage: "social" },
  { id: "facebook-story", name: "Story Facebook", aspectRatio: "9:16", width: 1080, height: 1920, platform: "Facebook", icon: "facebook", usage: "social" },
  
  // WhatsApp
  { id: "whatsapp-status", name: "Statut WhatsApp", aspectRatio: "9:16", width: 1080, height: 1920, platform: "WhatsApp", icon: "whatsapp", usage: "social" },
  { id: "whatsapp-share", name: "Image WhatsApp", aspectRatio: "1:1", width: 1080, height: 1080, platform: "WhatsApp", icon: "whatsapp", usage: "social" },
  
  // TikTok
  { id: "tiktok-video", name: "TikTok", aspectRatio: "9:16", width: 1080, height: 1920, platform: "TikTok", icon: "tiktok", usage: "social" },
  
  // YouTube
  { id: "youtube-thumbnail", name: "Miniature YouTube", aspectRatio: "16:9", width: 1280, height: 720, platform: "YouTube", icon: "youtube", usage: "social" },
  { id: "youtube-banner", name: "Bannière YouTube", aspectRatio: "16:9", width: 2560, height: 1440, platform: "YouTube", icon: "youtube", usage: "social" },
  
  // LinkedIn
  { id: "linkedin-post", name: "Post LinkedIn", aspectRatio: "1:1", width: 1200, height: 1200, platform: "LinkedIn", icon: "linkedin", usage: "social" },
  { id: "linkedin-cover", name: "Couverture LinkedIn", aspectRatio: "4:1", width: 1584, height: 396, platform: "LinkedIn", icon: "linkedin", usage: "social" },
  
  // X (Twitter)
  { id: "twitter-post", name: "Post X/Twitter", aspectRatio: "16:9", width: 1200, height: 675, platform: "X", icon: "twitter", usage: "social" },
  { id: "twitter-header", name: "Header X/Twitter", aspectRatio: "3:1", width: 1500, height: 500, platform: "X", icon: "twitter", usage: "social" },
];

// Presets pour impression
const PRINT_PRESETS: FormatPreset[] = [
  { id: "print-a4-portrait", name: "A4 Portrait", aspectRatio: "3:4", width: 2480, height: 3508, platform: "Impression", icon: "print", usage: "print" },
  { id: "print-a4-landscape", name: "A4 Paysage", aspectRatio: "4:3", width: 3508, height: 2480, platform: "Impression", icon: "print", usage: "print" },
  { id: "print-a3-portrait", name: "A3 Portrait", aspectRatio: "3:4", width: 3508, height: 4961, platform: "Impression", icon: "print", usage: "print" },
  { id: "print-poster", name: "Affiche Poster", aspectRatio: "2:3", width: 2400, height: 3600, platform: "Impression", icon: "print", usage: "print" },
  { id: "print-flyer", name: "Flyer Standard", aspectRatio: "3:4", width: 2100, height: 2970, platform: "Impression", icon: "print", usage: "print" },
  { id: "print-banner", name: "Bannière Roll-up", aspectRatio: "1:3", width: 1000, height: 3000, platform: "Impression", icon: "print", usage: "print" },
  { id: "print-square", name: "Carré HD", aspectRatio: "1:1", width: 3000, height: 3000, platform: "Impression", icon: "print", usage: "print" },
];

const ALL_PRESETS = [...SOCIAL_PRESETS, ...PRINT_PRESETS];

// Grouper les presets par plateforme
const groupedPresets = [...SOCIAL_PRESETS, ...PRINT_PRESETS].reduce((acc, preset) => {
  const platform = preset.platform;
  if (!acc[platform]) acc[platform] = [];
  acc[platform].push(preset);
  return acc;
}, {} as Record<string, FormatPreset[]>);

type Resolution = "1K" | "2K" | "4K";

const RESOLUTIONS: { value: Resolution; label: string; description: string }[] = [
  { value: "1K", label: "1K - Économique", description: "1 crédit" },
  { value: "2K", label: "2K - Standard", description: "2 crédits" },
  { value: "4K", label: "4K - Haute qualité", description: "4 crédits" },
];

export function FormatSelect({ onSelect, disabled }: FormatSelectProps) {
  const [usageType, setUsageType] = useState<UsageType | "custom">("social");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [customWidth, setCustomWidth] = useState<string>("1080");
  const [customHeight, setCustomHeight] = useState<string>("1080");

  const handleUsageChange = (value: UsageType | "custom") => {
    setUsageType(value);
    setSelectedFormat("");
    
    // Note: On garde la résolution choisie par l'utilisateur
    // Les utilisateurs gratuits sont limités à 1K (le backend vérifie)
  };

  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId);
  };

  const handleConfirm = () => {
    if (usageType === "custom") {
      const width = parseInt(customWidth) || 1080;
      const height = parseInt(customHeight) || 1080;
      
      // Déterminer le ratio
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(width, height);
      const ratioW = width / divisor;
      const ratioH = height / divisor;
      
      let aspectRatio: string;
      const ratio = width / height;
      if (Math.abs(ratio - 1) < 0.1) aspectRatio = "1:1";
      else if (Math.abs(ratio - 4/3) < 0.1) aspectRatio = "4:3";
      else if (Math.abs(ratio - 3/4) < 0.1) aspectRatio = "3:4";
      else if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = "16:9";
      else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = "9:16";
      else aspectRatio = `${ratioW}:${ratioH}`;
      
      const customPreset: FormatPreset = {
        id: "custom",
        name: `Personnalisé (${width}×${height})`,
        aspectRatio,
        width,
        height,
        platform: "Personnalisé",
        icon: "custom",
        usage: resolution === "4K" ? "print" : "social",
        resolution,
      };
      
      onSelect(customPreset);
    } else {
      const preset = ALL_PRESETS.find(p => p.id === selectedFormat);
      if (preset) {
        onSelect({ ...preset, resolution });
      }
    }
  };

  const getFilteredFormats = () => {
    if (usageType === "social") {
      return groupedPresets;
    } else if (usageType === "print") {
      return { "Impression": PRINT_PRESETS };
    }
    return {};
  };

  const filteredFormats = getFilteredFormats();
  const canConfirm = usageType === "custom" || selectedFormat;

  return (
    <div className="space-y-4 p-4 rounded-xl bg-card/50 border border-border/40 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Monitor className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Format de l'affiche</h3>
      </div>

      {/* Type d'utilisation */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Type d'utilisation</Label>
        <Select value={usageType} onValueChange={handleUsageChange} disabled={disabled}>
          <SelectTrigger className="w-full bg-background/60 border-border/50 hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Choisir le type" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50 backdrop-blur-xl z-50">
            <SelectItem value="social" className="cursor-pointer hover:bg-primary/10">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span>Réseaux sociaux</span>
                <Badge variant="outline" className="ml-2 text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
                  1K-2K
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="print" className="cursor-pointer hover:bg-primary/10">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-500" />
                <span>Impression</span>
                <Badge variant="outline" className="ml-2 text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                  4K
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="custom" className="cursor-pointer hover:bg-primary/10">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span>Personnalisé</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Format spécifique (si pas custom) */}
      {usageType !== "custom" && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Format</Label>
          <Select value={selectedFormat} onValueChange={handleFormatChange} disabled={disabled}>
            <SelectTrigger className="w-full bg-background/60 border-border/50 hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Choisir le format" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50 backdrop-blur-xl z-50 max-h-[300px]">
              {Object.entries(filteredFormats).map(([platform, presets]) => (
                <SelectGroup key={platform}>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                    {platform}
                  </SelectLabel>
                  {presets.map((preset) => (
                    <SelectItem 
                      key={preset.id} 
                      value={preset.id}
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.width}×{preset.height}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dimensions personnalisées */}
      {usageType === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom-width" className="text-xs text-muted-foreground">Largeur (px)</Label>
            <Input
              id="custom-width"
              type="number"
              min="512"
              max="4096"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              disabled={disabled}
              placeholder="1080"
              className="bg-background/60 border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-height" className="text-xs text-muted-foreground">Hauteur (px)</Label>
            <Input
              id="custom-height"
              type="number"
              min="512"
              max="4096"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              disabled={disabled}
              placeholder="1080"
              className="bg-background/60 border-border/50"
            />
          </div>
        </div>
      )}

      {/* Résolution */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Résolution</Label>
        <Select value={resolution} onValueChange={(v) => setResolution(v as Resolution)} disabled={disabled}>
          <SelectTrigger className="w-full bg-background/60 border-border/50 hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Choisir la résolution" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50 backdrop-blur-xl z-50">
            {RESOLUTIONS.map((res) => (
              <SelectItem 
                key={res.value} 
                value={res.value}
                className="cursor-pointer hover:bg-primary/10"
              >
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{res.label}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${
                      res.value === "1K" 
                        ? "bg-green-500/10 text-green-500 border-green-500/30"
                        : res.value === "2K"
                        ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    }`}
                  >
                    {res.description}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info sur la consommation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/30">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>
          {resolution === "4K" 
            ? "Haute qualité pour impression (4 crédits)"
            : resolution === "2K"
            ? "Qualité standard (2 crédits)"
            : "Qualité économique (1 crédit)"
          }
        </span>
      </div>

      {/* Bouton de confirmation */}
      <Button 
        onClick={handleConfirm} 
        disabled={disabled || !canConfirm}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-all"
      >
        <Check className="w-4 h-4 mr-2" />
        Confirmer et générer
      </Button>
    </div>
  );
}
