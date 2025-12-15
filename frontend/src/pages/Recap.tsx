import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpdraftLogo, UpdraftIcon } from "@/components/UpdraftLogo";
import { StoryCard, CardVariant } from "@/components/RecapCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { ArrowLeft, Share2, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Image as ImageIcon, Download } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";

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
  firstPost?: {
    text: string;
    likes: number;
    reposts: number;
    replies: number;
    uri: string;
    createdAt: string;
  } | null;
  mostLikedPost?: {
    text: string;
    likes: number;
    reposts: number;
    replies: number;
    uri: string;
  } | null;
  mostRepostedPost?: {
    text: string;
    likes: number;
    reposts: number;
    replies: number;
    uri: string;
  } | null;
  mostRepliedPost?: {
    text: string;
    likes: number;
    reposts: number;
    replies: number;
    uri: string;
  } | null;
  emojis?: {
    topEmojis: { emoji: string; count: number }[];
    totalEmojis: number;
  };
  media?: {
    mediaPosts: number;
    mediaRatio: number;
    type: string;
    description: string;
  };
  engagementTimeline?: {
    bestMonth: string;
    bestDay: string;
    bestHour: number;
    bestMonthAvg: number;
    bestDayAvg: number;
    bestHourAvg: number;
  };
  milestones?: {
    milestones: {
      postNumber: number;
      text: string;
      likes: number;
      reposts: number;
      replies: number;
      uri: string;
      createdAt: string;
    }[];
  };
  links?: {
    topDomains: { domain: string; count: number }[];
    totalLinks: number;
    type: string;
    description: string;
  };
  year: number;
  truncated?: boolean;
}

const cardVariants: CardVariant[] = ["intro", "firstPost", "stats", "mostLiked", "mostReposted", "mostReplied", "topPost", "rhythm", "streak", "posterType", "postingAge", "topFans", "topics", "emojis", "media", "links", "engagementTimeline", "milestones", "summary", "finale", "credits"];

