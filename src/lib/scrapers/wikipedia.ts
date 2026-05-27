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
  const data = await res.json().catch(() => null) as WikiSummary | null
  if (!data) return null
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
  const data = await res.json().catch(() => null) as { query?: { search?: { title: string }[] } } | null
  return data?.query?.search?.[0]?.title ?? null
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
