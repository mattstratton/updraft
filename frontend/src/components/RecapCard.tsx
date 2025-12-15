import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";
import { UpdraftLogo } from "@/components/UpdraftLogo";

// Simple wrapper card for general use
interface SimpleCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export const RecapCard = forwardRef<HTMLDivElement, SimpleCardProps>(
  ({ children, delay = 0, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-soft",
          "opacity-0 animate-fade-in",
          className
        )}
        style={{ animationDelay: `${delay}s`, animationFillMode: "forwards" }}
      >
        {children}
      </div>
    );
  }
);
RecapCard.displayName = "RecapCard";

// Shareable story-style card variants
export type CardVariant = "intro" | "stats" | "topPost" | "rhythm" | "streak" | "posterType" | "postingAge" | "topFans" | "topics" | "summary" | "finale";

interface TopFan {
  handle: string;
  displayName: string;
  avatar: string;
  likes: number;
  reposts: number;
  score: number;
}

interface StoryCardData {
  variant: CardVariant;
  handle: string;
  displayName: string;
  avatar?: string;
  year: number;
  // Stats
  totalPosts?: number;
  totalLikes?: number;
  totalReposts?: number;
  totalEngagement?: number;
  avgEngagement?: number;
  // Patterns
  mostActiveMonth?: string;
  mostActiveDay?: string;
  peakHour?: number;
  longestStreak?: number;
  daysActive?: number;
  // Top post
  topPostText?: string;
  topPostLikes?: number;
  topPostReposts?: number;
  // Top fans
  topFans?: TopFan[];
  // Topics
  topWords?: { word: string; count: number }[];
  topBigrams?: { phrase: string; count: number }[];
  // Poster type
  posterType?: string;
  posterTypeDescription?: string;
  // Posting age
  postingAge?: string;
  postingAgeYear?: string;
  postingAgeDescription?: string;
}

interface StoryCardProps {
  data: StoryCardData;
  className?: string;
}

