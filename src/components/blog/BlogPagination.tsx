type BlogPaginationProps = {
  currentPage: number
  onNext: () => void
  onPrevious: () => void
  pageCount: number
  postCount: number
}

export function BlogPagination({ currentPage, onNext, onPrevious, pageCount, postCount }: BlogPaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav aria-label="Blog pagination" className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">
        Page {currentPage} / {pageCount} · {postCount} posts
      </p>
      <div className="flex items-center gap-2">
        <button
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400 transition hover:border-violet-500/40 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-zinc-400"
          disabled={currentPage === 1}
          onClick={onPrevious}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400 transition hover:border-violet-500/40 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-zinc-400"
          disabled={currentPage === pageCount}
          onClick={onNext}
          type="button"
        >
          Next
        </button>
      </div>
    </nav>
  )
}
