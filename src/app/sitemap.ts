import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const revalidate = 3600

const BASE_URL = 'https://stevesdropping.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,           changeFrequency: 'daily',  priority: 1.0 },
    { url: `${BASE_URL}/titles`,     changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE_URL}/people`,     changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE_URL}/characters`, changeFrequency: 'daily',  priority: 0.8 },
  ]

  try {
    const [titles, people, characters] = await Promise.all([
      prisma.title.findMany({ where: { castings: { some: {} } }, select: { id: true, updatedAt: true } }),
      prisma.person.findMany({ where: { castings: { some: {} } }, select: { id: true, updatedAt: true } }),
      prisma.character.findMany({ where: { castings: { some: {} } }, select: { id: true, updatedAt: true } }),
    ])

    const titleRoutes: MetadataRoute.Sitemap = titles.map((t) => ({
      url: `${BASE_URL}/titles/${t.id}`,
      lastModified: t.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    const personRoutes: MetadataRoute.Sitemap = people.map((p) => ({
      url: `${BASE_URL}/people/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    const characterRoutes: MetadataRoute.Sitemap = characters.map((c) => ({
      url: `${BASE_URL}/characters/${c.id}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.5,
    }))

    return [...staticRoutes, ...titleRoutes, ...personRoutes, ...characterRoutes]
  } catch (err) {
    // DB unreachable (e.g., Neon auto-suspend at build time) — ship a minimal
    // sitemap so the deploy doesn't fail. ISR will repopulate on next revalidate.
    console.error('[sitemap] DB unreachable; returning static routes only:', err)
    return staticRoutes
  }
}
