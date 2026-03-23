# Stevesdropping

A database cataloging actors, celebrities, and characters named Steve across film and television.

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL (Neon) · Tailwind CSS · Vercel

---

## Project Structure

```
stevesdropping/
├── prisma/
│   ├── schema.prisma       # Data models + enums
│   └── seed.ts             # Full seed from xlsx data
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout + nav
│   │   ├── page.tsx        # Homepage with stats
│   │   ├── not-found.tsx
│   │   ├── api/
│   │   │   ├── people/     # GET /api/people, /api/people/[id]
│   │   │   ├── characters/ # GET /api/characters
│   │   │   ├── titles/     # GET /api/titles
│   │   │   └── episodes/   # GET /api/episodes
│   │   ├── people/
│   │   │   ├── page.tsx    # People listing w/ search + filter
│   │   │   └── [id]/page.tsx  # Person detail + filmography
│   │   ├── characters/
│   │   │   ├── page.tsx    # Characters listing
│   │   │   └── [id]/page.tsx  # Character detail + who played them
│   │   └── titles/
│   │       ├── page.tsx    # Titles listing w/ search + filter
│   │       └── [id]/page.tsx  # Title detail + Steve cast + episodes
│   ├── lib/
│   │   └── prisma.ts       # Prisma client singleton
│   └── types/
│       └── index.ts        # Enriched Prisma types
├── .env.example
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd stevesdropping
npm install
```

### 2. Set up Neon

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project — name it `stevesdropping`
3. From your project dashboard, go to **Connection Details**
4. Copy the **pooled connection string** → `DATABASE_URL`
5. Copy the **direct connection string** → `DIRECT_URL`

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Neon connection strings:

```env
DATABASE_URL="postgresql://user:pass@ep-xxxx.us-east-1.aws.neon.tech/stevesdropping?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-xxxx.us-east-1.aws.neon.tech/stevesdropping?sslmode=require"
```

> **Why two URLs?** Prisma needs the direct URL for migrations (bypasses PgBouncer pooler). The pooled URL is used for runtime queries — important for serverless on Vercel.

### 4. Push schema + seed

```bash
npm run db:push     # Push schema to Neon (no migration files)
npm run db:seed     # Seed all 14 people, 2 characters, 15 titles, 5 episodes, 17 castings
```

Or if you want full migration history:

```bash
npm run db:migrate  # Creates migration files in prisma/migrations/
npm run db:seed
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema changes without migration files |
| `npm run db:migrate` | Run migrations (creates migration files) |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:reset` | Wipe + re-migrate + re-seed |

---

## Data Model

```
Person ──────────────── Casting ──────────────── Character
  (actor/celebrity)    (who plays who, where)   (Steve Rogers, etc)
                            │
                       ─────┴─────
                       Title    Episode
                    (film/TV)   (optional)
```

### Enums

**PersonType:** `actor` `celebrity` `musician` `athlete` `other`

**CharacterType:** `protagonist` `supporting` `antagonist` `cameo` `other`

**TitleType:** `film` `tv_series` `tv_movie` `animated` `short` `documentary` `other`

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or via CLI
vercel env add DATABASE_URL
vercel env add DIRECT_URL
```

Or connect your GitHub repo in the Vercel dashboard for automatic deploys on push.

---

## Adding Data

The easiest path is **Prisma Studio**:

```bash
npm run db:studio
```

This opens a visual browser at `localhost:5555` where you can add/edit records directly.

For bulk additions, update `prisma/seed.ts` and run `npm run db:seed`.

> ⚠️ The current seed uses `deleteMany()` before inserting — it wipes existing data on each run. Once you have production data, switch to upserts or comment out the delete block.

---

## Future Ideas

- [ ] TMDB API integration for poster images
- [ ] Real Steves page (Steve Burns, Steve Guttenberg, Steve Jobs, etc.) — people with no casting records who are Steves in real life
- [ ] Full-text search across all models
- [ ] Admin UI for adding records (protected route)
- [ ] stevesdropping.com custom domain on Vercel
