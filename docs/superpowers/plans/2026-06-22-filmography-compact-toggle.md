# Filmography Compact / Full Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Compact / Full toggle to the Person page Filmography so prolific people (e.g. Steve Allen) default to a scannable one-row-per-title list, while Full mode keeps today's detailed episode rendering.

**Architecture:** Extract the Filmography `<section>` out of the server component `people/[id]/page.tsx` into a new client component `Filmography.tsx` that holds the Compact/Full toggle state. Full mode reuses the existing `<CastingRow>` verbatim; Compact mode renders a new lightweight `CompactTitleRow`. Character grouping is preserved in both modes. The server passes plain-serializable data plus a `defaultCompact` flag (`distinctTitles > 4`).

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS.

## Global Constraints

- No test framework exists in this repo; verification is via `npm run lint`, `npm run build`, and manual review at `localhost:3000`.
- **Do not push to `main`** — push to `main` auto-deploys to production. All work stays on branch `feat/filmography-compact-toggle` for local review.
- Default state computed server-side: **Compact when `distinctTitles > 4`**, else Full. Threshold counts **total distinct titles for the person**.
- One toggle controls the whole Filmography section (not per-character). Toggle state is ephemeral (`useState`) — no localStorage / URL / cookie persistence.
- Compact episode count = `episodes.length` for that title under that character; shown only when `> 0`. Films / episode-less titles show no count.
- Reuse existing components: `TitleBadge`, `LightboxImage`, `Placeholder`, `CastingRow`. Reuse existing styling tokens (`bg-cream-card`, `border-cream-border dark:border-warm-700`, `text-steve`, `bg-steve text-cream` for the active pill, serif fonts).
- No changes to: Prisma schema, API routes, the Roles section, stats, JSON-LD, or metadata.

---

### Task 1: Extract Filmography into a client component (no behavior change)

A pure refactor: move the existing Filmography section into `Filmography.tsx` and render it through the new component. The page must look **identical** to before — no toggle, no compact view yet. This isolates the risky boundary-serialization change from the new feature so a reviewer can verify parity independently.

**Files:**
- Create: `src/components/ui/Filmography.tsx`
- Modify: `src/app/people/[id]/page.tsx` (replace the Filmography `<section>`, ~lines 367–432; add the prop-shaping just before the `return`)

**Interfaces:**
- Consumes: `CastingRow`, `CastingRowData` from `./CastingRow`.
- Produces:
  - `type FilmographyTitle = CastingRowData & { episodeCount: number }`
  - `type FilmographyCharacter = { characterId: number; characterName: string; characterImageUrl: string | null; titles: FilmographyTitle[] }`
  - `type FilmographyStats = { distinctTitles: number; appearances: number; spanText: string | null }`
  - `function Filmography(props: { characters: FilmographyCharacter[]; stats: FilmographyStats; defaultCompact: boolean }): JSX.Element`

- [ ] **Step 1: Create `Filmography.tsx` reproducing the current Full rendering**

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CastingRow, type CastingRowData } from './CastingRow'
import { Placeholder } from './Placeholder'

export type FilmographyTitle = CastingRowData & { episodeCount: number }

export type FilmographyCharacter = {
  characterId: number
  characterName: string
  characterImageUrl: string | null
  titles: FilmographyTitle[]
}

export type FilmographyStats = {
  distinctTitles: number
  appearances: number
  spanText: string | null
}

