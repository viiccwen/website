import { Badge } from '@/components/ui/badge'
import type { BlogPost } from '@/lib/blog'
import { revealStyle } from '@/lib/reveal'

export function BlogPostHeader({ post }: { post: BlogPost }) {
  return (
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
  )
}
