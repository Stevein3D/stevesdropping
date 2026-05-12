# Handoff — Title & Person detail page rework

This package is a design spec for `src/app/titles/[id]/page.tsx` and `src/app/people/[id]/page.tsx`. The HTML preview (`Stevesdropping Detail Pages.html`) shows the final picks at the **top** of the canvas (sections "Title — Final merge" and "Person — Final merge"); earlier exploration directions sit below for reference.

The work is purely a styling / structural rework. **Prisma queries, route shape, and the data model do not change.** All tokens are already defined in your existing tailwind config + `globals.css`.

---

## What changes

### `src/app/titles/[id]/page.tsx`

Replace the page with three sections in this order:

1. **Marquee hero** — channel-card framing
2. **Stat strip** — 4 cells: castings, episodes, seasons, span
3. **The Steve Cast** — trading-card grid
4. **Episodes with Steves** — season tabs + rich episode rows

#### 1. Marquee hero
- Outer card: `bg-cream-card border border-cream-border rounded-lg overflow-hidden`
- **Top bar**: full-width red strip (`bg-steve text-cream`), monospace small caps, ~11px, ~0.18em letter-spacing. Left: `◉ ON AIR · {network ?? "ENTRY"}`. Right: `STEVESDROPPING ENTRY №{title.id}`.
- **Body** (under the bar, padding `26px 30px 30px`): two-column grid `200px 1fr`, gap 28px.
  - Left column: poster (200px wide, `aspect-[2/3]`, `rounded-md`). When `imageUrl` is null, render the **placeholder poster** (see "Image placeholders" below).
  - Right column:
    - Kicker line above title (`text-steve uppercase tracking-[0.18em] text-[11px] font-semibold`). Use a contextual phrase: for a long-running TV series → "Tonight, and every {weekday} since {year}". For a film → "Now showing · {year}". Keep it 1 line.
    - `<h1>` Playfair 900, ~60px, line-height 0.95, tracking -0.02em, color `text-warm-900`.
    - Meta row (flex wrap, gap 14px, `text-[13px] text-warm-600`): `<TitleBadge>` · `{network ?? "—"} · {yearRange}` · separator dot (`text-warm-500`) · `{genre}` · dot · `{runtime} min`.
    - Description: `text-[14px] text-warm-600 leading-[1.55] max-w-[60ch] text-wrap-pretty`.
    - **Marquee bulb strip**: `flex gap-1 mt-2.5`, 24 dots, each 8×8 round; every 3rd dot is "off" (border-default bg, no glow); on-state is `bg-steve` with `box-shadow: 0 0 6px rgba(201,74,26,0.6)`. Pure decoration, no interaction.

#### 2. Stat strip
- A 4-cell row, `border border-cream-border rounded-md bg-cream-card`, divided by `border-r border-cream-subtle` between cells.
- Each cell: `padding: 18px 20px`, two stacked elements:
  - Number: Playfair 900, 32px, line-height 1, `text-steve`, tracking -0.01em.
  - Label: 10px, `tracking-[0.15em] uppercase text-warm-500`, margin-top 8px.
- Compute from existing data:
  - `castings` = unique `(personId, characterId)` pairs across title-level and episode castings (the page already builds this — call it `allAppearances.length`).
  - `episodes` = `title.episodes.length`.
  - `seasons` = number of distinct `season` values in `title.episodes` (only show this cell for TV types; for film, replace with "Runtime" or omit and use a 3-cell strip).
  - `span` = `yearRange` you already compute.

#### 3. The Steve Cast (trading-card grid)
- Heading: section heading from the brief (`section-h`).
  - Title: "The Steve Cast" (Playfair 900, ~22px).
  - Right meta: `{n} listed`.
- Grid: `grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5`.
- Each card (`<Link href={/people/{personId}}>`): `bg-cream-card border border-cream-border rounded-md p-2.5 flex flex-col gap-2 hover:border-steve hover:-translate-y-0.5 transition`.
  - **Banner**: `bg-steve text-cream rounded-sm py-1 px-2 text-center text-[10px] font-semibold tracking-[0.08em] uppercase` — shows the **character name**.
  - **Portrait**: aspect 3/4, `rounded-sm`. Use casting `imageUrl` if present, else person `imageUrl`, else placeholder portrait.
  - **Actor name**: Playfair 700, 14px, centered, `text-warm-900`.
  - **Char line**: `text-[11px] text-warm-600 text-center` → `as <strong className="text-steve font-medium">{character}</strong>`.
  - **Footer row**: `flex justify-between border-t border-dotted border-cream-border pt-1.5 text-[9px] tracking-[0.1em] uppercase text-warm-500` → left: `{years}` (only show on TV — derive from min/max of `episode.airDate` or notes; otherwise just title year). Right: `{appearances}×` (count of castings for that person+character; for a film cast this is just `1`).
