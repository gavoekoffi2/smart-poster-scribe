import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Monitor, 
  Smartphone, 
  Printer, 
  Settings2,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  MessageCircle,
  Twitter,
  Image,
  Check
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

const getPlatformIcon = (icon: string) => {
  switch (icon) {
    case "facebook": return <Facebook className="w-4 h-4" />;
    case "instagram": return <Instagram className="w-4 h-4" />;
    case "youtube": return <Youtube className="w-4 h-4" />;
    case "linkedin": return <Linkedin className="w-4 h-4" />;
    case "whatsapp": return <MessageCircle className="w-4 h-4" />;
    case "twitter": return <Twitter className="w-4 h-4" />;
    case "tiktok": return <Smartphone className="w-4 h-4" />;
    case "print": return <Printer className="w-4 h-4" />;
    default: return <Image className="w-4 h-4" />;
  }
};

export function FormatSelect({ onSelect, disabled }: FormatSelectProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [customWidth, setCustomWidth] = useState<string>("1080");
  const [customHeight, setCustomHeight] = useState<string>("1080");
  const [activeTab, setActiveTab] = useState<UsageType>("social");

  const handlePresetSelect = (preset: FormatPreset) => {
    setSelectedFormat(preset.id);
    onSelect(preset);
  };

  const handleCustomConfirm = () => {
    const width = parseInt(customWidth) || 1080;
    const height = parseInt(customHeight) || 1080;
    
    // Déterminer le ratio
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const ratioW = width / divisor;
    const ratioH = height / divisor;
    
    // Simplifier le ratio pour l'API
    let aspectRatio: string;
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) aspectRatio = "1:1";
    else if (Math.abs(ratio - 4/3) < 0.1) aspectRatio = "4:3";
    else if (Math.abs(ratio - 3/4) < 0.1) aspectRatio = "3:4";
    else if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = "16:9";
    else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = "9:16";
    else aspectRatio = `${ratioW}:${ratioH}`;
    
    // Déterminer l'usage basé sur la résolution
    const usage: UsageType = width >= 2400 || height >= 2400 ? "print" : "social";
    
    const customPreset: FormatPreset = {
      id: "custom",
      name: `Personnalisé (${width}×${height})`,
      aspectRatio,
      width,
      height,
      platform: "Personnalisé",
      icon: "custom",
      usage,
    };
    
    setSelectedFormat("custom");
    onSelect(customPreset);
  };

  // Grouper les presets sociaux par plateforme
  const groupedSocialPresets = SOCIAL_PRESETS.reduce((acc, preset) => {
    const platform = preset.platform;
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(preset);
    return acc;
  }, {} as Record<string, FormatPreset[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Choisissez le format</h3>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UsageType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Réseaux sociaux</span>
            <span className="sm:hidden">Social</span>
          </TabsTrigger>
          <TabsTrigger value="print" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            <span>Impression</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Personnalisé</span>
            <span className="sm:hidden">Custom</span>
          </TabsTrigger>
        </TabsList>

        {/* Réseaux sociaux */}
        <TabsContent value="social" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              Résolution 1K-2K
            </Badge>
            <span>Optimisé pour le web</span>
          </div>
          
          {Object.entries(groupedSocialPresets).map(([platform, presets]) => (
            <div key={platform} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {getPlatformIcon(presets[0].icon)}
                {platform}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <Card
                    key={preset.id}
                    className={`p-3 cursor-pointer transition-all hover:border-primary/50 ${
                      selectedFormat === preset.id 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "border-border/50"
                    } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.width}×{preset.height}
                        </span>
                      </div>
                      {selectedFormat === preset.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Impression */}
        <TabsContent value="print" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
              Résolution 4K
            </Badge>
            <span>Haute qualité pour impression</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRINT_PRESETS.map((preset) => (
              <Card
                key={preset.id}
                className={`p-3 cursor-pointer transition-all hover:border-primary/50 ${
                  selectedFormat === preset.id 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border/50"
                } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => handlePresetSelect(preset)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{preset.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {preset.width}×{preset.height}
                    </span>
                  </div>
                  {selectedFormat === preset.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </Card>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Les formats d'impression consomment plus de crédits en raison de leur haute résolution.
          </p>
        </TabsContent>

        {/* Personnalisé */}
        <TabsContent value="custom" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-width">Largeur (px)</Label>
              <Input
                id="custom-width"
                type="number"
                min="512"
                max="4096"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                disabled={disabled}
                placeholder="1080"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-height">Hauteur (px)</Label>
              <Input
                id="custom-height"
                type="number"
                min="512"
                max="4096"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                disabled={disabled}
                placeholder="1080"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {parseInt(customWidth) >= 2400 || parseInt(customHeight) >= 2400 ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                Qualité impression (4K)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                Qualité web (1K-2K)
              </Badge>
            )}
          </div>
          
          <Button 
            onClick={handleCustomConfirm} 
            disabled={disabled}
            className="w-full"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmer ce format
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
