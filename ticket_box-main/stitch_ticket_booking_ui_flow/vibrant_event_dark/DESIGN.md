---
name: Vibrant Event Dark
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bbcac0'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#86948b'
  outline-variant: '#3d4a42'
  surface-tint: '#54dda9'
  primary: '#54dda9'
  on-primary: '#003826'
  primary-container: '#26bc8a'
  on-primary-container: '#004530'
  inverse-primary: '#006c4c'
  secondary: '#fff9ef'
  on-secondary: '#3a3000'
  secondary-container: '#ffdb3c'
  on-secondary-container: '#725f00'
  tertiary: '#edb1ff'
  on-tertiary: '#520070'
  tertiary-container: '#d886f5'
  on-tertiary-container: '#611080'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74fac4'
  primary-fixed-dim: '#54dda9'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#005139'
  secondary-fixed: '#ffe16d'
  secondary-fixed-dim: '#e9c400'
  on-secondary-fixed: '#221b00'
  on-secondary-fixed-variant: '#544600'
  tertiary-fixed: '#f9d8ff'
  tertiary-fixed-dim: '#edb1ff'
  on-tertiary-fixed: '#320046'
  on-tertiary-fixed-variant: '#6e208c'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1200px
---

## Brand & Style

This design system is engineered for the high-energy, fast-paced world of live entertainment and event ticketing. The brand personality is **energetic, precise, and immersive**, designed to create a "theatre-dark" environment that makes colorful event posters and seat maps pop with maximum vibrance.

The visual style follows a **Modern Corporate Dark** aesthetic. It utilizes deep obsidian surfaces combined with sharp high-contrast accents. The interface recedes into the background to prioritize content, using vibrant functional colors to guide the user through the high-stakes journey of selecting and purchasing tickets. The emotional response should be one of excitement and trust, ensuring the user feels the urgency of the event while remaining confident in the transactional security of the platform.

## Colors

The palette is anchored by a true black background to eliminate visual noise. The **Primary Green (#26BC8A)** is used exclusively for successful actions, primary buttons, and availability indicators. 

The system employs a specific "Seat Mapping" sub-palette for clarity:
- **Primary Green:** Available / Selected
- **Secondary Yellow (#FFD700):** VIP Tiers
- **Tertiary Purple (#9D50BB):** Deluxe Tiers
- **Error Red (#EF4444):** Occupied / Sold Out

Neutral grays are used to build depth, with `#1A1A1A` serving as the standard container surface and `#2D2D2D` used for input fields and hover states. All text defaults to High-Emphasis White (#FFFFFF) or Medium-Emphasis Gray (#A0A0A0).

## Typography

This design system uses a dual-font strategy. **Hanken Grotesk** is used for headlines to provide a sharp, contemporary edge that feels modern and tech-forward. **Inter** is used for all functional body text and UI labels because of its exceptional legibility at small sizes, which is critical for seat numbers and pricing data.

On mobile devices, headline sizes scale down significantly to maintain vertical rhythm, while body text remains at a minimum of 14px to ensure readability in dark mode. Label styles often use uppercase with increased letter spacing to differentiate metadata from interactive content.

## Layout & Spacing

The layout utilizes a **12-column fixed grid** for desktop, centered on the screen with a maximum width of 1200px. This focus prevents eye strain during complex tasks like seat selection. 

**Spacing Principles:**
- **Fluid Vertical Rhythm:** Sections are separated by large 64px or 80px gaps to create a sense of premium "breathing room."
- **Component Padding:** Elements like cards and input fields use a consistent 16px or 24px internal padding.
- **Mobile Reflow:** On mobile, the 2-column "Ticket Info / Seat Map" layout stacks vertically, with the Checkout Bar pinning to the bottom of the viewport for easy thumb access.

## Elevation & Depth

Depth is communicated through **Tonal Layering** rather than traditional shadows. In a dark theme, shadows are less effective, so the system uses increasingly lighter shades of gray to indicate "height."

1.  **Level 0 (Floor):** Pure Black (#000000) for the main page background.
2.  **Level 1 (Card):** Dark Gray (#1A1A1A) for the primary content containers.
3.  **Level 2 (Interaction):** Lighter Gray (#2D2D2D) for input fields and secondary buttons.

**Glassmorphism** is applied sparingly to floating elements, such as "Time Remaining" timers or sticky navigation bars, using a 12px backdrop blur and a 10% white border to simulate a glass overlay.

## Shapes

The design system employs **Rounded (Level 2)** geometry to soften the technical nature of seat maps and data-heavy grids.

- **Standard Elements:** 0.5rem (8px) for input fields, small cards, and standard buttons.
- **Large Containers:** 1rem (16px) for main event cards and seat map enclosures.
- **Utility:** Circular shapes are reserved for seat icons and user avatars to distinguish them from structural UI elements.

## Components

### Buttons
- **Primary:** Solid Primary Green (#26BC8A) with white text. High-contrast and always rounded.
- **Secondary:** Outlined with Primary Green or a subtle gray border.
- **Checkout:** Large, full-width buttons that include both text and price data for clarity.

### Seat Icons
Small circles that change color based on the pricing tier or availability. Selected seats must have a Primary Green border or fill with a checkmark icon for accessibility.

### Input Fields
High-contrast containers using #2D2D2D background with a subtle 1px border. Labels should be placed above the field in a `label-md` style.

### Event Cards
Horizontal layouts that combine a high-quality imagery area (right) with event details and ticket pricing (left). Use a "ticket stub" notch effect to reinforce the product's purpose.

### Progress Timers
High-visibility, high-contrast red boxes with bold white numerals to create a sense of urgency during the checkout process.