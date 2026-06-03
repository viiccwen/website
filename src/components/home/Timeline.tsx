import type { ReactNode } from 'react'

import { revealStyle } from '@/lib/reveal'

import { Bullet } from './Bullet'
import { Logo } from './Logo'

export type TimelineItem = {
  title: string
  subtitle: string
  period: string
  logo: string
  summary?: string
  points: readonly ReactNode[]
  href?: string
  fullItemHref?: boolean
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="divide-y divide-white/10">
      {items.map((item, index) => {
        const content = (
          <div className="flex items-start gap-4">
            <Logo src={item.logo} alt={item.title} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
                <h3 className="text-base font-semibold text-zinc-100 transition-colors duration-300 group-hover:text-violet-200">
                  {item.href && !item.fullItemHref ? <a href={item.href} rel="noreferrer" target="_blank">{item.title}</a> : item.title}
                </h3>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{item.period}</p>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
              {item.summary ? <p className="mt-4 text-sm leading-7 text-zinc-400">{item.summary}</p> : null}
              {item.points.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {item.points.map((point, index) => <Bullet key={index}>{point}</Bullet>)}
                </ul>
              ) : null}
            </div>
          </div>
        )

        return (
          <article className="group py-7 first:pt-0 last:pb-0" data-reveal key={`${item.title}-${item.subtitle}-${item.period}`} style={revealStyle(index, 40, 80)}>
            {item.href && item.fullItemHref ? (
              <a className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70" href={item.href} rel="noreferrer" target="_blank">
                {content}
              </a>
            ) : content}
          </article>
        )
      })}
    </div>
  )
}