export default function Recap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [handle, setHandle] = useState(searchParams.get("user") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

  // Helper function to proxy image through backend to avoid CORS
  const proxyImage = async (url: string): Promise<string> => {
    // Proxy all external images (Bluesky CDN and other external sources)
    // This ensures CORS works properly for html2canvas
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
      return url; // Return data URLs and blob URLs as-is
    }
    
    // Check if it's an external URL
    try {
      const urlObj = new URL(url);
      // If it's not from the same origin, proxy it
      if (urlObj.origin !== window.location.origin) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        // Ensure API URL has protocol
        const baseUrl = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;
        const proxyUrl = `${baseUrl}/api/proxy-image?url=${encodeURIComponent(url)}`;
        return proxyUrl;
      }
    } catch (e) {
      // Invalid URL, return as-is
    }
    
    return url;
  };

  const handleShareImage = async () => {
    if (!cardRef.current || !recap) {
      toast.error("Unable to generate image");
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Hide navigation elements temporarily
      const navElements = document.querySelectorAll('[aria-label="Previous card"], [aria-label="Next card"], .flex.items-center.justify-center.gap-2.mt-6');
      const originalDisplay: string[] = [];
      navElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        originalDisplay.push(htmlEl.style.display);
        htmlEl.style.display = 'none';
      });

      // Proxy external images through backend to avoid CORS issues
      const images = cardRef.current.querySelectorAll('img');
      const originalSrcs: string[] = [];
      const conversionPromises: Promise<void>[] = [];

      images.forEach((img, index) => {
        if (img.src && (img.src.startsWith('http://') || img.src.startsWith('https://'))) {
          originalSrcs[index] = img.src;
          conversionPromises.push(
            proxyImage(img.src).then((proxyUrl) => {
              // Create a new image to preload it through the proxy
              return new Promise<void>((resolve) => {
                const preloadImg = new Image();
                preloadImg.crossOrigin = 'anonymous';
                preloadImg.onload = () => {
                  img.src = proxyUrl;
                  img.crossOrigin = 'anonymous';
                  resolve();
                };
                preloadImg.onerror = () => {
                  // If proxy fails, try to use original with crossOrigin
                  img.crossOrigin = 'anonymous';
                  resolve();
                };
                preloadImg.src = proxyUrl;
              });
            }).catch(() => {
              // Keep original src if proxy fails, but set crossOrigin
              img.crossOrigin = 'anonymous';
            })
          );
        }
      });

      // Wait for all images to be proxied and preloaded
      await Promise.all(conversionPromises);
      
      // Wait for images to load and fonts to be ready
      await Promise.all([
        // Wait for all images to load
        Promise.all(
          Array.from(cardRef.current.querySelectorAll('img')).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = resolve; // Continue even if image fails
              setTimeout(resolve, 2000); // Timeout after 2 seconds
            });
          })
        ),
        // Wait for fonts to load
        document.fonts.ready,
        // Small delay to ensure everything is rendered
        new Promise(resolve => setTimeout(resolve, 200)),
      ]);

      // Get actual rendered dimensions
      const rect = cardRef.current.getBoundingClientRect();
      const actualWidth = rect.width;
      const actualHeight = rect.height;
      
      // Ensure we have valid dimensions
      if (actualWidth === 0 || actualHeight === 0) {
        throw new Error('Card has zero dimensions');
      }
      
      // Store original styles to restore later
      const originalCardStyle = {
        width: cardRef.current.style.width,
        maxWidth: cardRef.current.style.maxWidth,
        minWidth: cardRef.current.style.minWidth,
      };
      
      // Set explicit width for image generation to ensure consistent rendering
      cardRef.current.style.width = `${actualWidth}px`;
      cardRef.current.style.maxWidth = `${actualWidth}px`;
      cardRef.current.style.minWidth = '0';
      
      // Wait for layout to update
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Generate image with high quality
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 2x resolution for high quality
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: actualWidth,
        height: actualHeight,
        windowWidth: actualWidth,
        windowHeight: actualHeight,
        imageTimeout: 15000,
        onclone: (clonedDoc, element) => {
          // Fix text overflow issues in the cloned document
          const clonedCard = element as HTMLElement;
          if (clonedCard) {
            // Set explicit width on the card
            clonedCard.style.width = `${actualWidth}px`;
            clonedCard.style.maxWidth = `${actualWidth}px`;
            clonedCard.style.minWidth = '0';
            clonedCard.style.boxSizing = 'border-box';
            
            // Fix all flex containers
            const flexContainers = clonedCard.querySelectorAll('.flex-1, [class*="flex-1"], .flex');
            flexContainers.forEach((container) => {
              const htmlEl = container as HTMLElement;
              htmlEl.style.minWidth = '0';
              htmlEl.style.boxSizing = 'border-box';
            });
            
            // Fix all text elements that should truncate
            const textElements = clonedCard.querySelectorAll('p.truncate, span.truncate, p[class*="truncate"]');
            textElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.textOverflow = 'ellipsis';
              htmlEl.style.overflow = 'hidden';
              htmlEl.style.whiteSpace = 'nowrap';
              htmlEl.style.maxWidth = '100%';
              htmlEl.style.display = 'block';
              htmlEl.style.boxSizing = 'border-box';
            });
            
            // Specifically fix the topFans list items - find by structure
            const fanRows = clonedCard.querySelectorAll('.flex.items-center.gap-3');
            fanRows.forEach((row) => {
              const rowEl = row as HTMLElement;
              rowEl.style.minWidth = '0';
              rowEl.style.width = '100%';
              rowEl.style.maxWidth = '100%';
              rowEl.style.boxSizing = 'border-box';
              
              const textContainer = rowEl.querySelector('.flex-1');
              if (textContainer) {
                const textEl = textContainer as HTMLElement;
                textEl.style.minWidth = '0';
                textEl.style.maxWidth = '100%';
                textEl.style.overflow = 'visible'; // Changed from 'hidden' to prevent clipping
                textEl.style.boxSizing = 'border-box';
                textEl.style.flex = '1 1 0%';
                textEl.style.paddingTop = '0';
                textEl.style.paddingBottom = '0';
                
                // Fix all paragraph elements in the text container
                const paragraphs = textContainer.querySelectorAll('p');
                paragraphs.forEach((pEl) => {
                  const pHtmlEl = pEl as HTMLElement;
                  // Ensure truncation styles are applied but don't clip vertically
                  if (pEl.classList.contains('truncate') || pHtmlEl.textContent) {
                    pHtmlEl.style.textOverflow = 'ellipsis';
                    pHtmlEl.style.overflowX = 'hidden'; // Only hide horizontal overflow
                    pHtmlEl.style.overflowY = 'visible'; // Allow vertical overflow for descenders
                    pHtmlEl.style.whiteSpace = 'nowrap';
                    pHtmlEl.style.maxWidth = '100%';
                    pHtmlEl.style.display = 'block';
                    pHtmlEl.style.boxSizing = 'border-box';
                    pHtmlEl.style.lineHeight = '1.5'; // Ensure proper line height with more space
                    // Add more padding for the first paragraph (name), less for second (stats)
                    if (pEl.textContent && pEl.textContent.includes('❤️')) {
                      // This is the stats line
                      pHtmlEl.style.paddingTop = '4px';
                      pHtmlEl.style.paddingBottom = '2px';
                    } else {
                      // This is the name line
                      pHtmlEl.style.paddingTop = '2px';
                      pHtmlEl.style.paddingBottom = '4px';
                    }
                    // Make sure text is visible
                    pHtmlEl.style.visibility = 'visible';
                    pHtmlEl.style.opacity = '1';
                  }
                });
              }
            });
            
            // Fix summary card text truncation
            const summaryItems = clonedCard.querySelectorAll('.flex.items-center.justify-between');
            summaryItems.forEach((item) => {
              const itemEl = item as HTMLElement;
              itemEl.style.minWidth = '0';
              itemEl.style.width = '100%';
              itemEl.style.boxSizing = 'border-box';
              itemEl.style.lineHeight = '1.5';
              itemEl.style.overflowY = 'visible'; // Allow vertical overflow for descenders
              
              // Fix all spans in the summary item
              const spans = itemEl.querySelectorAll('span');
              spans.forEach((spanEl) => {
                const spanHtmlEl = spanEl as HTMLElement;
                spanHtmlEl.style.lineHeight = '1.5';
                spanHtmlEl.style.overflowY = 'visible';
                
                // Check if this span should truncate (has truncate class or is the right-side value)
                const isRightSide = spanEl.classList.contains('text-right') || 
                                   (spanEl.classList.contains('font-medium') && !spanEl.classList.contains('text-muted-foreground'));
                
                if (spanEl.classList.contains('truncate') || isRightSide) {
                  spanHtmlEl.style.textOverflow = 'ellipsis';
                  spanHtmlEl.style.overflowX = 'hidden';
                  spanHtmlEl.style.overflowY = 'visible';
                  spanHtmlEl.style.whiteSpace = 'nowrap';
                  spanHtmlEl.style.maxWidth = '100%';
                  spanHtmlEl.style.display = 'inline-block';
                  spanHtmlEl.style.boxSizing = 'border-box';
                } else {
                  // Left side labels - no truncation needed
                  spanHtmlEl.style.flexShrink = '0';
                }
              });
            });
            
            // Fix the parent container
            const contentContainer = clonedCard.querySelector('.flex-1.flex.flex-col, .flex-1');
            if (contentContainer) {
              const contentEl = contentContainer as HTMLElement;
              contentEl.style.width = '100%';
              contentEl.style.maxWidth = '100%';
              contentEl.style.minWidth = '0';
              contentEl.style.boxSizing = 'border-box';
            }
            
            // Force a reflow to ensure styles are applied
            void clonedCard.offsetHeight;
          }
        },
      });
      
      // Restore original styles
      cardRef.current.style.width = originalCardStyle.width;
      cardRef.current.style.maxWidth = originalCardStyle.maxWidth;
      cardRef.current.style.minWidth = originalCardStyle.minWidth;

      // Restore original image sources
      images.forEach((img, index) => {
        if (originalSrcs[index]) {
          img.src = originalSrcs[index];
        }
      });

      // Restore navigation elements
      navElements.forEach((el, i) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = originalDisplay[i];
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          setIsGeneratingImage(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const fileName = `updraft-${recap.profile.handle}-${recap.year}-${cardVariants[currentIndex]}.png`;

        // Download the image
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);

        toast.success("Image downloaded! You can now share it.");
        setIsGeneratingImage(false);
      }, 'image/png', 0.95); // High quality PNG
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please try again.");
      setIsGeneratingImage(false);
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
      firstPostText: recap.firstPost?.text,
      firstPostLikes: recap.firstPost?.likes,
      firstPostReposts: recap.firstPost?.reposts,
      firstPostReplies: recap.firstPost?.replies,
      firstPostCreatedAt: recap.firstPost?.createdAt,
      mostLikedText: recap.mostLikedPost?.text,
      mostLikedLikes: recap.mostLikedPost?.likes,
      mostRepostedText: recap.mostRepostedPost?.text,
      mostRepostedReposts: recap.mostRepostedPost?.reposts,
      mostRepliedText: recap.mostRepliedPost?.text,
      mostRepliedReplies: recap.mostRepliedPost?.replies,
      topEmojis: recap.emojis?.topEmojis,
      totalEmojis: recap.emojis?.totalEmojis,
      mediaType: recap.media?.type,
      mediaDescription: recap.media?.description,
      mediaPosts: recap.media?.mediaPosts,
      mediaRatio: recap.media?.mediaRatio,
      linkType: recap.links?.type || "Text-only",
      linkDescription: recap.links?.description || "You keep it simple. No links, no distractions.",
      topDomains: recap.links?.topDomains || [],
      totalLinks: recap.links?.totalLinks || 0,
      bestMonth: recap.engagementTimeline?.bestMonth,
      bestDay: recap.engagementTimeline?.bestDay,
      bestHour: recap.engagementTimeline?.bestHour,
      bestMonthAvg: recap.engagementTimeline?.bestMonthAvg,
      bestDayAvg: recap.engagementTimeline?.bestDayAvg,
      bestHourAvg: recap.engagementTimeline?.bestHourAvg,
      milestones: recap.milestones?.milestones,
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
              {cardData && <StoryCard ref={cardRef} data={cardData} />}
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
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="hero" size="lg" onClick={handleShare} className="w-full sm:w-auto">
                <Share2 className="w-4 h-4 mr-2" />
                Share Text
              </Button>
              <Button 
                variant="hero" 
                size="lg" 
                onClick={handleShareImage}
                disabled={isGeneratingImage}
                className="w-full sm:w-auto"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Share Image
                  </>
                )}
              </Button>
            </div>
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
