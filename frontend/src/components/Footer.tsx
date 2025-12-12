import { UpdraftLogo, UpdraftIcon } from "@/components/UpdraftLogo";

export function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-border/50">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <UpdraftIcon className="w-6 h-6 text-primary" />
          <UpdraftLogo size="sm" />
        </div>
        
        <p className="text-sm text-muted-foreground mb-2">
          Made for the open web by{" "}
          <a
            href="https://bsky.app/profile/matty.wtf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            @matty.wtf
          </a>
        </p>
        
        <p className="text-xs text-muted-foreground/60">
          Not affiliated with Bluesky, PBC
        </p>
      </div>
    </footer>
  );
}
