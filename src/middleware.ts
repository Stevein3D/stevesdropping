import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'admin_session'
const PUBLIC = ['/admin/login', '/api/admin/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = request.cookies.get(COOKIE)?.value
  const expected = btoa(process.env.ADMIN_PASSWORD ?? '')

  if (!session || session !== expected) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
