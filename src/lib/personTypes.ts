import { humanizeType } from './humanizeType'

// personType supports comma-separated values ("musician,actor") so a person can
// be more than one thing. Import normalizes each token (lowercase + underscores)
// and joins with bare commas; everything here works token-wise on that format.

// Curated labels — any token not listed here falls back to humanizeType().
export const PERSON_TYPE_LABELS: Record<string, string> = {
  actor: 'Actor', artist: 'Artist', author: 'Author', celebrity: 'Celebrity',
  comedian: 'Comedian', composer: 'Composer', director: 'Director',
  filmmaker: 'Filmmaker', inventor: 'Inventor', musician: 'Musician',
  athlete: 'Athlete', writer: 'Writer', other: 'Other',
}

export function splitPersonTypes(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

export function personTypeLabel(token: string): string {
  return PERSON_TYPE_LABELS[token] ?? humanizeType(token)
}

// Prisma filter matching a single token anywhere in the CSV column. Relies on
// the canonical no-space storage format ("a,b") to avoid substring false
// positives (e.g. "actor" must not match "voice_actor").
export function personTypeFilter(type: string) {
  return {
    OR: [
      { personType: type },
      { personType: { startsWith: `${type},` } },
      { personType: { endsWith: `,${type}` } },
      { personType: { contains: `,${type},` } },
    ],
  }
}

// First names that qualify for the "Just the Steves, please" filter.
// Lowercase — compare case-insensitively.
export const STEVE_NAMES = [
  'steve', 'steven', 'stephen', 'esteban', 'stefan', 'stephanie',
  'stevie', 'steph', 'stef', 'stephon',
]

// Postgres regex matching any steve-name as a whole word, for entities that
// only have a full name field (characters, titles). \m/\M are PG word bounds.
export const STEVE_NAME_REGEX = `\\m(${STEVE_NAMES.join('|')})\\M`
