import { Button } from "@/components/ui/button";
import { UpdraftLogo, UpdraftIcon } from "@/components/UpdraftLogo";

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background gradient glow */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] gradient-glow animate-glow-pulse" />
      
      {/* Floating ambient elements */}
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-sky-light/30 blur-3xl animate-drift" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-accent/40 blur-3xl animate-float" />
      
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Logo */}
        <div className="opacity-0 animate-fade-in flex items-center justify-center gap-3 mb-8">
          <UpdraftIcon className="w-10 h-10 text-primary animate-float" />
        </div>
        
        {/* Wordmark */}
        <h1 className="opacity-0 animate-fade-in-delay-1">
          <UpdraftLogo size="xl" className="text-5xl sm:text-7xl md:text-8xl" />
        </h1>
        
        {/* Subhead */}
        <p className="opacity-0 animate-fade-in-delay-2 mt-6 text-xl sm:text-2xl text-muted-foreground font-light text-balance">
          Your year on Bluesky, lifted.
        </p>
        
        {/* One-liner */}
        <p className="opacity-0 animate-fade-in-delay-3 mt-4 text-base sm:text-lg text-muted-foreground/80 max-w-xl mx-auto text-balance">
          A beautiful, shareable recap of your posts, follows, and moments from the past year.
        </p>
        
        {/* CTAs */}
        <div className="opacity-0 animate-fade-in-delay-4 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="hero" size="xl">
            See your Updraft
          </Button>
        </div>
        
        {/* Trust line */}
        <p className="opacity-0 animate-fade-in-delay-4 mt-6 text-sm text-muted-foreground/60">
          No posting. No tracking. Just your data.
        </p>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in-slow" style={{ animationDelay: "1s" }}>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
