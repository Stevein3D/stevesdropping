import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export const dynamic = 'force-dynamic'

const COOKIE = 'admin_session'

// This endpoint serves two POST shapes from @vercel/blob/client:
//   1. browser → server: "generate-client-token" — gated by the admin cookie
//   2. Vercel  → server: "blob.upload-completed" callback — has no cookie;
//      handleUpload verifies its own bearer token, and middleware lets it pass.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = cookies().get(COOKIE)?.value
        const expected = btoa(process.env.ADMIN_PASSWORD ?? '')
        if (!session || session !== expected) {
          throw new Error('Unauthorized')
        }
        return {
          allowedContentTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/octet-stream',
          ],
          maximumSizeInBytes: 100 * 1024 * 1024,
        }
      },
      onUploadCompleted: async () => {
        // no-op — the browser POSTs the resulting URL straight to /api/admin/import
      },
    })
    return NextResponse.json(json)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload token error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
