import { ListTree } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { MarkdownHeading } from '@/lib/markdownHeadings'

type ArticleNavigationProps = {
  headings: MarkdownHeading[]
  label: string
}

function TableOfContents({ activeId, headings, label }: ArticleNavigationProps & { activeId: string }) {
  return (
    <nav aria-label={label}>
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        <ListTree aria-hidden="true" className="size-4 text-violet-400" />
        {label}
      </p>
      <ol className="space-y-2 border-l border-white/10">
        {headings.map((heading) => (
          <li className={heading.depth === 3 ? 'pl-4' : ''} key={heading.id}>
            <a
              aria-current={activeId === heading.id ? 'location' : undefined}
              className={`-ml-px block border-l py-1 pl-4 text-sm leading-5 transition ${activeId === heading.id ? 'border-violet-400 text-violet-300' : 'border-transparent text-zinc-500 hover:border-violet-500/40 hover:text-zinc-300'}`}
              href={`#${heading.id}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function ArticleNavigation({ headings, label }: ArticleNavigationProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function updateReadingState() {
      const article = document.querySelector<HTMLElement>('.markdown-body')
      if (!article) return

      const start = article.getBoundingClientRect().top + window.scrollY
      const distance = Math.max(1, article.offsetHeight - window.innerHeight)
      setProgress(Math.min(100, Math.max(0, ((window.scrollY - start) / distance) * 100)))

      const current = headings
        .map((heading) => document.getElementById(heading.id))
        .filter((element): element is HTMLElement => Boolean(element))
        .filter((element) => element.getBoundingClientRect().top <= 160)
        .at(-1)

      setActiveId(current?.id ?? headings[0]?.id ?? '')
    }

    updateReadingState()
    window.addEventListener('resize', updateReadingState)
    window.addEventListener('scroll', updateReadingState, { passive: true })

    return () => {
      window.removeEventListener('resize', updateReadingState)
      window.removeEventListener('scroll', updateReadingState)
    }
  }, [headings])

  if (headings.length === 0) return null

  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 bg-white/5">
        <div className="h-full bg-violet-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      <details className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 xl:hidden">
        <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-300">{label}</summary>
        <div className="mt-5 max-h-72 overflow-y-auto pr-2">
          <TableOfContents activeId={activeId} headings={headings} label={label} />
        </div>
      </details>

      <aside className="fixed left-[calc(50%+26rem)] top-32 hidden max-h-[calc(100vh-10rem)] w-56 overflow-y-auto pr-3 xl:block">
        <TableOfContents activeId={activeId} headings={headings} label={label} />
      </aside>
    </>
  )
}
