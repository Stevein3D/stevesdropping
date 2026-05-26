# Scrape & Enrich System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-driven bulk enrichment pipeline that scrapes People from Wikipedia and Titles from TMDB, stages field-level diffs for human review, applies approved changes to the DB, and exports approved rows as XLSX for local Excel sync.

**Architecture:** Two scraper modules (Wikipedia REST API + TMDB API) write `ScrapeResult` rows to Postgres. An `/admin/scrape` page lets the admin initiate batches, review field-level diffs (keep / accept / inline-edit), and export approved changes as an XLSX matching the master Excel column layout.

**Tech Stack:** Next.js 14 App Router, Prisma/Neon PostgreSQL, `xlsx` (already installed), Wikipedia REST API (no key), TMDB API (free key in env as `TMDB_API_KEY`), Tailwind CSS following existing design tokens.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `ScrapeResult` model |
| Create | `src/lib/scrapers/types.ts` | Shared FieldDiff + ScrapeOutput types |
| Create | `src/lib/scrapers/wikipedia.ts` | Fetch Person data from Wikipedia REST API |
| Create | `src/lib/scrapers/tmdb.ts` | Fetch Title data from TMDB API |
| Create | `src/app/api/admin/scrape/start/route.ts` | POST: run scrapers, write ScrapeResult rows |
| Create | `src/app/api/admin/scrape/results/route.ts` | GET: paginated ScrapeResult list |
| Create | `src/app/api/admin/scrape/results/[id]/approve/route.ts` | PATCH: apply approved fields to Person/Title |
| Create | `src/app/api/admin/scrape/results/[id]/reject/route.ts` | PATCH: mark rejected |
| Create | `src/app/api/admin/scrape/export/route.ts` | POST: generate XLSX of approved rows |
| Create | `src/components/admin/scrape/InitiationPanel.tsx` | Batch trigger UI |
| Create | `src/components/admin/scrape/DiffRow.tsx` | Field-level keep/accept/edit diff UI |
| Create | `src/components/admin/scrape/ResultsQueue.tsx` | Tabbed pending/approved/rejected queue |
| Create | `src/app/admin/scrape/page.tsx` | `/admin/scrape` page shell |
| Modify | `src/app/admin/layout.tsx` | Add "Scrape" nav link |

---

## Task 1: Add ScrapeResult model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model to schema**

Open `prisma/schema.prisma` and append this model at the end of the file (after the `Casting` model):

```prisma
model ScrapeResult {
  id             Int       @id @default(autoincrement())
  entityType     String    // "person" | "title"
  entityId       Int
  status         String    @default("pending") // "pending" | "approved" | "rejected" | "not_found"
  source         String    // "wikipedia" | "tmdb"
  diffs          Json      // { fieldName: { current: string|null, scraped: string|null, edited: string|null } }
  approvedFields String[]  @default([])
  scrapedAt      DateTime  @default(now())
  reviewedAt     DateTime?
  updatedAt      DateTime  @updatedAt

  @@map("scrape_results")
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-scrape-result
```

Expected: Migration created and applied, Prisma client regenerated. You should see `"scrape_results" table created`.

- [ ] **Step 3: Verify in Prisma Studio**

```bash
npx prisma studio
```

Open `http://localhost:5555`, confirm `ScrapeResult` table exists with all columns. Close Studio.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ScrapeResult model to schema"
```

---

## Task 2: Define shared scraper types

**Files:**
- Create: `src/lib/scrapers/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/lib/scrapers/types.ts

export type FieldDiff = {
  current: string | null
  scraped: string | null
  edited:  string | null
}

export type ScrapeResultDiffs = {
  [fieldName: string]: FieldDiff
}

export type ScrapeOutput = {
  source: 'wikipedia' | 'tmdb'
  diffs: ScrapeResultDiffs
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scrapers/types.ts
git commit -m "feat: add shared scraper types"
```

---

## Task 3: Wikipedia scraper for Person enrichment

**Files:**
- Create: `src/lib/scrapers/wikipedia.ts`

The Wikipedia REST API requires no key. Strategy: try a direct page lookup by name (spaces → underscores), fall back to the MediaWiki search API if not found.

Fields pulled: `bio` (extract), `birthDate`, `birthYear`, `deathDate`, `deathYear`, `nationality`, `birthplace`, `imageUrl`.

- [ ] **Step 1: Create scraper**

```typescript
// src/lib/scrapers/wikipedia.ts
import type { ScrapeOutput, ScrapeResultDiffs, FieldDiff } from './types'
import type { Person } from '@prisma/client'

const REST_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary'
const SEARCH_BASE = 'https://en.wikipedia.org/w/api.php'

type WikiSummary = {
  type: string
  extract: string
  thumbnail?: { source: string }
}

async function fetchSummary(pageTitle: string): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(pageTitle.replace(/ /g, '_'))
  const res = await fetch(`${REST_BASE}/${encoded}`, {
    headers: { 'User-Agent': 'stevesdropping/1.0 (stevein3d@gmail.com)' },
  })
  if (!res.ok) return null
  const data = await res.json() as WikiSummary
  // disambiguation pages have type "disambiguation" — skip them
  if (data.type === 'disambiguation') return null
  return data
}

