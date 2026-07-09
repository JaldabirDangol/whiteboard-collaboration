---
name: WhiteboardX
description: A real-time collaborative whiteboard for design and creative teams
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  sidebar: "oklch(0.985 0 0)"
  sidebar-foreground: "oklch(0.145 0 0)"
  sidebar-border: "oklch(0.922 0 0)"
  deep-iris: "oklch(0.527 0.154 278)"
  deep-iris-hover: "oklch(0.585 0.148 278)"
  surface-canvas: "oklch(0.973 0.005 250)"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontWeight: 500
    fontSize: "0.8125rem"
    lineHeight: 1.4
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  "2xl": "1.125rem"
  "3xl": "1.375rem"
  "4xl": "1.625rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border}"
    padding: "0.5rem 0.625rem"
    height: "2rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
    height: "2rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "1rem"
    border: "1px solid color-mix(in oklch, var(--foreground) 10%, transparent)"
  dialog:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "1rem"
    border: "1px solid color-mix(in oklch, var(--foreground) 10%, transparent)"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 0.875rem"
    border: "1px solid {colors.border}"
    height: "2.5rem"
---

# Design System: WhiteboardX

## 1. Overview

**Creative North Star: "The Whiteboard"**

WhiteboardX is a whiteboard in the physical sense: a clean, bright surface where ideas happen. The interface is the frame around that surface — present enough to hold tools, quiet enough to forget about. The brand personality ("playful, creative, energetic") lives in accent color, motion on state change, and crafted details, not in decoration or visual noise.

This system explicitly rejects generic SaaS grayscale and overcomplicated tool UIs. It is soft and rounded without being childish, layered without being heavy. The canvas is the hero; chrome recedes.

**Key Characteristics:**
- Single sans-serif family (Geist) across the entire surface — no display/body pairing
- Achromatic base with a single Deep Iris accent used sparingly for interactive states
- Rounded corners throughout (xl on containers, lg on buttons, xl on inputs) — soft and approachable
- Layered elevation (flat canvas, lifted toolbars, elevated overlays)
- State-rich feedback (hover lifts, focus rings, active presses) — the interface responds to touch

## 2. Colors

The palette is built on achromatic grayscale with a single accent color (Deep Iris) for interactive states. This is a Restrained strategy by default — neutrals carry the surface, Deep Iris marks the action points.

### Primary
- **Ink** (oklch(0.145 0 0)): Body text, headings, primary icon color. Maximum readability.
- **Paper** (oklch(1 0 0)): Card backgrounds, dialog surfaces, content areas. Pure white.
- **Stone** (oklch(0.97 0 0)): Muted backgrounds, sidebar surfaces, secondary containers.
- **Clay** (oklch(0.922 0 0)): Borders, dividers, input strokes. Subtle separation.
- **Ash** (oklch(0.556 0 0)): Secondary text, placeholder text, metadata labels. Minimum legible contrast.
- **Charcoal** (oklch(0.205 0 0)): Primary button backgrounds, emphasized text, active nav. Near-black for weight.

### Accent
- **Deep Iris** (oklch(0.527 0.154 278)): Primary CTA backgrounds, selected tool states, active tab indicators, focus ring color. Applied to ≤10% of any given screen.
- **Deep Iris Hover** (oklch(0.585 0.148 278)): Button hover, interactive element hover. Lighter than Deep Iris; appears on contact.

### Destructive
- **Ember** (oklch(0.577 0.245 27.325)): Destructive actions, error states, deletion. Used sparingly — reserved for actual danger.

### Dark Mode
Dark mode inverts the achromatic axis while preserving the Deep Iris accent on a darker canvas. Backgrounds become Charcoal (oklch(0.145 0 0)), surfaces lift one step, borders use oklch(1 0 0 / 10%), and text goes to Paper.

### Named Rules
**The Deep Iris Rule.** The accent appears on active, selected, or interactive elements only. Never decorative. Its rarity is the point — when Deep Iris appears, the user knows something is actionable or active.

