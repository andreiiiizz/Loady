---
name: Cyber Signal
colors:
  surface: '#10131c'
  surface-dim: '#10131c'
  surface-bright: '#363943'
  surface-container-lowest: '#0b0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#272a33'
  surface-container-highest: '#32343f'
  on-surface: '#e0e2ef'
  on-surface-variant: '#cfc2d6'
  inverse-surface: '#e0e2ef'
  inverse-on-surface: '#2d303a'
  outline: '#988d9f'
  outline-variant: '#4d4354'
  surface-tint: '#ddb7ff'
  primary: '#ddb7ff'
  on-primary: '#490080'
  primary-container: '#b76dff'
  on-primary-container: '#400071'
  inverse-primary: '#842bd2'
  secondary: '#ffafd3'
  on-secondary: '#620040'
  secondary-container: '#85145a'
  on-secondary-container: '#ff93c8'
  tertiary: '#4de082'
  on-tertiary: '#003919'
  tertiary-container: '#00a755'
  on-tertiary-container: '#003115'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f0dbff'
  primary-fixed-dim: '#ddb7ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#6900b3'
  secondary-fixed: '#ffd8e7'
  secondary-fixed-dim: '#ffafd3'
  on-secondary-fixed: '#3d0026'
  on-secondary-fixed-variant: '#85145a'
  tertiary-fixed: '#6dfe9c'
  tertiary-fixed-dim: '#4de082'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005227'
  background: '#10131c'
  on-background: '#e0e2ef'
  surface-variant: '#32343f'
  electric-purple: '#A855F7'
  cyber-pink: '#F472B6'
  neon-lime: '#4ADE80'
  midnight-signal: '#10131C'
  glass-surface: rgba(255, 255, 255, 0.03)
  glass-border: rgba(255, 255, 255, 0.08)
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.12em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 48px
---

## Brand & Style

The design system evolves from a utility-focused tool into a high-performance digital hub. It targets a tech-literate audience that values speed, precision, and a futuristic aesthetic. The visual narrative shifts from "Physical Utility" to **Digital Cyber-Modernism**, blending the structured reliability of enterprise systems with the energetic pulse of neo-noir aesthetics.

The style is a sophisticated mix of **Glassmorphism** and **High-Contrast Bold**. It leverages the deep "Midnight Signal" background to create an infinite canvas where translucent panels float, illuminated by vibrant neon accents. The emotional goal is to make the user feel like they are operating a high-end, near-future interface that is both powerful and effortless.

**Design Principles:**
- **Luminescent Hierarchy:** Using light as a functional tool. Primary actions and critical statuses glow, drawing immediate focus in a dark environment.
- **Organic Fluidity:** Moving away from rigid boxes to soft, organic shapes that feel comfortable and premium.
- **Translucent Depth:** Using glass layers to maintain context of the "Signal" environment while focusing on the task at hand.

## Colors

The palette is anchored in the deep, ink-like **Midnight Signal** (#10131C) to provide maximum contrast for the new functional neon palette.

- **Primary Accent (Electric Purple):** Used for signature highlights, primary buttons, and active navigational states. It represents the energy of the network.
- **Warning/Alert (Cyber Pink):** Replaces traditional reds/oranges. It is used for low balance, expiring promos, and critical system alerts.
- **Positive/Success (Neon Lime):** Indicates healthy balances, successful transactions, and "On" states.
- **Surface Strategy:** Instead of solid navies, surfaces are built using varying opacities of white and the primary purple to create a "glass" effect that feels lighter and more modern.

## Typography

Typography has been modernized to a wide, geometric sans-serif for high-impact areas.

- **Headlines (Sora):** A wider geometric sans that feels expansive and contemporary. Its unique rhythm provides a distinctive brand voice for page titles and large data points.
- **Body & Interface (Inter):** Maintains world-class legibility for descriptions, fine print, and settings.
- **Data & Metrics (JetBrains Mono):** Retained for its technical precision. All currency, data MBs, and time values must use this to prevent horizontal "jitter" when numbers update.

## Layout & Spacing

The system uses a **Fluid Grid** model with a consistent 8px rhythmic increment.

- **Desktop:** 12-column grid with 24px gutters. Content is centered with a max-width of 1200px.
- **Mobile:** 4-column grid with 16px gutters and 20px side margins.
- **Visual Rhythm:** Vertical spacing between cards and major sections should be generous (32px) to allow the glassmorphic panels "room to breathe" against the dark background.
- **Interactive Zones:** Maintain the "Thumb Zone" philosophy by placing primary actions in the lower half of mobile screens, but use floating action buttons (FABs) to maintain a modern, layered look.

## Elevation & Depth

Depth is no longer communicated through flat tonal stacking, but through **light and translucency**.

- **Level 0 (Base):** The solid Midnight Signal (#10131C).
- **Level 1 (Glass Panels):** Semi-transparent background blur (backdrop-filter: blur(20px)) with a 1px soft border. This creates a "frosted glass" effect that allows the underlying colors of the background to peak through subtly.
- **Level 2 (Active States):** Elements at this level use an **Outer Glow**. Instead of a black shadow, use a soft, diffused shadow colored by the primary Electric Purple (e.g., `box-shadow: 0 0 20px rgba(168, 85, 247, 0.3)`).
- **Subtle Gradients:** Use linear gradients (top-left to bottom-right) on cards with a 5% opacity primary color tint to give the glass a "tinted" feel.

## Shapes

The shape language is strictly **Rounded (Level 2/XL)**. 

- **Organic Consistency:** Every container, button, and input field must have soft, generous corners. Sharp corners are entirely forbidden in this system.
- **Card Radius:** Main content cards use 1.5rem (24px) to feel friendly and modern.
- **Component Radius:** Buttons and input fields use 1rem (16px) for a "squishy," tactile feel that invites interaction.
- **The Pill Exception:** Interactive chips and status badges may use Pill-shaped (3) roundedness to further distinguish them from primary structural cards.

## Components

- **Primary Action Button:** Background is a gradient of Electric Purple. Corners are `rounded-xl`. On hover, add a subtle glow effect using the primary color. Text is white for high contrast.
- **Glass Cards:** The fundamental container. Uses `rgba(255, 255, 255, 0.03)` fill with a `backdrop-filter: blur(16px)` and a 1px border of `rgba(255, 255, 255, 0.1)`.
- **Status Indicators:** Use the new neon palette. A successful load is signified by a **Neon Lime** glow. An expiring promo uses a **Cyber Pink** pulse animation.
- **Inputs:** Fully boxed with `rounded-xl` corners. The background is a slightly darker glass, and the border glows Electric Purple when focused.
- **Glass Chips:** Smaller versions of the glass card, used for filtering. When selected, they fill with a solid Electric Purple to Midnight Signal gradient.
- **Progress Bars:** Use a "Glow Track" — a dark background track with a neon-colored glowing bar that features a slight gradient.