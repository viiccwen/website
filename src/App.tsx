import { ArrowDown, ArrowRight, ExternalLink, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { MarkdownContent } from '@/components/MarkdownContent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { education, experience, honors, openSource, profile, projects, socials, talks } from '@/data/site'
import { getBlogPost, getBlogPosts, hasBlogPost } from '@/lib/blog'
import { defaultLocale, isLocale, localeLabel, locales, type Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'

import './App.css'

const siteTitle = 'Vic Wen — Software Engineer & Open Source Contributor'
const siteDescription = 'Profile and engineering blog of Vic Wen, covering backend engineering, data infrastructure, open source contributions, and technical communities.'
const blogTitle = 'Vic Wen Blog — Engineering Notes'

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  const selector = `meta[${attribute}="${name}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }

  element.content = content
}

type Route =
  | { name: 'home'; locale: Locale }
  | { name: 'blog'; locale: Locale }
  | { name: 'post'; locale: Locale; slug: string }

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

const iconBySocial: Record<string, React.ComponentType<{ className?: string }>> = {
  GitHub: GitHubIcon,
  LinkedIn: LinkedInIcon,
}

function routeFromPath(): Route {
  const segments = window.location.pathname.split('/').filter(Boolean)

  if (segments[0] === 'blog') {
    if (segments[1]) return { name: 'post', locale: defaultLocale, slug: segments[1] }
    return { name: 'blog', locale: defaultLocale }
  }

  const [localeCandidate, section, slug] = segments
  const locale = isLocale(localeCandidate) ? localeCandidate : defaultLocale

  if (section === 'blog') {
    if (slug) return { name: 'post', locale, slug }
    return { name: 'blog', locale }
  }

  return { name: 'home', locale }
}

function pathForRoute(route: Route) {
  if (route.name === 'blog') return `/${route.locale}/blog`
  if (route.name === 'post') return `/${route.locale}/blog/${route.slug}`
  return `/${route.locale}`
}

function switchLocale(route: Route, nextLocale: Locale): Route {
  if (route.name === 'post') {
    if (hasBlogPost(nextLocale, route.slug)) return { ...route, locale: nextLocale }
    return { name: 'blog', locale: nextLocale }
  }

  return { ...route, locale: nextLocale }
}

function App() {
  const [route, setRoute] = useState<Route>(() => routeFromPath())
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const post = route.name === 'post' ? getBlogPost(route.locale, route.slug) : undefined
    const title = route.name === 'post' && post ? `${post.title} — Vic Wen Blog` : route.name === 'blog' ? blogTitle : siteTitle
    const description = route.name === 'post' && post?.excerpt ? post.excerpt : siteDescription

    document.documentElement.lang = route.locale === 'zh-tw' ? 'zh-Hant-TW' : 'en'
    document.title = title
    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
  }, [route])

  useEffect(() => {
    function handlePopState() {
      setRoute(routeFromPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
        {route.name === 'blog' ? <BlogPage locale={route.locale} onNavigate={navigate} /> : route.name === 'post' ? <BlogPostPage locale={route.locale} onNavigate={navigate} slug={route.slug} /> : <HomePage locale={route.locale} onNavigate={navigate} />}
      </div>
    </div>
  )
}

function Header({ route, theme, onNavigate, onSwitchLocale, onToggleTheme }: { route: Route; theme: 'dark' | 'light'; onNavigate: (route: Route) => void; onSwitchLocale: (locale: Locale) => void; onToggleTheme: () => void }) {
  const t = messages[route.locale]

  return (
    <header className="mb-24 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-700">
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
              className="rounded-full p-2 text-zinc-500 transition duration-300 hover:bg-white/5 hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
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
          className="rounded-full p-2 text-zinc-500 transition duration-300 hover:bg-white/5 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
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

function HomePage({ locale, onNavigate }: { locale: Locale; onNavigate: (route: Route) => void }) {
  const t = messages[locale]

  return (
    <main>
      <section className="flex min-h-[calc(100svh-15rem)] flex-col justify-between pb-20">
        <div />
        <div className="space-y-8">
          <div className="flex items-end justify-between gap-6">
            <h1 className="animate-in fade-in slide-in-from-bottom-6 duration-700 text-[clamp(3.1rem,13vw,7.6rem)] font-black uppercase leading-[0.82] tracking-[-0.095em] text-zinc-50">
              Vic
              <br />
              Wen.
            </h1>
            <div className="mb-2 size-20 shrink-0 animate-in fade-in zoom-in-95 duration-700 sm:size-24" style={{ animationDelay: '140ms', animationFillMode: 'both' }}>
              <div className="grid size-full place-items-center rounded-full border border-violet-500/30 bg-[conic-gradient(from_180deg,rgba(139,92,246,0.48),rgba(255,255,255,0.08),rgba(167,139,250,0.28))] p-px shadow-2xl shadow-violet-950/40">
                <img alt={profile.portraitAlt} className="size-full rounded-full bg-neutral-950 object-cover saturate-110 transition duration-500 hover:saturate-150" src={profile.portrait} />
              </div>
            </div>
          </div>
          <div className="flex animate-in flex-col gap-4 fade-in slide-in-from-bottom-4 duration-700 sm:flex-row sm:items-end sm:justify-between" style={{ animationDelay: '220ms', animationFillMode: 'both' }}>
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

      <Section id="about" index="01" label="About">
        <div className="space-y-5 text-base leading-8 text-zinc-400">
          <p>{profile.summary}</p>
        </div>
      </Section>

      <Section id="experience" index="02" label="Experience">
        <Timeline items={experience.map((item) => ({
          title: item.company,
          subtitle: `${item.role} · ${item.location}`,
          period: item.period,
          logo: item.logo,
          points: item.points,
        }))} />
      </Section>

      <Section id="opensource" index="03" label="Open Source">
        <div className="divide-y divide-white/10">
          {openSource.map((item) => (
            <article className="group py-7 first:pt-0 last:pb-0" key={item.title}>
              <div className="flex items-start gap-4">
                <Logo src={item.logo} alt={item.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
                    <h3 className="text-lg font-semibold text-zinc-100 transition group-hover:text-violet-200">{item.title}</h3>
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{item.period}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{item.subtitle} · {item.repository}</p>
                  <ul className="mt-4 space-y-2">
                    {item.points.map((point) => <Bullet key={point}>{point}</Bullet>)}
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-2">
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

      <Section id="education" index="04" label="Education">
        <Timeline items={education.map((item) => ({
          title: item.school,
          subtitle: item.credential,
          period: item.period,
          logo: item.logo,
          points: item.focus,
        }))} />
      </Section>

      <Section id="projects" index="05" label="Projects">
        <div className="space-y-4">
          {projects.map((project) => (
            <Card className="group overflow-hidden hover:border-violet-500/30" key={project.title}>
              <div className="grid gap-0 sm:grid-cols-[12rem_1fr]">
                <img alt="" className="h-44 w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100 sm:h-full" src={project.imageUrl} />
                <div>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl group-hover:text-violet-200">{project.title}</CardTitle>
                        <CardDescription>{project.year} · {project.status}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-zinc-400">{project.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {project.stack.map((tech) => <Badge key={tech} variant="outline">{tech}</Badge>)}
                    </div>
                    <div className="mt-5">
                      <a className="text-xs uppercase tracking-[0.18em] text-violet-300 transition hover:text-violet-200" href={project.links[0]?.href} rel="noreferrer" target="_blank">
                        {project.links[0]?.label} →
                      </a>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="honors" index="06" label="Honors">
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

      <Section id="talks" index="07" label="Talks">
        <Timeline items={talks.map((item) => ({
          title: item.title,
          subtitle: `${item.subtitle} · ${item.topic}`,
          period: item.period,
          logo: item.logo,
          href: item.href,
          points: [],
        }))} />
      </Section>

      <section className="py-12">
        <div className="flex flex-col gap-5 rounded-3xl border border-violet-500/20 bg-violet-500/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-violet-300">{t.writing}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">{t.readNotes}</h2>
          </div>
          <Button onClick={() => onNavigate({ name: 'blog', locale })} variant="outline">
            {t.openBlog} <ArrowRight />
          </Button>
        </div>
      </section>
    </main>
  )
}

function Section({ children, id, index, label }: { children: ReactNode; id: string; index: string; label: string }) {
  return (
    <section className="py-12 animate-in fade-in slide-in-from-bottom-3 duration-700" id={id}>
      <div className="mb-7 flex items-center gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">{label}</h2>
        <span className="font-mono text-xs text-violet-400">{index}</span>
        <span aria-hidden="true" className="section-marker h-px w-12 rounded-full bg-gradient-to-r from-violet-400/50 to-transparent" />
      </div>
      {children}
    </section>
  )
}

function Timeline({ items }: { items: Array<{ title: string; subtitle: string; period: string; logo: string; summary?: string; points: readonly string[]; href?: string }> }) {
  return (
    <div className="divide-y divide-white/10">
      {items.map((item) => (
        <article className="group py-7 first:pt-0 last:pb-0" key={`${item.title}-${item.subtitle}-${item.period}`}>
          <div className="flex items-start gap-4">
            <Logo src={item.logo} alt={item.title} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
                <h3 className="text-lg font-semibold text-zinc-100 transition group-hover:text-violet-200">
                  {item.href ? <a href={item.href} rel="noreferrer" target="_blank">{item.title}</a> : item.title}
                </h3>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{item.period}</p>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
              {item.summary ? <p className="mt-4 text-sm leading-7 text-zinc-400">{item.summary}</p> : null}
              {item.points.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {item.points.map((point) => <Bullet key={point}>{point}</Bullet>)}
                </ul>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white p-1 shadow-lg shadow-black/20">
      <img alt={`${alt} logo`} className="max-h-full max-w-full object-contain" src={src} />
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

const postsPerPage = 10

function BlogPage({ locale, onNavigate }: { locale: Locale; onNavigate: (route: Route) => void }) {
  const t = messages[locale]
  const posts = useMemo(() => getBlogPosts(locale), [locale])
  const [pageState, setPageState] = useState<{ locale: Locale; page: number }>({ locale, page: 1 })
  const pageCount = Math.max(1, Math.ceil(posts.length / postsPerPage))
  const page = pageState.locale === locale ? pageState.page : 1
  const currentPage = Math.min(page, pageCount)
  const visiblePosts = posts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage)

  return (
    <main className="animate-in fade-in slide-in-from-bottom-3 duration-700">
      <section className="mb-16">
        <button className="mb-10 text-xs uppercase tracking-[0.28em] text-zinc-500 transition hover:text-violet-300" onClick={() => onNavigate({ name: 'home', locale })} type="button">
          {t.backHome}
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-violet-400">{t.engineeringNotes}</p>
        <h1 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.08em] text-zinc-50 sm:text-7xl">
          {t.blogTitleTop}
          <br />
          {t.blogTitleBottom}
        </h1>
      </section>

      <section className="border-t border-white/10">
        {visiblePosts.map((post) => (
          <article className="group cursor-pointer border-b border-white/10 py-8 transition-colors hover:border-violet-500/40" key={post.slug} onClick={() => onNavigate({ name: 'post', locale, slug: post.slug })}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{post.date} · {post.readingTime}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100 group-hover:text-violet-200">{post.title}</h2>
                {post.excerpt ? <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">{post.excerpt}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
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
        <nav aria-label="Blog pagination" className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

  if (!post) {
    return (
      <main className="animate-in fade-in slide-in-from-bottom-3 duration-700">
        <button className="mb-10 text-xs uppercase tracking-[0.28em] text-zinc-500 transition hover:text-violet-300" onClick={() => onNavigate({ name: 'blog', locale })} type="button">
          {t.backBlog}
        </button>
        <h1 className="text-4xl font-black tracking-tight text-zinc-50">{t.postNotFound}</h1>
      </main>
    )
  }

  return (
    <main className="animate-in fade-in slide-in-from-bottom-3 duration-700">
      <button className="mb-10 text-xs uppercase tracking-[0.28em] text-zinc-500 transition hover:text-violet-300" onClick={() => onNavigate({ name: 'blog', locale })} type="button">
        {t.backBlog}
      </button>
      <header className="mb-12 border-b border-white/10 pb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-violet-400">{post.category}</p>
        <h1 className="mt-5 text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-zinc-50 sm:text-6xl">{post.title}</h1>
        {post.excerpt ? <p className="mt-6 max-w-xl text-base leading-8 text-zinc-400">{post.excerpt}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{post.date} · {post.readingTime}</p>
          {post.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
        </div>
        {post.image ? <img alt="" className="mx-auto mt-8 max-h-[28rem] max-w-full rounded-3xl border border-white/10 object-contain shadow-2xl shadow-black/20" src={post.image} /> : null}
      </header>
      <MarkdownContent content={post.content} />
    </main>
  )
}

export default App