**The One Voice Rule.** All backgrounds are achromatic. Deep Iris is the only accent. Never add a second accent color without explicit system expansion.

## 3. Typography

**Display Font:** Geist (with system-ui, sans-serif fallback)
**Body Font:** Geist (with system-ui, sans-serif fallback)
**Label Font:** Geist (with system-ui, sans-serif fallback)

**Character:** A single well-tuned sans-serif carries the entire system — headings, body, buttons, labels, data. No display/body pairing needed for a product surface. Geist is geometric but warm, tight but legible, and a single variable weight axis (100–900) covers every role.

### Hierarchy
- **Display** (ExtraBold 800, clamp-sized for landing page, line-height 1): Hero headlines only. On the landing page hero. Not used inside the app UI.
- **Headline** (Bold 700, 1rem–1.25rem, line-height 1.2): Section titles, modal headings, board titles. Used sparingly — one per view.
- **Title** (Semibold 600, 0.9375rem, line-height 1.3): Card titles, sidebar section headers, tab labels.
- **Body** (Regular 400, 0.875rem, line-height 1.5): The default for all reading text. Max width 65–75ch for prose (descriptions, board descriptions).
- **Label** (Medium 500, 0.8125rem, line-height 1.4): Form labels, button text, small metadata, table cells. The most common type token in the system.

### Named Rules
**The One Family Rule.** No display font, no serif accent, no mono for UI labels. Geist at every weight covers the full hierarchy. A second font only for canvas-rendered text (user-selectable in the text tool).

## 4. Elevation

WhiteboardX uses a layered elevation model. The canvas is always flat — it's the ground plane. Toolbars, sidebars, panels, and overlays each lift one step above the ground. The layering is intentional: the user always knows what surface they're on.

Elevation is conveyed through:
- **Background tinting:** The neutral palette shifts one stop (Paper → Stone → Clay) as surfaces lift.
- **Subtle border tones**: `color-mix(in oklch, var(--foreground) 10%, transparent)` replaces shadows for container distinction.
- **Shadows on interaction only:** Hovered or focused elements may gain a small shadow, but no surface casts a shadow at rest.

### Elevation Scale
- **Ground (z-0):** Canvas, main content area. Flat, no border, pure background.
- **Surface (z-10):** Toolbars, sidebars, top bars. Slightly tinted background gradient, subtle bottom/right border.
- **Lifted (z-20):** Popovers, dropdowns, tool panels. White background, ring-1 border, optional backdrop blur.
- **Overlay (z-50):** Dialogs, side panels. White background, ring-1 border, backdrop blur overlay on the content behind.

### Named Rules
**The Flat-By-Default Rule.** No surface casts a shadow at rest. Shadows appear as a response to interaction (hover, focus, active). The canvas is always flat.

## 5. Components

### Buttons
- **Shape:** Rounded-lg (0.625rem / 10px). Soft pill-like but not fully round.
- **Primary:** Charcoal (`--primary`) background, Paper (`--primary-foreground`) text. Deep Iris variant for the most important actions (used on landing page CTAs and "New Board").
- **Hover:** Background lightens; Deep Iris buttons shift to Deep Iris Hover. Small translateY(-1px) lift on hover (when not disabled).
- **Active:** Presses down via translateY(1px). No shadow state change — flat-to-flat.
- **Focus:** Ring-2 with `--ring` color offset.
- **Disabled:** Opacity 50%, no pointer events.
- **Outlined:** 1px `--border` stroke, transparent background. Hover fills with Stone (`--muted`).
- **Ghost:** No border, no background. Hover fills with Stone.
- **Destructive:** Ember text on Ember/10 background. Hover deepens to Ember/20.
- **Sizes:** xs (h-6), sm (h-7), default (h-8), lg (h-9), icon variants. Tight padding — buttons are compact and tool-like.

