import { openSource } from '@/data/site'
import { revealStyle } from '@/lib/reveal'

import { Bullet } from './Bullet'
import { Logo } from './Logo'

export function OpenSourceSection() {
  return (
    <div className="divide-y divide-white/10">
      {openSource.map((item, index) => (
        <article className="group py-7 first:pt-0 last:pb-0" data-reveal key={item.title} style={revealStyle(index, 40, 80)}>
          <div className="flex items-start gap-4">
            <Logo src={item.logo} alt={item.title} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
                <h3 className="text-base font-semibold text-zinc-100 transition group-hover:text-violet-200">{item.title}</h3>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{item.period}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {item.points.map((point, index) => <Bullet key={index}>{point}</Bullet>)}
              </ul>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {item.links.map((link) => (
                  <a className="text-xs uppercase tracking-[0.18em] text-violet-300 transition hover:text-violet-200" href={link.href} key={link.href} rel="noreferrer" target="_blank">
                    {link.label} →
                  </a>
                ))}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
