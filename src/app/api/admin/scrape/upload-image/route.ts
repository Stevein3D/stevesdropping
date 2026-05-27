import { NextRequest, NextResponse } from 'next/server'
import { imagekit } from '@/lib/imagekit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId, imageUrl } = await request.json() as {
      entityType: 'person' | 'title'
      entityId: number
      imageUrl: string
    }

    if (!entityType || !entityId || !imageUrl) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const result = await imagekit.upload({
      file: imageUrl,
      fileName: `${entityType}-${entityId}`,
      folder: '/scrape',
      useUniqueFileName: false,
    })

    return NextResponse.json({ ok: true, url: result.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
