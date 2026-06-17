# Suggest-a-Steve Footer Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal "Are we missing any Steves?" suggestion form to the global footer that emails submissions to the site owner via Resend.

**Architecture:** A client-component form (`SuggestForm`) renders inside the existing server-rendered footer in `layout.tsx`. It POSTs JSON to a new `/api/suggest` route handler that runs a honeypot check, a per-IP in-memory rate limit, input validation, then sends an email through a thin Resend client wrapper. No database, no captcha.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Resend Node SDK.

## Global Constraints

- Recipient (`SUGGESTION_TO`): `steve.sikoryak@gmail.com`.
- Sender (`SUGGESTION_FROM`): `onboarding@resend.dev` until `stevesdropping.com` is verified in Resend.
- Heading copy verbatim: **Are we missing any Steves?**
- Subline copy verbatim: **Let us know and we'll add them Steventually!**
- Message field is required; email field is optional (validated only if present).
- Visitor email, when supplied, is set as `Reply-To` on the email.
- Honeypot field name: `website`. A filled honeypot returns a fake `{ ok: true }` (no email sent).
- Rate limit: max 3 requests/minute per IP → `429` over the limit.
- Message max length: 2000 chars.
- Email-only; no DB storage, no captcha, no admin UI.
- Match existing styling tokens: `bg-cream-card`, `border-cream-subtle dark:border-warm-700`, `text-steve` accent, serif heading via existing font variables.
- No test framework exists in this repo; verification is via `curl`, `npm run lint`, and `npm run build`.

---

### Task 1: Resend dependency, client wrapper, and env docs

**Files:**
- Modify: `package.json` (add `resend` dependency)
- Create: `src/lib/resend.ts`
- Modify: `.env.example`
- Modify: `.env.local` (local dev values; gitignored — not committed)

**Interfaces:**
- Consumes: nothing.
- Produces: `import { resend } from '@/lib/resend'` → a configured `Resend` client instance. `resend.emails.send({ from, to, replyTo?, subject, text })` returns `Promise<{ data, error }>`.

- [ ] **Step 1: Install the Resend SDK**

Run:
```bash
npm install resend
```
Expected: `resend` appears under `dependencies` in `package.json` and `package-lock.json` updates.

- [ ] **Step 2: Create the Resend client wrapper**

Create `src/lib/resend.ts`:
```typescript
import { Resend } from 'resend'

// Single shared Resend client. RESEND_API_KEY is read at module load.
// If the key is missing, calls will fail at send time and the route handler
// returns a 500 — the page itself is never affected.
export const resend = new Resend(process.env.RESEND_API_KEY)
```

- [ ] **Step 3: Document env vars in `.env.example`**

Append to `.env.example`:
```bash

# Resend — suggestion form (https://resend.com > API Keys)
RESEND_API_KEY="re_your_api_key"
# Where suggestion emails are delivered
SUGGESTION_TO="steve.sikoryak@gmail.com"
# Sender. Use Resend's sandbox until stevesdropping.com is verified,
# then switch to e.g. suggestions@stevesdropping.com
SUGGESTION_FROM="onboarding@resend.dev"
```

- [ ] **Step 4: Add the same keys to `.env.local` for local dev**

Add `RESEND_API_KEY` (real key from the Resend dashboard), `SUGGESTION_TO`, and `SUGGESTION_FROM` to `.env.local`. This file is gitignored — do not commit it.

- [ ] **Step 5: Verify the project still builds**

Run:
```bash
npm run build
```
Expected: build succeeds (Prisma generate + Next build), no TypeScript errors from `src/lib/resend.ts`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/resend.ts .env.example
git commit -m "feat: add Resend client wrapper and suggestion env vars"
```

---

### Task 2: `/api/suggest` route handler

**Files:**
- Create: `src/app/api/suggest/route.ts`

**Interfaces:**
- Consumes: `resend` from `@/lib/resend`; env `SUGGESTION_TO`, `SUGGESTION_FROM`.
- Produces: `POST /api/suggest` accepting JSON `{ email?: string; message: string; website?: string }`. Returns `{ ok: true }` (200) on success or honeypot trip; `{ error: string }` with status `400` (validation), `429` (rate limit), or `500` (send/config failure).

- [ ] **Step 1: Write the route handler**

Create `src/app/api/suggest/route.ts`:
```typescript
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
```

- [ ] **Step 2: Start the dev server**

Run (in a background terminal):
```bash
npm run dev
```
Expected: server ready at `http://localhost:3000`.

- [ ] **Step 3: Verify validation rejects an empty message**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/suggest \
  -H 'Content-Type: application/json' -d '{"message":"   "}'
```
Expected: `400`.

- [ ] **Step 4: Verify the honeypot returns ok without sending**

Run:
```bash
curl -s -X POST http://localhost:3000/api/suggest \
  -H 'Content-Type: application/json' \
  -d '{"message":"real","website":"http://spam.test"}'
