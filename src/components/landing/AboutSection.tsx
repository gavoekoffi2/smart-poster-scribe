import { TrendingUp } from "lucide-react";

const skills = [
  { name: "Business Strategy", percentage: 65 },
  { name: "Technology Consulting", percentage: 90 }
];

export function AboutSection() {
  return (
    <section id="about" className="py-24 px-4 relative overflow-hidden">
      {/* Background organic shapes */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-secondary/30 to-transparent rounded-r-[100px]" />
      <div className="absolute top-20 right-20 w-4 h-4 rounded-full bg-primary" />
      <div className="absolute bottom-20 right-40 w-2 h-2 rounded-full bg-primary/50" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              <span className="text-foreground">Rejoignez la Communauté pour en savoir plus</span>
              <br />
              <span className="text-foreground">À propos de notre </span>
              <span className="gradient-text">Entreprise</span>
            </h2>
            
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Continuellement, nous générons des communautés 2.0 et des produits axés sur le client. 
              Synergiquement, nous fabriquons des produits stratégiques alors que les effets de levier.
            </p>
            
            {/* Progress bars */}
            <div className="space-y-6">
              {skills.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-foreground">{skill.name}</span>
                    <span className="text-primary font-bold">{skill.percentage}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                      style={{ width: `${skill.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right - Image with organic shape */}
          <div className="relative">
            {/* Organic background shape */}
            <div className="absolute -top-8 -right-8 w-full h-full bg-gradient-to-br from-secondary to-secondary/50 rounded-[40px] -rotate-3" />
            
            <div className="relative rounded-[40px] overflow-hidden">
              <img 
                src="/reference-templates/formation/formation-2.jpg"
                alt="Notre équipe au travail"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>
            
            {/* Decorative dots */}
            <div className="absolute -bottom-4 -right-4 grid grid-cols-4 gap-2">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary/30" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
