import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'admin_session'
// /api/admin/import/upload-url receives Vercel's blob.upload-completed callback,
// which doesn't carry the admin cookie. handleUpload verifies its own bearer
// token; we re-check the admin cookie inside the route for the user-initiated leg.
const PUBLIC = ['/admin/login', '/api/admin/login', '/api/admin/import/upload-url']

// AI training crawlers + aggressive SEO bots — blocked at the edge with 403.
// Matched as a case-insensitive substring against the user-agent.
const BLOCKED_UA = new RegExp(
  [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'PerplexityBot',
    'Perplexity-User',
    'CCBot',
    'Google-Extended',
    'Bytespider',
    'Amazonbot',
    'Applebot-Extended',
    'cohere-ai',
    'Diffbot',
    'DuckAssistBot',
    'Meta-ExternalAgent',
    'Meta-ExternalFetcher',
    'FacebookBot',
    'ImagesiftBot',
    'omgili',
    'PetalBot',
    'SemrushBot',
    'AhrefsBot',
    'MJ12bot',
    'DotBot',
  ].join('|'),
  'i'
)

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block known scraping/AI-training bots before they hit any function.
  const ua = request.headers.get('user-agent') ?? ''
  if (BLOCKED_UA.test(ua)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Admin auth (only applies to /admin/* and /api/admin/*).
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (PUBLIC.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    const session = request.cookies.get(COOKIE)?.value
    const expected = btoa(process.env.ADMIN_PASSWORD ?? '')

    if (!session || session !== expected) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

// Run middleware on everything except static assets / image optimizer / favicon.
// Static asset paths must NOT trigger middleware — that would multiply edge CPU.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
