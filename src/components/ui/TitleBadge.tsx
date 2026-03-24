const BADGE_STYLES: Record<string, string> = {
  film:          'bg-[#c94a1a] text-[#fdf6e3]',
  tv_series:     'bg-[#7a5230] text-[#fdf6e3]',
  tv_movie:      'bg-[#7a5230] text-[#fdf6e3]',
  animated:      'bg-[#4a6a2a] text-[#fdf6e3]',
  documentary:   'bg-[#2a4a6a] text-[#fdf6e3]',
  other:         'bg-warm-100 text-warm-600',
}

const BADGE_LABELS: Record<string, string> = {
  film:          'Film',
  tv_series:     'TV Series',
  tv_movie:      'TV Movie',
  animated:      'Animated',
  documentary:   'Documentary',
  other:         'Other',
}

export function TitleBadge({ type }: { type: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded tracking-wide whitespace-nowrap ${BADGE_STYLES[type] ?? BADGE_STYLES.other}`}>
      {BADGE_LABELS[type] ?? type}
    </span>
  )
}
