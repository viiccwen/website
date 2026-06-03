import type { ReactNode } from 'react'

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-6 text-zinc-500">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500 transition-transform group-hover:scale-150" />
      <span>{children}</span>
    </li>
  )
}
