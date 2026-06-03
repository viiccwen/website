import { useEffect, useState } from 'react'

import { BlogPagination } from '@/components/blog/BlogPagination'
import { BlogPostListItem } from '@/components/blog/BlogPostListItem'
import { getBlogPosts, POSTS_PER_PAGE, type BlogPost } from '@/lib/blog'
import type { Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

export function BlogPage({ locale, onNavigate }: { locale: Locale; onNavigate: (route: Route) => void }) {
  const t = messages[locale]
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [pageState, setPageState] = useState<{ locale: Locale; page: number }>({ locale, page: 1 })
  const pageCount = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE))
  const page = pageState.locale === locale ? pageState.page : 1
  const currentPage = Math.min(page, pageCount)
  const visiblePosts = posts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)

  useEffect(() => {
    let cancelled = false

    getBlogPosts(locale).then((nextPosts) => {
      if (!cancelled) setPosts(nextPosts)
    })

    return () => {
      cancelled = true
    }
  }, [locale])

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
          <BlogPostListItem index={index} key={post.slug} locale={locale} onNavigate={onNavigate} post={post} readLabel={t.read} />
        ))}
      </section>

      <BlogPagination
        currentPage={currentPage}
        onNext={() => setPageState({ locale, page: Math.min(pageCount, currentPage + 1) })}
        onPrevious={() => setPageState({ locale, page: Math.max(1, currentPage - 1) })}
        pageCount={pageCount}
        postCount={posts.length}
      />
    </main>
  )
}

export default BlogPage
