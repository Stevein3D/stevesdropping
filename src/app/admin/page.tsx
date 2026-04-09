import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pt-2 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-900 dark:text-warm-200">Dashboard</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
        <Link
          href="/admin/import"
          className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-5 hover:border-steve dark:hover:border-warm-200 transition-colors"
        >
          <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 mb-1">Import Data</h2>
          <p className="text-sm text-warm-500">Upload an XLSX to sync people, characters, titles, episodes, and castings</p>
        </Link>
        <Link
          href="/admin/images"
          className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-5 hover:border-steve dark:hover:border-warm-200 transition-colors"
        >
          <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 mb-1">Images</h2>
          <p className="text-sm text-warm-500">Upload and manage images for people, characters, titles, and castings</p>
        </Link>
      </div>
    </div>
  )
}
