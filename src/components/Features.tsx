import { TrendingUp, Wind, Cloud, Compass } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";

const features = [
  {
    icon: TrendingUp,
    title: "Lift",
    description: "See how your posts and followers grew over time.",
  },
  {
    icon: Wind,
    title: "Tailwinds",
    description: "Discover which conversations and connections helped your posts travel.",
  },
  {
    icon: Cloud,
    title: "High Points",
    description: "Your most engaged-with posts, moments, and themes.",
  },
  {
    icon: Compass,
    title: "Patterns",
    description: "When you posted, how often, and what stuck.",
  },
];

export function Features() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
