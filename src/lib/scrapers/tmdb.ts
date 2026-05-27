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
  const data = await res.json().catch(() => null) as { results: TmdbMovieResult[] } | null
  return data?.results[0]?.id ?? null
}

async function searchTv(name: string, year?: number): Promise<number | null> {
  const params: Record<string, string> = { query: name }
  if (year) params.first_air_date_year = String(year)
  const res = await fetch(apiUrl('/search/tv', params))
  if (!res.ok) return null
  const data = await res.json().catch(() => null) as { results: TmdbTvResult[] } | null
  return data?.results[0]?.id ?? null
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
    if (!tvId) movieId = await searchMovie(title.name, year)
  }

  let rawDiffs: ScrapeResultDiffs = {}

  if (movieId) {
    const res = await fetch(apiUrl(`/movie/${movieId}`))
    if (!res.ok) return null
    const d = await res.json().catch(() => null) as TmdbMovieDetail | null
    if (!d) return null

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
    const d = await res.json().catch(() => null) as TmdbTvDetail | null
    if (!d) return null

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
