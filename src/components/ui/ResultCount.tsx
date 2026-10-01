// Result count beside the page title. With a type filter active, `filterText`
// (from src/lib/typeCounts.ts, e.g. "16 Authors") replaces it in steve orange.
export function ResultCount({ total, filterText }: { total: number; filterText?: string }) {
  if (!filterText) {
    return <span className="text-sm font-medium text-warm-600 dark:text-warm-500 tabular-nums">{total} results</span>
  }
  return <span className="text-sm font-medium text-steve tabular-nums">{filterText}</span>
}
