// Wording for the result count when a type filter is active ("18 Authors").
// Types are free-form data, so plurals are curated per type: no suffix rule
// survives "henchman", "self", "royalty" or "law enforcement". A type with no
// entry gets "N results · Label", which is never ungrammatical; add an entry
// here when a new type shows up.

type Noun = { one: string; many: string }

// Regular plural: "Author" → "Authors".
const s = (one: string): Noun => ({ one, many: `${one}s` })
// Adjective/mass-noun types read as a kind of character: "24 Law Enforcement characters".
const chars = (label: string): Noun => ({ one: `${label} character`, many: `${label} characters` })

const PERSON_NOUNS: Record<string, Noun> = {
  actor:           s('Actor'),
  actress:         { one: 'Actress', many: 'Actresses' },
  artist:          s('Artist'),
  athlete:         s('Athlete'),
  author:          s('Author'),
  business_person: { one: 'Business Person', many: 'Business People' },
  celebrity:       { one: 'Celebrity', many: 'Celebrities' },
  character:       s('Character'),
  comedian:        s('Comedian'),
  composer:        s('Composer'),
  director:        s('Director'),
  filmmaker:       s('Filmmaker'),
  game_designer:   s('Game Designer'),
  inventor:        s('Inventor'),
  journalist:      s('Journalist'),
  musician:        s('Musician'),
  other:           { one: 'Other Person', many: 'Other People' },
  performer:       s('Performer'),
  politician:      s('Politician'),
  producer:        s('Producer'),
  royalty:         s('Royal'),
  scientist:       s('Scientist'),
  writer:          s('Writer'),
}

const CHARACTER_NOUNS: Record<string, Noun> = {
  agent:           s('Agent'),
  animal:          s('Animal'),
  antagonist:      s('Antagonist'),
  cameo:           s('Cameo'),
  character:       s('Character'),
  clown:           s('Clown'),
  cowboy:          s('Cowboy'),
  doctor:          s('Doctor'),
  gangster:        s('Gangster'),
  henchman:        { one: 'Henchman', many: 'Henchmen' },
  host:            s('Host'),
  law_enforcement: chars('Law Enforcement'),
  leader:          s('Leader'),
  machine:         s('Machine'),
  media:           chars('Media'),
  medical:         chars('Medical'),
  military:        chars('Military'),
  musician:        s('Musician'),
  other:           chars('Other'),
  police:          chars('Police'),
  politician:      s('Politician'),
  protagonist:     s('Protagonist'),
  religious:       chars('Religious'),
  royalty:         s('Royal'),
  self:            { one: 'Playing Themselves', many: 'Playing Themselves' },
  supporting:      chars('Supporting'),
}

export function typeCountText(kind: 'person' | 'character', type: string, label: string, total: number): string {
  const noun = (kind === 'person' ? PERSON_NOUNS : CHARACTER_NOUNS)[type]
  if (!noun) return `${total === 0 ? 'No' : total} result${total === 1 ? '' : 's'} · ${label}`
  if (total === 0) return `No ${noun.many}`
  return `${total} ${total === 1 ? noun.one : noun.many}`
}
