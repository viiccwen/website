import { ArrowDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { education, experience, honors, openSource, profile, talks } from '@/data/site'
import { revealStyle } from '@/lib/reveal'

export function HomePage() {
  return (
    <main>
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

      <Section id="about" index="01" label="About" order={0}>
        <div className="space-y-5 text-base leading-8 text-zinc-400">
          <p>{profile.summary}</p>
        </div>
      </Section>

      <Section id="experience" index="02" label="Experience" order={1}>
        <Timeline items={experience.map((item) => ({
          title: item.company,
          subtitle: item.role,
          period: item.period,
          logo: item.logo,
          points: item.points,
        }))} />
      </Section>

      <Section id="opensource" index="03" label="Open Source" order={2}>
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
      </Section>

      <Section id="education" index="04" label="Education" order={3}>
        <Timeline items={education.map((item) => ({
          title: item.school,
          subtitle: item.credential,
          period: item.period,
          logo: item.logo,
          points: item.focus.map((point) => {
            if (item.labHref && point.startsWith('NLP Lab')) {
              return (
                <>
                  <a className="text-violet-300 underline-offset-4 transition hover:text-violet-200 hover:underline" href={item.labHref} rel="noreferrer" target="_blank">
                    NLP Lab
                  </a>
                  {point.slice('NLP Lab'.length)}
                </>
              )
            }

            return point
          }),
        }))} />
      </Section>

      <Section id="honors" index="05" label="Honors" order={4}>
        <Timeline items={honors.map((item) => ({
          title: item.title,
          subtitle: item.subtitle,
          period: item.period,
          logo: item.logo,
          summary: item.description,
          href: item.href,
          points: [],
        }))} />
      </Section>

      <Section id="talks" index="06" label="Talks" order={5}>
        <Timeline items={talks.map((item) => ({
          title: item.title,
          subtitle: item.topic,
          period: item.period,
          logo: item.logo,
          href: item.href,
          fullItemHref: true,
          points: [],
        }))} />
      </Section>
    </main>
  )
}

function Section({ children, id, index, label, order }: { children: ReactNode; id: string; index: string; label: string; order: number }) {
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

function Timeline({ items }: { items: Array<{ title: string; subtitle: string; period: string; logo: string; summary?: string; points: readonly ReactNode[]; href?: string; fullItemHref?: boolean }> }) {
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

function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="logo-frame grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white shadow-lg shadow-black/20">
      <img alt={`${alt} logo`} className="size-full rounded-md object-contain" src={src} />
    </div>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-6 text-zinc-500">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500 transition-transform group-hover:scale-150" />
      <span>{children}</span>
    </li>
  )
}
