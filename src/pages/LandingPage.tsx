import { useNavigate } from "react-router-dom";
import { Scene3D } from "@/components/landing/Scene3D";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CaseStudiesSection } from "@/components/landing/CaseStudiesSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { TemplatesMarketplace } from "@/components/landing/TemplatesMarketplace";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { DomainsSection } from "@/components/landing/DomainsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden animated-gradient">
      {/* 3D Background - Interactive */}
      <Scene3D />
      
      {/* Main Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <Navbar onGetStarted={handleGetStarted} />
        
        {/* Hero Section */}
        <HeroSection onGetStarted={handleGetStarted} />
        
        {/* Testimonials Section */}
        <TestimonialsSection />
        
        {/* Showcase - Community Creations */}
        <ShowcaseSection />
        
        {/* Templates Marketplace */}
        <TemplatesMarketplace />
        
        {/* Case Studies Section */}
        <CaseStudiesSection />
        
        {/* Process Section */}
        <ProcessSection />
        
        {/* About Section */}
        <AboutSection />
        
        {/* Features/Services Section */}
        <FeaturesSection />
        
        {/* Domains Section */}
        <DomainsSection />
        
        {/* CTA Section */}
        <CTASection onGetStarted={handleGetStarted} />
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
