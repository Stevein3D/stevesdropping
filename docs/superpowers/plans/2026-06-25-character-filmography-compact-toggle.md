# Character Page Filmography Compact / Full Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Character page Filmography the same Compact / Full toggle the Person page has, by generalizing the existing `Filmography` client component to be group-agnostic and feeding it from both pages.

**Architecture:** The `Filmography` client component already owns the toggle, the Compact/Full control, and `CompactTitleRow`. Today its group type is hardwired to characters and its heading link is hardwired to `/characters/[id]`, which blocks reuse. Task 1 generalizes the group to a neutral `{ id, name, imageUrl, href, titles }` shape and updates its only current consumer (the Person page) to the new prop — a regression-neutral rename. Task 2 wires the Character page (grouped by actor) into the now-generic component.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS.

## Global Constraints

- No test framework exists in this repo; verification is via `npm run lint`, `npm run build`, and manual review at `localhost:3000`.
- **Do not push to `main`** — push to `main` auto-deploys to production. All work stays on branch `feat/character-filmography-compact-toggle` for local review.
- Default state computed server-side: **Compact when `distinctTitles.size > 4`**, else Full. Threshold counts **total distinct titles** (Person page = titles for the person; Character page = titles for the character).
- One toggle controls the whole Filmography section. Toggle state is ephemeral (`useState`) — no localStorage / URL / cookie persistence.
- Compact episode count = `episodes.length` for that title under that group; shown only when `> 0`.
- Reuse existing pieces unchanged: `CastingRow`, `CompactTitleRow`, `TitleBadge`, `LightboxImage`, `Placeholder`, and all existing styling tokens.
- No changes to: Prisma schema, API routes, data import, the Title page, the Character page Cast tile grid / banner / stats / JSON-LD / metadata, the Person page Roles section / stats / metadata.

---

### Task 1: Generalize `Filmography` + migrate the Person page (regression-neutral)

Rename the component's group from character-specific fields to a neutral `{ id, name, imageUrl, href, titles }` shape, and update the Person page (its only consumer) to feed the new shape. The Person page must look and behave **identically** to before — same default, same grouping, same `/characters/[id]` heading links, same episode counts. This isolates the shared-component change so a reviewer can verify Person-page parity independently before the Character page is touched.

**Files:**
- Modify: `src/components/ui/Filmography.tsx` (group type + the `groups.map(...)` heading block)
- Modify: `src/app/people/[id]/page.tsx` (the `filmographyCharacters` map ~lines 234–256, and the `<Filmography>` invocation ~lines 392–400)

**Interfaces:**
- Consumes: `CastingRow`, `CastingRowData` from `./CastingRow`; `TitleBadge`, `LightboxImage`, `Placeholder` (all unchanged).
- Produces:
  - `type FilmographyTitle = CastingRowData & { episodeCount: number }` (unchanged)
  - `type FilmographyGroup = { id: number; name: string; imageUrl: string | null; href: string; titles: FilmographyTitle[] }` (replaces `FilmographyCharacter`)
  - `type FilmographyStats = { distinctTitles: number; appearances: number; spanText: string | null }` (unchanged)
  - `function Filmography(props: { groups: FilmographyGroup[]; stats: FilmographyStats; defaultCompact: boolean }): JSX.Element`

- [ ] **Step 1: Replace the group type in `Filmography.tsx`**

Replace the `FilmographyCharacter` type (lines ~13–18) with the neutral group type:

```tsx
export type FilmographyGroup = {
  id: number
  name: string
  imageUrl: string | null
  href: string
  titles: FilmographyTitle[]
}
```

- [ ] **Step 2: Rename the prop and update the group loop**

In the `Filmography` function signature, rename `characters: FilmographyCharacter[]` to `groups: FilmographyGroup[]`. Then replace the `characters.map((cg) => ( ... ))` block (lines ~76–116) with the group-agnostic version below. Only the `key`, heading `<Link href>`, avatar image, and name change; the Compact/Full row branch is untouched:

```tsx
      {groups.map((group) => (
        <div key={group.id} className="space-y-0">
          {/* Group heading */}
          <div className="flex items-center gap-2.5 pt-2 pb-2">
            <span className="w-[30px] h-[30px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
              {group.imageUrl ? (
                <Image
                  src={group.imageUrl}
                  alt={group.name}
                  fill
                  className="object-cover"
                  sizes="30px"
                />
              ) : (
                <Placeholder name={group.name} variant="avatar" />
              )}
            </span>
            <Link
              href={group.href}
              className="font-serif font-black text-[18px] text-steve hover:text-steve-hover transition-colors"
            >
              {group.name}
            </Link>
          </div>

          {/* Rows */}
          {compact ? (
            <div className="grid sm:grid-cols-2 sm:gap-x-6">
              {group.titles.map((t) => (
                <CompactTitleRow key={t.titleId} t={t} />
              ))}
            </div>
          ) : (
            <div>
              {group.titles.map((t) => (
                <CastingRow key={t.titleId} data={t} />
              ))}
            </div>
          )}
        </div>
      ))}
```

- [ ] **Step 3: Update the Person page prop-shaping**

In `src/app/people/[id]/page.tsx`, rename `filmographyCharacters` to `filmographyGroups` and emit the neutral shape (map ~lines 234–256):

