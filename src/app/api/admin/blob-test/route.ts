import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'

// Server-side smoke test for BLOB_READ_WRITE_TOKEN. Hits vercel.com/api/blob
// directly with the env var as bearer, bypassing the client-token / handleUpload
// flow. Cookie-gated by middleware (/api/admin/*).
export async function GET() {
  const tokenLength = process.env.BLOB_READ_WRITE_TOKEN?.length ?? 0
  const tokenPrefix = process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 24) ?? ''
  try {
    const blob = await put(
      `test/${Date.now()}.txt`,
      `hello from stevesdropping at ${new Date().toISOString()}`,
      { access: 'private', contentType: 'text/plain' },
    )
    return NextResponse.json({ ok: true, url: blob.url, tokenLength, tokenPrefix })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown',
        tokenLength,
        tokenPrefix,
      },
      { status: 500 },
    )
  }
}
