'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Props = {
  paramName: string
  className?: string
  children: React.ReactNode
}

export function FilterSelect({ paramName, className, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set(paramName, e.target.value)
    } else {
      params.delete(paramName)
    }
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={searchParams.get(paramName) ?? ''}
      onChange={handleChange}
      className={className}
    >
      {children}
    </select>
  )
}
