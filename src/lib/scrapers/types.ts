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
