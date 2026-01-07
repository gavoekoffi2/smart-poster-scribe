import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Upload, Database } from "lucide-react";

// All template files organized by domain
const TEMPLATE_FILES: Record<string, { filename: string; category: string; tags: string[] }[]> = {
  church: [
    { filename: "14-jours-jeune.jpg", category: "jeune", tags: ["jeûne", "prière", "église"] },
    { filename: "21-jours-jeune-goshen.jpg", category: "jeune", tags: ["jeûne", "goshen", "prière"] },
    { filename: "21-jours-jeune-tlbc.jpg", category: "jeune", tags: ["jeûne", "tlbc", "prière"] },
    { filename: "centre-chretien-excellence.jpg", category: "service", tags: ["culte", "église", "dimanche"] },
    { filename: "church-flyer-cameroon.jpg", category: "service", tags: ["culte", "cameroun", "église"] },
    { filename: "church-flyer-french-2.jpg", category: "service", tags: ["culte", "francophone"] },
    { filename: "church-flyer-french.jpg", category: "service", tags: ["culte", "francophone"] },
    { filename: "ciel-ouvert.jpg", category: "conference", tags: ["conférence", "ciel ouvert"] },
    { filename: "jinterviens-trone-grace.jpg", category: "priere", tags: ["prière", "intercession"] },
    { filename: "special-bonzola-2022.jpg", category: "special", tags: ["spécial", "invité"] },
    { filename: "special-bonzola.jpg", category: "special", tags: ["spécial", "invité"] },
    { filename: "telechargement-1.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement-2.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement-3.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement-4.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement.jpg", category: "service", tags: ["culte"] },
    { filename: "unity-convention.jpg", category: "convention", tags: ["convention", "unité"] },
    { filename: "visuel-church.jpg", category: "service", tags: ["culte", "église"] },
  ],
  ecommerce: [
    { filename: "jays-deoden.jpg", category: "fashion", tags: ["mode", "vêtements", "promo"] },
    { filename: "mega-sales-event.jpg", category: "sales", tags: ["soldes", "promo", "vente"] },
    { filename: "rush-fruitys-products.jpg", category: "food", tags: ["fruits", "produits", "frais"] },
    { filename: "see-wide-collections.jpg", category: "fashion", tags: ["collection", "mode"] },
    { filename: "terez-ember-sales.jpg", category: "sales", tags: ["soldes", "promo"] },
    { filename: "valentine-package.jpg", category: "special", tags: ["saint-valentin", "cadeau"] },
  ],
  event: [
    { filename: "african-praise.jpg", category: "concert", tags: ["concert", "gospel", "louange"] },
    { filename: "apostolic-praise-2024.jpg", category: "concert", tags: ["concert", "apostolique"] },
    { filename: "concert-celebration-epouse.jpg", category: "concert", tags: ["concert", "célébration"] },
    { filename: "concert-celebration-tabernacle.jpg", category: "concert", tags: ["concert", "tabernacle"] },
    { filename: "concert-de-la-vie.jpg", category: "concert", tags: ["concert", "vie"] },
    { filename: "concert-gospel-cct.jpg", category: "concert", tags: ["concert", "gospel"] },
    { filename: "event-flyer.jpg", category: "general", tags: ["événement"] },
    { filename: "excursion-flyer.jpg", category: "excursion", tags: ["excursion", "sortie"] },
    { filename: "handkerchief-praise.jpg", category: "concert", tags: ["concert", "louange"] },
    { filename: "mega-all-night.jpg", category: "veille", tags: ["veillée", "prière", "nuit"] },
    { filename: "praise-concert-flyer.jpg", category: "concert", tags: ["concert", "louange"] },
    { filename: "praise-worship-concert.jpg", category: "concert", tags: ["concert", "louange", "adoration"] },
    { filename: "telechargement-event-1.jpg", category: "general", tags: ["événement"] },
    { filename: "telechargement-event-2.jpg", category: "general", tags: ["événement"] },
    { filename: "telechargement-event-3.jpg", category: "general", tags: ["événement"] },
    { filename: "waajal-koom-koom.jpg", category: "cultural", tags: ["culturel", "festival"] },
    { filename: "worship-xperience.jpg", category: "concert", tags: ["concert", "adoration"] },
  ],
  fashion: [
    { filename: "aicha-couture.jpg", category: "couture", tags: ["couture", "mode", "africaine"] },
  ],
  formation: [
    { filename: "certification-rh.jpg", category: "certification", tags: ["RH", "certification", "formation"] },
    { filename: "certified-hr-manager.jpg", category: "certification", tags: ["RH", "manager", "certification"] },
    { filename: "dba-projet-recherche.jpg", category: "academique", tags: ["DBA", "recherche", "doctorat"] },
    { filename: "dba-reference-scientifique.jpg", category: "academique", tags: ["DBA", "scientifique"] },
    { filename: "formation-1.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-2.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-3.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-4.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-ecommerce-alibaba.jpg", category: "ecommerce", tags: ["e-commerce", "alibaba", "import"] },
    { filename: "webinaire-power-bi.jpg", category: "webinaire", tags: ["webinaire", "power bi", "data"] },
  ],
  restaurant: [
    { filename: "best-taste-kitchen.jpg", category: "cuisine", tags: ["cuisine", "restaurant"] },
    { filename: "bloom-resto-bar.jpg", category: "bar", tags: ["bar", "restaurant", "resto"] },
    { filename: "favours-kitchen-2.jpg", category: "cuisine", tags: ["cuisine", "traiteur"] },
    { filename: "favours-kitchen.jpg", category: "cuisine", tags: ["cuisine", "traiteur"] },
    { filename: "giftys-cuisine.jpg", category: "cuisine", tags: ["cuisine", "africaine"] },
    { filename: "jassy-la-manjay.jpg", category: "cuisine", tags: ["cuisine", "manjay"] },
    { filename: "kom-party.jpg", category: "event", tags: ["fête", "kom", "restaurant"] },
    { filename: "piment-doux-promo.jpg", category: "promo", tags: ["promo", "piment doux"] },
    { filename: "primo-promo-bar.jpg", category: "bar", tags: ["bar", "promo"] },
    { filename: "restaurant-grille-maquis.jpg", category: "maquis", tags: ["maquis", "grillades"] },
    { filename: "saveurs-authentik.jpg", category: "cuisine", tags: ["cuisine", "authentique"] },
    { filename: "special-fetes-chef.jpg", category: "special", tags: ["fêtes", "chef", "spécial"] },
  ],
  service: [
    { filename: "ariwas-import-export.jpg", category: "import-export", tags: ["import", "export", "commerce"] },
    { filename: "baddest-beauty-salon.jpg", category: "beaute", tags: ["beauté", "salon", "coiffure"] },
    { filename: "boost-social-media.jpg", category: "digital", tags: ["social media", "marketing"] },
    { filename: "boostez-visuels-premium.jpg", category: "design", tags: ["design", "visuel", "premium"] },
    { filename: "designer-professionnel.jpg", category: "design", tags: ["design", "professionnel"] },
    { filename: "la-joie-coiffure.jpg", category: "beaute", tags: ["coiffure", "tresse", "beauté"] },
    { filename: "lanro-picture-visuels.jpg", category: "photo", tags: ["photo", "visuels"] },
    { filename: "ozark-graphics-design.jpg", category: "design", tags: ["graphisme", "design"] },
    { filename: "pat-beauty-care.jpg", category: "beaute", tags: ["beauté", "soins"] },
    { filename: "peemas-beauty-studio.jpg", category: "beaute", tags: ["beauté", "studio"] },
    { filename: "smart-design-flyer.jpg", category: "design", tags: ["design", "flyer"] },
    { filename: "williams-service-international-2.jpg", category: "international", tags: ["service", "international"] },
    { filename: "williams-service-international.jpg", category: "international", tags: ["service", "international"] },
    { filename: "yahuta-graphic-design.jpg", category: "design", tags: ["graphisme", "design"] },
  ],
};

