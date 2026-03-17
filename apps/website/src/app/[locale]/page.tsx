import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { BanksSection } from "@/components/sections/Banks";
import { FeaturesSection } from "@/components/sections/Features";
import { HeroSection } from "@/components/sections/Hero";
import { HowItWorksSection } from "@/components/sections/HowItWorks";
import { PricingSection } from "@/components/sections/Pricing";
import { PrivacySection } from "@/components/sections/Privacy";
import { ProblemSection } from "@/components/sections/Problem";
import { QuickStartSection } from "@/components/sections/QuickStart";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <BanksSection />
        <PrivacySection />
        <PricingSection />
        <QuickStartSection />
      </main>
      <Footer />
    </>
  );
}
