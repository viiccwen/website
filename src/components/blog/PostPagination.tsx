import type { BlogPost } from '@/lib/blog'
import type { Locale } from '@/lib/i18n'
import type { Route } from '@/lib/routes'

type PostPaginationProps = {
  locale: Locale
  nextPost?: BlogPost
  onNavigate: (route: Route) => void
  previousPost?: BlogPost
}

export function PostPagination({ locale, nextPost, onNavigate, previousPost }: PostPaginationProps) {
  return (
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
  )
}
