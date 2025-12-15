import { TrendingUp, Wind, Cloud, Compass } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";

const features = [
  {
    icon: TrendingUp,
    title: "Your Numbers",
    description: "Total posts, likes, reposts, and engagement across the year.",
  },
  {
    icon: Wind,
    title: "Tailwinds",
    description: "Your biggest fans—the people who engaged with your posts most.",
  },
  {
    icon: Cloud,
    title: "Top Moments",
    description: "Your most engaging post and the topics that defined your year.",
  },
  {
    icon: Compass,
    title: "Your Rhythm",
    description: "When you posted, your longest streak, and your posting patterns.",
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
