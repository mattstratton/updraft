import { cn } from "@/lib/utils";

interface UpdraftLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

export function UpdraftLogo({ className, size = "md" }: UpdraftLogoProps) {
  return (
    <span
      className={cn(
        "wordmark font-semibold tracking-wide text-foreground select-none",
        sizeClasses[size],
        className
      )}
    >
      updraf
      <span className="relative">
        t
        {/* Subtle upward tilt on the crossbar implied by positioning */}
        <span className="absolute -top-[0.15em] left-[0.1em] w-[0.5em] h-[0.08em] bg-primary/30 rounded-full transform rotate-6 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </span>
  );
}

export function UpdraftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("w-8 h-8", className)}
      aria-label="Updraft icon"
    >
      {/* Three rising lines - weather map inspired */}
      <path
        d="M8 24 L8 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="opacity-60"
      />
      <path
        d="M16 26 L16 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 24 L24 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="opacity-60"
      />
      {/* Subtle curved accent at top */}
      <path
        d="M12 6 Q16 4 20 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        className="opacity-40"
      />
    </svg>
  );
}
