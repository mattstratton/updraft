import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";
import { UpdraftLogo } from "@/components/UpdraftLogo";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

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
export type CardVariant = "intro" | "firstPost" | "stats" | "mostLiked" | "mostReposted" | "mostReplied" | "topPost" | "rhythm" | "streak" | "posterType" | "postingAge" | "topFans" | "topics" | "emojis" | "media" | "links" | "visualizations" | "engagementTimeline" | "milestones" | "summary" | "finale" | "credits";

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
  // First post
  firstPostText?: string;
  firstPostLikes?: number;
  firstPostReposts?: number;
  firstPostReplies?: number;
  firstPostCreatedAt?: string;
  // Separate engagement posts
  mostLikedText?: string;
  mostLikedLikes?: number;
  mostRepostedText?: string;
  mostRepostedReposts?: number;
  mostRepliedText?: string;
  mostRepliedReplies?: number;
  // Emojis
  topEmojis?: { emoji: string; count: number }[];
  totalEmojis?: number;
  // Media
  mediaType?: string;
  mediaDescription?: string;
  mediaPosts?: number;
  mediaRatio?: number;
  // Links
  linkType?: string;
  linkDescription?: string;
  topDomains?: { domain: string; count: number }[];
  totalLinks?: number;
  // Visualizations
  monthlyPosts?: { month: string; count: number }[];
  monthlyEngagement?: { month: string; engagement: number }[];
  dailyActivity?: { day: string; count: number }[];
  // Engagement timeline
  bestMonth?: string;
  bestDay?: string;
  bestHour?: number;
  bestMonthAvg?: number;
  bestDayAvg?: number;
  bestHourAvg?: number;
  // Milestones
  milestones?: {
    postNumber: number;
    text: string;
    likes: number;
    reposts: number;
    replies: number;
    createdAt: string;
  }[];
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

