import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpdraftLogo, UpdraftIcon } from "@/components/UpdraftLogo";
import { StoryCard, CardVariant } from "@/components/RecapCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { ArrowLeft, Share2, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

interface TopFan {
  handle: string;
  displayName: string;
  avatar: string;
  likes: number;
  reposts: number;
  score: number;
}

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
  };
  topFans: TopFan[];
  topics: {
    topWords: { word: string; count: number }[];
    topBigrams: { phrase: string; count: number }[];
  };
  posterType: {
    type: string;
    description: string;
  };
  postingAge: {
    era: string;
    year: string;
    description: string;
  };
  year: number;
  truncated?: boolean;
}

const cardVariants: CardVariant[] = ["intro", "stats", "topPost", "rhythm", "streak", "posterType", "postingAge", "topFans", "topics", "finale"];

export default function Recap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [handle, setHandle] = useState(searchParams.get("user") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-fetch if user param is present
  useEffect(() => {
    const userParam = searchParams.get("user");
    if (userParam && !recap && !isLoading) {
      // Normalize handle from URL parameter
      const normalizedHandle = userParam.trim().replace(/^@/, "").toLowerCase();
      setHandle(normalizedHandle);
      fetchRecap(normalizedHandle);
    }
  }, []);

  const fetchRecap = async (userHandle: string) => {
    // Normalize handle: remove @, trim, and convert to lowercase
    // Bluesky handles are case-insensitive but should be normalized to lowercase
    const cleanHandle = userHandle.trim().replace("@", "").toLowerCase();
    if (!cleanHandle) {
      toast.error("Please enter a Bluesky handle");
      return;
    }

    setIsLoading(true);
    setCurrentIndex(0);
    
    // Update URL with user param
    setSearchParams({ user: cleanHandle });
    
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Ensure the URL has a protocol (https:// or http://)
      // If it's just a domain name, add https://
      if (apiUrl && !apiUrl.match(/^https?:\/\//)) {
        apiUrl = `https://${apiUrl}`;
      }
      
      console.log('Calling API at:', `${apiUrl}/api/recap`);
      
      const response = await fetch(`${apiUrl}/api/recap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ handle: cleanHandle }),
      });

      // Check if response is actually JSON (not HTML error page)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 200));
        throw new Error(`API returned non-JSON response. Check that VITE_API_URL is set correctly. Current: ${apiUrl}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch recap: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Log debug info if available
      if (data._debug) {
        console.log("📊 Fetch Debug Info:", {
          totalPostsFetched: data._debug.totalPostsFetched,
          totalPostsAfterFilter: data._debug.totalPostsAfterFilter,
          iterations: data._debug.iterations,
          maxIterations: data._debug.maxIterations,
        });
      }

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

  const handleFetchRecap = () => fetchRecap(handle);

  const handleRegenerate = async () => {
    if (!recap) return;
    
    setIsLoading(true);
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Ensure the URL has a protocol (https:// or http://)
      if (apiUrl && !apiUrl.match(/^https?:\/\//)) {
        apiUrl = `https://${apiUrl}`;
      }

      const response = await fetch(`${apiUrl}/api/recap/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handle: recap.profile.handle }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to regenerate recap' }));
        throw new Error(errorData.error || 'Failed to regenerate recap');
      }

      const data = await response.json();
      setRecap(data);
      setCurrentIndex(0); // Reset to first card
      toast.success("Recap regenerated!");
    } catch (error: unknown) {
      console.error("Error regenerating recap:", error);
      const message = error instanceof Error ? error.message : "Failed to regenerate recap";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const appUrl = window.location.origin;
    const userHandle = recap?.profile.handle?.replace(/^@/, "") || "";
    // Format numbers with commas for share text
    const formatNum = (num: number) => num.toLocaleString('en-US');
    const shareText = `Check out my ${recap?.year} Bluesky recap! 🌬️\n\n📊 ${formatNum(recap?.stats.totalPosts || 0)} posts\n❤️ ${formatNum(recap?.stats.totalLikes || 0)} likes received\n🔥 ${recap?.patterns.longestStreak} day streak\n\nSee mine and get your own at ${appUrl}/recap?user=${userHandle}\n\n#Updraft${recap?.year || '2025'}`;
    
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
      topFans: recap.topFans,
      topWords: recap.topics?.topWords,
      topBigrams: recap.topics?.topBigrams,
      posterType: recap.posterType?.type,
      posterTypeDescription: recap.posterType?.description,
      postingAge: recap.postingAge?.era,
      postingAgeYear: recap.postingAge?.year,
      postingAgeDescription: recap.postingAge?.description,
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
            onClick={() => {
              setRecap(null);
              setSearchParams({});
            }}
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
          {/* Truncation warning */}
          {recap.truncated && (
            <div className="w-full max-w-md mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">Wow, you're a posting machine! 🌬️</span> With over 10,000 posts this year, we've captured a sample of your incredible activity. The stats shown reflect this subset.
                </p>
              </div>
            </div>
          )}
          
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
          <div className="flex flex-col items-center gap-3 mt-8 w-full max-w-md">
            <Button variant="hero" size="lg" onClick={handleShare} className="w-full sm:w-auto">
              <Share2 className="w-4 h-4 mr-2" />
              Share your Updraft
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleRegenerate}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => {
                  setRecap(null);
                  setSearchParams({});
                }}
                className="w-full sm:w-auto"
              >
                Try another handle
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-6 text-center">
            #Updraft · updraft-app.com
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
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
      <Footer />
    </div>
  );
}
