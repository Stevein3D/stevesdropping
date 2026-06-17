import { Resend } from 'resend'

// Single shared Resend client. RESEND_API_KEY is read at module load.
// If the key is missing, calls will fail at send time and the route handler
// returns a 500 — the page itself is never affected.
export const resend = new Resend(process.env.RESEND_API_KEY)