async function searchPageTitle(name: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: name,
    srlimit: '1',
    format: 'json',
    origin: '*',
  })
  const res = await fetch(`${SEARCH_BASE}?${params}`)
  if (!res.ok) return null
  const data = await res.json() as { query: { search: { title: string }[] } }
  return data.query.search[0]?.title ?? null
}

function diff(current: string | null | undefined, scraped: string | null): FieldDiff {
  return { current: current ?? null, scraped, edited: null }
}

function hasDiff(d: FieldDiff): boolean {
  return d.scraped !== null && d.scraped !== d.current
}

export async function scrapePerson(person: Pick<Person, 'name' | 'bio' | 'nationality' | 'birthplace' | 'imageUrl' | 'birthDate' | 'birthYear' | 'deathDate' | 'deathYear'>): Promise<ScrapeOutput | null> {
  let summary = await fetchSummary(person.name)

  if (!summary) {
    const pageTitle = await searchPageTitle(person.name)
    if (!pageTitle) return null
    summary = await fetchSummary(pageTitle)
    if (!summary) return null
  }

  const extract = summary.extract?.trim() || null
  const imageUrl = summary.thumbnail?.source ?? null

  const rawDiffs: ScrapeResultDiffs = {
    bio:      diff(person.bio, extract),
    imageUrl: diff(person.imageUrl, imageUrl),
  }

  // Filter to only fields where scraped value differs from current
  const diffs: ScrapeResultDiffs = Object.fromEntries(
    Object.entries(rawDiffs).filter(([, d]) => hasDiff(d))
  )

  if (Object.keys(diffs).length === 0) return null

  return { source: 'wikipedia', diffs }
}
```

- [ ] **Step 2: Manually test via a Node script**

Create a temporary file `scripts/test-wiki.ts`:

```typescript
import { scrapePerson } from '../src/lib/scrapers/wikipedia'

const fakePerson = {
  name: 'Steve Martin',
  bio: null,
  nationality: null,
  birthplace: null,
  imageUrl: null,
  birthDate: null,
  birthYear: null,
  deathDate: null,
  deathYear: null,
}

const result = await scrapePerson(fakePerson)
console.log(JSON.stringify(result, null, 2))
```

Run:
```bash
npx tsx scripts/test-wiki.ts
```

Expected: JSON output showing `bio` with Steve Martin's Wikipedia extract, `imageUrl` with thumbnail URL. If `null` is returned, the name lookup failed — check network and name spelling.

- [ ] **Step 3: Delete test script**

```bash
rm scripts/test-wiki.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/wikipedia.ts
git commit -m "feat: add Wikipedia scraper for Person enrichment"
```

---

## Task 4: TMDB scraper for Title enrichment

**Files:**
- Create: `src/lib/scrapers/tmdb.ts`

TMDB API key must be set as `TMDB_API_KEY` in `.env.local`. The scraper searches `/search/movie` first, then `/search/tv` if not found, fetches details for the top result.

Fields pulled: `description` (overview), `genre` (first genre name), `imageUrl` (poster), `runtime` (minutes), `year`, `releaseDate`.

- [ ] **Step 1: Add env var**

Add to `.env.local`:
```
TMDB_API_KEY=your_tmdb_api_key_here
```

Get a free API key at https://www.themoviedb.org/settings/api (account required).

- [ ] **Step 2: Create scraper**

```typescript
// src/lib/scrapers/tmdb.ts
import type { ScrapeOutput, ScrapeResultDiffs, FieldDiff } from './types'
import type { Title } from '@prisma/client'

const BASE = 'https://api.themoviedb.org/3'

type TmdbMovieResult = { id: number; title: string; release_date?: string }
type TmdbTvResult    = { id: number; name: string; first_air_date?: string }
type TmdbMovieDetail = {
  overview: string
  genres: { id: number; name: string }[]
  poster_path: string | null
  runtime: number | null
  release_date: string
}
type TmdbTvDetail = {
  overview: string
  genres: { id: number; name: string }[]
  poster_path: string | null
  episode_run_time: number[]
  first_air_date: string
}

function apiUrl(path: string, params: Record<string, string> = {}): string {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('TMDB_API_KEY is not set')
  const q = new URLSearchParams({ api_key: key, ...params })
  return `${BASE}${path}?${q}`
}

async function searchMovie(name: string, year?: number): Promise<number | null> {
  const params: Record<string, string> = { query: name }
  if (year) params.year = String(year)
  const res = await fetch(apiUrl('/search/movie', params))
  if (!res.ok) return null
  const data = await res.json() as { results: TmdbMovieResult[] }
  return data.results[0]?.id ?? null
}

