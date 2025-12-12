import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RecapCard, RecapData } from "@/components/RecapCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { UpdraftIcon } from "@/components/UpdraftLogo";
import { Share2, ChevronLeft, ChevronRight, LogOut, Download } from "lucide-react";
import { toast } from "sonner";

// Demo data - in production this would come from Bluesky API
const generateDemoRecap = (): RecapData[] => {
  const year = new Date().getFullYear();
  const handle = "you";
  
  return [
    {
      variant: "lift",
      handle,
      year,
      reach: 12483,
      peakMonth: "October",
    },
    {
      variant: "rhythm",
      handle,
      year,
      postCount: 214,
      mostActiveDay: "Wednesday",
      streakDays: 23,
    },
    {
      variant: "signal",
      handle,
      year,
      topPostEngagement: 847,
      topTheme: "Tech & Design",
    },
  ];
};

export default function Recap() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(true);
  const [recaps, setRecaps] = useState<RecapData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Simulate loading time
      const timer = setTimeout(() => {
        setRecaps(generateDemoRecap());
        setIsGenerating(false);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleShare = async () => {
    const shareText = `I just saw my Bluesky year with Updraft 🌬️\n\nupdraft.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Updraft",
          text: shareText,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % recaps.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + recaps.length) % recaps.length);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (isGenerating) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      {/* Header */}
      <header className="flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <UpdraftIcon className="w-6 h-6 text-primary" />
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Card carousel */}
        <div className="relative w-full max-w-md">
          {/* Navigation arrows */}
          {recaps.length > 1 && (
            <>
              <button
                onClick={prevCard}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 sm:-translate-x-16 p-2 rounded-full bg-card/80 border border-border/50 hover:bg-card transition-colors z-20"
                aria-label="Previous card"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextCard}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 sm:translate-x-16 p-2 rounded-full bg-card/80 border border-border/50 hover:bg-card transition-colors z-20"
                aria-label="Next card"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Card */}
          <div className="transition-all duration-300">
            <RecapCard data={recaps[currentIndex]} />
          </div>

          {/* Dots indicator */}
          {recaps.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {recaps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to card ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
          <Button variant="hero" size="lg" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share your Updraft
          </Button>
          <Button variant="hero-secondary" size="lg">
            <Download className="w-4 h-4 mr-2" />
            Save image
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60 mt-6 text-center">
          #Updraft · updraft.app
        </p>
      </main>
    </div>
  );
}
