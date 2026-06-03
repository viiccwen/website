import { Search, X } from 'lucide-react'

type BlogSearchProps = {
  label: string
  onQueryChange: (query: string) => void
  placeholder: string
  query: string
  resultLabel: string
}

export function BlogSearch({ label, onQueryChange, placeholder, query, resultLabel }: BlogSearchProps) {
  return (
    <section aria-label={label} className="mb-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/10 backdrop-blur" data-reveal>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300 transition focus-within:border-violet-400/60 focus-within:bg-violet-500/5" htmlFor="blog-search">
          <Search aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
          <span className="sr-only">{label}</span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            id="blog-search"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="rounded-full p-1 text-zinc-500 transition hover:bg-white/10 hover:text-violet-200"
              onClick={() => onQueryChange('')}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </label>
        <p className="px-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{resultLabel}</p>
      </div>
    </section>
  )
}
