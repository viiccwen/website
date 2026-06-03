import { useEffect, useMemo, useState } from 'react'

import { BlogPagination } from '@/components/blog/BlogPagination'
import { BlogPostListItem } from '@/components/blog/BlogPostListItem'
import { BlogSearch } from '@/components/blog/BlogSearch'
import { getBlogPosts, POSTS_PER_PAGE, type BlogPost } from '@/lib/blog'
import type { Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

function normalizeSearchTerm(value: string) {
  return value.trim().toLocaleLowerCase()
}

function postMatchesQuery(post: BlogPost, query: string) {
  if (!query) return true

  const searchableText = [post.title, post.excerpt, post.category, post.date, post.readingTime, ...post.tags, post.content]
    .join(' ')
    .toLocaleLowerCase()

  return searchableText.includes(query)
}

export function BlogPage({ locale, onNavigate }: { locale: Locale; onNavigate: (route: Route) => void }) {
  const t = messages[locale]
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [query, setQuery] = useState('')
  const normalizedQuery = normalizeSearchTerm(query)
  const [pageState, setPageState] = useState<{ locale: Locale; page: number; query: string }>({ locale, page: 1, query: '' })
  const filteredPosts = useMemo(() => posts.filter((post) => postMatchesQuery(post, normalizedQuery)), [normalizedQuery, posts])
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const page = pageState.locale === locale && pageState.query === normalizedQuery ? pageState.page : 1
  const currentPage = Math.min(page, pageCount)
  const visiblePosts = filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)
  const resultLabel = normalizedQuery ? t.searchResultCount.replace('{count}', String(filteredPosts.length)) : t.allPostCount.replace('{count}', String(posts.length))

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
        <h1 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.08em] text-zinc-50 sm:text-7xl" data-reveal style={revealStyle(2, 40)}>
          {t.blogTitleTop}
          <br />
          {t.blogTitleBottom}
        </h1>
      </section>

      <BlogSearch
        label={t.searchLabel}
        onQueryChange={setQuery}
        placeholder={t.searchPlaceholder}
        query={query}
        resultLabel={resultLabel}
      />

      <section className="border-t border-white/10">
        {visiblePosts.length > 0 ? visiblePosts.map((post, index) => (
          <BlogPostListItem index={index} key={post.slug} locale={locale} onNavigate={onNavigate} post={post} readLabel={t.read} />
        )) : (
          <div className="py-16 text-center text-sm leading-7 text-zinc-500">
            <p className="text-lg font-semibold text-zinc-300">{t.noSearchResults}</p>
            <p className="mt-2">{t.noSearchResultsHint}</p>
          </div>
        )}
      </section>

      <BlogPagination
        currentPage={currentPage}
        onNext={() => setPageState({ locale, page: Math.min(pageCount, currentPage + 1), query: normalizedQuery })}
        onPrevious={() => setPageState({ locale, page: Math.max(1, currentPage - 1), query: normalizedQuery })}
        pageCount={pageCount}
        postCount={filteredPosts.length}
      />
    </main>
  )
}

export default BlogPage