export function Filmography({
  characters,
  stats,
}: {
  characters: FilmographyCharacter[]
  stats: FilmographyStats
  defaultCompact: boolean
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
        <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
          Filmography
        </h2>
        <span className="text-xs text-warm-600 dark:text-warm-500">
          {stats.distinctTitles} title{stats.distinctTitles === 1 ? '' : 's'} · {stats.appearances} appearance{stats.appearances === 1 ? '' : 's'}
          {stats.spanText ? ` · ${stats.spanText}` : ''}
        </span>
      </div>

      {characters.map((cg) => (
        <div key={cg.characterId} className="space-y-0">
          {/* Character heading */}
          <div className="flex items-center gap-2.5 pt-2 pb-2">
            <span className="w-[30px] h-[30px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
              {cg.characterImageUrl ? (
                <Image
                  src={cg.characterImageUrl}
                  alt={cg.characterName}
                  fill
                  className="object-cover"
                  sizes="30px"
                />
              ) : (
                <Placeholder name={cg.characterName} variant="avatar" />
              )}
            </span>
            <Link
              href={`/characters/${cg.characterId}`}
              className="font-serif font-black text-[18px] text-steve hover:text-steve-hover transition-colors"
            >
              {cg.characterName}
            </Link>
          </div>

          {/* Rows */}
          <div>
            {cg.titles.map((t) => (
              <CastingRow key={t.titleId} data={t} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
```

Note: `CastingRow` accepts `data: CastingRowData`. `FilmographyTitle` extends `CastingRowData`, so passing `t` directly is valid — the extra `episodeCount` field is ignored by `CastingRow` and used in Task 2.

- [ ] **Step 2: Shape serializable props in `page.tsx` before the `return`**

In `src/app/people/[id]/page.tsx`, immediately after the `personTypes`/`jsonLd`/`kicker` setup and before `return (`, add:

```tsx
  // Plain-serializable shape for the Filmography client component.
  const filmographyCharacters = characters.map((cg) => ({
    characterId: cg.characterId,
    characterName: cg.characterName,
    characterImageUrl: cg.characterImageUrl,
    titles: cg.titlesSorted.map((tg) => ({
      titleId: tg.titleId,
      title: {
        id: tg.title.id,
        name: tg.title.name,
        year: tg.title.year,
        endYear: tg.title.endDate ? tg.title.endDate.getUTCFullYear() : null,
        description: tg.title.description,
        genre: tg.title.genre,
        titleType: tg.title.titleType,
        imageUrl: tg.title.imageUrl,
      },
      castingImageUrl: tg.castingImageUrl,
      hasFilmLevel: tg.hasFilmLevel,
      episodes: tg.episodes,
      episodeCount: tg.episodes.length,
    })),
  }))
```

- [ ] **Step 3: Replace the Filmography `<section>` with the component**

Add the import near the other UI imports at the top of `page.tsx`:

```tsx
import { Filmography } from '@/components/ui/Filmography'
```

Replace the entire Filmography block — from `{/* Filmography */}` and its `{characters.length > 0 && ( <section ...> ... </section> )}` (current lines ~367–432) — with:

```tsx
      {/* Filmography */}
      {characters.length > 0 && (
        <Filmography
          characters={filmographyCharacters}
          stats={{
            distinctTitles: distinctTitles.size,
            appearances: person.castings.length,
            spanText,
          }}
          defaultCompact={distinctTitles.size > 4}
        />
      )}
```

Leave the `{characters.length === 0 && (...)}` "No castings recorded yet." block untouched directly below it.

- [ ] **Step 4: Typecheck and lint**

Run: `npm run lint && npm run build`
Expected: no type errors, no new lint errors. Build completes.

- [ ] **Step 5: Manual parity check**

With the dev server at `localhost:3000`, open a prolific person page (e.g. Steve Allen) and a short one. Expected: the Filmography section looks **identical** to before — same character headings, same `CastingRow` detail, same episode lists and "show more" behavior.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Filmography.tsx src/app/people/[id]/page.tsx
git commit -m "refactor: extract Filmography section into client component"
```

---

### Task 2: Add the Compact/Full toggle and compact rows

**Files:**
- Modify: `src/components/ui/Filmography.tsx`

**Interfaces:**
- Consumes: `FilmographyTitle`, `FilmographyCharacter`, `FilmographyStats` (Task 1); `TitleBadge` from `./TitleBadge`; `LightboxImage` from `./LightboxImage`; `Placeholder` from `./Placeholder`.
- Produces: `function CompactTitleRow({ t }: { t: FilmographyTitle }): JSX.Element` (module-local).

- [ ] **Step 1: Add imports and the `CompactTitleRow` component**

At the top of `Filmography.tsx`, add to the imports:

```tsx
import { useState } from 'react'
import { TitleBadge } from './TitleBadge'
import { LightboxImage } from './LightboxImage'
```

(`Link` and `Placeholder` are already imported from Task 1.)

Add this module-local component at the bottom of the file:

```tsx
function CompactTitleRow({ t }: { t: FilmographyTitle }) {
  const yearText = t.title.year != null
    ? t.title.endYear != null && t.title.endYear !== t.title.year
      ? `${t.title.year}–${t.title.endYear}`
      : String(t.title.year)
    : ''

  return (
    <div className="flex items-center gap-3 py-1.5 px-1.5 border-b border-dotted border-cream-border dark:border-warm-700">
      {/* Tiny poster */}
      <Link
        href={`/titles/${t.titleId}`}
        className="block w-7 shrink-0 hover:opacity-90 transition-opacity"
      >
        {t.title.imageUrl ? (
          <LightboxImage
            src={t.title.imageUrl}
            alt={t.title.name}
            sizes="28px"
            containerClassName="aspect-[2/3] rounded-sm overflow-hidden relative bg-warm-100 dark:bg-warm-700"
          />
        ) : (
          <Placeholder name={t.title.name} variant="poster" className="rounded-sm" />
        )}
      </Link>

      {/* Title (truncates) */}
      <Link
        href={`/titles/${t.titleId}`}
        className="font-serif font-bold text-[14px] sm:text-[15px] text-warm-900 dark:text-warm-200 hover:text-steve transition-colors min-w-0 truncate"
      >
        {t.title.name}
      </Link>

      <TitleBadge type={t.title.titleType} />

      {yearText && (
        <span className="font-serif font-bold italic text-[12px] text-warm-600 dark:text-warm-500 tabular-nums whitespace-nowrap">
          {yearText}
        </span>
      )}

      {t.episodeCount > 0 && (
        <span className="ml-auto text-[11px] text-warm-600 dark:text-warm-500 tabular-nums whitespace-nowrap">
          {t.episodeCount} ep{t.episodeCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add toggle state and the header control, and branch the rows**

Replace the `Filmography` function body from Task 1 with this version (adds `defaultCompact` use, the `compact` state, the header toggle, and the compact/full branch):

```tsx
export function Filmography({
  characters,
  stats,
  defaultCompact,
}: {
  characters: FilmographyCharacter[]
  stats: FilmographyStats
  defaultCompact: boolean
}) {
  const [compact, setCompact] = useState(defaultCompact)

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
        <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
          Filmography
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-warm-600 dark:text-warm-500">
            {stats.distinctTitles} title{stats.distinctTitles === 1 ? '' : 's'} · {stats.appearances} appearance{stats.appearances === 1 ? '' : 's'}
            {stats.spanText ? ` · ${stats.spanText}` : ''}
          </span>
          {/* Compact / Full toggle */}
          <div className="inline-flex bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-full p-[3px] text-[11px]">
            <button
              onClick={() => setCompact(true)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                compact
                  ? 'bg-steve text-cream'
                  : 'text-warm-600 dark:text-warm-500 hover:text-warm-900 dark:hover:text-warm-200'
              }`}
              style={{ letterSpacing: '0.05em' }}
            >
              Compact
            </button>
            <button
              onClick={() => setCompact(false)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                !compact
                  ? 'bg-steve text-cream'
                  : 'text-warm-600 dark:text-warm-500 hover:text-warm-900 dark:hover:text-warm-200'
              }`}
              style={{ letterSpacing: '0.05em' }}
            >
              Full
            </button>
          </div>
        </div>
      </div>

      {characters.map((cg) => (
        <div key={cg.characterId} className="space-y-0">
          {/* Character heading */}
          <div className="flex items-center gap-2.5 pt-2 pb-2">
            <span className="w-[30px] h-[30px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
              {cg.characterImageUrl ? (
                <Image
                  src={cg.characterImageUrl}
                  alt={cg.characterName}
                  fill
                  className="object-cover"
                  sizes="30px"
                />
              ) : (
                <Placeholder name={cg.characterName} variant="avatar" />
              )}
            </span>
            <Link
              href={`/characters/${cg.characterId}`}
              className="font-serif font-black text-[18px] text-steve hover:text-steve-hover transition-colors"
            >
              {cg.characterName}
            </Link>
          </div>

          {/* Rows */}
          <div>
            {compact
              ? cg.titles.map((t) => <CompactTitleRow key={t.titleId} t={t} />)
              : cg.titles.map((t) => <CastingRow key={t.titleId} data={t} />)}
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run lint && npm run build`
Expected: no type errors, no new lint errors. Build completes.

- [ ] **Step 4: Manual feature check at `localhost:3000`**

Verify against the spec's checklist:
- Prolific person (Steve Allen): **defaults to Compact**; each title is one row with tiny poster + title + badge + year/span; TV titles show `{n} eps`, films show no count.
- Click **Full**: restores the existing detailed `CastingRow` view with episode lists. Click **Compact**: returns to rows.
- Person with **≤ 4 titles**: defaults to **Full** (Compact still selectable).
- Person with **multiple distinct Steve characters**: grouping headings render correctly in both modes.
- **Film-only title**: no episode count; badge reads "Film".
- Check **dark mode** and **mobile** width — rows don't overflow; title truncates, count stays right-aligned.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Filmography.tsx
git commit -m "feat: add Compact/Full toggle to Person page Filmography"
```

---

## Self-Review

**Spec coverage:**
- Section-level Compact/Full toggle in header → Task 2 Step 2. ✓
- Default Compact when `distinctTitles > 4`, total-for-person → `page.tsx` `defaultCompact` (Task 1 Step 3) + `useState(defaultCompact)` (Task 2 Step 2). ✓
- Character grouping preserved in both modes → Task 1 & 2 render character headings. ✓
- Compact row: tiny poster + title link + TitleBadge + year/span + `{n} eps` only when episodes > 0 → `CompactTitleRow` (Task 2 Step 1). ✓
- Full mode unchanged (existing `CastingRow`) → Task 1 Step 1 / Task 2 Step 2 branch. ✓
- Plain-serializable props across client boundary → `filmographyCharacters` (Task 1 Step 2). ✓
- No persistence, no per-character toggle, Roles/JSON-LD/metadata untouched → enforced by Global Constraints; `page.tsx` edits limited to the Filmography block + prop shaping. ✓
- No push to `main` / local review → Global Constraints + manual steps. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `FilmographyTitle`/`FilmographyCharacter`/`FilmographyStats` defined in Task 1, consumed unchanged in Task 2. `CompactTitleRow` signature `{ t: FilmographyTitle }` matches its call site. `Filmography` prop type identical across both tasks. `CastingRow` consumes `data: CastingRowData`, and `FilmographyTitle extends CastingRowData`. ✓
