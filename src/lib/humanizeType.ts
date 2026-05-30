// Tokens that should stay uppercase when humanizing a snake_case type
// ("tv_miniseries" → "TV Miniseries", not "Tv Miniseries").
const UPPERCASE_TOKENS = new Set(['tv'])

export function humanizeType(raw: string): string {
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(word => {
      const lower = word.toLowerCase()
      if (UPPERCASE_TOKENS.has(lower)) return lower.toUpperCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
