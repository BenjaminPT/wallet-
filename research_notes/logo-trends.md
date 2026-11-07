# Noir Wallet icon research (as of Nov 2026)

Sourcing: Apple HIG App Icons (fetched; change log shows Jun 2026 Liquid Glass refinement, Oct 2026 format options). Generic trend blogs (inspoai, vp0, manypixels) returned thin/no content. Brand observations (Phantom, Rainbow, Family, Coinbase Wallet, Trust, Ledger, Linear, Arc) are from my own knowledge, not fetched sources. Treat as principles only.

## What leaders do (principles)
- One bold glyph on a flat or near-flat field: Phantom (ghost on solid), Ledger (hard-edged bracket mark, black/white), Linear (single geometric mark, dark gradient), Trust (shield, 2 tones). Almost no text.
- Wallets differentiate by shape + one colour. Rainbow/Family/Arc use soft gradients or tiny depth; Coinbase uses a simple circle-in-field. Mono palettes (Ledger, Linear) win on sophistication.
- Silhouette is distinctive at 16px; detail is reserved for 512px+.

## 2026 trends
- Single glyph / monogram with geometric negative space (letter implied by a cut, not drawn).
- Soft, low-contrast gradients (top-light to bottom-dark) rather than rainbow.
- Glass/depth: translucent overlapping shapes. Apple HIG: "filled, overlapping shapes", vary foreground opacity, let the system add specular/refraction.
- Liquid Glass era: system adds highlights, shadows, blur. Do NOT bake in glow, bevel, drop shadow, or blur (HIG).

## Legibility and masking rules
- HIG: minimal shapes, avoid very thin strokes and sharp corners, clearly defined (not feathered) foreground edges, text only if essential (a first-letter mnemonic is OK).
- iOS: supply a square, unmasked 1024x1024 (system rounds; do not pre-round); layered foreground + background; must survive default, dark, clear, tinted variants. Keep features consistent across them; use light icon as basis for dark.
- Android adaptive/maskable: 108dp canvas, 72dp visible, safe zone = centred circle ~66dp (about 61% of canvas; PWA maskable guidance: keep content within the central 80% circle, i.e. radius 40%). Full-bleed background.
- Practical: glyph occupies ~50-58% of canvas; min stroke about 6% of canvas (6px at 100px); no strokes thinner than 1px at 16px; gaps/counters at least 8% of canvas.
- Black bg caution: pure #000 blends with dark wallpapers/OLED; use #0B0B0D to #1A1A1E gradient plus a faint lighter inner edge. (HIG explicitly warns on watchOS black backgrounds.)

## Concept 1: "Cut N" (monogram via negative space)
- 1024 canvas, bg linear gradient #1C1C20 (top) to #050506 (bottom), 160deg.
- White N built from two vertical bars (width 92, height 440) and a diagonal parallelogram; diagonal separated from bars by 28px gaps (negative space = the N). Glyph box ~520 wide, centred. Corners rx 22 on bars.
- Fill #F5F5F7. Optional single 0.35-opacity second layer offset for glass.
- Why: monogram + negative space; sturdy stroke survives 16px.

## Concept 2: "Glass Pane" (overlapping translucent shapes)
- Bg solid/gradient near-black #0D0D10.
- Two overlapping rounded squares (rx 28% of side, side 400): back one white at 0.92, front one offset (+110,+110) white at 0.18 with 3px #FFFFFF 0.5 inner stroke, backdrop-like gradient (white 0.35 to 0.05). Overlap region reads as a wallet flap/N fold.
- Why: matches HIG overlapping shapes + varied opacity; ties to Mono Glass theme. Keep edges crisp; leave blur to system.

## Concept 3: "Noir Disc" (single glyph, ring + aperture)
- Bg #111114 flat. White ring: outer r 230, stroke 96 (heavy), with a 70-degree gap at upper right (a notch/"coin slot") and a solid dot r 56 at centre-left, off-axis.
- Gradient on ring: #FFFFFF to #B8B8C0 (top to bottom). Stroke caps round.
- Why: simplest silhouette, best at 16px; circle sits inside Android's circular safe zone at radius 230/1024 (well inside 40%).

## Recommendation
Prototype 1 and 3 first (strongest at small size); use 2 as the hero/marketing variant. Export: layered SVGs (bg, glyph) for iOS Icon Composer; separate monochrome glyph for Android themed icon; check 16/32/48/180/512.
