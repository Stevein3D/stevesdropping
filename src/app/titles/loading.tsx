export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <div className="h-9 w-20 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
        <div className="h-4 w-16 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
      </div>
      <div className="h-10 w-64 bg-warm-100 dark:bg-warm-700 rounded-lg animate-pulse" />
      <div className="border border-cream-border dark:border-warm-700 rounded-lg overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[44px_52px_1fr_auto] items-center gap-3 px-3 py-2 border-b border-cream-border dark:border-warm-700 last:border-b-0">
            <div className="aspect-[2/3] bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
            <div className="h-4 w-10 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-3/4 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-warm-100 dark:bg-warm-700 rounded animate-pulse" />
            </div>
            <div className="h-5 w-16 bg-warm-100 dark:bg-warm-700 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
