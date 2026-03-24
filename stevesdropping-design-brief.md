# Stevesdropping — Design Implementation Brief

## Project context
Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma/Neon PostgreSQL.
This is a media database cataloging people, characters, and titles connected to the name Steve.
The site is for a general audience (60s+), should feel warm, nostalgic, and readable — inspired by Nick at Nite and classic TV Guide aesthetics.

---

## Design direction

### Personality
Retro-nostalgic, warm, editorial. Think late-night TV channel card meets classic program guide.
Clean and intuitive but with character. Not generic, not cold, not overly modern.

### Typography
- **Wordmark + section headings + stats:** `Playfair Display` (Google Font), weights 700 and 900
- **Body / UI text:** `DM Sans` (Google Font), weights 400 and 500
- Add both to `layout.tsx` via `next/font/google`

### Color palette

#### Light mode (default)
| Token | Hex | Usage |
|---|---|---|
| Page background | `#fdf6e3` | Warm cream base |
| Card surface | `#fff8ee` | Slightly warmer than page bg |
| Primary accent | `#c94a1a` | Red-orange — wordmark, nav active, badges, stat numbers, links |
| Accent hover | `#a83a12` | Darker red-orange for hover states |
| Border default | `#e0c89a` | Warm tan border |
| Border subtle | `#ecdab0` | For card borders |
| Text primary | `#2a1a08` | Near-black warm brown |
| Text secondary | `#7a5230` | Mid warm brown — nav links, labels, metadata |
| Text muted | `#c4956a` | Lighter warm — years, subtitles, tags |
| Badge bg | `#f0e0c0` | For type pill backgrounds |
| Badge text | `#7a5230` | For type pill text |

#### Dark mode
| Token | Hex | Usage |
|---|---|---|
| Page background | `#1a1008` | Near-black warm brown |
| Card surface | `#261808` | Slightly lighter than page bg |
| Primary accent | `#c94a1a` | Same red-orange — stays consistent |
| Border default | `#3d2a10` | Dark warm border |
| Text primary | `#f0e2c4` | Warm off-white |
| Text secondary | `#c4956a` | Mid amber |
| Text muted | `#8a6040` | Darker amber for muted text |
| Badge bg | `#3d2a10` | Dark badge background |
| Badge text | `#c4956a` | Amber badge text |

#### Badge colors by title type
| Type | Background | Text |
|---|---|---|
| Film | `#c94a1a` | `#fdf6e3` |
| TV Series / TV Movie | `#7a5230` | `#fdf6e3` |
| Animated | `#4a6a2a` | `#fdf6e3` |
| Documentary | `#2a4a6a` | `#fdf6e3` |

---

## Tailwind config

Replace the current `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#fdf6e3',
          card:    '#fff8ee',
          border:  '#e0c89a',
          subtle:  '#ecdab0',
        },
        steve: {
          DEFAULT: '#c94a1a',
          hover:   '#a83a12',
        },
        warm: {
          900: '#2a1a08',
          800: '#1a1008',
          700: '#3d2a10',
          600: '#7a5230',
          500: '#c4956a',
          400: '#8a6040',
          200: '#f0e2c4',
          100: '#f0e0c0',
          50:  '#fff8ee',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:  ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

---

## Root layout (`src/app/layout.tsx`)

```tsx
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Stevesdropping — All Steves, All the Time',
  description: 'A database cataloging every Steve and Steven across film, television, and beyond.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${dmSans.variable} font-sans antialiased bg-cream text-warm-900 dark:bg-warm-800 dark:text-warm-200 min-h-screen`}>
        <header className="border-b-2 border-steve px-6 py-4 bg-cream dark:bg-warm-800">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="font-serif text-2xl font-black text-steve tracking-tight">
              Stevesdropping
            </a>
            <nav className="flex gap-6 text-sm text-warm-600 dark:text-warm-500">
              <a href="/people"     className="hover:text-steve transition-colors">People</a>
              <a href="/characters" className="hover:text-steve transition-colors">Characters</a>
              <a href="/titles"     className="hover:text-steve transition-colors">Titles</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-cream-border dark:border-warm-700 px-6 py-6 mt-20 text-center text-xs text-warm-500">
          Stevesdropping — All Steves, All the Time
        </footer>
      </body>
    </html>
  )
}
```

---

## Global CSS (`src/app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #fdf6e3;
  }
  .dark body {
    background-color: #1a1008;
  }
}
```

---

## Component patterns

### Section heading
```tsx
<div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 mb-4">
  <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">Section Title</h2>
  <a href="#" className="text-xs text-steve hover:text-steve-hover transition-colors">View all →</a>
