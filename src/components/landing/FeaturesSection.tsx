import { Sparkles, Palette, Zap, Image, MessageSquare, Download, Layers, Clock, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FeaturesSection() {
  const { t } = useTranslation();
  const services = [
    { icon: Sparkles, title: t("features.services.s1Title"), description: t("features.services.s1Desc"), image: "/reference-templates/service/designer-professionnel.jpg" },
    { icon: Palette, title: t("features.services.s2Title"), description: t("features.services.s2Desc"), image: "/reference-templates/event/worship-xperience.jpg" },
    { icon: Layers, title: t("features.services.s3Title"), description: t("features.services.s3Desc"), image: "/reference-templates/event/praise-worship-concert.jpg" }
  ];

  const features = [
    { icon: MessageSquare, title: t("features.list.f1Title"), description: t("features.list.f1Desc") },
    { icon: Palette, title: t("features.list.f2Title"), description: t("features.list.f2Desc") },
    { icon: Layers, title: t("features.list.f3Title"), description: t("features.list.f3Desc") },
    { icon: Image, title: t("features.list.f4Title"), description: t("features.list.f4Desc") },
    { icon: Zap, title: t("features.list.f5Title"), description: t("features.list.f5Desc") },
    { icon: Clock, title: t("features.list.f6Title"), description: t("features.list.f6Desc") },
    { icon: Download, title: t("features.list.f7Title"), description: t("features.list.f7Desc") },
    { icon: Sparkles, title: t("features.list.f8Title"), description: t("features.list.f8Desc") },
  ];

  return (
    <section id="features" className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 diagonal-stripes opacity-50" />
      <div className="absolute top-20 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-foreground">{t("features.titleA")}</span>
            <span className="gradient-text">{t("features.titleB")}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("features.description")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group service-card relative rounded-3xl bg-card/60 border border-border/40 overflow-hidden cursor-pointer"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>
              
              <div className="p-6 relative">
                <h3 className="font-display text-2xl font-bold mb-2 text-foreground">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="absolute bottom-6 right-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                  <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3 mb-24">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <div className="w-3 h-3 rounded-full bg-muted" />
          <div className="w-3 h-3 rounded-full bg-muted" />
        </div>

        <div className="pt-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{t("features.sectionBadge")}</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">{t("features.sectionTitle")}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="group p-6 rounded-2xl bg-card/40 border border-border/40 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                <h3 className="font-display text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
