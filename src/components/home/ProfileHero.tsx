import { ArrowDown } from 'lucide-react'

import { profile } from '@/data/site'
import { revealStyle } from '@/lib/reveal'

export function ProfileHero() {
  return (
    <section className="flex min-h-[calc(100svh-15rem)] flex-col justify-between pb-20">
      <div />
      <div className="space-y-8">
        <div className="flex items-end justify-between gap-6">
          <h1 className="text-[clamp(3.1rem,13vw,7.6rem)] font-black uppercase leading-[0.82] tracking-[-0.095em] text-zinc-50" data-reveal style={revealStyle(1, 70, 90)}>
            Vic
            <br />
            Wen.
          </h1>
          <div className="mb-2 size-20 shrink-0 sm:size-24" data-reveal style={revealStyle(2, 70, 90)}>
            <div className="grid size-full place-items-center rounded-full border border-violet-500/30 bg-[conic-gradient(from_180deg,rgba(139,92,246,0.48),rgba(255,255,255,0.08),rgba(167,139,250,0.28))] p-px shadow-2xl shadow-violet-950/40">
              <img alt={profile.portraitAlt} className="size-full rounded-full bg-neutral-950 object-cover saturate-110 transition duration-500 hover:saturate-150" src={profile.portrait} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-reveal style={revealStyle(3, 70, 90)}>
          <p className="max-w-md text-base leading-7 text-zinc-300 sm:text-lg">{profile.headline}</p>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500 sm:justify-end">
            <span>{profile.location}</span>
            <span aria-hidden="true">·</span>
            <span>CSIE NTUST</span>
            <a className="animate-bounce text-violet-400" href="#about" aria-label="Scroll to about">
              <ArrowDown className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
