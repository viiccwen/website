import { MarkdownContent } from '@/components/MarkdownContent'
import { Badge } from '@/components/ui/badge'
import { getAdjacentBlogPosts, getBlogPost } from '@/lib/blog'
import type { Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

export function BlogPostPage({ locale, slug, onNavigate }: { locale: Locale; slug: string; onNavigate: (route: Route) => void }) {
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
