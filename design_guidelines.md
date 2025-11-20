# Reflux Capital Design Guidelines

## Design Approach
**System Choice**: Financial Services Hybrid - Combining Bloomberg Terminal's data density, Vanguard's trustworthy minimalism, and Charles Schwab's accessible professionalism. This creates authority while maintaining clarity for complex financial information.

## Typography System
- **Primary Font**: Inter (via Google Fonts) - exceptional readability for numbers and data
- **Display Font**: IBM Plex Serif for headlines - adds gravitas and traditional finance credibility
- **Hierarchy**:
  - Hero Headlines: 4xl-6xl, Serif, font-semibold
  - Section Headers: 3xl-4xl, Serif, font-medium
  - Data Labels: sm-base, Sans, font-medium, uppercase tracking-wide
  - Body Text: base-lg, Sans, font-normal
  - Financial Figures: lg-2xl, Sans, tabular-nums for alignment

## Layout & Spacing
**Spacing Primitives**: Tailwind units 4, 6, 8, 12, 16, 24 for predictable rhythm
- Section Padding: py-24 desktop, py-16 mobile
- Component Margins: mb-16 between major sections, mb-8 within sections
- Card Padding: p-6 to p-8
- Container: max-w-7xl for content sections

## Component Library

### Navigation
Top bar with logo left, centered main navigation (Markets, Products, Research, About), right-aligned "Client Portal" and "Get Started" CTA buttons. Sticky on scroll with subtle shadow.

### Hero Section
Full-width image (financial district skyline or trading floor - professional, aspirational) with gradient overlay (dark to transparent). Centered content with serif headline "Sophisticated Investment Solutions for Discerning Investors", subheadline explaining bond and equity expertise, two CTAs: primary "Open Account" and secondary "Explore Markets" - both with backdrop-blur backgrounds and white/transparent borders.

### Market Data Dashboard
Three-column grid showing live market indices (S&P 500, NASDAQ, Bond Index). Each card displays: index name, current value (large tabular numbers), percentage change with directional arrow, mini sparkline chart. Background: subtle card elevation, border treatment.

### Product Showcase
Two-column alternating layout for Bonds, Equities, Mutual Funds sections. Left: professional imagery (corporate headquarters, charts, handshake). Right: product description, key benefits as bulleted list, performance highlights in data cards, "Learn More" link.

### Trust Indicators
Four-column grid with regulatory badges/certifications, years of experience metric, assets under management figure, client satisfaction score. Each displays large number with supporting label beneath.

### Insights/Research Section
Magazine-style three-column grid of market analysis articles. Cards show category tag, headline, publication date, author, excerpt, and "Read Analysis" link. Featured article spans two columns with larger imagery.

### Advisory CTA
Split layout: Left shows professional advisor image. Right contains headline "Personalized Investment Strategies", descriptive text about advisory services, three key differentiators as icon-free list items, "Schedule Consultation" CTA.

### Footer
Three-column layout: Company info with logo, navigation links grouped by category (Products, Resources, Company), contact information and social links. Bottom bar with legal disclaimers, regulatory information, copyright.

## Images
1. **Hero**: Professional financial district at dusk (1920x800px minimum) - conveys scale and stability
2. **Product Sections**: Three distinct images - corporate bonds (building architecture), equities (trading floor screens), mutual funds (diverse portfolio visualization)
3. **Advisory Section**: Professional financial advisor in consultation (authentic, not stock-photo-generic)
4. **Trust Indicators**: Consider subtle background pattern of market data or charts

## Data Visualization Standards
- Line charts for performance tracking
- Horizontal bars for portfolio allocation
- Tabular data uses monospace numbers, right-aligned
- Percentage changes use directional indicators (▲▼) with semantic meaning
- All financial figures include proper decimal places and currency symbols

## Interaction Patterns
Button states: Solid fills for primary, outlined for secondary, subtle hover elevations
Links: Underline on hover, arrow indicators for external/action items
Cards: Minimal elevation, border treatment, no shadow-heavy design
Tables: Zebra striping for rows, sticky headers, sortable columns

This creates institutional trust while maintaining modern usability - essential for high-stakes financial decision-making.