import { useEffect, useRef } from 'react'

export function useAutosave<T>(value: T, key: string, delay = 2000) {
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value))
    }, delay) as unknown as number
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [value, key, delay])
}
