import type { CSSProperties } from 'react'

export function revealStyle(index: number, base = 0, step = 80): CSSProperties {
  return { '--reveal-delay': `${base + index * step}ms` } as CSSProperties
}