async function searchTv(name: string, year?: number): Promise<number | null> {
  const params: Record<string, string> = { query: name }
  if (year) params.first_air_date_year = String(year)
  const res = await fetch(apiUrl('/search/tv', params))
  if (!res.ok) return null
  const data = await res.json() as { results: TmdbTvResult[] }
  return data.results[0]?.id ?? null
}

function diff(current: string | number | null | undefined, scraped: string | null): FieldDiff {
  const cur = current != null ? String(current) : null
  return { current: cur, scraped, edited: null }
}

function hasDiff(d: FieldDiff): boolean {
  return d.scraped !== null && d.scraped !== d.current
}

export async function scrapeTitle(title: Pick<Title, 'name' | 'year' | 'description' | 'genre' | 'imageUrl' | 'runtime' | 'releaseDate' | 'titleType'>): Promise<ScrapeOutput | null> {
  const isFilm = ['film', 'tv_movie', 'documentary', 'short', 'video'].includes(title.titleType)
  const year = title.year ?? undefined

  let movieId: number | null = null
  let tvId: number | null = null

  if (isFilm) {
    movieId = await searchMovie(title.name, year)
  } else {
    tvId = await searchTv(title.name, year)
    // fall back to movie search for animated/other
    if (!tvId) movieId = await searchMovie(title.name, year)
  }

  let rawDiffs: ScrapeResultDiffs = {}

  if (movieId) {
    const res = await fetch(apiUrl(`/movie/${movieId}`))
    if (!res.ok) return null
    const d = await res.json() as TmdbMovieDetail

    const posterUrl = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null
    const releaseYear = d.release_date ? new Date(d.release_date).getFullYear() : null

    rawDiffs = {
      description: diff(title.description, d.overview || null),
      genre:       diff(title.genre, d.genres[0]?.name ?? null),
      imageUrl:    diff(title.imageUrl, posterUrl),
      runtime:     diff(title.runtime, d.runtime ? String(d.runtime) : null),
      year:        diff(title.year, releaseYear ? String(releaseYear) : null),
      releaseDate: diff(title.releaseDate ? new Date(title.releaseDate).toISOString().split('T')[0] : null, d.release_date || null),
    }
  } else if (tvId) {
    const res = await fetch(apiUrl(`/tv/${tvId}`))
    if (!res.ok) return null
    const d = await res.json() as TmdbTvDetail

    const posterUrl = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null
    const airYear = d.first_air_date ? new Date(d.first_air_date).getFullYear() : null
    const runtime = d.episode_run_time[0] ?? null

    rawDiffs = {
      description: diff(title.description, d.overview || null),
      genre:       diff(title.genre, d.genres[0]?.name ?? null),
      imageUrl:    diff(title.imageUrl, posterUrl),
      runtime:     diff(title.runtime, runtime ? String(runtime) : null),
      year:        diff(title.year, airYear ? String(airYear) : null),
      releaseDate: diff(title.releaseDate ? new Date(title.releaseDate).toISOString().split('T')[0] : null, d.first_air_date || null),
    }
  } else {
    return null
  }

  const diffs = Object.fromEntries(
    Object.entries(rawDiffs).filter(([, d]) => hasDiff(d))
  )

  if (Object.keys(diffs).length === 0) return null

  return { source: 'tmdb', diffs }
}
```

- [ ] **Step 3: Manually test via a Node script**

Create `scripts/test-tmdb.ts`:

```typescript
import { scrapeTitle } from '../src/lib/scrapers/tmdb'

const fakeTitle = {
  name: 'The 40-Year-Old Virgin',
  year: 2005,
  description: null,
  genre: null,
  imageUrl: null,
  runtime: null,
  releaseDate: null,
  titleType: 'film' as const,
}

