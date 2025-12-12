import { cn } from "@/lib/utils";
import { UpdraftLogo } from "@/components/UpdraftLogo";

export interface RecapData {
  variant: "lift" | "rhythm" | "signal";
  handle: string;
  year: number;
  // Lift variant
  reach?: number;
  peakMonth?: string;
  // Rhythm variant
  postCount?: number;
  mostActiveDay?: string;
  streakDays?: number;
  // Signal variant
  topPostEngagement?: number;
  topTheme?: string;
}

interface RecapCardProps {
  data: RecapData;
  className?: string;
}

const titles = {
  lift: "Your year, according to Updraft",
  rhythm: "This was your year on Bluesky",
  signal: "Your corner of the sky",
};

const taglines = {
  lift: "Some posts catch an updraft. Some become it.",
  rhythm: "Not constant. Just consistent.",
  signal: "The signal wasn't louder. It was yours.",
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export function RecapCard({ data, className }: RecapCardProps) {
  const { variant, handle, year } = data;

  const renderBigStat = () => {
    switch (variant) {
      case "lift":
        return (
          <>
            <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-foreground">
              {formatNumber(data.reach || 0)}
            </span>
            <span className="text-xl sm:text-2xl text-muted-foreground mt-2">
              views reached
            </span>
          </>
        );
      case "rhythm":
        return (
          <>
            <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-foreground">
              {data.postCount || 0}
            </span>
            <span className="text-xl sm:text-2xl text-muted-foreground mt-2">
              posts shared
            </span>
          </>
        );
      case "signal":
        return (
          <>
            <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-foreground">
              {formatNumber(data.topPostEngagement || 0)}
            </span>
            <span className="text-xl sm:text-2xl text-muted-foreground mt-2">
              interactions on your top post
            </span>
          </>
        );
    }
  };

  const renderSmallLine = () => {
    switch (variant) {
      case "lift":
        return `Peak altitude: ${data.peakMonth || "—"}`;
      case "rhythm":
        return `Most active: ${data.mostActiveDay || "—"} · Streak: ${data.streakDays || 0} days`;
      case "signal":
        return `Most shared theme: ${data.topTheme || "—"}`;
    }
  };

  return (
    <div
      className={cn(
        "relative w-full max-w-md aspect-[9/16] rounded-3xl overflow-hidden",
        "bg-gradient-to-br from-card via-background to-sky-light/30",
        "border border-border/50 shadow-soft",
        className
      )}
    >
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] gradient-glow opacity-50" />

      <div className="relative z-10 h-full flex flex-col items-center justify-between p-8 text-center">
        {/* Top - Title */}
        <div className="pt-8">
          <h2 className="text-lg sm:text-xl font-medium text-muted-foreground">
            {titles[variant]}
          </h2>
          <p className="text-sm text-muted-foreground/60 mt-1">{year}</p>
        </div>

        {/* Center - Big Stat */}
        <div className="flex flex-col items-center">
          {renderBigStat()}
          <p className="text-sm text-muted-foreground/80 mt-4">
            {renderSmallLine()}
          </p>
        </div>

        {/* Bottom - Tagline & Branding */}
        <div className="pb-6">
          <p className="text-sm text-muted-foreground italic mb-6">
            {taglines[variant]}
          </p>
          <div className="flex flex-col items-center gap-1">
            <UpdraftLogo size="sm" className="opacity-70" />
            <p className="text-xs text-muted-foreground/50">
              updraft.app · @{handle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