interface UploadResult {
  domain: string;
  filename: string;
  success: boolean;
  storageUrl?: string;
  error?: string;
}

export default function AdminUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [currentFile, setCurrentFile] = useState("");

  const getTotalFiles = () => {
    return Object.values(TEMPLATE_FILES).reduce((acc, files) => acc + files.length, 0);
  };

  const uploadAllTemplates = async () => {
    setUploading(true);
    setProgress(0);
    setResults([]);

    const allResults: UploadResult[] = [];
    const totalFiles = getTotalFiles();
    let processedFiles = 0;

    for (const [domain, files] of Object.entries(TEMPLATE_FILES)) {
      for (const file of files) {
        const localPath = `/reference-templates/${domain}/${file.filename}`;
        const storagePath = `${domain}/${file.filename}`;
        setCurrentFile(`${domain}/${file.filename}`);

        try {
          // Fetch the image from the local public folder
          const response = await fetch(localPath);
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
          }

          const blob = await response.blob();

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("reference-templates")
            .upload(storagePath, blob, {
              contentType: blob.type || "image/jpeg",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from("reference-templates")
            .getPublicUrl(storagePath);

          const newStorageUrl = publicUrlData.publicUrl;

          // Update the database record
          const { error: updateError } = await supabase
            .from("reference_templates")
            .update({ image_url: newStorageUrl })
            .eq("image_url", localPath);

          if (updateError) {
            console.warn(`DB update warning for ${localPath}:`, updateError.message);
          }

          allResults.push({
            domain,
            filename: file.filename,
            success: true,
            storageUrl: newStorageUrl,
          });

        } catch (error) {
          allResults.push({
            domain,
            filename: file.filename,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        processedFiles++;
        setProgress((processedFiles / totalFiles) * 100);
        setResults([...allResults]);
      }
    }

    setUploading(false);
    setCurrentFile("");
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <Database className="inline-block mr-2 h-8 w-8 text-primary" />
            Transfert des Templates vers Supabase
          </h1>
          <p className="text-muted-foreground">
            Cette page transfère toutes les affiches de référence vers le stockage Supabase
            et met à jour les URLs dans la base de données.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Statistiques</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-3xl font-bold text-foreground">{getTotalFiles()}</div>
              <div className="text-sm text-muted-foreground">Total Templates</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-500">{successCount}</div>
              <div className="text-sm text-muted-foreground">Réussis</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-500">{failCount}</div>
              <div className="text-sm text-muted-foreground">Échoués</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <Button
            onClick={uploadAllTemplates}
            disabled={uploading}
            size="lg"
            className="w-full glow-orange"
          >
            <Upload className="mr-2 h-5 w-5" />
            {uploading ? "Transfert en cours..." : "Lancer le Transfert"}
          </Button>

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progression</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  En cours: {currentFile}
                </p>
              )}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Résultats détaillés</h2>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? "bg-green-500/10" : "bg-red-500/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {result.domain}/{result.filename}
                      </p>
                      {result.error && (
                        <p className="text-sm text-red-400">{result.error}</p>
                      )}
                    </div>
                  </div>
                  {result.success && result.storageUrl && (
                    <a
                      href={result.storageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Voir
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
