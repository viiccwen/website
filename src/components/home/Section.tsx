import type { ReactNode } from 'react'

import { revealStyle } from '@/lib/reveal'

type SectionProps = {
  children: ReactNode
  id: string
  index: string
  label: string
  order: number
}

export function Section({ children, id, index, label, order }: SectionProps) {
  return (
    <section className="py-12" data-reveal id={id} style={revealStyle(order, 20, 55)}>
      <div className="mb-7 flex items-center gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">{label}</h2>
        <span className="font-mono text-xs text-violet-400">{index}</span>
        <span aria-hidden="true" className="section-marker h-px w-12 rounded-full bg-gradient-to-r from-violet-400/50 to-transparent" />
      </div>
      {children}
    </section>
  )
}
