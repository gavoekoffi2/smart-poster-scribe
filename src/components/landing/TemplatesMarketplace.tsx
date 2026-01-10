import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowUpRight, Copy, Church, UtensilsCrossed, GraduationCap, Store, Calendar, Briefcase, Shirt, Building, Heart, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
interface ReferenceTemplate {
  id: string;
  domain: string;
  design_category: string;
  image_url: string;
  description: string | null;
  tags: string[] | null;
}
const domainConfig = [{
  id: "all",
  name: "Tous",
  icon: Sparkles
}, {
  id: "church",
  name: "Église",
  icon: Church
}, {
  id: "restaurant",
  name: "Restaurant",
  icon: UtensilsCrossed
}, {
  id: "formation",
  name: "Formation",
  icon: GraduationCap
}, {
  id: "ecommerce",
  name: "E-commerce",
  icon: Store
}, {
  id: "event",
  name: "Événement",
  icon: Calendar
}, {
  id: "service",
  name: "Service",
  icon: Briefcase
}, {
  id: "fashion",
  name: "Mode",
  icon: Shirt
}, {
  id: "realestate",
  name: "Immobilier",
  icon: Building
}, {
  id: "health",
  name: "Santé",
  icon: Heart
}];
export function TemplatesMarketplace() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ReferenceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<ReferenceTemplate | null>(null);
  useEffect(() => {
    fetchTemplates();
  }, [selectedDomain]);
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase.from("reference_templates").select("*").order("created_at", {
        ascending: false
      }).limit(24);
      if (selectedDomain !== "all") {
        query = query.eq("domain", selectedDomain);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleCloneTemplate = (template: ReferenceTemplate) => {
    // Navigate to app with template info in state
    navigate("/app", {
      state: {
        cloneTemplate: {
          id: template.id,
          imageUrl: template.image_url,
          domain: template.domain,
          description: template.description
        }
      }
    });
  };
  const getDomainLabel = (domainId: string) => {
    const domain = domainConfig.find(d => d.id === domainId);
    return domain?.name || domainId;
  };
  return <section id="templates" className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Marketplace</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-foreground">Templates </span>
            <span className="gradient-text">Professionnels</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choisissez un modèle et personnalisez-le avec vos informations. Notre IA s'occupe du reste !
          </p>
        </div>

        {/* Domain Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {domainConfig.map(domain => {
          const Icon = domain.icon;
          const isActive = selectedDomain === domain.id;
          return <button key={domain.id} onClick={() => setSelectedDomain(domain.id)} className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                  ${isActive ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30" : "bg-card/60 border border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"}
                `}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{domain.name}</span>
              </button>;
        })}
        </div>

        {/* Templates Grid */}
        {loading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({
          length: 8
        }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-card/40 border border-border/40 animate-pulse" />)}
          </div> : templates.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun template trouvé pour ce domaine.</p>
          </div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {templates.map((template, index) => <div key={template.id} className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] bg-card/40 border border-border/40 hover:border-primary/40 transition-all duration-300" style={{
          animationDelay: `${index * 0.05}s`
        }} onClick={() => setSelectedTemplate(template)}>
                {/* Image */}
                <img src={template.image_url} alt={template.description || template.design_category} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs text-primary font-medium">
                      {getDomainLabel(template.domain)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground font-medium capitalize">
                    {template.design_category.replace(/-/g, " ")}
                  </p>
                </div>

                {/* Clone button on hover */}
                

                {/* Decorative glow */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>)}
          </div>}

        {/* CTA */}
        <div className="text-center mt-12">
          <Button onClick={() => navigate("/app")} className="glow-orange bg-gradient-to-r from-primary to-accent rounded-full px-8 py-6 text-lg">
            Créer mon affiche
            <ArrowUpRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedTemplate && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => setSelectedTemplate(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] rounded-3xl overflow-hidden bg-card border border-border/40 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row">
              {/* Image */}
              <div className="md:w-1/2">
                <img src={selectedTemplate.image_url} alt={selectedTemplate.description || "Template"} className="w-full h-full object-cover" />
              </div>

              {/* Details */}
              <div className="md:w-1/2 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm text-primary font-medium">
                      {getDomainLabel(selectedTemplate.domain)}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-3 capitalize">
                    {selectedTemplate.design_category.replace(/-/g, " ")}
                  </h3>
                  {selectedTemplate.description && <p className="text-muted-foreground mb-6">
                      {selectedTemplate.description}
                    </p>}
                  {selectedTemplate.tags && selectedTemplate.tags.length > 0 && <div className="flex flex-wrap gap-2 mb-6">
                      {selectedTemplate.tags.map(tag => <span key={tag} className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/30">
                          {tag}
                        </span>)}
                    </div>}
                </div>

                <div className="space-y-3">
                  <Button onClick={() => handleCloneTemplate(selectedTemplate)} className="w-full glow-orange bg-gradient-to-r from-primary to-accent rounded-full py-6">
                    <Copy className="w-4 h-4 mr-2" />
                    Cloner ce design
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)} className="w-full rounded-full">
                    Fermer
                  </Button>
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedTemplate(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors">
              ✕
            </button>
          </div>
        </div>}
    </section>;
}