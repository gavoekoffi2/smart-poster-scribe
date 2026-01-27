import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Templates from public folder - organized by rows
// Helper pour détecter le domaine depuis le chemin de l'image
function getDomainFromPath(imagePath: string): string {
  if (imagePath.includes('/youtube/')) return 'youtube';
  if (imagePath.includes('/church/')) return 'church';
  if (imagePath.includes('/restaurant/')) return 'restaurant';
  if (imagePath.includes('/event/')) return 'event';
  if (imagePath.includes('/formation/')) return 'formation';
  if (imagePath.includes('/ecommerce/')) return 'ecommerce';
  if (imagePath.includes('/service/')) return 'service';
  if (imagePath.includes('/fashion/')) return 'fashion';
  return 'other';
}

const MARQUEE_TEMPLATES: { row1: string[]; row2: string[]; row3: string[] } = {
  row1: [
    "/reference-templates/church/14-jours-jeune.jpg",
    "/reference-templates/ecommerce/mega-sales-event.jpg",
    "/reference-templates/event/african-praise.jpg",
    "/reference-templates/formation/webinaire-power-bi.jpg",
    "/reference-templates/restaurant/best-taste-kitchen.jpg",
    "/reference-templates/service/boost-social-media.jpg",
    "/reference-templates/church/21-jours-jeune-goshen.jpg",
    "/reference-templates/ecommerce/see-wide-collections.jpg",
    "/reference-templates/event/concert-celebration-epouse.jpg",
    "/reference-templates/youtube/ecommerce-tiktok-sales.jpg",
  ],
  row2: [
    "/reference-templates/church/ciel-ouvert.jpg",
    "/reference-templates/restaurant/giftys-cuisine.jpg",
    "/reference-templates/service/designer-professionnel.jpg",
    "/reference-templates/event/mega-all-night.jpg",
    "/reference-templates/formation/formation-ecommerce-alibaba.jpg",
    "/reference-templates/church/special-bonzola.jpg",
    "/reference-templates/ecommerce/valentine-package.jpg",
    "/reference-templates/restaurant/favours-kitchen.jpg",
    "/reference-templates/service/ozark-graphics-design.jpg",
    "/reference-templates/youtube/commencer-ecommerce.jpg",
  ],
  row3: [
    "/reference-templates/event/praise-worship-concert.jpg",
    "/reference-templates/church/unity-convention.jpg",
    "/reference-templates/formation/dba-projet-recherche.jpg",
    "/reference-templates/restaurant/bloom-resto-bar.jpg",
    "/reference-templates/service/lanro-picture-visuels.jpg",
    "/reference-templates/ecommerce/rush-fruitys-products.jpg",
    "/reference-templates/event/worship-xperience.jpg",
    "/reference-templates/church/jinterviens-trone-grace.jpg",
    "/reference-templates/restaurant/piment-doux-promo.jpg",
  ],
};

function MarqueeRow({ 
  images, 
  direction = "left", 
  speed = 30,
  rotation = 0 
}: { 
  images: string[]; 
  direction?: "left" | "right";
  speed?: number;
  rotation?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Double the images for seamless loop
  const duplicatedImages = [...images, ...images, ...images];

  const handleInspire = async (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    
    // Déterminer le domaine depuis le chemin
    const domain = getDomainFromPath(imageUrl);
    
    // Vérifier l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Stocker le template pour après login
      sessionStorage.setItem('pendingCloneTemplate', JSON.stringify({
        imageUrl,
        domain
      }));
      navigate("/auth", { 
        state: { redirectTo: "/app", pendingClone: true } 
      });
      return;
    }
    
    // Utilisateur connecté → aller directement à l'app
    navigate("/app", {
      state: {
        cloneTemplate: { imageUrl, domain }
      }
    });
  };
  
  return (
    <div 
      className="overflow-hidden py-2 w-[120%] -ml-[10%]"
      style={{ 
        transform: `rotate(${rotation}deg)`,
      }}
      ref={containerRef}
    >
      <div 
        className={`flex gap-4 ${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"}`}
        style={{ 
          animationDuration: `${speed}s`,
        }}
      >
        {duplicatedImages.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="relative flex-shrink-0 w-40 md:w-52 lg:w-64 aspect-[3/4] rounded-xl overflow-hidden group border border-border/20 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <img
              src={image}
              alt="Template design"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={(e) => handleInspire(e, image)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 hover:bg-primary backdrop-blur-sm text-primary-foreground text-xs font-medium transition-all duration-200 hover:scale-105 shadow-lg cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                S'inspirer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemplatesMarquee() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/4 right-0 w-72 h-72 bg-primary/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-accent/15 rounded-full blur-[80px]" />
      
      {/* Header */}
      <div className="container mx-auto max-w-7xl relative z-10 mb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Inspirations</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-foreground">Templates </span>
            <span className="gradient-text">Premium</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Des centaines de designs professionnels créés par nos graphistes partenaires
          </p>
        </div>
      </div>
      
      {/* Marquee Rows with diagonal effect */}
      <div className="relative z-0 space-y-3 -rotate-2">
        <MarqueeRow 
          images={MARQUEE_TEMPLATES.row1} 
          direction="left" 
          speed={45}
          rotation={0}
        />
        <MarqueeRow 
          images={MARQUEE_TEMPLATES.row2} 
          direction="right" 
          speed={50}
          rotation={0}
        />
        <MarqueeRow 
          images={MARQUEE_TEMPLATES.row3} 
          direction="left" 
          speed={40}
          rotation={0}
        />
      </div>
      
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
    </section>
  );
}