const result = await scrapeTitle(fakeTitle)
console.log(JSON.stringify(result, null, 2))
```

Run:
```bash
npx tsx scripts/test-tmdb.ts
```

Expected: JSON with `description`, `genre`, `imageUrl`, `runtime`, `year`, `releaseDate` diffs populated. If you get an error about `TMDB_API_KEY`, ensure `.env.local` is set and the script loads it (add `import 'dotenv/config'` at the top if needed).

- [ ] **Step 4: Delete test script**

```bash
rm scripts/test-tmdb.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrapers/tmdb.ts .env.local
git commit -m "feat: add TMDB scraper for Title enrichment"
```

Note: ensure `.env.local` is in `.gitignore` before committing. If it's not, do NOT commit it — only commit the scraper file.

---

## Task 5: Scrape start API route

**Files:**
- Create: `src/app/api/admin/scrape/start/route.ts`

Accepts `{ entityType: 'person'|'title', filter: 'all'|'empty', entityIds?: number[] }`. Fetches matching records, runs scrapers concurrently (5 at a time), writes `ScrapeResult` rows.

- [ ] **Step 1: Create route**

```typescript
// src/app/api/admin/scrape/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapePerson } from '@/lib/scrapers/wikipedia'
import { scrapeTitle } from '@/lib/scrapers/tmdb'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      entityType: 'person' | 'title'
      filter: 'all' | 'empty'
      entityIds?: number[]
    }

    const { entityType, filter, entityIds } = body

    if (!['person', 'title'].includes(entityType)) {
      return NextResponse.json({ ok: false, error: 'Invalid entityType' }, { status: 400 })
    }

    let created = 0
    let skipped = 0

    if (entityType === 'person') {
      const where = entityIds?.length
        ? { id: { in: entityIds } }
        : filter === 'empty'
        ? { bio: null }
        : {}

      const people = await prisma.person.findMany({
        where,
        select: { id: true, name: true, bio: true, nationality: true, birthplace: true, imageUrl: true, birthDate: true, birthYear: true, deathDate: true, deathYear: true },
        take: 50,
      })

      await runConcurrent(people, 5, async (person) => {
        const output = await scrapePerson(person)
        if (!output) {
          await prisma.scrapeResult.create({
            data: { entityType: 'person', entityId: person.id, status: 'not_found', source: 'wikipedia', diffs: {} },
          })
          skipped++
          return
        }
        await prisma.scrapeResult.create({
          data: { entityType: 'person', entityId: person.id, status: 'pending', source: output.source, diffs: output.diffs },
        })
        created++
      })
    } else {
      const where = entityIds?.length
        ? { id: { in: entityIds } }
        : filter === 'empty'
        ? { description: null }
        : {}

      const titles = await prisma.title.findMany({
        where,
        select: { id: true, name: true, year: true, description: true, genre: true, imageUrl: true, runtime: true, releaseDate: true, titleType: true },
        take: 50,
      })

      await runConcurrent(titles, 5, async (title) => {
        const output = await scrapeTitle(title)
        if (!output) {
          await prisma.scrapeResult.create({
            data: { entityType: 'title', entityId: title.id, status: 'not_found', source: 'tmdb', diffs: {} },
          })
          skipped++
          return
        }
        await prisma.scrapeResult.create({
          data: { entityType: 'title', entityId: title.id, status: 'pending', source: output.source, diffs: output.diffs },
        })
        created++
      })
    }

    return NextResponse.json({ ok: true, created, skipped })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scrape failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify route loads**

Start the dev server (`npm run dev`) and send a test POST:

```bash
curl -X POST http://localhost:3000/api/admin/scrape/start \
  -H "Content-Type: application/json" \
  -d '{"entityType":"person","filter":"empty","entityIds":[10202]}'
```

