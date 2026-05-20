import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

// Triggered by Vercel Cron (see vercel.json). Refreshes the home page so the
// date-sensitive "Today in Steve History" / "Coming Up" sections roll over at
// midnight ET. Verified with the CRON_SECRET env var Vercel auto-sets.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  revalidatePath('/')
  return NextResponse.json({
    ok: true,
    revalidated: '/',
    at: new Date().toISOString(),
  })
}
