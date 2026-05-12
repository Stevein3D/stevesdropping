// Stable hash → 1..8 so the same name always lands on the same gradient.
const TONE_GRADIENTS = [
  'linear-gradient(135deg, #c94a1a, #7a5230)',
  'linear-gradient(135deg, #7a5230, #2a4a6a)',
  'linear-gradient(135deg, #4a6a2a, #c94a1a)',
  'linear-gradient(135deg, #2a4a6a, #4a6a2a)',
  'linear-gradient(135deg, #a83a12, #1a1008)',
  'linear-gradient(135deg, #d97757, #7a5230)',
  'linear-gradient(135deg, #2a1a08, #c94a1a)',
  'linear-gradient(135deg, #c4956a, #2a4a6a)',
]

function tone(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return TONE_GRADIENTS[Math.abs(h) % TONE_GRADIENTS.length]
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}

type Variant = 'poster' | 'portrait' | 'avatar' | 'square'

const VARIANT: Record<Variant, { aspect: string; radius: string; fontCqw: number }> = {
  poster:   { aspect: 'aspect-[2/3]',  radius: 'rounded-md',   fontCqw: 38 },
  portrait: { aspect: 'aspect-[3/4]',  radius: 'rounded-md',   fontCqw: 38 },
  avatar:   { aspect: 'aspect-square', radius: 'rounded-full', fontCqw: 44 },
  square:   { aspect: 'aspect-square', radius: 'rounded-sm',   fontCqw: 44 },
}

export function Placeholder({
  name,
  variant = 'poster',
  className = '',
}: {
  name: string
  variant?: Variant
  className?: string
}) {
  const v = VARIANT[variant]
  return (
    <div
      className={`${v.aspect} ${v.radius} relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ background: tone(name), containerType: 'inline-size' }}
      aria-label={name}
    >
      <span
        className="font-serif font-black italic text-cream relative z-10"
        style={{ fontSize: `${v.fontCqw}cqw`, lineHeight: 1, letterSpacing: '-0.02em' }}
      >
        {initials(name)}
      </span>
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 14px)',
        }}
      />
    </div>
  )
}