```
Expected: `{"ok":true}` and no email delivered to the inbox.

- [ ] **Step 5: Verify an invalid email is rejected**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/suggest \
  -H 'Content-Type: application/json' -d '{"message":"hi","email":"notanemail"}'
```
Expected: `400`.

- [ ] **Step 6: Verify the happy path delivers an email**

Run:
```bash
curl -s -X POST http://localhost:3000/api/suggest \
  -H 'Content-Type: application/json' \
  -d '{"message":"You are missing Steve Buscemi.","email":"fan@example.com"}'
```
Expected: `{"ok":true}` and an email arrives at `steve.sikoryak@gmail.com` with Reply-To `fan@example.com`. (Requires a valid `RESEND_API_KEY`; in the sandbox the recipient must own the Resend account.)

- [ ] **Step 7: Verify rate limiting**

Run the happy-path curl from Step 6 four times within a minute. Expected: the 4th response is `429`.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/suggest/route.ts
git commit -m "feat: add /api/suggest route with honeypot, rate limit, validation"
```

---

### Task 3: `SuggestForm` component and footer integration

**Files:**
- Create: `src/components/ui/SuggestForm.tsx`
- Modify: `src/app/layout.tsx` (footer)

**Interfaces:**
- Consumes: `POST /api/suggest` from Task 2.
- Produces: `export default function SuggestForm()` — a self-contained client component with no props.

- [ ] **Step 1: Write the `SuggestForm` component**

Create `src/components/ui/SuggestForm.tsx`:
```tsx
'use client'
import { useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function SuggestForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      setError('Please add a message.')
      setStatus('error')
      return
    }
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, website }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong, please try again.')
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch {
      setError('Something went wrong, please try again.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-sm text-steve text-center">
        Thanks — we&apos;ll add them Steventually!
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto text-left">
      <h2 className="font-serif text-2xl font-black text-warm-900 dark:text-warm-200 text-center">
        Are we missing any Steves?
      </h2>
      <p className="text-sm text-warm-600 dark:text-warm-500 mt-1 mb-4 text-center">
        Let us know and we&apos;ll add them Steventually!
      </p>

      {/* Honeypot — hidden from humans */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] w-px h-px overflow-hidden"
        aria-hidden="true"
      />

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email (optional)"
        className="w-full rounded-md border border-cream-subtle dark:border-warm-700 bg-cream-card dark:bg-warm-50/5 px-3 py-2 text-sm text-warm-900 dark:text-warm-200 mb-2 focus:outline-none focus:border-steve"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Which Steve are we missing?"
        required
        rows={3}
        maxLength={2000}
        className="w-full rounded-md border border-cream-subtle dark:border-warm-700 bg-cream-card dark:bg-warm-50/5 px-3 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
      />

      {status === 'error' && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-3 w-full rounded-md bg-steve text-white text-sm font-medium py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send suggestion'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Integrate the form into the footer**

In `src/app/layout.tsx`, add the import near the other component imports:
```tsx
import SuggestForm from '@/components/ui/SuggestForm'
```

Replace the existing `<footer>` element:
```tsx
        <footer className="border-t border-cream-border dark:border-warm-700 px-6 py-6 mt-20 text-center text-xs text-warm-600 dark:text-warm-500">
          Stevesdropping — All Steves, All the Time
        </footer>
```
with:
```tsx
        <footer className="border-t border-cream-border dark:border-warm-700 px-6 pt-10 pb-6 mt-20">
          <SuggestForm />
          <p className="text-center text-xs text-warm-600 dark:text-warm-500 mt-10">
            Stevesdropping — All Steves, All the Time
          </p>
        </footer>
```

- [ ] **Step 3: Visually verify the form in the browser**

With `npm run dev` running, open `http://localhost:3000`, scroll to the footer. Expected: heading "Are we missing any Steves?", optional email input, required message textarea, and a `text-steve`-colored submit button, on every page. The honeypot field is not visible.

- [ ] **Step 4: Verify the happy path end-to-end in the browser**

Type a message (and optionally an email), submit. Expected: button shows "Sending…", then the form is replaced by "Thanks — we'll add them Steventually!" and an email arrives at `steve.sikoryak@gmail.com`.

- [ ] **Step 5: Verify lint and build pass**

Run:
```bash
npm run lint && npm run build
```
Expected: both succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/SuggestForm.tsx src/app/layout.tsx
git commit -m "feat: add suggest-a-Steve form to global footer"
```

---

## Notes for the implementer

- `text-steve`, `cream-card`, `cream-subtle`, `cream-border`, and the `warm-*` scale are existing Tailwind tokens defined in `tailwind.config.js` — reuse them, don't introduce new colors.
- The Resend Node SDK uses camelCase `replyTo` (v3+). If a type error appears on that field, check the installed SDK version.
- The sandbox sender `onboarding@resend.dev` only delivers to the email that owns the Resend account. To test end-to-end delivery to `steve.sikoryak@gmail.com`, either create the Resend account under that address or verify `stevesdropping.com`.
