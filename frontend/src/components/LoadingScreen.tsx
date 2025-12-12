import { useState, useEffect } from "react";
import { UpdraftIcon } from "@/components/UpdraftLogo";

const loadingMessages = [
  "Gathering your posts...",
  "Counting the likes...",
  "Finding your high points...",
  "Analyzing patterns...",
  "Calculating your reach...",
  "Almost there...",
];

export function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 gradient-hero"
      role="status"
      aria-live="polite"
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] gradient-glow animate-glow-pulse" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/20 animate-ping" />
          <UpdraftIcon className="w-20 h-20 text-primary animate-float" />
        </div>

        {/* Loading message */}
        <p className="text-xl text-foreground font-medium mb-6 h-8 transition-opacity duration-300">
          {loadingMessages[messageIndex]}
        </p>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Accessibility text */}
        <span className="sr-only">
          Generating your Updraft... this can take a moment.
        </span>
      </div>
    </div>
  );
}
