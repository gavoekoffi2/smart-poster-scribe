import { useState, useEffect } from "react";
import { Sparkles, ArrowUpRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedImage {
  id: string;
  image_url: string;
  prompt: string;
  domain: string | null;
  created_at: string;
}

export function ShowcaseSection() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    fetchShowcaseImages();
  }, []);

  const fetchShowcaseImages = async () => {
    try {
      const { data, error } = await supabase
        .from("generated_images")
        .select("id, image_url, prompt, domain, created_at")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      setImages(data || []);
    } catch (err) {
      console.error("Error fetching showcase images:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDomainLabel = (domain: string | null) => {
    const labels: Record<string, string> = {
      church: "Église",
      restaurant: "Restaurant",
      event: "Événement",
      formation: "Formation",
      ecommerce: "E-commerce",
      service: "Service",
      fashion: "Mode",
      realestate: "Immobilier",
      health: "Santé",
    };
    return domain ? labels[domain] || domain : "Général";
  };

  if (loading) {
    return (
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-8 w-64 bg-muted rounded" />
              <div className="h-4 w-96 bg-muted rounded" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <section id="showcase" className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Réalisations</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-foreground">Créés par notre </span>
            <span className="gradient-text">Communauté</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les visuels créés par nos utilisateurs. Laissez-vous inspirer par leur créativité !
          </p>
        </div>

        {/* Images Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] bg-card/40 border border-border/40"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => setSelectedImage(image)}
            >
              {/* Image */}
              <img
                src={image.image_url}
                alt={image.prompt?.slice(0, 50) || "Création"}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content on hover */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs text-primary font-medium">
                    {getDomainLabel(image.domain)}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">
                  {image.prompt?.slice(0, 60)}...
                </p>
              </div>

              {/* Eye icon */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <Eye className="w-4 h-4 text-foreground" />
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>

        {/* View More Link */}
        <div className="text-center mt-12">
          <a
            href="#templates"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Voir plus de créations
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] rounded-3xl overflow-hidden bg-card border border-border/40 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.image_url}
              alt={selectedImage.prompt || "Création"}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-primary font-medium">
                  {getDomainLabel(selectedImage.domain)}
                </span>
              </div>
              <p className="text-foreground">{selectedImage.prompt}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Créé le {new Date(selectedImage.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
