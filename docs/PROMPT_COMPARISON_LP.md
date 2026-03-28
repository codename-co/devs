# Prompt: Generate DEVS Comparison Landing Pages

> Use this prompt to generate individual "DEVS vs {Alternative}" landing pages. Each LP shares a common layout, is conversion-oriented, and follows the project's established UI patterns.

---

## Context

You are building comparison landing pages for **DEVS** — a browser-native, open-source AI agent orchestration platform (PWA). These pages help users evaluating alternatives understand why DEVS is the right choice. Each page targets one specific competitor (e.g., "DEVS vs Manus", "DEVS vs ChatGPT Agent Mode", "DEVS vs Suna").

Refer to `docs/COMPARISON.md` for accurate competitor data.

---

## Technical Stack & Constraints

- **Framework**: React + TypeScript + Vite
- **UI Library**: HeroUI (`@heroui/react`) — use `Button`, `Card`, `CardBody`, `Chip`, `Divider`, `Link`, `Accordion`, `AccordionItem`
- **Styling**: Tailwind CSS with dark mode (`dark:` prefix). Color system uses `text-default-*`, `bg-default-*`, `text-primary-*`.
- **Animation**: Framer Motion via `@/lib/motion` (`fadeInUp`, `scaleIn`, `createTransition`, `SPRING_CONFIG`)
- **Shared components**: `Container` (sizes 4–7), `Section`, `Title`, `Icon` from `@/components`
- **Layout**: `DefaultLayout` from `@/layouts/Default` — wraps every page with sidebar, tabbar, responsive header
- **i18n**: `useI18n(localeI18n)` with page-level translation files in `src/pages/{PageName}/i18n/`. Use curly apostrophes (`'`). Supports `{variable}` interpolation.
- **Routing**: Add route in `src/app/Router.tsx` as `'compare/{slug}': CompareXxxPage`
- **Product branding**: Import `PRODUCT` from `@/config/product` for display name (`𝐃𝐄𝐕𝐒`)
- **Path aliases**: Always use `@/` prefix for imports
- **Icons**: Use Iconoir icon names with the `Icon` component

---

## File Structure (per comparison page)

```
src/pages/Compare/{Alternative}/
├── index.tsx          # Main page component
├── motion.tsx         # Framer Motion variants (copy pattern from Index/motion.tsx)
└── i18n/
    ├── index.ts       # Barrel export aggregating all languages
    ├── en.ts          # English strings
    ├── fr.ts          # French strings
    ├── de.ts          # German strings
    ├── es.ts          # Spanish strings
    ├── ar.ts          # Arabic strings
    └── ko.ts          # Korean strings
```

---

## Shared LP Layout (all comparison pages follow this structure)

### Section 1 — Hero (Above the Fold)

```
┌─────────────────────────────────────────────────────────────┐
│  [Chip: "Comparison"]                                       │
│                                                             │
│  𝐃𝐄𝐕𝐒 vs {Alternative}                                     │
│  {One-line value proposition differentiating DEVS}          │
│                                                             │
│  [CTA: "Try DEVS Free →"]   [Secondary: "View on GitHub"]  │
└─────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Use `Section` with `mainClassName="bg-gradient-to-b from-primary-50/50 via-transparent to-transparent dark:from-primary-900/10"`
- `Title` level={1} size="5xl" with `!leading-tight`
- Subtitle as `<p className="max-w-2xl mx-auto text-lg text-default-600">`
- Two buttons: primary `Button` (links to `/`) + ghost `Button` (links to GitHub)
- Animate with `fadeInUp` staggered delays (0, 0.1, 0.2s)

### Section 2 — TL;DR Verdict (Quick Summary)

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 🔒 Privacy   │  │ 💰 Pricing   │  │ 🧩 Features  │      │
│  │ DEVS: ✅     │  │ DEVS: Free   │  │ DEVS: ✅✅✅  │      │
│  │ Alt:  ❌     │  │ Alt:  $39/mo │  │ Alt:  ✅✅    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- 3-column grid (`grid grid-cols-1 md:grid-cols-3 gap-5`)
- Each column is a `Card` with `shadow="sm"` and `border border-default-100`
- Icon + title + two-row comparison (DEVS value vs Alternative value)
- Use `text-success-600` for DEVS advantages, `text-danger-500` for competitor disadvantages
- Focus on the **3 most impactful differentiators** for that specific competitor

### Section 3 — Feature-by-Feature Comparison Table

```
┌─────────────────────────────────────────────────────────────┐
│  [Chip: "Feature Comparison"]                               │
│  Head-to-Head Comparison                                    │
│                                                             │
│  ┌────────────────────┬──────────┬──────────────┐           │
│  │ Feature            │ DEVS     │ {Alternative}│           │
│  ├────────────────────┼──────────┼──────────────┤           │
│  │ Open Source         │ ✅ MIT   │ ❌           │           │
│  │ Browser-Native      │ ✅       │ ❌           │           │
│  │ Data Stays Local    │ ✅       │ ❌           │           │
│  │ Multi-Agent         │ ✅       │ ⚠️ Basic     │           │
│  │ BYOK               │ ✅       │ ❌           │           │
│  │ Offline Capable     │ ✅       │ ❌           │           │
│  │ P2P Sync           │ ✅       │ ❌           │           │
│  │ Agent Memory        │ ✅       │ ⚠️ Limited   │           │
│  │ Free Tier           │ ✅ Full  │ ⚠️ Limited   │           │
│  └────────────────────┴──────────┴──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Use a styled div-based table (not HTML `<table>`) for responsive design
- Header row with `bg-default-100 dark:bg-default-50/10 rounded-t-lg`
- Alternating row backgrounds for readability
- Icons for status: `CheckCircle` (green), `Xmark` (red), `WarningTriangle` (amber)
- Only include features relevant to the specific competitor
- Pull accurate data from `docs/COMPARISON.md`

