# Filmography Compact / Full Toggle — Design

**Date:** 2026-06-22
**Project:** stevesdropping
**Status:** Approved, pending implementation

## Problem

Person pages with many credits (e.g. Steve Allen — multiple TV series, each with
dozens of episodes) render an enormous Filmography section. The current section groups
castings by Steve **character**, then renders every title as a `<CastingRow>` that dumps
its full episode list (season filter pills + an internal "show 8+ more" collapse). For a
prolific person this is a wall of episodes that buries the simple question "what was this
person in?"

## Goal

Give Person pages a **Compact / Full** toggle on the Filmography section. Compact mode
shows a scannable one-row-per-title list (character grouping preserved); Full mode is the
existing detailed episode rendering, unchanged. Long pages default to Compact.

## Behavior

- A **Compact / Full** segmented control sits in the Filmography section header, next to
  the existing meta line ("X titles · Y appearances · {span}").
- **Default state is computed server-side:** Compact when the person has **> 4 distinct
  titles**, otherwise Full.
- One toggle controls the entire Filmography section (not per-character).
- Switching is instant client state. It is **not** persisted across visits or in the URL.
- The **Roles** section above Filmography and the rest of the page are untouched.

## Compact rendering

- Character grouping is preserved: same `● {Character Name}` headings, each linking to
  `/characters/[id]`, in the existing first-appearance-year order.
- Each title collapses to a single row containing, left to right:
  - **Tiny poster** (~28px) — links to `/titles/[id]`; uses `LightboxImage` when an image
    exists, `Placeholder` (variant `poster`) otherwise. Matches the full-view poster
    behavior at smaller size.
  - **Title name** — links to `/titles/[id]`.
  - **`TitleBadge`** — reuses the existing component (`Film` / `TV Series` / `Miniseries`
    / etc., with its color styling).
  - **Year / span** — `{year}` or `{year}–{endYear}`, reusing the `yearText` formatting
    already in `CastingRow`.
  - **Episode count** — `{n} eps` shown **only when the title has episodes** (TV Series /
    Miniseries). The count is the number of episode-level castings for that title under
    that character. Films and episode-less titles show no count — the badge already
    communicates the type.
- Rows are visually lighter than `CastingRow` (no description sub-line, no episode table).

## Full rendering

Unchanged. Renders the existing `<CastingRow>` per title — full episode list, season
pills, and its own internal "show more" collapse — exactly as today.

## Architecture

`src/app/people/[id]/page.tsx` is a server component and stays one (it owns the Prisma
query and JSON-LD). The toggle needs client state, so the Filmography section is extracted
into a new client component.

### New: `src/components/ui/Filmography.tsx` (`'use client'`)

- **Props (all plain-serializable — no `Map`/`Date` cross the boundary):**
  - `characters`: array of `{ characterId, characterName, characterImageUrl, titles[] }`
    where each title is the existing `CastingRowData` shape (already serializable: numeric
    years, ISO-string episode dates) plus a derived `episodeCount: number`.
  - `stats`: `{ distinctTitles, appearances, spanText }` for the header meta line.
  - `defaultCompact: boolean` — the server-computed `distinctTitles > 4` result.
- Holds `const [compact, setCompact] = useState(defaultCompact)`.
- Renders the section header (title + meta line + the Compact/Full control), then branches:
  - **compact** → list of character groups, each rendering `CompactTitleRow` per title.
  - **full** → list of character groups, each rendering the existing `<CastingRow>` per
    title (the JSX moved verbatim from `page.tsx`).

### New: `CompactTitleRow` (co-located in `Filmography.tsx`)

Presentational row described under "Compact rendering." Reuses `TitleBadge`,
`LightboxImage`, `Placeholder`. No new data dependencies.

### Changed: `page.tsx`

- The Filmography `<section>` (current lines ~367–432) is replaced with
  `<Filmography characters={...} stats={...} defaultCompact={...} />`.
- The server component shapes the plain-serializable `characters` array (it already builds
  the grouped/sorted `characters` structure; this maps it to the prop shape and derives
  `episodeCount` per title — `episodes.length`).
- `defaultCompact = distinctTitles.size > 4`.
- No change to the Prisma query, the Roles section, stats, JSON-LD, or metadata.

### No changes to

Prisma schema, API routes, data import, Title/Character pages, the Roles section.

## Out of scope (YAGNI)

- Persisting the toggle (localStorage / URL / cookie).
- Per-character toggles.
- Compact view on Title or Character pages.
- Any change to the Roles tiles.

## Testing / review

- Local review at `localhost:3000` before any merge to `main` (push to `main`
  auto-deploys to production — do not push until reviewed).
- Manual checks:
  - A prolific person (e.g. Steve Allen): defaults to Compact, episode counts correct,
    toggling to Full restores the current detailed view.
  - A person with ≤ 4 titles: defaults to Full.
  - A person with multiple distinct Steve characters: grouping headings render correctly
    in both modes.
  - A film-only title: no episode count shown; badge reads "Film."
  - Dark mode and mobile layout for the compact rows.
