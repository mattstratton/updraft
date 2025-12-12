import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface RecapCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function RecapCard({ children, delay = 0, className }: RecapCardProps) {
  return (
    <div
      className={cn(
        "bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-soft",
        "opacity-0 animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
