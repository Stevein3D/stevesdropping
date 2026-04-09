'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Entity = 'person' | 'character' | 'title' | 'casting'

type Record = {
  id:       number
  name:     string
  imageUrl: string | null
}

type MatchedFile = {
  file:    File
  record:  Record
  status:  'pending' | 'uploading' | 'done' | 'error'
  url?:    string
}

type UnmatchedFile = {
  file:    File
  reason:  string
}

type Props = {
  records:  Record[]
  entity:   Entity
  folder:   string
}

function matchFiles(files: File[], records: Record[]): { matched: MatchedFile[]; unmatched: UnmatchedFile[] } {
  const matched: MatchedFile[] = []
  const unmatched: UnmatchedFile[] = []

  for (const file of files) {
    const base = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '')
    const asId = parseInt(base)
    let record: Record | undefined

    if (!isNaN(asId)) {
      record = records.find((r) => r.id === asId)
    } else {
      record = records.find((r) => r.name.toLowerCase() === base.toLowerCase())
    }

    if (record) {
      matched.push({ file, record, status: 'pending' })
    } else {
      unmatched.push({ file, reason: `No record found for "${base}"` })
    }
  }

  return { matched, unmatched }
}

export function BatchUploadSection({ records, entity, folder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [matched, setMatched]     = useState<MatchedFile[]>([])
  const [unmatched, setUnmatched] = useState<UnmatchedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone]           = useState(false)
  const router = useRouter()

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const result = matchFiles(files, records)
    setMatched(result.matched)
    setUnmatched(result.unmatched)
    setDone(false)
  }

  async function uploadAll() {
    if (!matched.length) return
    setUploading(true)

    for (let i = 0; i < matched.length; i++) {
      const item = matched[i]
      setMatched((prev) => prev.map((m, idx) => idx === i ? { ...m, status: 'uploading' } : m))

      try {
        const authRes = await fetch('/api/admin/imagekit-auth')
        const { token, expire, signature, publicKey } = await authRes.json()

        const form = new FormData()
        form.append('file', item.file)
        form.append('fileName', `${item.record.id}.jpg`)
        form.append('folder', folder)
        form.append('publicKey', publicKey)
        form.append('signature', signature)
        form.append('expire', String(expire))
        form.append('token', token)
        form.append('useUniqueFileName', 'false')

        const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: form,
        })

        if (!uploadRes.ok) throw new Error('Upload failed')
        const { url } = await uploadRes.json()

        await fetch('/api/admin/update-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity, id: item.record.id, url }),
        })

        setMatched((prev) => prev.map((m, idx) => idx === i ? { ...m, status: 'done', url } : m))
      } catch {
        setMatched((prev) => prev.map((m, idx) => idx === i ? { ...m, status: 'error' } : m))
      }
    }

    setUploading(false)
    setDone(true)
    router.refresh()
  }

  function reset() {
    setMatched([])
    setUnmatched([])
    setDone(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const pendingCount = matched.filter((m) => m.status === 'pending').length
  const doneCount    = matched.filter((m) => m.status === 'done').length
  const errorCount   = matched.filter((m) => m.status === 'error').length

  return (
    <div className="border border-cream-border dark:border-warm-700 rounded-lg p-4 space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-warm-900 dark:text-warm-200">Batch Upload</p>
        <p className="text-xs text-warm-500">
          Files are matched by ID (e.g. 10001.jpg) or name (e.g. Chris Evans.jpg)
        </p>
      </div>

      {matched.length === 0 && unmatched.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-cream-border dark:border-warm-700 rounded-lg p-6 text-center cursor-pointer hover:border-steve dark:hover:border-warm-200 transition-colors"
        >
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
          <p className="text-sm text-warm-600 dark:text-warm-500">Click to select multiple image files</p>
        </div>
      )}

      {(matched.length > 0 || unmatched.length > 0) && (
        <div className="space-y-3">
          {/* Matched */}
          {matched.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-warm-500 uppercase tracking-wide">
                Matched — {matched.length} file{matched.length !== 1 ? 's' : ''}
              </p>
              <div className="border border-cream-border dark:border-warm-700 rounded-lg overflow-y-auto max-h-[420px]">
                {matched.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_80px] gap-3 px-3 py-2 border-b border-cream-border dark:border-warm-700 last:border-b-0 text-xs"
                  >
                    <span className="text-warm-600 dark:text-warm-500 truncate">{item.file.name}</span>
                    <span className="text-warm-900 dark:text-warm-200 truncate">{item.record.name}</span>
                    <span className={
                      item.status === 'done'      ? 'text-green-600'
                      : item.status === 'error'   ? 'text-steve'
                      : item.status === 'uploading' ? 'text-warm-500 animate-pulse'
                      : 'text-warm-400'
                    }>
                      {item.status === 'done'      ? '✓ Done'
                      : item.status === 'error'    ? '✗ Error'
                      : item.status === 'uploading' ? 'Uploading…'
                      : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched */}
          {unmatched.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-warm-500 uppercase tracking-wide">
                Unmatched — {unmatched.length} file{unmatched.length !== 1 ? 's' : ''} (will be skipped)
              </p>
              <div className="border border-cream-subtle dark:border-warm-700 rounded-lg overflow-y-auto max-h-[420px] opacity-60">
                {unmatched.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr] gap-3 px-3 py-2 border-b border-cream-border dark:border-warm-700 last:border-b-0 text-xs">
                    <span className="text-warm-600 dark:text-warm-500 truncate">{item.file.name}</span>
                    <span className="text-warm-400">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!done ? (
              <button
                onClick={uploadAll}
                disabled={uploading || pendingCount === 0}
                className="bg-steve hover:bg-steve-hover text-cream text-sm px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                {uploading ? `Uploading… (${doneCount}/${matched.length})` : `Upload ${matched.length} file${matched.length !== 1 ? 's' : ''}`}
              </button>
            ) : (
              <p className="text-sm text-warm-600 dark:text-warm-500">
                {doneCount} uploaded{errorCount > 0 ? `, ${errorCount} failed` : ''}
              </p>
            )}
            <button
              onClick={reset}
              disabled={uploading}
              className="text-xs text-warm-500 hover:text-steve transition-colors disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
