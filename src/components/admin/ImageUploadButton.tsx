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
  folder:       string   // e.g. "/stevesdropping/people"
  fileName:     string   // e.g. "10001.jpg"
  currentUrl:   string | null
  label:        string
}

export function ImageUploadButton({ entity, id, folder, fileName, currentUrl, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const router = useRouter()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')

    try {
      // 1. Get auth parameters from our server
      const authRes = await fetch('/api/admin/imagekit-auth')
      const { token, expire, signature, publicKey } = await authRes.json()

      // 2. Upload directly to ImageKit
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

      // 3. Save URL to database
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

    // Reset so same file can be re-uploaded if needed
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-3 hover:border-steve transition-colors">
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