// Simple bar chart component for visualizations
function SimpleBarChart({ 
  data, 
  dataKey, 
  nameKey, 
  color 
}: { 
  data: { [key: string]: string | number }[]; 
  dataKey: string; 
  nameKey: string; 
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <XAxis 
          dataKey={nameKey} 
          tick={{ fontSize: 10, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tick={{ fontSize: 10, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px'
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Bar 
          dataKey={dataKey} 
          fill={color}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

const cardContent: Record<CardVariant, { title: string; tagline: string }> = {
  intro: {
    title: "Your year on Bluesky",
    tagline: "Let's see what you've been up to.",
  },
  firstPost: {
    title: "It all began with",
    tagline: "Your first post of the year.",
  },
  stats: {
    title: "You showed up",
    tagline: "Every post, a small signal in the sky.",
  },
  mostLiked: {
    title: "This one got the hearts",
    tagline: "Your most liked post of the year.",
  },
  mostReposted: {
    title: "This one got shared",
    tagline: "Your most reposted post of the year.",
  },
  mostReplied: {
    title: "This one started a conversation",
    tagline: "Your most replied-to post of the year.",
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
  emojis: {
    title: "Your emoji personality",
    tagline: "You really love these.",
  },
  media: {
    title: "You're a",
    tagline: "Your content style, revealed.",
  },
  links: {
    title: "You're a",
    tagline: "Your link sharing style, revealed.",
  },
  visualizations: {
    title: "Your year visualized",
    tagline: "See your activity patterns.",
  },
  engagementTimeline: {
    title: "Your golden hour",
    tagline: "When you shine brightest.",
  },
  milestones: {
    title: "Milestone moments",
    tagline: "You hit these numbers.",
  },
  summary: {
    title: "Your year in numbers",
    tagline: "The highlights that made it yours.",
  },
  finale: {
    title: "That was your year",
    tagline: "Some posts catch an updraft. Some become it.",
  },
  credits: {
    title: "Want more?",
    tagline: "Check out another take on your Bluesky year.",
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

      case "firstPost":
        return (
          <div className="space-y-6 w-full">
            {data.firstPostText ? (
              <>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.firstPostText}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-foreground block">
                      {formatNumber(data.firstPostLikes || 0)}
                    </span>
                    <span className="text-muted-foreground">likes</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-foreground block">
                      {formatNumber(data.firstPostReposts || 0)}
                    </span>
                    <span className="text-muted-foreground">reposts</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-foreground block">
                      {formatNumber(data.firstPostReplies || 0)}
                    </span>
                    <span className="text-muted-foreground">replies</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center">No posts found for this year</p>
            )}
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

      case "mostLiked":
        return (
          <div className="space-y-6 w-full">
            {data.mostLikedText ? (
              <>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.mostLikedText}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary block">
                    {formatNumber(data.mostLikedLikes || 0)}
                  </span>
                  <span className="text-muted-foreground">❤️ likes</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center">No posts found</p>
            )}
          </div>
        );

      case "mostReposted":
        return (
          <div className="space-y-6 w-full">
            {data.mostRepostedText ? (
              <>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.mostRepostedText}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary block">
                    {formatNumber(data.mostRepostedReposts || 0)}
                  </span>
                  <span className="text-muted-foreground">🔄 reposts</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center">No posts found</p>
            )}
          </div>
        );

      case "mostReplied":
        return (
          <div className="space-y-6 w-full">
            {data.mostRepliedText ? (
              <>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.mostRepliedText}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary block">
                    {formatNumber(data.mostRepliedReplies || 0)}
                  </span>
                  <span className="text-muted-foreground">💬 replies</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center">No posts found</p>
            )}
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

      case "emojis":
        return (
          <div className="space-y-6 w-full">
            {data.topEmojis && data.topEmojis.length > 0 ? (
              <>
                <div className="flex flex-wrap justify-center gap-4">
                  {data.topEmojis.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <span className="text-5xl">{item.emoji}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(item.count)}</span>
                    </div>
                  ))}
                </div>
                {data.totalEmojis && data.totalEmojis > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {formatNumber(data.totalEmojis)} emojis total
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center">No emojis found</p>
            )}
          </div>
        );

      case "media":
        return (
          <div className="space-y-6 text-center">
            <div>
              <span className="text-5xl font-bold text-primary">
                {data.mediaType || "Text-only"}
              </span>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
              {data.mediaDescription || "Words are your medium."}
            </p>
            {data.mediaPosts !== undefined && (
              <div className="pt-4 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  {formatNumber(data.mediaPosts)} posts with media
                  {data.mediaRatio !== undefined && (
                    <span className="block mt-1">
                      ({Math.round(data.mediaRatio * 100)}% of your posts)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        );

      case "links":
        const hasLinks = data.topDomains && data.topDomains.length > 0;
        return (
          <div className="space-y-6 w-full">
            {hasLinks ? (
              <>
                <div className="text-center">
                  <span className="text-5xl font-bold text-primary">
                    {data.linkType || "Link Sharer"}
                  </span>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto text-center">
                  {data.linkDescription || "You share links that matter."}
                </p>
                <div className="pt-4 border-t border-border/30">
                  <p className="text-sm text-muted-foreground mb-3 text-center">Your most shared domains</p>
                  <div className="space-y-2">
                    {data.topDomains.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-4 p-2 bg-muted/30 rounded">
                        <span className="text-sm font-medium text-foreground truncate flex-1">
                          {item.domain}
                        </span>
                        <span className="text-sm text-muted-foreground flex-shrink-0">
                          {formatNumber(item.count)} {item.count === 1 ? 'link' : 'links'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {data.totalLinks !== undefined && (
                  <p className="text-xs text-muted-foreground text-center">
                    {formatNumber(data.totalLinks)} links total
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-center">
                  <span className="text-5xl font-bold text-primary">
                    Text-only
                  </span>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto text-center">
                  You keep it simple. No links, no distractions. Pure thoughts.
                </p>
                <p className="text-sm text-muted-foreground text-center pt-4">
                  No external links shared this year
                </p>
              </>
            )}
          </div>
        );

      case "visualizations":
        return (
          <div className="space-y-6 w-full">
            {data.monthlyPosts && data.monthlyPosts.length > 0 ? (
              <>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3 text-center">Posts per month</p>
                    <div className="h-40 w-full">
                      <SimpleBarChart
                        data={data.monthlyPosts}
                        dataKey="count"
                        nameKey="month"
                        color="#4a90e2"
                      />
                    </div>
                  </div>
                  {data.monthlyEngagement && data.monthlyEngagement.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3 text-center">Engagement per month</p>
                      <div className="h-40 w-full">
                        <SimpleBarChart
                          data={data.monthlyEngagement}
                          dataKey="engagement"
                          nameKey="month"
                          color="#10b981"
                        />
                      </div>
                    </div>
                  )}
                  {data.dailyActivity && data.dailyActivity.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3 text-center">Activity by day of week</p>
                      <div className="h-40 w-full">
                        <SimpleBarChart
                          data={data.dailyActivity}
                          dataKey="count"
                          nameKey="day"
                          color="#8b5cf6"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center">Not enough data for visualizations</p>
            )}
          </div>
        );

      case "engagementTimeline":
        return (
          <div className="space-y-6 text-center">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Best performing month</p>
              <span className="text-4xl font-bold text-foreground">
                {data.bestMonth || "Unknown"}
              </span>
              {data.bestMonthAvg !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  Avg. {formatNumber(data.bestMonthAvg)} engagement per post
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Best day</p>
                <span className="text-2xl font-semibold text-foreground">
                  {data.bestDay || "Unknown"}
                </span>
                {data.bestDayAvg !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg. {formatNumber(data.bestDayAvg)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Peak hour</p>
                <span className="text-2xl font-semibold text-foreground">
                  {data.bestHour !== undefined ? formatHour(data.bestHour) : "Unknown"}
                </span>
                {data.bestHourAvg !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg. {formatNumber(data.bestHourAvg)}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case "milestones":
        return (
          <div className="space-y-4 w-full">
            {data.milestones && data.milestones.length > 0 ? (
              <div className="space-y-4">
                {data.milestones.slice(0, 3).map((milestone, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className="text-2xl font-bold text-primary">
                        #{formatNumber(milestone.postNumber)}
                      </span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          ❤️ {formatNumber(milestone.likes)}
                        </span>
                        <span className="text-muted-foreground">
                          🔄 {formatNumber(milestone.reposts)}
                        </span>
                        <span className="text-muted-foreground">
                          💬 {formatNumber(milestone.replies)}
                        </span>
                      </div>
                    </div>
                    {milestone.text && (
                      <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                        {milestone.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No milestones found</p>
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

      case "credits":
        return (
          <div className="space-y-6 text-center">
            <p className="text-lg text-muted-foreground">
              Liked this recap?
            </p>
            <p className="text-base text-foreground">
              Check out another take on your Bluesky year
            </p>
            <a
              href={`https://www.madebyolof.com/bluesky-wrapped/${data.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Try Bluesky Wrapped by Olof
            </a>
            <p className="text-xs text-muted-foreground/60 mt-4">
              Made by{" "}
              <a
                href="https://bsky.app/profile/matty.wtf"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                @matty.wtf
              </a>
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
