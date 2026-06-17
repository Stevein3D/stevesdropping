import { NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

const MAX_MESSAGE_LENGTH = 2000
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Simple in-memory per-IP rate limiter. Adequate for a low-traffic,
// single-region deployment; resets on cold start.
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > RATE_LIMIT
}

export async function POST(request: Request) {
  let body: { email?: unknown; message?: unknown; website?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Honeypot: bots fill this hidden field. Pretend success, send nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Try again in a minute.' },
      { status: 429 },
    )
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'A message is required.' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'That email looks invalid.' }, { status: 400 })
  }

  const to = process.env.SUGGESTION_TO
  const from = process.env.SUGGESTION_FROM
  if (!to || !from) {
    console.error('[suggest] SUGGESTION_TO or SUGGESTION_FROM is not set')
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email || undefined,
      subject: 'New Steve suggestion — Stevesdropping',
      text: `New suggestion from Stevesdropping:\n\n${message}\n\nFrom: ${email || 'no email provided'}`,
    })
    if (error) {
      console.error('[suggest] Resend error:', error)
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }
  } catch (err) {
    console.error('[suggest] send threw:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
