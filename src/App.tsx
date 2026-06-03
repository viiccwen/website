import { ArrowDown, ArrowRight, ExternalLink, Moon, Sun } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { MarkdownContent } from '@/components/MarkdownContent'
import { Badge } from '@/components/ui/badge'

import { education, experience, honors, openSource, profile, socials, talks } from '@/data/site'
import { getAdjacentBlogPosts, getBlogPost, getBlogPosts, POSTS_PER_PAGE } from '@/lib/blog'
import { getPreferredTheme, type Theme, useTheme } from '@/hooks/useTheme'
import { localeLabel, locales, type Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'
import { revealStyle } from '@/lib/reveal'
import { pathForRoute, routeFromPath, switchLocale, type Route } from '@/lib/routes'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { usePopStateRoute } from '@/hooks/usePopStateRoute'
import { useRevealEffect } from '@/hooks/useReveal'

import './App.css'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .5a12 12 0 0 0-3.8 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05a3.75 3.75 0 0 1 3.37-1.85c3.61 0 4.27 2.38 4.27 5.47v6.28ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.04H3.54V8.98H7.1v11.47ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

const iconBySocial: Record<string, ComponentType<{ className?: string }>> = {
  GitHub: GitHubIcon,
  LinkedIn: LinkedInIcon,
}

function App() {
  const [route, setRoute] = useState<Route>(() => routeFromPath())
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme())

  useTheme(theme)
  useDocumentMeta(route)
  usePopStateRoute(setRoute)
  useRevealEffect(route)

  function navigate(next: Route) {
    window.history.pushState({}, '', pathForRoute(next))
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`min-h-svh overflow-hidden bg-background text-foreground antialiased theme-${theme}`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_15%_82%,rgba(124,58,237,0.10),transparent_24%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,72px_72px,72px_72px]" />
      <div className="relative mx-auto w-full max-w-3xl px-6 py-10 sm:px-8 sm:py-16">
        <Header route={route} theme={theme} onNavigate={navigate} onSwitchLocale={(locale) => navigate(switchLocale(route, locale))} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
        {route.name === 'blog' ? <BlogPage locale={route.locale} onNavigate={navigate} /> : route.name === 'post' ? <BlogPostPage locale={route.locale} onNavigate={navigate} slug={route.slug} /> : <HomePage />}
      </div>
    </div>
  )
}

function Header({ route, theme, onNavigate, onSwitchLocale, onToggleTheme }: { route: Route; theme: 'dark' | 'light'; onNavigate: (route: Route) => void; onSwitchLocale: (locale: Locale) => void; onToggleTheme: () => void }) {
  const t = messages[route.locale]

  return (
    <header className="mb-24 flex items-center justify-between" data-reveal style={revealStyle(0)}>
      <nav className="flex items-center gap-5 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
        <button className={navClass(route.name === 'home')} onClick={() => onNavigate({ name: 'home', locale: route.locale })} type="button">
          {t.home}
        </button>
        <button className={navClass(route.name === 'blog' || route.name === 'post')} onClick={() => onNavigate({ name: 'blog', locale: route.locale })} type="button">
          {t.blog}
        </button>
      </nav>
      <div className="flex items-center gap-1">
        {socials.filter((social) => social.label === 'GitHub' || social.label === 'LinkedIn').map((social) => {
          const Icon = iconBySocial[social.label] ?? ExternalLink
          return (
            <a
              aria-label={social.label}
              className="header-icon-button rounded-full p-2 text-zinc-500 transition duration-300 hover:bg-violet-500/10 hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
              href={social.href}
              key={social.label}
              rel="noreferrer"
              target={social.href.startsWith('mailto:') ? undefined : '_blank'}
            >
              <Icon className="size-4" />
            </a>
          )
        })}
        <div className="mx-1 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.025] p-1">
          {locales.map((locale) => (
            <button
              aria-label={`Switch language to ${locale}`}
              className={["rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] transition", route.locale === locale ? "bg-violet-500/20 text-violet-200" : "text-zinc-500 hover:text-violet-300"].join(' ')}
              key={locale}
              onClick={() => onSwitchLocale(locale)}
              type="button"
            >
              {localeLabel(locale)}
            </button>
          ))}
        </div>
        <button
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="header-icon-button rounded-full p-2 text-zinc-500 transition duration-300 hover:bg-violet-500/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
          onClick={onToggleTheme}
          type="button"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </header>
  )
}

function navClass(active: boolean) {
  return [
    'relative transition-colors duration-300 hover:text-violet-300 focus-visible:outline-none focus-visible:text-violet-300',
    active ? 'text-zinc-100 after:absolute after:-bottom-2 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-violet-500' : '',
  ].join(' ')
}

