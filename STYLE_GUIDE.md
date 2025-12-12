# Updraft — Style Guide & Design System

## Brand Overview

**Updraft** is a year-in-review experience for Bluesky. The brand is:
- Modern, indie, open-web energy
- Airy, trust-building, calm
- Anti-optimization, sincere (fits Bluesky culture)
- Wordmark-first, no mascot

---

## Typography

### Font Family
```css
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
```

### Letter Spacing
- **Body text:** `-0.01em` (tight)
- **Headlines/Wordmark:** `0.02em` (airy)

### Usage
- Wordmark: lowercase `updraft`, semibold, airy tracking
- Headlines: Semibold, tracking-air
- Body: Regular weight, tracking-tight

---

## Color Palette (HSL)

### Light Mode
| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | 210 40% 98% | Page background |
| `--foreground` | 220 25% 10% | Primary text (near-black ink) |
| `--primary` | 220 70% 55% | CTAs, links, brand accent |
| `--primary-foreground` | 0 0% 100% | Text on primary |
| `--secondary` | 45 40% 96% | Secondary surfaces (warm off-white) |
| `--muted` | 210 30% 94% | Muted backgrounds |
| `--muted-foreground` | 220 15% 45% | Secondary text |
| `--accent` | 200 80% 92% | Accent surfaces (light sky) |
| `--sky` | 210 80% 65% | Sky blue accent |
| `--sky-light` | 200 85% 94% | Light sky for gradients |

### Dark Mode (Twilight)
The dark mode should feel like twilight, not pitch black.

| Token | HSL |
|-------|-----|
| `--background` | 230 30% 12% |
| `--foreground` | 210 30% 95% |
| `--primary` | 210 80% 65% |
| `--muted` | 230 25% 18% |

---

## Gradients

```css
--gradient-hero: linear-gradient(180deg, hsl(200 80% 96%) 0%, hsl(210 40% 98%) 100%);
--gradient-sky: linear-gradient(135deg, hsl(200 85% 94%) 0%, hsl(220 70% 92%) 50%, hsl(210 40% 98%) 100%);
--gradient-glow: radial-gradient(ellipse at center, hsl(220 70% 55% / 0.15) 0%, transparent 70%);
```

---

## Shadows

```css
--shadow-soft: 0 4px 24px -4px hsl(220 70% 55% / 0.12);
--shadow-glow: 0 0 60px hsl(220 70% 55% / 0.15);
```

---

## Animations

### Keyframes Available
- `fade-in` - Fade up from 16px with opacity
- `fade-in-slow` - Simple opacity fade (1s)
- `float` - Gentle vertical float (6s loop)
- `drift` - Organic x/y drift motion (8s loop)
- `glow-pulse` - Subtle opacity pulse for glows (4s loop)

### Animation Classes
```css
.animate-fade-in
.animate-fade-in-delay-1 (0.1s delay)
.animate-fade-in-delay-2 (0.2s delay)
.animate-fade-in-delay-3 (0.3s delay)
.animate-fade-in-delay-4 (0.4s delay)
.animate-float
.animate-drift
.animate-glow-pulse
```

### Accessibility
Always respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Button Variants

### Hero (Primary CTA)
```tsx
<Button variant="hero" size="xl">See your Updraft</Button>
```
- Blue background, white text
- Shadow + slight lift on hover (-0.5 translate-y)

### Hero Secondary
```tsx
<Button variant="hero-secondary" size="lg">Save image</Button>
```
- Transparent with border
- Subtle fill on hover

### Sizes
- `sm` - h-9
- `default` - h-10
- `lg` - h-12, rounded-xl
- `xl` - h-14, rounded-xl, text-lg

---

## Component Patterns

### Cards
- Rounded corners: `rounded-2xl` or `rounded-3xl`
- Soft border: `border border-border/50`
- Subtle glow on hover: `hover:shadow-soft`
- Background blur for overlays: `bg-card/80 backdrop-blur-sm`

### Recap Cards (Portrait Screenshots)
- Aspect ratio: 9:16
- Big breathing room
- One strong stat in center
- Minimal clutter
- Gradient background with glow effect

### Trust Elements
- Icons in rounded containers
- Small, calm text
- No marketing-speak

---

## Logo Components

### UpdraftLogo
```tsx
import { UpdraftLogo } from "@/components/UpdraftLogo";

<UpdraftLogo size="sm" />  // text-xl
<UpdraftLogo size="md" />  // text-2xl (default)
<UpdraftLogo size="lg" />  // text-4xl
<UpdraftLogo size="xl" />  // text-6xl
```

### UpdraftIcon
```tsx
import { UpdraftIcon } from "@/components/UpdraftLogo";

<UpdraftIcon className="w-8 h-8 text-primary" />
```
Three rising lines (weather map inspired), middle tallest.

---

## Copy Guidelines

### Tone
- Low-hype sincerity
- Anti-optimization vibes
- User control emphasis
- Privacy respect

### Do Say
- "Your year on Bluesky, lifted."
- "No tracking. No posting. Just your data."
- "Some posts catch an updraft. Some become it."

### Don't Say
- "Dominate your feed"
- "Top 1% poster"
- "Your influence score"
- Overly competitive leaderboards

### Taglines by Variant
- **Lift:** "Some posts catch an updraft. Some become it."
- **Rhythm:** "Not constant. Just consistent."
- **Signal:** "The signal wasn't louder. It was yours."

---

## File Structure

```
src/
├── components/
│   ├── ui/          # Shadcn components (customized)
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── FeatureCard.tsx
│   ├── WhatIsUpdraft.tsx
│   ├── TrustSection.tsx
│   ├── Footer.tsx
│   ├── UpdraftLogo.tsx
│   ├── RecapCard.tsx
│   └── LoadingScreen.tsx
├── contexts/
│   └── AuthContext.tsx
├── pages/
│   ├── Index.tsx    # Landing page
│   ├── Auth.tsx     # Login/Signup
│   └── Recap.tsx    # User's year-in-review
└── index.css        # Design system tokens
```

---

## Accessibility Checklist

- [x] Minimum tap targets: 44×44px
- [x] Color contrast: 4.5:1 for body, 3:1 for large text
- [x] Respect prefers-reduced-motion
- [x] Visible focus rings
- [x] ARIA labels on icon buttons
- [x] Screen reader text for loading states
- [x] Alt text for share card images

---

## Icon Library

Using **Lucide React**. Key icons used:
- `TrendingUp` - Lift feature
- `Wind` - Tailwinds feature
- `Cloud` - High Points feature
- `Compass` - Patterns feature
- `Shield`, `Lock`, `Eye` - Trust section
- `Share2`, `Download`, `LogOut` - Actions
- `ChevronLeft`, `ChevronRight` - Navigation

---

## Footer

```
Made for the open web by @matty.wtf
Not affiliated with Bluesky, PBC
```

---

## Quick Reference: Tailwind Classes

### Backgrounds
- `gradient-hero` - Hero section gradient
- `gradient-sky` - Sky gradient
- `gradient-glow` - Radial glow

### Shadows
- `shadow-soft` - Subtle elevation
- `shadow-glow` - Glowing effect

### Text Balance
- `text-balance` - CSS text-wrap: balance

### Common Patterns
```tsx
// Card with hover
className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-soft"

// Floating element
className="absolute w-64 h-64 rounded-full bg-sky-light/30 blur-3xl animate-drift"

// Glowing background
className="absolute w-[800px] h-[600px] gradient-glow animate-glow-pulse"
```
