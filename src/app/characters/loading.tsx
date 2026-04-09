export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <div className="h-9 w-32 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
        <div className="h-4 w-16 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border border-cream-subtle dark:border-warm-700">
            <div className="aspect-[3/4] bg-warm-100 dark:bg-warm-700 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
              <div className="h-3 w-20 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
