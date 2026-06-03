import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { getBlogPosts, POSTS_PER_PAGE } from '@/lib/blog'
import type { Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

export function BlogPage({ locale, onNavigate }: { locale: Locale; onNavigate: (route: Route) => void }) {
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
