# Scrape & Enrich System — Design Spec

**Date:** 2026-05-26
**Project:** Stevesdropping
**Scope:** People + Titles (Characters deferred to future phase)

---

## Overview

An admin-driven bulk enrichment system that scrapes structured data from TMDB (for Titles) and the Wikipedia REST API (for People), stages results in the database for human review, and applies approved changes both to the live Neon/Postgres DB and to the local Excel master file.

---

## Data Sources

| Entity | Source | API |
|--------|--------|-----|
| Person | Wikipedia REST API | `api.en.wikipedia.org/api/rest_v1/page/summary/{title}` — no key required |
| Title  | TMDB API | `api.themoviedb.org/3/` — free key stored in env as `TMDB_API_KEY` |

IMDB is not used — scraping it violates their ToS and is actively blocked. TMDB covers the same title/film/TV data via a clean public API.

---

## Data Model

One new Prisma model added to the existing schema:

```prisma
model ScrapeResult {
  id             Int       @id @default(autoincrement())
  entityType     String    // "person" | "title"
  entityId       Int
  status         String    @default("pending") // "pending" | "approved" | "rejected" | "not_found"
  source         String    // "tmdb" | "wikipedia"
  diffs          Json      // { fieldName: { current: string|null, scraped: string|null, edited: string|null } }
  approvedFields String[]  // fields admin selected to apply
  scrapedAt      DateTime  @default(now())
  reviewedAt     DateTime?
  updatedAt      DateTime  @updatedAt

  @@map("scrape_results")
}
```

### Diff shape per field

```ts
type FieldDiff = {
  current: string | null   // current value in DB
  scraped: string | null   // value returned by scraper
  edited:  string | null   // admin override (if manually edited)
}

type ScrapeResultDiffs = {
  [fieldName: string]: FieldDiff
}
```

Only fields where the scraped value differs from the current DB value are included — unchanged fields are omitted from `diffs`.

The `approvedFields` array records which field names the admin chose to apply. On write, the apply logic uses `edited` if present, `scraped` if accepted as-is.

---

## Scraping Layer

Two modules in `src/lib/scrapers/`:

### `wikipedia.ts` — Person enrichment

Searches Wikipedia by person name. Pulls:

| DB Field | Wikipedia source |
|----------|-----------------|
| `bio` | `extract` from page summary |
| `birthDate` | infobox / structured data |
| `birthYear` | derived from birthDate |
| `deathDate` | infobox / structured data |
| `deathYear` | derived from deathDate |
| `nationality` | infobox |
| `birthplace` | infobox |
| `imageUrl` | page thumbnail |

Returns a `ScrapeResultDiffs` object. All values are strings; date fields are ISO 8601 strings.

### `tmdb.ts` — Title enrichment

Searches TMDB by title name + year. Pulls:

| DB Field | TMDB source |
|----------|------------|
| `description` | `overview` |
| `genre` | first genre name from `genres[]` |
| `imageUrl` | `https://image.tmdb.org/t/p/w500{poster_path}` |
| `runtime` | `runtime` (minutes) |
| `year` | year portion of `release_date` |
| `releaseDate` | `release_date` |

Returns a `ScrapeResultDiffs` object.

Both scrapers share a common return type and error contract: if no match is found, they return `null` and the job is marked with a `not_found` status variant (stored in `status`).

---

## Admin UI — `/admin/scrape`

### Phase 1: Initiation Panel

- Entity type selector: **People** / **Titles**
- Filter: **All records** / **Records with empty fields only**
- Optional name search to narrow the batch
- "Start Scrape" button → `POST /api/admin/scrape/start`
- Progress bar while scraping runs (batch of 20–50 recommended; larger batches are supported but slower)

### Phase 2: Review Queue

Tabbed view: **Pending** / **Approved** / **Rejected** / **Not Found**

Each row in the table shows: entity name, source, number of differing fields, and an Expand button.

**Expanded diff view** — a field-by-field table with three options per field:

| Option | Behavior |
|--------|----------|
| Keep current | Field is excluded from `approvedFields` |
| Use scraped | Field added to `approvedFields`; `scraped` value is written |
| Edit | Inline text input pre-filled with scraped value; `edited` value is written |

Actions:
- **Apply** — applies approved fields for this record, marks `ScrapeResult` as approved
- **Reject** — marks record as rejected, no DB changes
- **Approve All Pending** — bulk-applies all pending results using scraped values for all differing fields (no manual editing)

### Phase 3: Export

After reviewing a batch, an **Export** button downloads an Excel file containing only the rows approved in the current session.

- One sheet per entity type (Person, Title) matching the exact column layout of the master Excel file
- Person columns: `Person ID`, `Person Type`, `Name`, `Prefix`, `First Name`, `Middle Name`, `Last Name`, `Suffix`, `Birth Name`, `Birth Date`, `Death Date`, `Nationality`, `Birthplace`, `Industry`, `Specialty`, `Bio`, `Notable Achievement`
- Title columns: `Title ID`, `Title Type`, `Title Sort`, `Title Name`, `Title Release Date`, `endDate`, `Genre`, `Title Description`, `Runtime (min)`, `Title Score`
- Dates exported as Excel serial numbers to match the existing master format
- `imageUrl` is written to the DB only — no image column exists in the Excel master

**Local sync workflow:** open master Excel → find matching rows by ID → paste exported rows over them.

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/admin/scrape/start` | Accepts `{ entityType, entityIds? }` or `{ entityType, filter }`. Runs scrapers, writes `ScrapeResult` rows. |
| `GET` | `/api/admin/scrape/results` | Paginated list of `ScrapeResult` rows; filterable by `status` and `entityType`. |
| `PATCH` | `/api/admin/scrape/results/[id]/approve` | Accepts `{ approvedFields: string[], edits?: Record<string, string> }`. Applies changes to Person/Title, marks result approved. |
| `PATCH` | `/api/admin/scrape/results/[id]/reject` | Marks result rejected. |
| `POST` | `/api/admin/scrape/export` | Accepts `{ resultIds: number[] }`. Returns `.xlsx` download of approved rows matching master column format. |

---

## Out of Scope (This Phase)

- Character enrichment — deferred; most fictional characters won't have standalone TMDB/Wikipedia entries
- AI-generated bios or editorial rewrites — raw scraped data only
- Automatic/scheduled scraping — admin-triggered only
- Full sheet export — export is batch-scoped (approved rows from current session only)
