import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="text-center py-32 space-y-4">
      <h1 className="text-6xl font-bold text-gray-700">404</h1>
      <p className="text-gray-400">That Steve doesn't seem to exist… yet.</p>
      <Link href="/" className="inline-block text-sky-400 hover:underline text-sm mt-4">
        ← Back to home
      </Link>
    </div>
  )
}