function HomePage() {
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

function BlogPage({ locale, onNavigate }: { locale: Locale; onNavigate: (route: Route) => void }) {
  const t = messages[locale]
  const posts = useMemo(() => getBlogPosts(locale), [locale])
  const [pageState, setPageState] = useState<{ locale: Locale; page: number }>({ locale, page: 1 })
  const pageCount = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE))
  const page = pageState.locale === locale ? pageState.page : 1
  const currentPage = Math.min(page, pageCount)
  const visiblePosts = posts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)

  return (
    <main>
      <section className="mb-16" data-reveal style={revealStyle(0)}>
        <button className="mb-10 text-xs uppercase tracking-[0.28em] text-zinc-500 transition hover:text-violet-300" data-reveal onClick={() => onNavigate({ name: 'home', locale })} style={revealStyle(0, 40)} type="button">
          {t.backHome}
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-violet-400" data-reveal style={revealStyle(1, 40)}>{t.engineeringNotes}</p>
        <h1 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.08em] text-zinc-50 sm:text-7xl" data-reveal style={revealStyle(2, 40)}>
          {t.blogTitleTop}
          <br />
          {t.blogTitleBottom}
        </h1>
      </section>

      <section className="border-t border-white/10">
        {visiblePosts.map((post, index) => (
          <article className="group cursor-pointer border-b border-white/10 py-8 transition-colors hover:border-violet-500/40" data-reveal key={post.slug} onClick={() => onNavigate({ name: 'post', locale, slug: post.slug })} style={revealStyle(index, 70, 75)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{post.date} · {post.readingTime}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100 group-hover:text-violet-200">{post.title}</h2>
                {post.excerpt ? <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">{post.excerpt}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => <Badge className="post-tag" key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              </div>
              <span className="inline-flex items-center gap-2 text-sm text-zinc-600 transition group-hover:translate-x-1 group-hover:text-violet-300">
                {t.read} <ArrowRight className="size-4" />
              </span>
            </div>
          </article>
        ))}
      </section>

      {pageCount > 1 ? (
        <nav aria-label="Blog pagination" className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-reveal style={revealStyle(0, 120)}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">
            Page {currentPage} / {pageCount} · {posts.length} posts
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400 transition hover:border-violet-500/40 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-zinc-400"
              disabled={currentPage === 1}
              onClick={() => setPageState({ locale, page: Math.max(1, currentPage - 1) })}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400 transition hover:border-violet-500/40 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-zinc-400"
              disabled={currentPage === pageCount}
              onClick={() => setPageState({ locale, page: Math.min(pageCount, currentPage + 1) })}
              type="button"
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}
    </main>
  )
}

function BlogPostPage({ locale, slug, onNavigate }: { locale: Locale; slug: string; onNavigate: (route: Route) => void }) {
  const t = messages[locale]
  const post = getBlogPost(locale, slug)
  const { previousPost, nextPost } = getAdjacentBlogPosts(locale, slug)

  if (!post) {
    return (
      <main>
        <button className="mb-10 text-xs uppercase tracking-[0.28em] text-zinc-500 transition hover:text-violet-300" data-reveal onClick={() => onNavigate({ name: 'blog', locale })} style={revealStyle(0)} type="button">
          {t.backBlog}
        </button>
        <h1 className="text-4xl font-black tracking-tight text-zinc-50" data-reveal style={revealStyle(1)}>{t.postNotFound}</h1>
      </main>
    )
  }

  return (
    <main>
      <button className="mb-10 text-xs uppercase tracking-[0.28em] text-zinc-500 transition hover:text-violet-300" data-reveal onClick={() => onNavigate({ name: 'blog', locale })} style={revealStyle(0)} type="button">
        {t.backBlog}
      </button>
      <header className="mb-12 border-b border-white/10 pb-10" data-reveal style={revealStyle(1)}>
        <p className="text-xs uppercase tracking-[0.3em] text-violet-400" data-reveal style={revealStyle(1, 40)}>{post.category}</p>
        <h1 className="mt-5 text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-zinc-50 sm:text-6xl" data-reveal style={revealStyle(2, 40)}>{post.title}</h1>
        {post.excerpt ? <p className="mt-6 max-w-xl text-base leading-8 text-zinc-400" data-reveal style={revealStyle(3, 40)}>{post.excerpt}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-3" data-reveal style={revealStyle(4, 40)}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{post.date} · {post.readingTime}</p>
          {post.tags.map((tag) => <Badge className="post-tag" key={tag} variant="secondary">{tag}</Badge>)}
        </div>
        {post.image ? <img alt="" className="mx-auto mt-8 max-h-[28rem] max-w-full rounded-3xl border border-white/10 object-contain shadow-2xl shadow-black/20" data-reveal src={post.image} style={revealStyle(5, 40)} /> : null}
      </header>
      <div>
        <MarkdownContent content={post.content} />
      </div>
      <nav aria-label="Post pagination" className="mt-16 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2">
        <button
          className="group rounded-3xl border border-white/10 p-5 text-left transition hover:border-violet-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10"
          disabled={!previousPost}
          onClick={() => previousPost ? onNavigate({ name: 'post', locale, slug: previousPost.slug }) : undefined}
          type="button"
        >
          <span className="text-xs uppercase tracking-[0.22em] text-zinc-600">Previous page</span>
          <span className="mt-3 block text-base font-semibold text-zinc-100 transition-colors group-hover:text-violet-200">{previousPost?.title ?? 'No previous page'}</span>
        </button>
        <button
          className="group rounded-3xl border border-white/10 p-5 text-left transition hover:border-violet-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 sm:text-right"
          disabled={!nextPost}
          onClick={() => nextPost ? onNavigate({ name: 'post', locale, slug: nextPost.slug }) : undefined}
          type="button"
        >
          <span className="text-xs uppercase tracking-[0.22em] text-zinc-600">Next page</span>
          <span className="mt-3 block text-base font-semibold text-zinc-100 transition-colors group-hover:text-violet-200">{nextPost?.title ?? 'No next page'}</span>
        </button>
      </nav>
    </main>
  )
}

export default App