### Cards
- **Corner Style:** Rounded-xl (0.875rem / 14px).
- **Background:** Paper (`--card`).
- **Border:** 1px `color-mix(in oklch, var(--foreground) 10%, transparent)`.
- **Shadow:** None at rest. On hover, a subtle lift via translateY(-2px) and shadow-tightening (used in board cards).
- **Internal Padding:** 1rem (py-4) vertically, 1rem (px-4) horizontally. Compact at `sm` size: 0.75rem.

### Inputs / Fields
- **Style:** 1px Clay (`--border`) stroke, Paper background. Rounded-xl (0.875rem / 14px).
- **Focus:** Stroke shifts to Deep Iris; ring-2 with Deep Iris/20.
- **Placeholder:** Ash (`--muted-foreground`) color. Must maintain 4.5:1 contrast against the Paper background.
- **Disabled:** Stone background, reduced opacity.

### Dialogs
- **Backdrop:** Fixed overlay at z-50. Black at 10% opacity with backdrop-blur(xs) when supported.
- **Surface:** Pure Paper, ring-1 border. Rounded-xl. Zoom-in entrance animation (95%→100%).
- **Header:** Title in Semibold with optional description in Ash text.
- **Footer:** Optional, separated by a border-top from content, with Stone/50 tint.
- **Close:** Ghost icon button in the top-right corner.

### Navigation
- **Sidebar (Board list):** Stone background, fixed width. Filter buttons as inline segments. Active filter uses Deep Iris text or background tint.
- **Top Bar (Board canvas):** Paper at 95% opacity with backdrop-blur. Border-bottom separates it from the canvas. Height 3.5rem (h-14).
- **Tool Header (Canvas tools):** Paper/Stone gradient background, rounded-2xl (1.5rem), floating above the canvas with a shadow. Vertical layout on desktop sidebar, horizontal on mobile top.

### Signature: Canvas Toolbar
The most distinctive component in the system. A floating rounded-2xl (1.5rem) panel containing tool selection, color picker, stroke controls, and font controls. Rendered as a vertical sidebar on desktop (w-28, fixed position), horizontal bar on mobile (top of canvas, scrollable). Selected tools glow with Deep Iris gradient. The toolbar is the primary interface between the user and the drawing surface.

## 6. Do's and Don'ts

### Do:
- **Do** use Deep Iris for exactly one thing per view: the primary action. Any second Deep Iris element degrades the accent.
- **Do** let the canvas breathe. The toolbar, sidebar, and top bar should feel like a frame around the work, not a dashboard.
- **Do** use rounded corners consistently: xl for containers, lg for buttons, xl for inputs.
- **Do** prefer inline actions over modal dialogs. Reserve modals for share, export, and settings.
- **Do** use Stone/Clay tinting for surface elevation in place of shadows.
- **Do** animate state changes only (hover → lift, press → depress, open → zoom in). No decorative entrance sequences on the product surface.
- **Do** respect reduced motion: all animations degrade to instant transitions.

### Don't:
- **Don't** use Deep Iris as a decorative background tint or gradient. It marks interactivity; applying it at rest destroys its signal.
- **Don't** use gradient text (`background-clip: text` with a gradient). Single solid colors only. Emphasis via weight or size.
- **Don't** use glassmorphism or backdrop blur as a default surface treatment. Rare and purposeful only.
- **Don't** create side-stripe borders (`border-left` >1px as colored accent) on cards, list items, or panels.
- **Don't** overload the toolbar. Tools are a palette, not a menu. If a control is not a primary drawing action, move it to a sub-menu.
- **Don't** use display fonts in UI labels, buttons, or data. Geist covers the full hierarchy.
- **Don't** ship a surface that looks like "generic SaaS" — no heavy shadows, no icon-only gradient buttons, no cream/beige backgrounds.
- **Don't** let the app UI feel disconnected from the landing page. Both surfaces share Deep Iris, Geist, and the same rounded corner language — make it look intentional.
