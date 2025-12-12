import { Hero } from "@/components/Hero";
import { WhatIsUpdraft } from "@/components/WhatIsUpdraft";
import { Features } from "@/components/Features";
import { TrustSection } from "@/components/TrustSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <WhatIsUpdraft />
      <Features />
      <TrustSection />
      <Footer />
    </main>
  );
};

export default Index;
