# Suggest-a-Steve Footer Form — Design

**Date:** 2026-06-17
**Status:** Approved

## Goal

Add a minimal contact/suggestion form to the bottom of Stevesdropping so visitors can
report Steves the database is missing. Submissions are emailed (via Resend) to the site
owner. No accounts, no database storage.

Copy:

- Heading: **Are we missing any Steves?**
- Subline: **Let us know and we'll add them Steventually!**

## Scope

In scope:

- A required **message** field and an optional **email** field.
- Global placement: the form renders inside the existing `<footer>` in
  `src/app/layout.tsx`, so it appears at the bottom of every page.
- Email delivery to **steve.sikoryak@gmail.com** via Resend, with the visitor's email
  set as `Reply-To` when supplied.
- Lightweight spam protection: a hidden honeypot field plus a simple per-IP rate limit.

Out of scope (explicitly not building):

- Storing submissions in the database (email only).
- Captcha / Turnstile.
- Any admin UI for viewing submissions.

## Architecture

Three pieces, following existing project conventions (App Router, API routes returning
`NextResponse.json`, Tailwind with the cream/warm + `text-steve` palette).

### 1. `src/components/ui/SuggestForm.tsx` (new, client component)

- `'use client'` component rendered inside the global footer.
- Fields:
  - `email` — optional text input (`type="email"`).
  - `message` — required `<textarea>`.
  - `website` — hidden honeypot input, visually hidden + `tabIndex={-1}` +
    `autoComplete="off"`. Bots fill it; humans don't.
- Local state: field values and a `status` of `idle | sending | sent | error`.
- On submit: `POST` to `/api/suggest` with the field values as JSON. While sending, the
  button is disabled. On success, the form is replaced with a thank-you line
  ("Thanks — we'll add them Steventually!"). On failure, an inline error message shows and
  the form stays editable.
- Styling mirrors existing components (`bg-cream-card`, `border-cream-subtle dark:border-warm-700`,
  serif heading via the existing font variables, `text-steve` accent on the button).

### 2. `src/app/api/suggest/route.ts` (new, `POST`)

Request body: `{ email?: string; message: string; website?: string }`.

Flow:

1. If the honeypot (`website`) is non-empty → return a fake `{ ok: true }` (200) so bots
   get no signal. No email sent.
2. Per-IP rate limit: simple in-memory map keyed by IP (from `x-forwarded-for`), max
   **3 requests / minute**. Over the limit → `429`. (In-memory is acceptable for a
   low-traffic single-region deploy; documented as a known limitation.)
3. Validate:
   - `message` required, trimmed, non-empty, max ~2000 chars → else `400`.
   - `email` optional; if present, must match a basic email regex → else `400`.
4. Send via Resend to `steve.sikoryak@gmail.com`:
   - `from`: `SUGGESTION_FROM` env (sandbox `onboarding@resend.dev` initially; a verified
     `suggestions@stevesdropping.com` later).
   - `replyTo`: the visitor's email when supplied.
   - subject + plain-text body containing the message and the supplied email (or
     "no email provided").
5. Return `{ ok: true }` on success; `500` (with a server-side log) if Resend errors or
   `RESEND_API_KEY` is missing. The route never throws in a way that breaks page render.

### 3. Resend wiring

- Add the `resend` npm dependency.
- `src/lib/resend.ts` — thin module instantiating `new Resend(process.env.RESEND_API_KEY)`.
- Env vars (added to `.env.example` with comments, matching the existing env doc style):
  - `RESEND_API_KEY` — from the Resend dashboard.
  - `SUGGESTION_TO` — recipient (`steve.sikoryak@gmail.com`).
  - `SUGGESTION_FROM` — sender (`onboarding@resend.dev` until the domain is verified).

### Footer change (`src/app/layout.tsx`)

Current footer is a single centered tagline line. New layout: the `<SuggestForm />` block
sits at the top of the footer, with the existing "Stevesdropping — All Steves, All the
Time" tagline kept beneath it (per chosen "form above, keep the tagline" option). The
footer stays a server component; only `SuggestForm` is a client island.

## Data flow

```
footer <SuggestForm/>  →  fetch POST /api/suggest (JSON)
  → honeypot check → rate limit → validate → Resend send (Reply-To = visitor email)
  → { ok: true } | 400 | 429 | 500
  → UI shows thank-you or inline error
```

## Error handling

- Honeypot trip → silent fake success, no email.
- Rate-limited → `429`, UI shows "Too many submissions, try again in a minute."
- Validation failure → `400`, UI shows the specific inline message.
- Resend / config failure → `500` + server log; UI shows generic "Something went wrong,
  please try again." The page itself never crashes from a mailer error.

## Setup note (Resend account)

The sandbox sender `onboarding@resend.dev` only delivers to the **email that owns the
Resend account**. Recommended: create the Resend account under `steve.sikoryak@gmail.com`
so the sandbox delivers immediately with no DNS work. End state: verify `stevesdropping.com`
in that account and switch `SUGGESTION_FROM` to `suggestions@stevesdropping.com`.

## Testing

- Manual: empty message rejected; honeypot-filled request returns ok but sends no email;
  valid message (with and without email) delivers, Reply-To set when email present;
  >3 submits/min returns 429.
- `npm run lint` and `npm run build` pass.