### Section 4 — Key Advantages (Why DEVS Wins)

```
┌─────────────────────────────────────────────────────────────┐
│  [Chip: "Why DEVS"]                                         │
│  Why Teams Choose DEVS over {Alternative}                   │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐    │
│  │ 🔒 True Privacy         │ │ 💸 Zero Platform Cost    │    │
│  │ No server, no telemetry │ │ Pay only your LLM API   │    │
│  │ {specific comparison}   │ │ {specific comparison}   │    │
│  └─────────────────────────┘ └─────────────────────────┘    │
│  ┌─────────────────────────┐ ┌─────────────────────────┐    │
│  │ 🤖 Advanced Orchestration│ │ 🌐 Provider Freedom    │    │
│  │ Multi-agent teams with  │ │ Switch LLMs anytime,   │    │
│  │ dependency resolution   │ │ no vendor lock-in       │    │
│  └─────────────────────────┘ └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- 2×2 grid of `Card` components with gradient backgrounds (same pattern as About page PILLARS)
- Each card: Icon + title + description with specific comparison to the alternative
- Use gradient classes: `from-{color}-500/10 via-transparent to-transparent`
- Tailor the 4 advantages to what matters most vs this specific competitor

### Section 5 — Pricing Comparison

```
┌─────────────────────────────────────────────────────────────┐
│  [Chip: "Pricing"]                                          │
│  Stop Paying for the Platform                               │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │ DEVS                │    │ {Alternative}        │         │
│  │                     │    │                      │         │
│  │ $0/mo               │    │ $XX/mo               │         │
│  │ ───────────         │    │ ───────────          │         │
│  │ ✅ Unlimited agents │    │ ⚠️ Limited credits   │         │
│  │ ✅ All features     │    │ ❌ Paid tiers        │         │
│  │ ✅ Full privacy     │    │ ❌ Cloud-only        │         │
│  │ ✅ BYOK any LLM    │    │ ❌ Locked provider   │         │
│  │                     │    │                      │         │
│  │ [Try DEVS Free →]   │    │                      │         │
│  └─────────────────────┘    └─────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Side-by-side `Card` layout (`grid grid-cols-1 md:grid-cols-2 gap-6`)
- DEVS card: `border-primary-200 dark:border-primary-800/30` with subtle primary gradient
- Competitor card: `border-default-200` neutral styling
- Price displayed as `text-4xl font-bold`
- Feature list using `Icon` components for check/cross
- CTA button only on the DEVS card

### Section 6 — Who Should Choose What (Fairness Section)

```
┌─────────────────────────────────────────────────────────────┐
│  [Chip: "Honest Take"]                                      │
│  Who Should Choose What                                     │
│                                                             │
│  ✅ Choose DEVS if you…                                     │
│     • Care about data privacy and sovereignty               │
│     • Want full control over LLM providers and costs        │
│     • Need multi-agent orchestration                        │
│     • Prefer open-source and self-hosted solutions          │
│                                                             │
│  ⚠️ Consider {Alternative} if you…                          │
│     • {Honest use case where competitor fits better}        │
│     • {Another honest use case}                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Builds trust through honesty — acknowledge competitor strengths
- Two sub-sections with different accent colors (success for DEVS, warning for alternative)
- Simple bulleted lists inside `Card` components
- Pull "when alternatives may be better" from `docs/COMPARISON.md`

### Section 7 — CTA (Conversion)

```
┌─────────────────────────────────────────────────────────────┐
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Ready to Take Control of Your AI Workflow?         │   │
│   │                                                     │   │
│   │  Start using DEVS for free — no account needed,     │   │
│   │  no credit card, no server to set up.               │   │
│   │                                                     │   │
│   │  [Get Started →]  [View Source on GitHub]            │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Full-width `Card` with gradient: `bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/15 dark:to-secondary-900/15`
- Same CTA pattern as the About page
- Primary button links to `/` (home/prompt area), secondary links to GitHub repo
- Include `Icon name="Heart"` as visual accent above the heading

