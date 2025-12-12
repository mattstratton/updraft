import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpdraftLogo, UpdraftIcon } from "@/components/UpdraftLogo";
import { RecapCard } from "@/components/RecapCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Share2 } from "lucide-react";
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
  };
  topPost: {
    text: string;
    likes: number;
    reposts: number;
    replies: number;
  } | null;
  patterns: {
    mostActiveMonth: string;
    mostActiveDay: string;
  };
  year: number;
}

export default function Recap() {
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);

  const handleFetchRecap = async () => {
    if (!handle.trim()) {
      toast.error("Please enter a Bluesky handle");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bluesky-fetch", {
        body: { handle: handle.trim().replace("@", "") },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setRecap(data);
      toast.success("Your 2024 recap is ready!");
    } catch (error: unknown) {
      console.error("Error fetching recap:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch your recap";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const shareText = `Check out my ${recap?.year} Bluesky recap with Updraft! 🌬️\n\n📊 ${recap?.stats.totalPosts} posts\n❤️ ${recap?.stats.totalLikes} likes received\n\n#Updraft`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Updraft",
          text: shareText,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (recap) {
    return (
      <div className="min-h-screen gradient-hero py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setRecap(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Try another handle
          </button>

          <div className="space-y-6">
            {/* Profile Header */}
            <RecapCard delay={0}>
              <div className="flex items-center gap-4">
                {recap.profile.avatar && (
                  <img
                    src={recap.profile.avatar}
                    alt={recap.profile.displayName}
                    className="w-16 h-16 rounded-full border-2 border-primary/20"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-display font-bold">
                    {recap.profile.displayName}
                  </h2>
                  <p className="text-muted-foreground">@{recap.profile.handle}</p>
                </div>
              </div>
            </RecapCard>

            {/* Year Title */}
            <RecapCard delay={0.1}>
              <div className="text-center py-4">
                <span className="text-6xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {recap.year}
                </span>
                <p className="text-muted-foreground mt-2">Your Year in Review</p>
              </div>
            </RecapCard>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <RecapCard delay={0.2}>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary">
                    {recap.stats.totalPosts.toLocaleString()}
                  </span>
                  <p className="text-muted-foreground text-sm mt-1">Posts</p>
                </div>
              </RecapCard>
              <RecapCard delay={0.3}>
                <div className="text-center">
                  <span className="text-4xl font-bold text-accent">
                    {recap.stats.totalLikes.toLocaleString()}
                  </span>
                  <p className="text-muted-foreground text-sm mt-1">Likes Received</p>
                </div>
              </RecapCard>
              <RecapCard delay={0.4}>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary">
                    {recap.stats.totalReposts.toLocaleString()}
                  </span>
                  <p className="text-muted-foreground text-sm mt-1">Reposts</p>
                </div>
              </RecapCard>
              <RecapCard delay={0.5}>
                <div className="text-center">
                  <span className="text-4xl font-bold text-accent">
                    {recap.stats.totalEngagement.toLocaleString()}
                  </span>
                  <p className="text-muted-foreground text-sm mt-1">Total Engagement</p>
                </div>
              </RecapCard>
            </div>

            {/* Patterns */}
            <RecapCard delay={0.6}>
              <h3 className="font-display font-semibold mb-4">Your Posting Patterns</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Most Active Month</p>
                  <p className="text-xl font-semibold text-primary">
                    {recap.patterns.mostActiveMonth}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Favorite Day</p>
                  <p className="text-xl font-semibold text-accent">
                    {recap.patterns.mostActiveDay}
                  </p>
                </div>
              </div>
            </RecapCard>

            {/* Top Post */}
            {recap.topPost && (
              <RecapCard delay={0.7}>
                <h3 className="font-display font-semibold mb-4">Your Top Post</h3>
                <p className="text-foreground/90 italic mb-4">
                  "{recap.topPost.text.slice(0, 200)}
                  {recap.topPost.text.length > 200 ? "..." : ""}"
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>❤️ {recap.topPost.likes}</span>
                  <span>🔁 {recap.topPost.reposts}</span>
                  <span>💬 {recap.topPost.replies}</span>
                </div>
              </RecapCard>
            )}

            {/* Share Button */}
            <div className="flex justify-center pt-4">
              <Button variant="hero" size="lg" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share your Updraft
              </Button>
            </div>
          </div>
        </div>
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
            Enter a Bluesky handle to see their 2024 recap
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