</div>
```

### Person card
```tsx
<div className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-4 hover:border-steve transition-colors cursor-pointer">
  <p className="text-xs text-warm-500 tracking-wide mb-1">b. {person.birthYear}</p>
  <h3 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight mb-1">{person.name}</h3>
  <p className="text-xs text-steve mb-2">{person.castings.length} castings</p>
  <span className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded capitalize">
    {person.personType}
  </span>
</div>
```

### TV Guide row (for titles listing)
```tsx
<div className="grid grid-cols-[52px_1fr_auto] items-center gap-3 px-4 py-3 border-b border-cream-border dark:border-warm-700 bg-cream dark:bg-warm-800 hover:bg-cream-card dark:hover:bg-warm-50/5 transition-colors cursor-pointer last:border-b-0">
  <span className="font-serif text-sm font-bold text-warm-500">{title.year}</span>
  <div>
    <p className="text-sm font-medium text-warm-900 dark:text-warm-200">{title.name}</p>
    <p className="text-xs text-warm-600 dark:text-warm-500 mt-0.5">{castingSummary}</p>
  </div>
  <TitleBadge type={title.titleType} />
</div>
```

### Title type badge component
```tsx
const BADGE_STYLES: Record<string, string> = {
  film:          'bg-[#c94a1a] text-[#fdf6e3]',
  tv_series:     'bg-[#7a5230] text-[#fdf6e3]',
  tv_movie:      'bg-[#7a5230] text-[#fdf6e3]',
  animated:      'bg-[#4a6a2a] text-[#fdf6e3]',
  documentary:   'bg-[#2a4a6a] text-[#fdf6e3]',
  other:         'bg-warm-100 text-warm-600',
}

const BADGE_LABELS: Record<string, string> = {
  film:        'Film',
  tv_series:   'TV Series',
  tv_movie:    'TV Movie',
  animated:    'Animated',
  documentary: 'Documentary',
  other:       'Other',
}

export function TitleBadge({ type }: { type: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded tracking-wide whitespace-nowrap ${BADGE_STYLES[type] ?? BADGE_STYLES.other}`}>
      {BADGE_LABELS[type] ?? type}
    </span>
  )
}
```

### Hero (homepage)
```tsx
<section className="py-8 border-b border-cream-border dark:border-warm-700 mb-8">
  <p className="text-xs text-steve tracking-widest uppercase mb-2">The Steve Database</p>
  <h1 className="font-serif text-5xl font-black leading-tight tracking-tight text-warm-900 dark:text-warm-200">
    All Steves,<br />
    <em className="text-steve">all the time.</em>
  </h1>
  <p className="text-sm text-warm-600 dark:text-warm-500 mt-3 max-w-md leading-relaxed">
    A catalog of every Steve and Steven across film, television, and beyond —
    real people and the characters they play.
  </p>
  <div className="flex gap-8 mt-6">
    {stats.map(({ label, value }) => (
      <div key={label}>
        <div className="font-serif text-3xl font-bold text-steve leading-none">{value}</div>
        <div className="text-xs text-warm-500 tracking-widest uppercase mt-1">{label}</div>
      </div>
    ))}
  </div>
</section>
```

---

## Dark mode toggle (optional)

To wire up the toggle button, create `src/components/DarkModeToggle.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

export function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="text-xs border border-warm-500 text-warm-600 dark:text-warm-500 px-3 py-1 rounded-full hover:border-steve hover:text-steve transition-colors"
    >
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
```

Then add `<DarkModeToggle />` to the nav in `layout.tsx`.

---

## Implementation notes for Claude Code

1. Update `tailwind.config.js` first — all component classes depend on it
2. Update `layout.tsx` with the new fonts and base classes
3. Create `src/components/ui/TitleBadge.tsx` — it's used across multiple pages
4. Create `src/components/ui/DarkModeToggle.tsx`
5. Restyle `src/app/page.tsx` using the hero pattern above
6. Restyle `src/app/people/page.tsx` using the person card pattern
7. Restyle `src/app/titles/page.tsx` using the TV Guide row pattern
8. Restyle `src/app/characters/page.tsx` to match the same system
9. Detail pages (`/people/[id]`, `/titles/[id]`, `/characters/[id]`) — apply section headings, warm text colors, and serif for names/titles throughout

The existing Prisma queries and API routes do not need to change — this is purely a styling pass.
