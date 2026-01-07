import { Quote } from "lucide-react";

const testimonial = {
  quote: "Nous aidons nos clients à renouveler leur fonction commerciale pour créer des organisations de marque remarquables.",
  author: "Philip Antrophy",
  role: "SPD & Founder",
  image: "/reference-templates/service/designer-professionnel.jpg"
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
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
              <span className="text-foreground">Ce que dit notre CEO, À propos</span>
              <br />
              <span className="gradient-text">des Clients Graphiste</span>
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
              Clients Review
            </button>
          </div>
          
          {/* Right Content - Testimonial image */}
          <div className="relative">
            {/* Quote mark background */}
            <div className="absolute -top-8 -left-8 w-24 h-24 bg-primary rounded-2xl flex items-center justify-center z-10">
              <Quote className="w-12 h-12 text-primary-foreground" />
            </div>
            
            <div className="relative rounded-[40px] overflow-hidden">
              <img 
                src={testimonial.image}
                alt="Client satisfait"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
