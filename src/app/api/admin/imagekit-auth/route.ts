import { NextResponse } from 'next/server'
import { imagekit } from '@/lib/imagekit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = imagekit.getAuthenticationParameters()
  return NextResponse.json({
    ...auth,
    publicKey:   process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  })
}
