import type { Person, Character, Title, Episode, Casting } from '@prisma/client'

// ─── Re-exports for convenience ───────────────────────────────────────────────
export type { Person, Character, Title, Episode, Casting }

// ─── Enriched types with relations ────────────────────────────────────────────

export type PersonWithCastings = Person & {
  castings: (Casting & {
    character: Character
    title: Title
    episode: Episode | null
  })[]
}

export type CharacterWithCastings = Character & {
  castings: (Casting & {
    person: Person
    title: Title
    episode: Episode | null
  })[]
}

export type TitleWithCastings = Title & {
  castings: (Casting & {
    person: Person
    character: Character
  })[]
  episodes: Episode[]
}

export type CastingFull = Casting & {
  person: Person
  character: Character
  title: Title
  episode: Episode | null
}

// ─── API response shapes ──────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { data: T; error?: never }
  | { data?: never; error: string }

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  perPage: number
}
