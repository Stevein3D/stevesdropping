# Character Page Filmography Compact / Full Toggle — Design

**Date:** 2026-06-25
**Project:** stevesdropping
**Status:** Approved, pending implementation

## Problem

Character pages with many credits (a Steve character played by many actors, and/or
appearing across many titles) render a long Filmography section. The section groups
castings by **actor (person)**, then renders every title as a `<CastingRow>` that dumps
its full episode list (season filter pills + an internal "show 8+ more" collapse). For a
prolific character this is a wall of episodes that buries the simple question "what was
this character in?"

The Person page already solved the identical problem on 2026-06-22 with a Compact / Full
toggle (`src/components/ui/Filmography.tsx`). That component is currently hardwired to
character-labeled groups, so it cannot yet be reused on the Character page. This spec
generalizes it and wires it into the Character page.

## Goal

Give Character pages the same **Compact / Full** toggle the Person page has, by
generalizing the existing `Filmography` client component to be group-agnostic and feeding
it from both pages. Compact mode shows a scannable one-row-per-title list (actor grouping
preserved); Full mode is the existing detailed episode rendering, unchanged. Long pages
default to Compact.

## Behavior (mirrors the Person page exactly)

- A **Compact / Full** segmented control sits in the Filmography section header, next to
  the existing meta line ("X titles · Y appearances · {span}").
- **Default state is computed server-side:** Compact when the character has **> 4 distinct
  titles**, otherwise Full. (Same rule as the Person page.)
- One toggle controls the entire Filmography section (not per-actor).
- Switching is instant client state. It is **not** persisted across visits or in the URL.
- The **Cast** tile grid above Filmography, the banner, stats, and metadata are untouched.

## Compact rendering

Identical to the Person page. Grouping is preserved — same `● {Actor Name}` headings, each
linking to `/people/[id]`, in the existing first-appearance-year order. Each title
collapses to a single `CompactTitleRow`: tiny poster (links to `/titles/[id]`), title name
(links to `/titles/[id]`), `TitleBadge`, year/span, and `{n} eps` shown only when the title
has episodes. No new presentational code — `CompactTitleRow` is reused as-is.

## Full rendering

Unchanged. Renders the existing `<CastingRow>` per title — full episode list, season pills,
and its own internal "show more" collapse — exactly as today.

## Architecture

The work is a small generalization of the shared `Filmography` component plus wiring on two
server pages. No new components.

### Changed: `src/components/ui/Filmography.tsx`

The component's group type is currently hardcoded to characters
(`characterId` / `characterName` / `characterImageUrl`) with the heading link hardwired to
`/characters/${cg.characterId}`. This is the only thing blocking reuse. Generalize the
group to a neutral, plain-serializable shape:

```ts
export type FilmographyGroup = {
  id: number
  name: string
  imageUrl: string | null
  href: string          // heading link — /characters/[id] (person page) or /people/[id] (character page)
  titles: FilmographyTitle[]
}
```

- Rename prop `characters` → `groups: FilmographyGroup[]`.
- The group heading `<Link>` uses `group.href`; the avatar and name use `group.imageUrl` /
  `group.name`. Map `key` becomes `group.id`.
- `FilmographyTitle`, `FilmographyStats`, `stats`, `defaultCompact`, the Compact/Full
  segmented control, the `compact`/`full` branch, and `CompactTitleRow` are all unchanged.
- Remove the now-unused `FilmographyCharacter` export.

### Changed: `src/app/people/[id]/page.tsx`

Pure rename — behavior identical. The `filmographyCharacters` map (current lines ~234-256)
becomes a `filmographyGroups` map producing `{ id, name, imageUrl, href, titles }`:

- `id: cg.characterId`
- `name: cg.characterName`
- `imageUrl: cg.characterImageUrl`
- `href: \`/characters/${cg.characterId}\``
- `titles`: unchanged (same `CastingRowData` + `episodeCount` mapping).

The `<Filmography>` invocation passes `groups={filmographyGroups}`. `stats` and
`defaultCompact={distinctTitles.size > 4}` are unchanged.

### Changed: `src/app/characters/[id]/page.tsx`

Replace the inline Filmography `<section>` (current lines ~288-351) with
`<Filmography groups={...} stats={...} defaultCompact={distinctTitles.size > 4} />`.

The page already builds `persons` (each with `titlesSorted`) and already maps each title to
the `CastingRowData` shape inline. Shape that into the prop:

- One group per actor: `{ id: pg.personId, name: pg.personName, imageUrl: pg.personImageUrl, href: \`/people/${pg.personId}\`, titles }`.
- Each title maps to the existing `CastingRowData` shape (the same mapping already at lines
  ~328-345) plus `episodeCount: tg.episodes.length`.
- `stats = { distinctTitles: distinctTitles.size, appearances: character.castings.length, spanText }`
  (these values already exist in the page).
- Add `import { Filmography } from '@/components/ui/Filmography'`. Remove the now-unused
  `CastingRow` import **only if** it is no longer referenced elsewhere in the file.

The page stays a server component (it owns the Prisma query and metadata). The Cast tile
grid, banner, `Stat` blocks, and JSON-LD/metadata are untouched.

## No changes to

Prisma schema, API routes, data import, the Title page, the Cast tile grid, `CastingRow`,
`CompactTitleRow`, `TitleBadge`, `LightboxImage`, `Placeholder`.

## Out of scope (YAGNI)

- A compact toggle on the Title page (its cast is already a `CastTile` grid, not a
  filmography).
- Persisting the toggle (localStorage / URL / cookie).
- Per-actor toggles.
- Any change to the Cast tiles or stats.

## Testing / review

- Local review at `localhost:3000` before any merge to `main` (push to `main`
  auto-deploys to production — do not push until reviewed).
- Manual checks:
  - A character played by many actors / across many titles: defaults to Compact, episode
    counts correct, toggling to Full restores the current detailed view.
  - A character with ≤ 4 distinct titles: defaults to Full.
  - A character with multiple actors: grouping headings render correctly in both modes and
    link to `/people/[id]`.
  - The **Person** page still works unchanged after the prop rename (regression check):
    defaults, grouping, links to `/characters/[id]`, episode counts.
  - A film-only title: no episode count shown; badge reads "Film."
  - Dark mode and mobile layout for the compact rows on the Character page.
