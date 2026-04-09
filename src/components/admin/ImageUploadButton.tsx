'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Request a small thumbnail from ImageKit instead of the full-res image
function ikThumb(url: string | null): string | null {
  if (!url) return null
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}tr=w-200,q-70`
}

type Entity = 'person' | 'character' | 'title' | 'casting'

type Props = {
  entity:       Entity
  id:           number
  folder:       string
  fileName:     string
  currentUrl:   string | null
  label:        string
  featured?:    boolean
}

function StarBadge({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={active ? 'Remove from showcase' : 'Add to showcase'}
      className={`absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center transition-all z-10 ${
        active
          ? 'text-amber-400 drop-shadow-sm'
          : 'text-white/50 hover:text-amber-300'
      }`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
      </svg>
      {/* S letter centered in star */}
      <span className="absolute text-[7px] font-black leading-none" style={{ color: active ? '#1a1008' : 'transparent' }}>
        S
      </span>
    </button>
  )
}

export function ImageUploadButton({ entity, id, folder, fileName, currentUrl, label, featured = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus]       = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const [isFeatured, setIsFeatured]   = useState(featured)
  const [toggling, setToggling]       = useState(false)
  const [toggleError, setToggleError] = useState(false)
  const router = useRouter()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')

    try {
      const authRes = await fetch('/api/admin/imagekit-auth')
      const { token, expire, signature, publicKey } = await authRes.json()

      const form = new FormData()
      form.append('file', file)
      form.append('fileName', fileName)
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

      if (!uploadRes.ok) throw new Error('ImageKit upload failed')

      const { url } = await uploadRes.json()

      const saveRes = await fetch('/api/admin/update-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, id, url }),
      })

      if (!saveRes.ok) throw new Error('Failed to save URL to database')

      setPreviewUrl(url)
      setStatus('done')
      router.refresh()
    } catch {
      setStatus('error')
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleToggleFeatured() {
    if (toggling) return
    setToggling(true)
    setToggleError(false)
    const next = !isFeatured
    try {
      const res = await fetch('/api/admin/toggle-featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, id, featured: next }),
      })
      if (res.ok) {
        setIsFeatured(next)
      } else {
        const body = await res.json().catch(() => ({}))
        console.error('toggle-featured failed:', res.status, body)
        setToggleError(true)
        setTimeout(() => setToggleError(false), 2000)
      }
    } catch (err) {
      console.error('toggle-featured error:', err)
      setToggleError(true)
      setTimeout(() => setToggleError(false), 2000)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-3 hover:border-steve dark:hover:border-warm-200 transition-colors">
      <div className="aspect-[3/4] mb-2 rounded overflow-hidden bg-warm-100 dark:bg-warm-700 relative">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ikThumb(previewUrl) ?? previewUrl}
            alt={label}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-warm-500 text-xs">
            No image
          </div>
        )}

        {/* Featured star — only for supported entities */}
        {entity !== 'casting' && (
          <>
            <StarBadge active={isFeatured} onClick={handleToggleFeatured} />
            {toggleError && (
              <span className="absolute top-1.5 left-1.5 text-[9px] bg-steve text-cream px-1.5 py-0.5 rounded z-10">
                Error
              </span>
            )}
          </>
        )}
      </div>

      <p className="text-xs font-medium text-warm-900 dark:text-warm-200 truncate mb-2">{label}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'uploading'}
        className={`w-full text-[10px] py-1 rounded transition-colors ${
          status === 'done'
            ? 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500'
            : status === 'error'
            ? 'bg-steve/10 text-steve'
            : 'bg-steve hover:bg-steve-hover text-cream disabled:opacity-50'
        }`}
      >
        {status === 'uploading' ? 'Uploading…'
          : status === 'done'  ? 'Uploaded ✓'
          : status === 'error' ? 'Error — retry'
          : previewUrl         ? 'Replace'
          : 'Upload'}
      </button>
    </div>
  )
}
