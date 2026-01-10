import { Quote, Sparkles } from "lucide-react";
import ceoPortrait from "@/assets/ceo-portrait.png";

const testimonial = {
  quote: "Les graphistes créent, l'IA automatise. Sur Graphiste IA, les designers soumettent leurs créations et perçoivent des royalties à chaque utilisation. Les clients génèrent des visuels pro en quelques clics. Tout le monde gagne : du temps, de l'argent, et de la qualité.",
  author: "GAVOE Koffi Claude",
  role: "CEO & Fondateur, Graphiste IA",
};

export function TestimonialsSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background organic shape */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-secondary/50 to-transparent rounded-l-[100px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Témoignage du Fondateur</span>
            </div>
            
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
              <span className="text-foreground">La Vision Derrière</span>
              <br />
              <span className="gradient-text">Graphiste IA</span>
            </h2>
            
            <div className="relative mb-8">
              <Quote className="absolute -top-4 -left-4 w-12 h-12 text-primary/20" />
              <p className="text-lg text-muted-foreground leading-relaxed pl-8">
                "{testimonial.quote}"
              </p>
            </div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1 h-12 bg-primary rounded-full" />
              <div>
                <p className="font-semibold text-foreground">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
            
            <button className="px-6 py-3 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
              Découvrir notre mission
            </button>
          </div>
          
          {/* Right Content - CEO Portrait with 3D Animation */}
          <div className="relative flex justify-center">
            {/* Animated rings around portrait */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Outer ring - slowest */}
              <div className="absolute w-80 h-80 rounded-full border-2 border-primary/20 animate-spin-slow" 
                   style={{ animationDuration: '20s' }} />
              
              {/* Middle ring */}
              <div className="absolute w-72 h-72 rounded-full border border-primary/30 animate-spin-slow" 
                   style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
              
              {/* Inner ring - fastest */}
              <div className="absolute w-64 h-64 rounded-full border-2 border-primary/40 animate-spin-slow" 
                   style={{ animationDuration: '10s' }} />
            </div>
            
            {/* Floating particles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-3 h-3 bg-primary rounded-full animate-float-particle" 
                   style={{ top: '10%', left: '20%', animationDelay: '0s' }} />
              <div className="absolute w-2 h-2 bg-primary/70 rounded-full animate-float-particle" 
                   style={{ top: '80%', left: '15%', animationDelay: '1s' }} />
              <div className="absolute w-4 h-4 bg-primary/50 rounded-full animate-float-particle" 
                   style={{ top: '20%', right: '10%', animationDelay: '2s' }} />
              <div className="absolute w-2 h-2 bg-primary rounded-full animate-float-particle" 
                   style={{ bottom: '15%', right: '20%', animationDelay: '0.5s' }} />
              <div className="absolute w-3 h-3 bg-primary/60 rounded-full animate-float-particle" 
                   style={{ top: '50%', left: '5%', animationDelay: '1.5s' }} />
            </div>
            
            {/* Quote mark background */}
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center z-20 shadow-lg shadow-primary/30 animate-pulse-glow">
              <Quote className="w-8 h-8 text-primary-foreground" />
            </div>
            
            {/* CEO Portrait - Circular with glow effect */}
            <div className="relative z-10">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 blur-xl transform scale-110 animate-pulse-glow" />
              
              {/* Portrait container */}
              <div className="relative w-56 h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-primary/30 shadow-2xl shadow-primary/20 animate-float-portrait">
                <img 
                  src={ceoPortrait}
                  alt="Emmanuel Kokou - CEO Graphiste IA"
                  className="w-full h-full object-cover object-top"
                />
                {/* Subtle overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-secondary rounded-full flex items-center justify-center z-20 animate-bounce-slow">
              <Sparkles className="w-6 h-6 text-secondary-foreground" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