---

## Page Component Template

```tsx
import { useI18n, useUrl } from '@/i18n'
import { Container, Icon, Section, Title } from '@/components'
import Layout from '@/layouts/Default'
import { Button, Card, CardBody, Chip, Divider, Link } from '@heroui/react'
import { motion } from 'framer-motion'
import { motionVariants } from './motion'
import { PRODUCT } from '@/config/product'
import localeI18n from './i18n'

export const CompareXxxPage = () => {
  const { t } = useI18n(localeI18n)
  const url = useUrl()

  const COMPETITOR = {
    name: '{Alternative Name}',
    pricing: '{$XX/mo}',
    type: '{SaaS / Open Source / Desktop}',
  }

  // Comparison data (pulled from docs/COMPARISON.md)
  const FEATURES = [
    { feature: 'Open Source', devs: true, competitor: false, note: 'MIT License' },
    { feature: 'Browser-Native', devs: true, competitor: false },
    { feature: 'Data Stays Local', devs: true, competitor: false },
    // ... add relevant features per competitor
  ]

  const ADVANTAGES = [
    {
      icon: 'Lock',
      title: '{Advantage Title}',
      description: '{Specific comparison point}',
      gradient: 'from-emerald-500/10 via-transparent to-transparent',
    },
    // ... 4 advantages
  ]

  return (
    <Layout showBackButton={true}>
      {/* Section 1: Hero */}
      {/* Section 2: TL;DR */}
      {/* Section 3: Feature Table */}
      {/* Section 4: Advantages */}
      {/* Section 5: Pricing */}
      {/* Section 6: Honest Take */}
      {/* Section 7: CTA */}
    </Layout>
  )
}
```

---

## Competitors to Generate Pages For

Generate one page per competitor. Prioritize by market relevance:

1. **DEVS vs Manus** — `/compare/manus` — General-purpose SaaS agent (acquired by Meta)
2. **DEVS vs ChatGPT Agent Mode** — `/compare/chatgpt` — OpenAI's built-in agent
3. **DEVS vs Suna (Kortix)** — `/compare/suna` — Open-source but requires Docker/Supabase
4. **DEVS vs OpenManus** — `/compare/openmanus` — Open-source but requires Python
5. **DEVS vs Replit Agent** — `/compare/replit` — Vibe coding SaaS
6. **DEVS vs AgenticSeek** — `/compare/agenticseek` — Local-first but requires Docker
7. **DEVS vs ROMA** — `/compare/roma` — Multi-agent framework (Python)

---

## Tone & Copy Guidelines

- **Confident but fair** — never trash competitors, acknowledge their strengths
- **Specific over vague** — "All data stays in IndexedDB" beats "Privacy-first"
- **User-centric** — frame everything as user benefits, not technical flex
- **Concise** — short paragraphs, scannable bullet points, clear headers
- **Action-oriented CTAs** — "Try DEVS Free", "Get Started", "View Source"
- **Consistent terminology**: "browser-native", "zero infrastructure", "provider-agnostic BYOK", "multi-agent orchestration"
- Use curly apostrophes (`'`) in all copy for i18n compatibility

---

## SEO & Meta

Each page should set appropriate meta via the Layout:
- **Title**: `DEVS vs {Alternative} — {key differentiator} | DEVS`
- **Description**: `Compare DEVS and {Alternative}. {One sentence highlighting the key advantage}.`
- **URL slug**: `/compare/{lowercase-slug}`

---

## Checklist Per Page

- [ ] Hero with clear positioning statement
- [ ] 3-card TL;DR summary
- [ ] Feature comparison table (8–12 rows, sourced from COMPARISON.md)
- [ ] 4 advantage cards with specific competitor comparisons
- [ ] Side-by-side pricing cards
- [ ] Honest "who should choose what" section
- [ ] Gradient CTA card with two buttons
- [ ] i18n files for all 6 languages (en, fr, de, es, ar, ko)
- [ ] Motion variants file
- [ ] Route registered in Router.tsx
- [ ] All data accuracy verified against docs/COMPARISON.md