```tsx
  // Plain-serializable shape for the Filmography client component.
  const filmographyGroups = characters.map((cg) => ({
    id: cg.characterId,
    name: cg.characterName,
    imageUrl: cg.characterImageUrl,
    href: `/characters/${cg.characterId}`,
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

- [ ] **Step 4: Update the Person page `<Filmography>` invocation**

Change the `characters={filmographyCharacters}` prop to `groups={filmographyGroups}` (~line 393). Leave `stats` and `defaultCompact={distinctTitles.size > 4}` unchanged:

```tsx
        <Filmography
          groups={filmographyGroups}
          stats={{
            distinctTitles: distinctTitles.size,
            appearances: person.castings.length,
            spanText,
          }}
          defaultCompact={distinctTitles.size > 4}
        />
```

- [ ] **Step 5: Lint and build**

Run: `npm run lint && npm run build`
Expected: PASS — no TypeScript errors. A type error here usually means a leftover `characters=` prop or `FilmographyCharacter` reference.

- [ ] **Step 6: Manual parity check (Person page)**

Run: `npm run dev`, open a prolific person (e.g. Steve Allen) at `localhost:3000/people/<id>`.
Expected: Page is identical to before — defaults to Compact, Compact/Full toggle works, episode counts correct, headings link to `/characters/[id]`, dark mode and mobile unchanged. Also open a person with ≤ 4 titles → defaults to Full.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Filmography.tsx src/app/people/[id]/page.tsx
git commit -m "refactor: generalize Filmography to group-agnostic props"
```

---

### Task 2: Wire the Character page Filmography through the component

Replace the inline Filmography `<section>` on the Character page with the generalized `<Filmography>`, grouped by actor (heading links to `/people/[id]`). This adds the Compact/Full toggle to Character pages.

**Files:**
- Modify: `src/app/characters/[id]/page.tsx` (add import; build `filmographyGroups`; replace the Filmography `<section>` ~lines 288–351; remove the now-unused `CastingRow` import on line 9)

**Interfaces:**
- Consumes: `Filmography`, `FilmographyGroup`-shaped data from Task 1. The `<Filmography>` props are `{ groups, stats, defaultCompact }`.
- Produces: nothing downstream.

- [ ] **Step 1: Swap the import**

In `src/app/characters/[id]/page.tsx`, remove the `CastingRow` import (line 9):

```tsx
import { CastingRow, type CastingRowData } from '@/components/ui/CastingRow'
```

and add the Filmography import alongside the other `@/components/ui` imports:

```tsx
import { Filmography } from '@/components/ui/Filmography'
```

- [ ] **Step 2: Build the `filmographyGroups` array**

Just before the `return (` (after the `truncatedDescription` block, ~line 201), add the plain-serializable group shaping. Groups are actors; each title maps to the same `CastingRowData` fields already used inline, plus `episodeCount`:

```tsx
  // Plain-serializable shape for the Filmography client component (grouped by actor).
  const filmographyGroups = persons.map((pg) => ({
    id: pg.personId,
    name: pg.personName,
    imageUrl: pg.personImageUrl,
    href: `/people/${pg.personId}`,
    titles: pg.titlesSorted.map((tg) => ({
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

- [ ] **Step 3: Replace the inline Filmography section**

Replace the entire Filmography `<section>` (current lines ~288–351, the `{persons.length > 0 && ( <section>...Filmography...</section> )}` block) with the component invocation:

```tsx
      {/* Filmography */}
      {persons.length > 0 && (
        <Filmography
          groups={filmographyGroups}
          stats={{
            distinctTitles: distinctTitles.size,
            appearances: character.castings.length,
            spanText,
          }}
          defaultCompact={distinctTitles.size > 4}
        />
      )}
```

Leave the Cast tile grid, the banner, the `Stat` blocks, the `persons.length === 0` empty state, and metadata untouched.

- [ ] **Step 4: Lint and build**

Run: `npm run lint && npm run build`
Expected: PASS. If lint flags an unused import, confirm `CastingRow`/`CastingRowData` are no longer referenced anywhere else in the file and that the removal in Step 1 was applied.

- [ ] **Step 5: Manual check (Character page)**

Run: `npm run dev`, open a character played by many actors / across many titles at `localhost:3000/characters/<id>`.
Expected: Filmography now has a Compact/Full toggle; defaults to Compact when distinct titles > 4; actor headings link to `/people/[id]`; episode counts show for TV titles only; toggling to Full restores the detailed `CastingRow` view. Open a character with ≤ 4 distinct titles → defaults to Full. Verify dark mode and mobile layout of the compact rows.

- [ ] **Step 6: Commit**

```bash
git add src/app/characters/[id]/page.tsx
git commit -m "feat: add Compact/Full toggle to Character page Filmography"
```

---

## Self-Review

**Spec coverage:**
- Generalize `Filmography.tsx` to group-agnostic shape → Task 1, Steps 1–2. ✓
- Person page migrated to new prop (regression-neutral) → Task 1, Steps 3–4, parity check Step 6. ✓
- Character page uses the component, grouped by actor, `/people/[id]` links → Task 2, Steps 1–3. ✓
- Default Compact when `distinctTitles.size > 4` → both invocations pass it. ✓
- Compact rendering / episode counts / Full unchanged → reuses `CompactTitleRow` + `CastingRow` verbatim. ✓
- Untouched areas (Title page, Cast grid, stats, metadata) → not modified by any task. ✓
- Local-review-before-`main` constraint → Global Constraints + manual-check steps. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `FilmographyGroup` fields (`id`, `name`, `imageUrl`, `href`, `titles`) are produced identically by both page maps and consumed in the Task 1 loop. `FilmographyTitle`/`episodeCount` unchanged from the existing component. ✓
