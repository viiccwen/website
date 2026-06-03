import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { BlogPost } from '@/lib/blog'
import type { Locale } from '@/lib/i18n'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

type BlogPostListItemProps = {
  index: number
  locale: Locale
  onNavigate: (route: Route) => void
  post: BlogPost
  readLabel: string
}

export function BlogPostListItem({ index, locale, onNavigate, post, readLabel }: BlogPostListItemProps) {
  return (
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
          {readLabel} <ArrowRight className="size-4" />
        </span>
      </div>
    </article>
  )
}
