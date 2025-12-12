import { Shield, Lock, Eye } from "lucide-react";

const trustPoints = [
  {
    icon: Eye,
    text: "Only reads what it needs",
  },
  {
    icon: Lock,
    text: "No storing your data",
  },
  {
    icon: Shield,
    text: "No posting on your behalf",
  },
];

export function TrustSection() {
  return (
    <section className="py-24 px-6 bg-secondary/50">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
          Your data stays yours
        </h2>
        <p className="text-lg text-muted-foreground mb-12 text-balance">
          Updraft only reads what it needs to generate your recap.
          No tracking. No surprises.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-8">
          {trustPoints.map((point) => (
            <div
              key={point.text}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/80 flex items-center justify-center">
                <point.icon className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium">{point.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
