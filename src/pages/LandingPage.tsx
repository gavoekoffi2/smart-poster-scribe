import { useNavigate } from "react-router-dom";
import { Scene3D } from "@/components/landing/Scene3D";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { DomainsSection } from "@/components/landing/DomainsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* 3D Background */}
      <Scene3D />
      
      {/* Navigation */}
      <Navbar onGetStarted={handleGetStarted} />
      
      {/* Hero Section */}
      <HeroSection onGetStarted={handleGetStarted} />
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* Domains Section */}
      <DomainsSection />
      
      {/* CTA Section */}
      <CTASection onGetStarted={handleGetStarted} />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
