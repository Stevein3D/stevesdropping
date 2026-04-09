'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useRef } from 'react'

type Props = {
  placeholder?: string
  paramName?: string
}

export function SearchInput({ placeholder = 'Search…', paramName = 'search' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const defaultValue = searchParams.get(paramName) ?? ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearTimeout(timerRef.current)
    const value = e.target.value
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(paramName, value)
      } else {
        params.delete(paramName)
      }
      // Reset to page 1 on new search
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`)
    }, 300)
  }

  return (
    <input
      name={paramName}
      defaultValue={defaultValue}
      placeholder={placeholder}
      onChange={handleChange}
      className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-4 py-2 text-sm text-warm-900 dark:text-warm-200 placeholder-warm-500 focus:outline-none focus:border-steve w-64"
    />
  )
}
