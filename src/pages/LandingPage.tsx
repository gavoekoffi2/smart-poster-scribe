import { useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { captureReferralCode } from "@/hooks/useAffiliate";
import { Navbar } from "@/components/landing/Navbar";
const Scene3D = lazy(() => import("@/components/landing/Scene3D").then(m => ({ default: m.Scene3D })));
import { HeroSection } from "@/components/landing/HeroSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { TemplatesMarketplace } from "@/components/landing/TemplatesMarketplace";
import { TemplatesMarquee } from "@/components/landing/TemplatesMarquee";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { CTASection } from "@/components/landing/CTASection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { JsonLd } from "@/components/seo/JsonLd";

export default function LandingPage() {
  const navigate = useNavigate();

  // Capture ?ref= referral code from URL
  useEffect(() => {
    captureReferralCode();
  }, []);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden animated-gradient">
      {/* 3D Background - Interactive */}
      <Suspense fallback={null}><Scene3D /></Suspense>
      
      {/* Main Content */}
      <div className="relative z-10">
        <JsonLd />
        {/* Navigation */}
        <Navbar onGetStarted={handleGetStarted} />
        
        {/* Hero Section */}
        <HeroSection onGetStarted={handleGetStarted} />
        
        {/* Testimonials Section */}
        <TestimonialsSection />
        
        {/* Templates Marquee - Animated showcase */}
        <TemplatesMarquee />
        
        {/* Templates Marketplace */}
        <TemplatesMarketplace />
        
        {/* Showcase - Community Creations */}
        <ShowcaseSection />
        
        {/* Process Section */}
        <ProcessSection />
        
        {/* About Section */}
        <AboutSection />
        
        {/* Features/Services Section */}
        <FeaturesSection />
        
        {/* Pricing Section */}
        <PricingSection />
        
        {/* Contact Section */}
        <ContactSection />
        
        {/* FAQ Section */}
        <FAQSection />
        
        {/* CTA Section */}
        <CTASection onGetStarted={handleGetStarted} />
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
