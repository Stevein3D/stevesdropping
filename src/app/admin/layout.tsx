import Link from 'next/link'
import { LogoutButton } from '@/components/admin/LogoutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b border-cream-border dark:border-warm-700 bg-warm-100 dark:bg-warm-700 px-6 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-warm-600 dark:text-warm-500">
          <div className="flex items-center gap-5">
            <span className="font-serif font-bold text-warm-900 dark:text-warm-200">Admin</span>
            <Link href="/admin" className="hover:text-steve transition-colors">Dashboard</Link>
            <Link href="/admin/import" className="hover:text-steve transition-colors">Import Data</Link>
            <Link href="/admin/images" className="hover:text-steve transition-colors">Images</Link>
          </div>
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  )
}