function formatNumber(num: number): string {
  // Format numbers with commas (e.g., 1,234,567)
  return num.toLocaleString('en-US');
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h} ${ampm}`;
}

const cardContent: Record<CardVariant, { title: string; tagline: string }> = {
  intro: {
    title: "Your year on Bluesky",
    tagline: "Let's see what you've been up to.",
  },
  stats: {
    title: "You showed up",
    tagline: "Every post, a small signal in the sky.",
  },
  topPost: {
    title: "This one hit different",
    tagline: "Your most engaging post of the year.",
  },
  rhythm: {
    title: "Your rhythm",
    tagline: "When inspiration struck.",
  },
  streak: {
    title: "Consistency is everything",
    tagline: "You kept showing up.",
  },
  posterType: {
    title: "You're a",
    tagline: "Your posting style, revealed.",
  },
  postingAge: {
    title: "Your posting age",
    tagline: "When did you learn to post?",
  },
  topFans: {
    title: "Your biggest fans",
    tagline: "The ones who showed up for you.",
  },
  topics: {
    title: "What you talked about",
    tagline: "The words that defined your year.",
  },
  summary: {
    title: "Your year in numbers",
    tagline: "The highlights that made it yours.",
  },
  finale: {
    title: "That was your year",
    tagline: "Some posts catch an updraft. Some become it.",
  },
};

export const StoryCard = forwardRef<HTMLDivElement, StoryCardProps>(
  ({ data, className }, ref) => {
    const { variant, handle, displayName, avatar, year } = data;
    const content = cardContent[variant];

  const renderContent = () => {
    switch (variant) {
      case "intro":
        return (
          <div className="flex flex-col items-center gap-6">
            {avatar && (
              <img
                src={avatar}
                alt={displayName}
                className="w-24 h-24 rounded-full border-4 border-primary/30 shadow-lg"
              />
            )}
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold">{displayName}</h2>
              <p className="text-muted-foreground">@{handle}</p>
            </div>
            <span className="text-7xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {year}
            </span>
          </div>
        );

      case "stats":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <span className="text-7xl font-bold text-foreground">
                {formatNumber(data.totalPosts || 0)}
              </span>
              <p className="text-xl text-muted-foreground mt-2">posts shared</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-3xl font-bold text-foreground">
                  {formatNumber(data.totalLikes || 0)}
                </span>
                <p className="text-sm text-muted-foreground">likes received</p>
              </div>
              <div>
                <span className="text-3xl font-bold text-foreground">
                  {formatNumber(data.totalReposts || 0)}
                </span>
                <p className="text-sm text-muted-foreground">reposts</p>
              </div>
            </div>
          </div>
        );

      case "topPost":
        return (
          <div className="space-y-6">
            <p className="text-lg text-foreground/90 italic leading-relaxed">
              "{data.topPostText?.slice(0, 180)}
              {(data.topPostText?.length || 0) > 180 ? "..." : ""}"
            </p>
            <div className="flex justify-center gap-6 text-lg">
              <span className="flex items-center gap-1">
                <span className="text-red-400">❤️</span> {formatNumber(data.topPostLikes || 0)}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green-400">🔁</span> {formatNumber(data.topPostReposts || 0)}
              </span>
            </div>
          </div>
        );

      case "rhythm":
        return (
          <div className="space-y-6 text-center">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Peak month</p>
              <span className="text-4xl font-bold text-foreground">
                {data.mostActiveMonth}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Favorite day</p>
                <span className="text-2xl font-semibold text-foreground">
                  {data.mostActiveDay}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Peak hour</p>
                <span className="text-2xl font-semibold text-foreground">
                  {formatHour(data.peakHour || 12)}
                </span>
              </div>
            </div>
          </div>
        );

      case "streak":
        return (
          <div className="space-y-6 text-center">
            <div>
              <span className="text-7xl font-bold text-foreground">
                {formatNumber(data.longestStreak || 0)}
              </span>
              <p className="text-xl text-muted-foreground mt-2">day streak</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-foreground">
                {formatNumber(data.daysActive || 0)}
              </span>
              <p className="text-sm text-muted-foreground">days active this year</p>
            </div>
          </div>
        );

      case "posterType":
        return (
          <div className="space-y-6 text-center">
            <div>
              <span className="text-5xl font-bold text-primary">
                {data.posterType || "Balanced"}
              </span>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
              {data.posterTypeDescription || "Your posting style is balanced across all metrics."}
            </p>
          </div>
        );

      case "postingAge":
        return (
          <div className="space-y-6 text-center">
            <div>
              <span className="text-6xl font-bold text-foreground">
                {data.postingAgeYear || "2024"}
              </span>
              <p className="text-2xl text-primary mt-2 font-semibold">
                {data.postingAge || "2024s Bluesky"}
              </p>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
              {data.postingAgeDescription || "Your posting style matches modern Bluesky."}
            </p>
          </div>
        );

      case "topFans":
        return (
          <div className="space-y-4 w-full px-2">
            {data.topFans && data.topFans.length > 0 ? (
              data.topFans.slice(0, 5).map((fan, index) => (
                <div key={fan.handle} className="flex items-center gap-3 min-w-0 w-full">
                  <span className="text-2xl font-bold text-primary/60 flex-shrink-0 w-6">
                    {index + 1}
                  </span>
                  {fan.avatar ? (
                    <img
                      src={fan.avatar}
                      alt={fan.displayName}
                      className="w-10 h-10 rounded-full border border-border/50 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-muted-foreground text-sm">
                        {fan.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left overflow-visible max-w-full">
                    <p 
                      className="font-medium text-sm truncate block overflow-hidden text-ellipsis whitespace-nowrap max-w-full" 
                      title={fan.displayName}
                      style={{ maxWidth: '100%', lineHeight: '1.5', paddingBottom: '4px', paddingTop: '2px' }}
                    >
                      {fan.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate block overflow-hidden text-ellipsis whitespace-nowrap max-w-full" style={{ lineHeight: '1.5', paddingTop: '4px', paddingBottom: '2px' }}>
                      {formatNumber(fan.likes)} ❤️ {formatNumber(fan.reposts)} 🔁
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">
                No top fans data yet
              </p>
            )}
          </div>
        );

      case "topics":
        return (
          <div className="space-y-6 w-full">
            {data.topWords && data.topWords.length > 0 ? (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  {data.topWords.slice(0, 8).map((item, index) => (
                    <span
                      key={item.word}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium",
                        index === 0 && "bg-primary text-primary-foreground text-base px-4 py-2",
                        index === 1 && "bg-accent text-accent-foreground",
                        index > 1 && "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.word}
                    </span>
                  ))}
                </div>
                {data.topBigrams && data.topBigrams.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">Common phrases</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {data.topBigrams.slice(0, 3).map((item) => (
                        <span
                          key={item.phrase}
                          className="px-2 py-1 rounded bg-card border border-border/50 text-xs"
                        >
                          "{item.phrase}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center">
                Not enough data for topics
              </p>
            )}
          </div>
        );

      case "summary":
        return (
          <div className="space-y-6 w-full">
            {/* Stats highlights */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-4xl font-bold text-foreground block">
                  {formatNumber(data.totalPosts || 0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">posts</p>
              </div>
              <div>
                <span className="text-4xl font-bold text-foreground block">
                  {formatNumber(data.totalLikes || 0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">likes</p>
              </div>
              <div>
                <span className="text-4xl font-bold text-foreground block">
                  {formatNumber(data.totalReposts || 0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">reposts</p>
              </div>
              <div>
                <span className="text-4xl font-bold text-foreground block">
                  {data.longestStreak || 0}
                </span>
                <p className="text-xs text-muted-foreground mt-1">day streak</p>
              </div>
            </div>

            {/* Top highlights */}
            <div className="space-y-3 pt-2 border-t border-border/30 pb-1">
              {data.topPostLikes && data.topPostLikes > 0 && (
                <div className="flex items-center justify-between text-sm min-w-0" style={{ lineHeight: '1.5', overflowY: 'visible' }}>
                  <span className="text-muted-foreground flex-shrink-0">Top post</span>
                  <span className="font-medium flex-shrink-0">{formatNumber(data.topPostLikes)} ❤️</span>
                </div>
              )}
              {data.posterType && (
                <div className="flex items-center justify-between text-sm min-w-0" style={{ lineHeight: '1.5', overflowY: 'visible' }}>
                  <span className="text-muted-foreground flex-shrink-0">You're a</span>
                  <span className="font-medium text-primary truncate max-w-[60%] min-w-0 text-right" title={data.posterType} style={{ overflowX: 'hidden', overflowY: 'visible' }}>
                    {data.posterType}
                  </span>
                </div>
              )}
              {data.postingAge && (
                <div className="flex items-center justify-between text-sm min-w-0" style={{ lineHeight: '1.5', overflowY: 'visible' }}>
                  <span className="text-muted-foreground flex-shrink-0">Posting age</span>
                  <span className="font-medium flex-shrink-0">{data.postingAgeYear || data.postingAge}</span>
                </div>
              )}
              {data.topFans && data.topFans.length > 0 && (
                <div className="flex items-center justify-between text-sm min-w-0" style={{ lineHeight: '1.5', overflowY: 'visible' }}>
                  <span className="text-muted-foreground flex-shrink-0">Biggest fan</span>
                  <span className="font-medium truncate max-w-[60%] min-w-0 text-right" title={data.topFans[0].displayName} style={{ overflowX: 'hidden', overflowY: 'visible' }}>
                    {data.topFans[0].displayName}
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      case "finale":
        return (
          <div className="space-y-8 text-center">
            <span className="text-6xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {formatNumber(data.totalEngagement || 0)}
            </span>
            <p className="text-xl text-muted-foreground">total interactions</p>
            <p className="text-base text-muted-foreground/80">
              Avg. {formatNumber(data.avgEngagement || 0)} per post
            </p>
          </div>
        );
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full max-w-md aspect-[9/16] rounded-3xl overflow-hidden",
        "bg-gradient-to-br from-card via-background to-sky-light/20",
        "border border-border/50 shadow-soft",
        className
      )}
    >
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] gradient-glow opacity-40" />

      <div className="relative z-10 h-full flex flex-col items-center justify-between p-8 text-center">
        {/* Top - Title */}
        <div className="pt-6">
          <h2 className="text-lg font-medium text-muted-foreground">
            {content.title}
          </h2>
          <p className="text-sm text-muted-foreground/60 mt-1">{year}</p>
        </div>

        {/* Center - Content */}
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4">
          {renderContent()}
        </div>

        {/* Bottom - Tagline & Branding */}
        <div className="pb-4">
          <p className="text-sm text-muted-foreground italic mb-4">
            {content.tagline}
          </p>
          <div className="flex flex-col items-center gap-1">
            <UpdraftLogo size="sm" className="opacity-70" />
            <p className="text-xs text-muted-foreground/50">
              updraft-app.com · @{handle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

StoryCard.displayName = "StoryCard";
