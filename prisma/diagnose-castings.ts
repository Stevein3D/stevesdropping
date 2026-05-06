import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Episode castings where the casting's titleId doesn't match the episode's titleId
  const mismatchedTitleId = await prisma.$queryRaw<{
    casting_id: number
    casting_title_id: number
    casting_title_name: string
    episode_id: number
    episode_title_id: number
    episode_title_name: string
    person_name: string
    character_name: string
  }[]>`
    SELECT
      c.id            AS casting_id,
      c."titleId"     AS casting_title_id,
      t1.name         AS casting_title_name,
      c."episodeId"   AS episode_id,
      e."titleId"     AS episode_title_id,
      t2.name         AS episode_title_name,
      p.name          AS person_name,
      ch.name         AS character_name
    FROM castings c
    JOIN episodes e  ON e.id = c."episodeId"
    JOIN titles t1   ON t1.id = c."titleId"
    JOIN titles t2   ON t2.id = e."titleId"
    JOIN persons p   ON p.id = c."personId"
    JOIN characters ch ON ch.id = c."characterId"
    WHERE c."episodeId" IS NOT NULL
      AND c."titleId" != e."titleId"
    ORDER BY c.id
  `

  console.log('\n=== Episode castings with MISMATCHED titleId ===')
  console.log(`Found: ${mismatchedTitleId.length}`)
  if (mismatchedTitleId.length > 0) {
    console.table(mismatchedTitleId)
  }

  // 2. All title-level castings grouped by title (sanity check)
  const titleLevelCounts = await prisma.$queryRaw<{
    title_id: number
    title_name: string
    casting_count: bigint
  }[]>`
    SELECT t.id AS title_id, t.name AS title_name, COUNT(c.id) AS casting_count
    FROM titles t
    JOIN castings c ON c."titleId" = t.id AND c."episodeId" IS NULL
    GROUP BY t.id, t.name
    ORDER BY casting_count DESC
    LIMIT 20
  `

  console.log('\n=== Top titles by title-level castings (episodeId = null) ===')
  console.table(titleLevelCounts.map(r => ({ ...r, casting_count: Number(r.casting_count) })))

  // 3. Titles with episode castings but no title-level castings
  const episodeOnlyTitles = await prisma.$queryRaw<{
    title_id: number
    title_name: string
    episode_casting_count: bigint
  }[]>`
    SELECT t.id AS title_id, t.name AS title_name, COUNT(c.id) AS episode_casting_count
    FROM titles t
    JOIN episodes e ON e."titleId" = t.id
    JOIN castings c ON c."episodeId" = e.id
    WHERE NOT EXISTS (
      SELECT 1 FROM castings c2 WHERE c2."titleId" = t.id AND c2."episodeId" IS NULL
    )
    GROUP BY t.id, t.name
    ORDER BY episode_casting_count DESC
    LIMIT 20
  `

  console.log('\n=== Titles with ONLY episode-level castings (no title-level) ===')
  console.table(episodeOnlyTitles.map(r => ({ ...r, episode_casting_count: Number(r.episode_casting_count) })))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
