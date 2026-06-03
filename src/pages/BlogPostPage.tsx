import { lazy, Suspense, useEffect, useState } from 'react'

import { BackToBlogButton } from '@/components/blog/BackToBlogButton'
import { BlogPostHeader } from '@/components/blog/BlogPostHeader'
import { PostPagination } from '@/components/blog/PostPagination'
import { getAdjacentBlogPosts, getBlogPost, type BlogPost } from '@/lib/blog'
import type { Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

const MarkdownContent = lazy(() => import('@/components/MarkdownContent').then((module) => ({ default: module.MarkdownContent })))

type BlogPostState = {
  key: string
  nextPost?: BlogPost
  post?: BlogPost
  previousPost?: BlogPost
}

export function BlogPostPage({ locale, slug, onNavigate }: { locale: Locale; slug: string; onNavigate: (route: Route) => void }) {
  const t = messages[locale]
  const routeKey = `${locale}/${slug}`
  const [{ key, nextPost, post, previousPost }, setPostState] = useState<BlogPostState>({ key: '' })
  const loaded = key === routeKey

  useEffect(() => {
    let cancelled = false

    Promise.all([getBlogPost(locale, slug), getAdjacentBlogPosts(locale, slug)]).then(([loadedPost, adjacentPosts]) => {
      if (cancelled) return

      setPostState({
        key: routeKey,
        nextPost: adjacentPosts.nextPost,
        post: loadedPost,
        previousPost: adjacentPosts.previousPost,
      })
    })

    return () => {
      cancelled = true
    }
  }, [locale, routeKey, slug])

  if (!loaded) {
    return <main aria-hidden="true" className="min-h-[50svh]" />
  }

  if (!post) {
    return (
      <main>
        <BackToBlogButton label={t.backBlog} locale={locale} onNavigate={onNavigate} />
        <h1 className="text-4xl font-black tracking-tight text-zinc-50" data-reveal style={revealStyle(1)}>{t.postNotFound}</h1>
      </main>
    )
  }

  return (
    <main>
      <BackToBlogButton label={t.backBlog} locale={locale} onNavigate={onNavigate} />
      <BlogPostHeader post={post} />
      <div>
        <Suspense fallback={<div aria-hidden="true" className="min-h-40" />}>
          <MarkdownContent content={post.content} />
        </Suspense>
      </div>
      <PostPagination locale={locale} nextPost={nextPost} onNavigate={onNavigate} previousPost={previousPost} />
    </main>
  )
}

export default BlogPostPage