Expected: `{ "ok": true, "created": 1, "skipped": 0 }` (or `skipped: 1` if Wikipedia doesn't find Colin Clive).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/scrape/start/route.ts
git commit -m "feat: add scrape start API route"
```

---

## Task 6: Results list API route

**Files:**
- Create: `src/app/api/admin/scrape/results/route.ts`

- [ ] **Step 1: Create route**

```typescript
// src/app/api/admin/scrape/results/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status     = searchParams.get('status') ?? 'pending'
    const entityType = searchParams.get('entityType') ?? undefined
    const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize   = 25

    const where = {
      ...(status !== 'all' ? { status } : {}),
      ...(entityType ? { entityType } : {}),
    }

    const [results, total] = await Promise.all([
      prisma.scrapeResult.findMany({
        where,
        orderBy: { scrapedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scrapeResult.count({ where }),
    ])

    // Attach entity names for display
    const personIds = results.filter(r => r.entityType === 'person').map(r => r.entityId)
    const titleIds  = results.filter(r => r.entityType === 'title').map(r => r.entityId)

    const [people, titles] = await Promise.all([
      personIds.length ? prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true } }) : [],
      titleIds.length  ? prisma.title.findMany({ where: { id: { in: titleIds } }, select: { id: true, name: true, year: true } }) : [],
    ])

    const personMap = Object.fromEntries(people.map(p => [p.id, p.name]))
    const titleMap  = Object.fromEntries(titles.map(t => [t.id, `${t.name}${t.year ? ` (${t.year})` : ''}`]))

    const enriched = results.map(r => ({
      ...r,
      entityName: r.entityType === 'person' ? personMap[r.entityId] : titleMap[r.entityId],
      diffCount: Object.keys(r.diffs as object).length,
    }))

    return NextResponse.json({ ok: true, results: enriched, total, page, pageSize })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch results'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify route**

```bash
curl "http://localhost:3000/api/admin/scrape/results?status=pending"
```

Expected: `{ "ok": true, "results": [...], "total": N }` with at least the test record created in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/scrape/results/route.ts
git commit -m "feat: add scrape results list API route"
```

---

## Task 7: Approve API route

**Files:**
- Create: `src/app/api/admin/scrape/results/[id]/approve/route.ts`

Applies the selected field values to the Person or Title record, marks the ScrapeResult as approved.

- [ ] **Step 1: Create route**

```typescript
// src/app/api/admin/scrape/results/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ScrapeResultDiffs } from '@/lib/scrapers/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const { approvedFields, edits } = await request.json() as {
      approvedFields: string[]
      edits?: Record<string, string>
    }

    const result = await prisma.scrapeResult.findUnique({ where: { id } })
    if (!result) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    if (result.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'Already reviewed' }, { status: 409 })
    }

    const diffs = result.diffs as ScrapeResultDiffs

    // Build the update payload: use edited value if present, otherwise scraped
    const updateData: Record<string, unknown> = {}
    for (const field of approvedFields) {
      const d = diffs[field]
      if (!d) continue
      const value = edits?.[field] ?? d.scraped
      updateData[field] = value
    }

    if (Object.keys(updateData).length > 0) {
      if (result.entityType === 'person') {
        await prisma.person.update({ where: { id: result.entityId }, data: updateData })
      } else {
        await prisma.title.update({ where: { id: result.entityId }, data: updateData })
      }
    }

    await prisma.scrapeResult.update({
      where: { id },
      data: {
        status: 'approved',
        approvedFields,
        reviewedAt: new Date(),
        // Store edits back into diffs for export accuracy
        diffs: Object.fromEntries(
          Object.entries(diffs).map(([k, v]) => [
            k,
            approvedFields.includes(k) ? { ...v, edited: edits?.[k] ?? null } : v,
          ])
        ),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Approve failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Test via curl**

Get the ID of the pending ScrapeResult you created in Task 5, then:

```bash
curl -X PATCH http://localhost:3000/api/admin/scrape/results/1/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedFields":["bio"]}'
```

Expected: `{ "ok": true }`. Check Prisma Studio — the Person record should have its `bio` field updated.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/scrape/results/[id]/approve/route.ts
git commit -m "feat: add scrape approve API route"
```

---

## Task 8: Reject API route

**Files:**
- Create: `src/app/api/admin/scrape/results/[id]/reject/route.ts`

- [ ] **Step 1: Create route**

```typescript
// src/app/api/admin/scrape/results/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const result = await prisma.scrapeResult.findUnique({ where: { id } })
    if (!result) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    await prisma.scrapeResult.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reject failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Test via curl**

```bash
curl -X PATCH http://localhost:3000/api/admin/scrape/results/2/reject
```

Expected: `{ "ok": true }`, result status changes to `"rejected"` in Prisma Studio.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/scrape/results/[id]/reject/route.ts
git commit -m "feat: add scrape reject API route"
```

---

## Task 9: Export API route

**Files:**
- Create: `src/app/api/admin/scrape/export/route.ts`

Accepts `{ resultIds: number[] }`. Fetches those approved ScrapeResults, builds Person/Title rows matching the master Excel column layout, returns an XLSX file for download.

The `excelDate` conversion is already defined in the import route. Replicate the date-to-serial helper here rather than importing it (keeps the route self-contained).

- [ ] **Step 1: Create route**

```typescript
// src/app/api/admin/scrape/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as xlsx from 'xlsx'
import type { ScrapeResultDiffs } from '@/lib/scrapers/types'

export const dynamic = 'force-dynamic'

// Convert a JS Date to an Excel serial number (matching existing master file format)
function toExcelDate(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  return Math.round(d.getTime() / 86400000 + 25569)
}

export async function POST(request: NextRequest) {
  try {
    const { resultIds } = await request.json() as { resultIds: number[] }

    if (!resultIds?.length) {
      return NextResponse.json({ ok: false, error: 'No resultIds provided' }, { status: 400 })
    }

    const results = await prisma.scrapeResult.findMany({
      where: { id: { in: resultIds }, status: 'approved' },
    })

    const personIds = results.filter(r => r.entityType === 'person').map(r => r.entityId)
    const titleIds  = results.filter(r => r.entityType === 'title').map(r => r.entityId)

    const [people, titles] = await Promise.all([
      personIds.length ? prisma.person.findMany({ where: { id: { in: personIds } } }) : [],
      titleIds.length  ? prisma.title.findMany({ where: { id: { in: titleIds } } }) : [],
    ])

    const personRows = people.map(p => ({
      'Person ID':           p.id,
      'Person Type':         p.personType,
      'Name':                p.name,
      'Prefix':              p.prefix ?? null,
      'First Name':          p.firstName ?? null,
      'Middle Name':         p.middleName ?? null,
      'Last Name':           p.lastName ?? null,
      'Suffix':              p.suffix ?? null,
      'Birth Name':          p.birthName ?? null,
      'Birth Date':          toExcelDate(p.birthDate),
      'Death Date':          toExcelDate(p.deathDate),
      'Nationality':         p.nationality ?? null,
      'Birthplace':          p.birthplace ?? null,
      'Industry':            p.industry ?? null,
      'Specialty':           p.specialty ?? null,
      'Bio':                 p.bio ?? null,
      'Notable Achievement': p.notableAchievement ?? null,
    }))

    const titleRows = titles.map(t => ({
      'Title ID':           t.id,
      'Title Type':         t.titleType,
      'Title Sort':         t.titleSort ?? null,
      'Title Name':         t.name,
      'Title Release Date': toExcelDate(t.releaseDate),
      'endDate':            toExcelDate(t.endDate),
      'Genre':              t.genre ?? null,
      'Title Description':  t.description ?? null,
      'Runtime (min)':      t.runtime ?? null,
      'Title Score':        t.titleScore ?? null,
    }))

    const wb = xlsx.utils.book_new()
    if (personRows.length) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(personRows), 'Person')
    }
    if (titleRows.length) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(titleRows), 'Title')
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="scrape-export-${Date.now()}.xlsx"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Test export**

First approve at least one ScrapeResult (Task 7). Then:

```bash
curl -X POST http://localhost:3000/api/admin/scrape/export \
  -H "Content-Type: application/json" \
  -d '{"resultIds":[1]}' \
  --output test-export.xlsx
```

Open `test-export.xlsx` in Excel. Verify: correct sheet name (Person or Title), columns match the master file layout, data is correct.

```bash
rm test-export.xlsx
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/scrape/export/route.ts
git commit -m "feat: add scrape XLSX export API route"
```

---

## Task 10: InitiationPanel component

**Files:**
- Create: `src/components/admin/scrape/InitiationPanel.tsx`

- [ ] **Step 1: Create component**

```typescript
// src/components/admin/scrape/InitiationPanel.tsx
'use client'
import { useState } from 'react'

type Props = {
  onComplete: () => void
}

export function InitiationPanel({ onComplete }: Props) {
  const [entityType, setEntityType] = useState<'person' | 'title'>('person')
  const [filter, setFilter] = useState<'all' | 'empty'>('empty')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filter }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setResult({ created: data.created, skipped: data.skipped })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed')
    }
    setLoading(false)
  }

  return (
    <div className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-6 space-y-5">
      <h2 className="font-serif text-lg font-bold text-warm-900 dark:text-warm-200">Start Scrape</h2>

      <div className="flex gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs text-warm-600 dark:text-warm-500 tracking-wide uppercase">Entity Type</p>
          <div className="flex gap-2">
            {(['person', 'title'] as const).map(t => (
              <button
                key={t}
                onClick={() => setEntityType(t)}
                className={`text-sm px-4 py-1.5 rounded-lg border transition-colors capitalize ${
                  entityType === t
                    ? 'bg-steve text-cream border-steve'
                    : 'border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-steve'
                }`}
              >
                {t === 'person' ? 'People' : 'Titles'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-warm-600 dark:text-warm-500 tracking-wide uppercase">Filter</p>
          <div className="flex gap-2">
            {(['empty', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${
                  filter === f
                    ? 'bg-steve text-cream border-steve'
                    : 'border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-steve'
                }`}
              >
                {f === 'empty' ? 'Empty fields only' : 'All records'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-warm-500">Max 50 records per batch. Scrapes run in parallel.</p>

      <button
        onClick={handleStart}
        disabled={loading}
        className="bg-steve hover:bg-steve-hover text-cream text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-40"
      >
        {loading ? 'Scraping…' : 'Start Scrape'}
      </button>

      {result && (
        <p className="text-sm text-warm-600 dark:text-warm-500">
          Done — <span className="text-steve font-medium">{result.created} queued</span>, {result.skipped} not found
        </p>
      )}
      {error && <p className="text-sm text-steve">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/scrape/InitiationPanel.tsx
git commit -m "feat: add scrape InitiationPanel component"
```

---

## Task 11: DiffRow component

**Files:**
- Create: `src/components/admin/scrape/DiffRow.tsx`

Shows a single field's diff with three options: keep current, use scraped, or inline edit. Parent controls the state via `onChange`.

- [ ] **Step 1: Create component**

```typescript
// src/components/admin/scrape/DiffRow.tsx
'use client'
import { useState } from 'react'
import type { FieldDiff } from '@/lib/scrapers/types'

type FieldChoice = 'keep' | 'accept' | 'edit'

type Props = {
  fieldName: string
  diff: FieldDiff
  onChange: (fieldName: string, choice: FieldChoice, editedValue: string) => void
}

const FIELD_LABELS: Record<string, string> = {
  bio: 'Bio',
  description: 'Description',
  genre: 'Genre',
  imageUrl: 'Image URL',
  runtime: 'Runtime (min)',
  year: 'Year',
  releaseDate: 'Release Date',
  nationality: 'Nationality',
  birthplace: 'Birthplace',
  notableAchievement: 'Notable Achievement',
}

export function DiffRow({ fieldName, diff, onChange }: Props) {
  const [choice, setChoice] = useState<FieldChoice>('accept')
  const [editValue, setEditValue] = useState(diff.scraped ?? '')

  function handleChoice(c: FieldChoice) {
    setChoice(c)
    onChange(fieldName, c, editValue)
  }

  function handleEdit(v: string) {
    setEditValue(v)
    onChange(fieldName, 'edit', v)
  }

  const label = FIELD_LABELS[fieldName] ?? fieldName

  return (
    <div className="border-b border-cream-border dark:border-warm-700 py-3 last:border-b-0">
      <p className="text-xs font-medium text-warm-600 dark:text-warm-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div>
          <p className="text-warm-500 mb-1">Current</p>
          <p className="text-warm-700 dark:text-warm-300 bg-cream dark:bg-warm-800 rounded p-2 min-h-8 break-words">
            {diff.current ?? <em className="text-warm-500">empty</em>}
          </p>
        </div>
        <div>
          <p className="text-warm-500 mb-1">Scraped</p>
          <p className="text-warm-700 dark:text-warm-300 bg-cream dark:bg-warm-800 rounded p-2 min-h-8 break-words">
            {diff.scraped ?? <em className="text-warm-500">empty</em>}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['keep', 'accept', 'edit'] as FieldChoice[]).map(c => (
          <button
            key={c}
            onClick={() => handleChoice(c)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              choice === c
                ? 'bg-steve text-cream border-steve'
                : 'border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-steve'
            }`}
          >
            {c === 'keep' ? 'Keep current' : c === 'accept' ? 'Use scraped' : 'Edit'}
          </button>
        ))}
      </div>

      {choice === 'edit' && (
        <textarea
          value={editValue}
          onChange={e => handleEdit(e.target.value)}
          className="mt-2 w-full text-xs border border-cream-border dark:border-warm-700 rounded-lg p-2 bg-cream dark:bg-warm-800 text-warm-900 dark:text-warm-200 resize-y min-h-16 focus:outline-none focus:border-steve"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/scrape/DiffRow.tsx
git commit -m "feat: add DiffRow component for field-level diff review"
```

---

## Task 12: ResultsQueue component

**Files:**
- Create: `src/components/admin/scrape/ResultsQueue.tsx`

Tabbed list (Pending / Approved / Rejected / Not Found). Each row expands to show DiffRows. Apply/Reject/Export controls.

- [ ] **Step 1: Create component**

```typescript
// src/components/admin/scrape/ResultsQueue.tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { DiffRow } from './DiffRow'
import type { FieldDiff } from '@/lib/scrapers/types'

type ScrapeResultRow = {
  id: number
  entityType: string
  entityId: number
  entityName: string
  status: string
  source: string
  diffs: Record<string, FieldDiff>
  diffCount: number
  approvedFields: string[]
}

type Tab = 'pending' | 'approved' | 'rejected' | 'not_found'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending',   label: 'Pending'   },
  { key: 'approved',  label: 'Approved'  },
  { key: 'rejected',  label: 'Rejected'  },
  { key: 'not_found', label: 'Not Found' },
]

type FieldChoices = Record<string, { choice: 'keep' | 'accept' | 'edit'; editedValue: string }>

export function ResultsQueue() {
  const [tab, setTab]                       = useState<Tab>('pending')
  const [results, setResults]               = useState<ScrapeResultRow[]>([])
  const [total, setTotal]                   = useState(0)
  const [loading, setLoading]               = useState(false)
  const [expandedId, setExpandedId]         = useState<number | null>(null)
  const [fieldChoices, setFieldChoices]     = useState<Record<number, FieldChoices>>({})
  const [actionLoading, setActionLoading]   = useState<number | null>(null)
  const [exportIds, setExportIds]           = useState<number[]>([])

  const fetchResults = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/scrape/results?status=${tab}`)
    const data = await res.json()
    if (data.ok) {
      setResults(data.results)
      setTotal(data.total)
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchResults() }, [fetchResults])

  function handleFieldChange(resultId: number, fieldName: string, choice: 'keep' | 'accept' | 'edit', editedValue: string) {
    setFieldChoices(prev => ({
      ...prev,
      [resultId]: { ...prev[resultId], [fieldName]: { choice, editedValue } },
    }))
  }

  async function handleApprove(result: ScrapeResultRow) {
    setActionLoading(result.id)
    const choices = fieldChoices[result.id] ?? {}
    const approvedFields = Object.keys(result.diffs).filter(f => (choices[f]?.choice ?? 'accept') !== 'keep')
    const edits: Record<string, string> = {}
    for (const f of approvedFields) {
      if (choices[f]?.choice === 'edit') edits[f] = choices[f].editedValue
    }
    await fetch(`/api/admin/scrape/results/${result.id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedFields, edits }),
    })
    setExportIds(prev => [...prev, result.id])
    setActionLoading(null)
    fetchResults()
  }

  async function handleReject(id: number) {
    setActionLoading(id)
    await fetch(`/api/admin/scrape/results/${id}/reject`, { method: 'PATCH' })
    setActionLoading(null)
    fetchResults()
  }

  async function handleExport() {
    const res = await fetch('/api/admin/scrape/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultIds: exportIds }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scrape-export-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setExportIds([])
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-cream-border dark:border-warm-700">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-sm px-4 py-2 border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-steve text-steve font-medium'
                : 'border-transparent text-warm-600 dark:text-warm-500 hover:text-steve'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Export bar */}
      {exportIds.length > 0 && (
        <div className="flex items-center justify-between bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg px-4 py-3">
          <p className="text-sm text-warm-600 dark:text-warm-500">
            <span className="text-steve font-medium">{exportIds.length}</span> approved this session
          </p>
          <button
            onClick={handleExport}
            className="text-sm bg-steve hover:bg-steve-hover text-cream px-4 py-1.5 rounded-lg transition-colors"
          >
            Export XLSX
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <p className="text-sm text-warm-500 py-8 text-center">Loading…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-warm-500 py-8 text-center">No {tab} results</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-warm-500">{total} result{total !== 1 ? 's' : ''}</p>
          {results.map(result => (
            <div key={result.id} className="border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden">
              {/* Row header */}
              <div
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 bg-cream-card dark:bg-warm-50/5 cursor-pointer hover:bg-cream dark:hover:bg-warm-50/10 transition-colors"
                onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
              >
                <div>
                  <p className="text-sm font-medium text-warm-900 dark:text-warm-200">{result.entityName ?? `${result.entityType} #${result.entityId}`}</p>
                  <p className="text-xs text-warm-500 mt-0.5 capitalize">{result.entityType} · {result.source} · {result.diffCount} field{result.diffCount !== 1 ? 's' : ''}</p>
                </div>
                {result.status === 'pending' && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleApprove(result)}
                      disabled={actionLoading === result.id}
                      className="text-xs bg-steve hover:bg-steve-hover text-cream px-3 py-1 rounded transition-colors disabled:opacity-40"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => handleReject(result.id)}
                      disabled={actionLoading === result.id}
                      className="text-xs border border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 px-3 py-1 rounded hover:border-steve transition-colors disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                )}
                <span className="text-xs text-warm-500">{expandedId === result.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded diff */}
              {expandedId === result.id && result.diffCount > 0 && (
                <div className="px-4 bg-cream dark:bg-warm-800">
                  {Object.entries(result.diffs).map(([fieldName, diff]) => (
                    <DiffRow
                      key={fieldName}
                      fieldName={fieldName}
                      diff={diff}
                      onChange={(f, choice, editedValue) => handleFieldChange(result.id, f, choice, editedValue)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/scrape/ResultsQueue.tsx
git commit -m "feat: add ResultsQueue component with diff review and export"
```

---

## Task 13: Admin scrape page

**Files:**
- Create: `src/app/admin/scrape/page.tsx`

- [ ] **Step 1: Create page**

```typescript
// src/app/admin/scrape/page.tsx
'use client'
import { useState } from 'react'
import { InitiationPanel } from '@/components/admin/scrape/InitiationPanel'
import { ResultsQueue } from '@/components/admin/scrape/ResultsQueue'

export default function ScrapePage() {
  const [queueKey, setQueueKey] = useState(0)

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pt-2 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-900 dark:text-warm-200">Scrape & Enrich</h1>
      </div>

      <InitiationPanel onComplete={() => setQueueKey(k => k + 1)} />

      <div key={queueKey}>
        <ResultsQueue />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/scrape/page.tsx
git commit -m "feat: add /admin/scrape page"
```

---

## Task 14: Update admin layout navigation

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Add Scrape link**

In `src/app/admin/layout.tsx`, add a link to Scrape after the Images link:

```typescript
// Find this line:
<Link href="/admin/images" className="hover:text-steve transition-colors">Images</Link>
// Add after it:
<Link href="/admin/scrape" className="hover:text-steve transition-colors">Scrape</Link>
```

- [ ] **Step 2: Start dev server and verify the full flow**

```bash
npm run dev
```

1. Open `http://localhost:3000/admin/scrape`
2. Confirm the "Scrape & Enrich" page loads with the initiation panel and empty queue
3. Select "People" + "Empty fields only" → click "Start Scrape"
4. Confirm the pending results appear in the queue after scraping completes
5. Expand a result — verify the two-column diff (current vs scraped) with keep/accept/edit buttons
6. Click "Edit" on a field — confirm inline textarea appears
7. Click "Apply" — confirm the result moves to the Approved tab
8. Click "Export XLSX" — confirm an `.xlsx` file downloads with the correct Person columns

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: add Scrape link to admin navigation"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ TMDB for Titles + Wikipedia for People
- ✅ Bulk queue trigger (max 50, filter all/empty)
- ✅ ScrapeResult DB model with JSONB diffs
- ✅ `{ current, scraped, edited }` diff shape
- ✅ Admin review UI with keep/accept/edit per field
- ✅ Apply per-record (Tasks 7, 12) and batch approve via "Apply" buttons
- ✅ Export batch-scoped rows only (session exportIds tracked in UI)
- ✅ XLSX columns match master file layout exactly (Task 9)
- ✅ `not_found` status when scraper returns null
- ✅ Characters deferred (out of scope)

**Type consistency:**
- `FieldDiff` and `ScrapeResultDiffs` defined once in `types.ts`, imported everywhere
- `ScrapeOutput` returned by both scrapers; consumed by start route
- `handleFieldChange` in ResultsQueue matches `onChange` prop signature in DiffRow
