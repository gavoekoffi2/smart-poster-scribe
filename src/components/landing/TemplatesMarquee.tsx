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

// Templates affiches professionnelles
const POSTER_TEMPLATES: { row1: string[]; row2: string[]; row3: string[] } = {
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

// Miniatures YouTube professionnelles
const YOUTUBE_THUMBNAILS: string[] = [
  "/reference-templates/youtube/ecommerce-tiktok-sales.jpg",
  "/reference-templates/youtube/commencer-ecommerce.jpg",
  "/reference-templates/youtube/ecommerce-cout-total.jpg",
  "/reference-templates/youtube/tiktok-ventes-37k.jpg",
  "/reference-templates/youtube/youtube-subscribers-28k.jpg",
  "/reference-templates/youtube/ne-pas-lancer-business.jpg",
];

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

// Composant pour les miniatures YouTube avec format 16:9
function YouTubeMarqueeRow({ 
  images, 
  direction = "left", 
  speed = 25 
}: { 
  images: string[]; 
  direction?: "left" | "right";
  speed?: number;
}) {
  const navigate = useNavigate();
  const duplicatedImages = [...images, ...images, ...images, ...images];

  const handleInspire = async (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    const domain = getDomainFromPath(imageUrl);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      sessionStorage.setItem('pendingCloneTemplate', JSON.stringify({ imageUrl, domain }));
      navigate("/auth", { state: { redirectTo: "/app", pendingClone: true } });
      return;
    }
    
    navigate("/app", { state: { cloneTemplate: { imageUrl, domain } } });
  };

  return (
    <div className="overflow-hidden py-3">
      <div 
        className={`flex gap-6 ${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {duplicatedImages.map((image, index) => (
          <div
            key={`yt-${image}-${index}`}
            className="relative flex-shrink-0 w-72 md:w-80 lg:w-96 aspect-video rounded-2xl overflow-hidden group border-2 border-primary/20 shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all duration-500 hover:scale-[1.02]"
          >
            <img
              src={image}
              alt="YouTube thumbnail"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            {/* Overlay effet brillant */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Badge YouTube */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-600/90 backdrop-blur-sm text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube
            </div>
            
            {/* Bouton S'inspirer */}
            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <button
                onClick={(e) => handleInspire(e, image)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 backdrop-blur-md text-primary-foreground text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-xl cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                S'inspirer de cette miniature
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
    <section className="py-20 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/4 right-0 w-72 h-72 bg-primary/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-accent/15 rounded-full blur-[80px]" />
      
      {/* Section Miniatures YouTube */}
      <div className="relative z-10 mb-16">
        <div className="container mx-auto max-w-7xl mb-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/10 border border-red-500/30 mb-4">
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-sm font-medium text-red-400">YouTube</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-foreground">Miniatures </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">Professionnelles</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Des miniatures YouTube captivantes qui boostent vos vues et votre engagement
            </p>
          </div>
        </div>
        
        <YouTubeMarqueeRow 
          images={YOUTUBE_THUMBNAILS} 
          direction="right" 
          speed={30}
        />
      </div>
      
      {/* Séparateur visuel */}
      <div className="container mx-auto max-w-7xl relative z-10 my-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      
      {/* Section Affiches Professionnelles */}
      <div className="relative z-10">
        <div className="container mx-auto max-w-7xl mb-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Inspirations</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-foreground">Affiches </span>
              <span className="gradient-text">Premium</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Des centaines de designs professionnels créés par nos graphistes partenaires
            </p>
          </div>
        </div>
        
        {/* Marquee Rows with diagonal effect */}
        <div className="space-y-3 -rotate-2">
          <MarqueeRow 
            images={POSTER_TEMPLATES.row1} 
            direction="left" 
            speed={45}
            rotation={0}
          />
          <MarqueeRow 
            images={POSTER_TEMPLATES.row2} 
            direction="right" 
            speed={50}
            rotation={0}
          />
          <MarqueeRow 
            images={POSTER_TEMPLATES.row3} 
            direction="left" 
            speed={40}
            rotation={0}
          />
        </div>
      </div>
      
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
    </section>
  );
}
