'use client'
import { useState, useEffect, useRef, CSSProperties } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'

interface Props {
  src: string
  alt: string
  sizes: string
  containerClassName: string
  imageClassName?: string
  scale?: number
}

export function LightboxImage({ src, alt, sizes, containerClassName, imageClassName = 'object-cover', scale = 3 }: Props) {
  const [preview, setPreview] = useState<CSSProperties | null>(null)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { setMounted(true) }, [])

  const show = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const w = Math.min(rect.width * scale, 600)
    const h = (rect.height / rect.width) * w

    let left = rect.right + 10
    if (left + w > window.innerWidth - 10) left = rect.left - w - 10

    let top = rect.top + rect.height / 2 - h / 2
    top = Math.max(10, Math.min(top, window.innerHeight - h - 10))

    setPreview({ position: 'fixed', left, top, width: w, height: h, zIndex: 9999 })
  }

  const hide = () => {
    clearTimeout(hoverTimer.current)
    setPreview(null)
  }

  const onMouseEnter = () => {
    // Start fetching the image immediately so it's ready when the preview appears
    const img = new window.Image()
    img.src = src
    hoverTimer.current = setTimeout(show, 200)
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`${containerClassName} cursor-default`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={hide}
      >
        <Image src={src} alt={alt} fill className={imageClassName} sizes={sizes} />
      </div>

      {mounted && preview && createPortal(
        <div
          style={preview}
          className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-black/20 pointer-events-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        </div>,
        document.body
      )}
    </>
  )
}
