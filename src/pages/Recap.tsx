import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpdraftLogo, UpdraftIcon } from "@/components/UpdraftLogo";
import { StoryCard, CardVariant } from "@/components/RecapCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface RecapData {
  profile: {
    handle: string;
    displayName: string;
    avatar: string;
    followersCount: number;
    followsCount: number;
  };
  stats: {
    totalPosts: number;
    totalLikes: number;
    totalReposts: number;
    totalReplies: number;
    totalEngagement: number;
    avgEngagement: number;
    daysActive: number;
  };
  topPost: {
    text: string;
    likes: number;
    reposts: number;
    replies: number;
    uri: string;
  } | null;
  patterns: {
    mostActiveMonth: string;
    mostActiveDay: string;
    peakHour: number;
    longestStreak: number;
    topWords: string[];
  };
  year: number;
}

const cardVariants: CardVariant[] = ["intro", "stats", "topPost", "rhythm", "streak", "finale"];

export default function Recap() {
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleFetchRecap = async () => {
    if (!handle.trim()) {
      toast.error("Please enter a Bluesky handle");
      return;
    }

    setIsLoading(true);
    setCurrentIndex(0);
    try {
      const { data, error } = await supabase.functions.invoke("bluesky-fetch", {
        body: { handle: handle.trim().replace("@", "") },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setRecap(data);
      toast.success(`Your ${data.year} recap is ready!`);
    } catch (error: unknown) {
      console.error("Error fetching recap:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch your recap";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const shareText = `Check out my ${recap?.year} Bluesky recap with Updraft! 🌬️\n\n📊 ${recap?.stats.totalPosts} posts\n❤️ ${recap?.stats.totalLikes} likes received\n🔥 ${recap?.patterns.longestStreak} day streak\n\n#Updraft #Bluesky`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Updraft",
          text: shareText,
        });
        return;
      }
    } catch (err) {
      // If user cancelled, don't show error
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      // Fall through to clipboard
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
    } catch {
      // Manual fallback for environments without clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Copied to clipboard!");
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % cardVariants.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + cardVariants.length) % cardVariants.length);
  };

  const getCardData = (variant: CardVariant) => {
    if (!recap) return null;
    return {
      variant,
      handle: recap.profile.handle,
      displayName: recap.profile.displayName,
      avatar: recap.profile.avatar,
      year: recap.year,
      totalPosts: recap.stats.totalPosts,
      totalLikes: recap.stats.totalLikes,
      totalReposts: recap.stats.totalReposts,
      totalEngagement: recap.stats.totalEngagement,
      avgEngagement: recap.stats.avgEngagement,
      daysActive: recap.stats.daysActive,
      mostActiveMonth: recap.patterns.mostActiveMonth,
      mostActiveDay: recap.patterns.mostActiveDay,
      peakHour: recap.patterns.peakHour,
      longestStreak: recap.patterns.longestStreak,
      topPostText: recap.topPost?.text,
      topPostLikes: recap.topPost?.likes,
      topPostReposts: recap.topPost?.reposts,
    };
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (recap) {
    const cardData = getCardData(cardVariants[currentIndex]);

    return (
      <div className="min-h-screen flex flex-col gradient-hero">
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-6">
          <button
            onClick={() => setRecap(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Try another</span>
          </button>
          <div className="flex items-center gap-2">
            <UpdraftIcon className="w-6 h-6 text-primary" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          {/* Card carousel */}
          <div className="relative w-full max-w-md">
            {/* Navigation arrows */}
            <button
              onClick={prevCard}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-14 p-2 rounded-full bg-card/80 border border-border/50 hover:bg-card transition-colors z-20"
              aria-label="Previous card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextCard}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-14 p-2 rounded-full bg-card/80 border border-border/50 hover:bg-card transition-colors z-20"
              aria-label="Next card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Card */}
            <div className="transition-all duration-300 flex justify-center">
              {cardData && <StoryCard data={cardData} />}
            </div>

            {/* Dots indicator */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {cardVariants.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                  }`}
                  aria-label={`Go to card ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
            <Button variant="hero" size="lg" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share your Updraft
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-6 text-center">
            #Updraft · updraft.app
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-hero">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] gradient-glow animate-glow-pulse" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <UpdraftIcon className="w-8 h-8 text-primary" />
            <UpdraftLogo size="lg" />
          </div>
          <p className="text-muted-foreground">
            Enter a Bluesky handle to see their {new Date().getFullYear()} recap
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-soft">
          <div className="space-y-5">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="handle.bsky.social"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetchRecap()}
                className="h-12 text-center"
              />
            </div>

            <Button
              onClick={handleFetchRecap}
              variant="hero"
              size="lg"
              className="w-full"
              disabled={!handle.trim()}
            >
              Generate Recap
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          No tracking. No posting. Just your data.
        </p>
      </div>
    </div>
  );
}
