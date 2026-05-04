import type { ImageLoaderProps } from 'next/image'

export default function imagekitLoader({ src, width, quality }: ImageLoaderProps): string {
  const base = src.split('?')[0]
  return `${base}?tr=w-${width},q-${quality ?? 75}`
}
