'use client'
import { useState } from 'react'

type EpisodeEntry = {
  castingId: number
  season: number | null
  episodeNumber: number | null
  episodeTitle: string | null
}

const INITIAL_LIMIT = 5

export function EpisodeList({ episodes }: { episodes: EpisodeEntry[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? episodes : episodes.slice(0, INITIAL_LIMIT)
  const remaining = episodes.length - INITIAL_LIMIT

  return (
    <div className="mt-1 space-y-0.5">
      {visible.map((ep) => (
        <p key={ep.castingId} className="text-sm text-warm-500">
          {ep.season != null && ep.episodeNumber != null
            ? `S${ep.season}E${ep.episodeNumber}`
            : ep.season != null
            ? `S${ep.season}`
            : ''}
          {ep.episodeTitle ? ` · "${ep.episodeTitle}"` : ''}
        </p>
      ))}
      {!showAll && remaining > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs text-steve hover:text-steve-hover transition-colors mt-1"
        >
          + {remaining} more episode{remaining !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