- Source the card list from `allAppearances` (already built in current page). Do **not** truncate — show them all.

#### 4. Episodes with Steves
- Heading: "Episodes with Steves" + meta `{loggedSum} of {title.episodes.length} cataloged` on the right (where `loggedSum` is the sum of episodes that have at least one casting).
- **Season tabs**: a horizontal strip just below the heading.
  - `flex gap-0.5 border-b border-cream-border mb-4 overflow-x-auto`.
  - Each tab: `px-3.5 py-2.5 text-xs font-semibold tracking-[0.04em] uppercase text-warm-600 border-b-2 border-transparent -mb-px whitespace-nowrap`. Active: `text-steve border-b-steve`. After the tab label, a count: `text-[10px] text-warm-500 ml-1.5`.
  - Tab labels: `Season {n}`. Default selected = max season number.
  - Group `title.episodes` by `season` to populate.
- **Episode rows** (the active season's episodes):
  - Container: `flex flex-col`. Each row: `grid grid-cols-[64px_1fr_auto] gap-[18px] py-4 border-b border-cream-subtle items-start`.
  - Col 1 (epnum): Playfair 900 italic, 22px, `text-steve`, line-height 1 — render as zero-padded episode number `{String(num).padStart(2,"0")}`. Below it (block, mt-1, 10px, `tracking-[0.12em] uppercase text-warm-500 font-semibold not-italic`): `S{season} · {airDate formatted "MMM d, yyyy"}`.
  - Col 2:
    - Episode title — Playfair 700, 16px, `text-warm-900`.
    - Description (if present) — 13px, `text-warm-600`, mt-1, leading-[1.45].
    - **Cast chips** (mt-2.5, flex wrap, gap-1.5): each chip = `inline-flex items-center gap-1.5 text-[11px] bg-cream-card border border-cream-subtle pl-1 pr-2.5 py-0.5 rounded-full text-warm-600`. Inside: 18px round avatar (use person.imageUrl or initials placeholder), then `<span className="text-warm-900 font-medium">{actor}</span> <span className="text-warm-500 mx-1">as</span> <span className="text-steve font-medium">{character}</span>`. Both names link to their detail pages.
  - Col 3 (runtime, if present): 11px, `text-warm-500 tracking-[0.04em] whitespace-nowrap`.

---

### `src/app/people/[id]/page.tsx`

Three sections:

1. **Compact horizontal banner**
2. **Steves on the Books** (chip row of characters played)
3. **The Filmography** — sections per character, dense ledger table with **per-casting season tabs** when an episode list spans multiple seasons.

#### 1. Banner
- A single card, `bg-cream-card border border-cream-border rounded-lg p-[22px]`.
- Inside: 3-col grid `120px 1fr auto`, gap 24, `align-items: center`.
  - Left: portrait, 120px wide, aspect 3/4, `rounded-md`. Use `person.imageUrl` or placeholder.
  - Middle:
    - Kicker: `text-steve uppercase tracking-[0.18em] text-[11px] font-semibold` → `{personType} · b. {birthYear}{birthplace ? ` · ${birthplace}` : ""}`.
    - `<h1>`: Playfair 900, 44px, line-height 1, tracking -0.02em, `text-warm-900`, `mt-1.5 mb-2`.
    - Bio: 13px, `text-warm-600`, leading-[1.5], max-w-[60ch]. Truncate at ~280 chars with `…` for now (later: full bio with collapse).
  - Right: 3 stat KVs in a row (`flex gap-[18px]`). Each: number Playfair 900 26px `text-steve`, label 9px `tracking-[0.18em] uppercase text-warm-500 mt-1`. Use:
    - `castings` = `person.castings.length`
    - `steves` = number of distinct `characterId`s
    - `titles` = number of distinct `titleId`s

#### 2. Steves on the Books
- Above the chips, a small kicker line: `text-warm-500 uppercase tracking-[0.18em] text-[11px] font-semibold` → "Steves on the Books".
- Chip row: `flex flex-wrap gap-2`.
- Each chip = `inline-flex items-center gap-1.5 bg-cream-card border border-cream-border rounded-full pl-1 pr-3 py-[5px] text-[12px]` and links to `/characters/{characterId}`.
  - 22px round avatar (character image if present, else initials placeholder).
  - Name: Playfair 700, `text-steve`.
  - Count badge: `bg-cream-100 text-warm-500 px-1.5 py-px rounded-full text-[10px] font-mono` — number of appearances (sum of episodes; if no episodes for a title, count it as 1 — a feature appearance).

#### 3. Filmography (sections per character)
- Top heading line — section heading: "The Filmography" + right meta `{titlesCount} titles · {castingsCount} castings · {span}`.
- For each character (in the same order as Steves on the Books — original or by year), render a **section divider** then a **table**.

**Section divider** (one per character):
- A horizontal strip: `flex items-center gap-2.5 py-2.5 border-t-2 border-steve border-b border-dotted border-cream-border`.
  - 30px round avatar (character image or initials).
  - Kicker: `text-warm-500 uppercase tracking-[0.18em] text-[11px] font-semibold` → `Section {idx+1, 2-padded} · as`.
  - Character name: Playfair 900, 18px, `text-steve`.
  - Dotted leader (`flex-1 border-b border-dotted border-cream-border self-end pb-1`).
  - Right meta: 11px, `tracking-[0.08em] uppercase text-warm-500` → `{titles} title(s) · {appearances} appearance(s)`.

**Table** (one per character, directly below the divider):
- `border-collapse, w-full, text-[13px]`.
- `<thead>`: 4 columns — Year (56px), Title, Episodes, [pill column, 90px right-aligned]. Header cells: 9px `tracking-[0.18em] uppercase text-warm-500 font-semibold py-0 pb-2 px-1.5 border-b border-cream-border`.
- `<tbody>`: zebra rows — `tbody tr:nth-child(odd) { background: var(--cream-card); }`, every row `border-b border-dotted border-cream-border`, hover `bg-steve/8`.
- `<td>` cells: `py-2.5 px-1.5 align-top`.
  - **Year cell**: Playfair 700 italic, 13px, `text-warm-500`. Show `tg.title.year`.
  - **Title cell**: Playfair 700, 14px, `text-warm-900`. The title links to `/titles/{titleId}`. Below it, a `block mt-px text-[11px] text-warm-600 font-sans font-normal` sub line — for TV with a description on the title, use `tg.title.description` truncated to ~80 chars; for a feature, use a tiny tagline like `Feature` or the genre. (If neither, leave blank.)
  - **Episodes cell**: see below — this is where the season tabs live.
  - **Pill cell**: right-aligned, contains `<TitleBadge type={tg.title.titleType} />`.

**Episodes cell — this is the new behavior**:
- For a row with **no** episodes (feature film): `<span className="text-warm-500">— feature —</span>`.
- For a row with episodes:
  - Collect distinct seasons from `tg.episodes.map(e => e.season)`, sorted.
  - **If 1 season** (or all in one season): just render the inline episode tag list directly.
  - **If 2+ seasons**: render a small season-pill control above the list. State is local to the row (one `useState` per `CastingRow` — see the prototype's `CastingRow` component).
    - Pill control container: `inline-flex bg-cream-card border border-cream-border rounded-full p-[3px] text-[11px] mb-2`.
    - Each pill: `px-3 py-1.5 rounded-full font-semibold tracking-[0.05em] text-warm-600`. Active: `bg-steve text-cream`.
    - First pill is always **All** with the total count: `All · {n}`.
    - One pill per season: `S{n} · {countInThatSeason}`. Default selected = "All".
- **Episode tag list** (inside the cell, mt-2 if pills are visible):
  - `flex flex-wrap gap-x-2.5 gap-y-1`.
  - Each tag is an `inline-flex items-baseline gap-1.5`:
    - Mono code: `font-mono text-[10px] text-steve bg-cream-100 px-1.5 py-px rounded-sm tracking-[0.04em] font-semibold` → `S{s}E{nn}`.
    - Title: `text-[11px] text-warm-600` → `{episodeTitle ?? "Untitled"}`.

---

## Image placeholders (initials + warm gradient)

The current pages assume images are present. For records without `imageUrl`, render a placeholder that matches the rest of the warm/retro vibe instead of an empty box.

Add `src/components/ui/Placeholder.tsx`:

```tsx
// Stable hash → 1..8 so the same name always lands on the same gradient.
const TONE_GRADIENTS = [
  'linear-gradient(135deg, #c94a1a, #7a5230)',
  'linear-gradient(135deg, #7a5230, #2a4a6a)',
  'linear-gradient(135deg, #4a6a2a, #c94a1a)',
  'linear-gradient(135deg, #2a4a6a, #4a6a2a)',
  'linear-gradient(135deg, #a83a12, #1a1008)',
  'linear-gradient(135deg, #d97757, #7a5230)',
  'linear-gradient(135deg, #2a1a08, #c94a1a)',
  'linear-gradient(135deg, #c4956a, #2a4a6a)',
]

function tone(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return TONE_GRADIENTS[Math.abs(h) % TONE_GRADIENTS.length]
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

type Variant = 'poster' | 'portrait' | 'avatar' | 'square'

const VARIANT: Record<Variant, { aspect: string; radius: string; ratio: number }> = {
  poster:   { aspect: 'aspect-[2/3]', radius: 'rounded-md', ratio: 0.42 }, // font ratio of width
  portrait: { aspect: 'aspect-[3/4]', radius: 'rounded-md', ratio: 0.40 },
  avatar:   { aspect: 'aspect-square', radius: 'rounded-full', ratio: 0.45 },
  square:   { aspect: 'aspect-square', radius: 'rounded-sm', ratio: 0.45 },
}

export function Placeholder({
  name,
  variant = 'poster',
  className = '',
}: { name: string; variant?: Variant; className?: string }) {
  const v = VARIANT[variant]
  return (
    <div
      className={`${v.aspect} ${v.radius} relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ background: tone(name) }}
      aria-label={name}
    >
      <span
        className="font-serif font-black italic text-cream"
        style={{ fontSize: '40%', lineHeight: 1, letterSpacing: '-0.02em' }}
      >
        {initials(name)}
      </span>
      {/* warm 45° hatch overlay */}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 14px)' }}
      />
    </div>
  )
}
```

Then wrap every `<Image>` site with a fallback. Replace the existing pattern:

```tsx
{person.imageUrl ? (
  <div className="..."><Image src={person.imageUrl} ... /></div>
) : (
  <div className="..." />
)}
```

with:

```tsx
{person.imageUrl ? (
  <div className="aspect-[3/4] rounded-md overflow-hidden relative">
    <Image src={person.imageUrl} alt={person.name} fill className="object-cover" sizes="120px" />
  </div>
) : (
  <Placeholder name={person.name} variant="portrait" />
)}
```

Apply the same pattern to:
- `title.imageUrl` (variant="poster")
- `casting.imageUrl` / `person.imageUrl` in the cast cards (variant="portrait")
- `person.imageUrl` in cast chips (variant="avatar")
- `character.imageUrl` in the chip row + filmography section dividers (variant="avatar")

---

## Component split suggestion

Pull these out so the page files stay readable:

- `src/components/title/MarqueeHero.tsx` — hero card
- `src/components/title/StatStrip.tsx` — generic, reused on Person too
- `src/components/title/CastGrid.tsx` — trading-card grid
- `src/components/title/EpisodesBySeason.tsx` — owns the season tab state, takes `episodes: Episode[]` (must contain `season`, `episodeNumber`, `episodeTitle`, `airDate`, `description`, `runtime`, `castings`)
- `src/components/person/PersonBanner.tsx`
- `src/components/person/CharacterChips.tsx`
- `src/components/person/Filmography.tsx` — top-level, maps over characters
- `src/components/person/CastingRow.tsx` — **client component**, owns the per-row season tab state. Takes the existing `TitleGroup` shape from `page.tsx`.

Mark `CastingRow.tsx`, `EpisodesBySeason.tsx`, and the `<Tabs>` UI as `'use client'` since they hold local state.

---

## Tokens reference

All tokens already exist in your `tailwind.config.js` and `globals.css`. Use:

- Colors: `bg-cream`, `bg-cream-card`, `border-cream-border`, `border-cream-subtle`, `text-warm-900` (primary), `text-warm-600` (secondary), `text-warm-500` (dim/muted), `text-steve` (accent), `bg-steve`, `bg-warm-100` (badge bg).
- Fonts: `font-serif` (Playfair Display) for display + section titles; `font-sans` (DM Sans, default) for body / UI.
- Add a `font-mono` family in tailwind config if you want the JetBrains Mono ep-id chips (alternatively: drop the chips and just use bold mono-ish stylenums via `tabular-nums` on DM Sans).

The dark-mode equivalents (`dark:bg-warm-800`, `dark:text-warm-200`, etc.) follow the existing pattern in your current detail pages — port them through.

---

## Suggested order of implementation

1. Add `Placeholder.tsx` and swap it into the **existing** `/titles/[id]` and `/people/[id]` pages first. Quick win.
2. Build `MarqueeHero` + `StatStrip` + `CastGrid` + `EpisodesBySeason`. Replace the body of `/titles/[id]/page.tsx`.
3. Build `PersonBanner` + `CharacterChips` + `Filmography` + `CastingRow`. Replace the body of `/people/[id]/page.tsx`.
4. Walk a few real records (a film with no images, a TV series with many seasons, a person with one casting) to make sure empty-states still feel composed.

---

## Reference

- Live HTML preview of the merged final designs: top of the design canvas in this project, sections "Title — Final merge" and "Person — Final merge".
- Earlier directions are still on the canvas below for visual reference if you want to crib a particular pattern.
