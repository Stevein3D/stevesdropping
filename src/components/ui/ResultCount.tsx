// Result count beside the page title. With a type filter active it reads in the
// filter's own terms ("16 Authors") in steve orange; otherwise "N results".
export function ResultCount({ total, noun }: { total: number; noun?: { one: string; many: string } }) {
  if (!noun) {
    return <span className="text-sm font-medium text-warm-600 dark:text-warm-500 tabular-nums">{total} results</span>
  }
  return (
    <span className="text-sm font-medium text-steve tabular-nums">
      {total === 0 ? `No ${noun.many}` : `${total} ${total === 1 ? noun.one : noun.many}`}
    </span>
  )
}

// "Author" → "Authors", "Celebrity" → "Celebrities".
export function pluralize(label: string): string {
  if (/[^aeiou]y$/i.test(label)) return label.slice(0, -1) + 'ies'
  if (/(s|x|ch|sh)$/i.test(label)) return label + 'es'
  return label + 's'
}
