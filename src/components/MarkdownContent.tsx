import { CodeBlock } from '@/components/CodeBlock'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function widthFromTitle(title?: string | null) {
  const value = title?.match(/width=([^\s]+)/)?.[1]
  if (!value) return undefined
  return /^\d+$/.test(value) ? `${value}px` : value
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <article className="markdown-body space-y-6 text-base leading-8 text-zinc-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-12 text-4xl font-black tracking-tight text-zinc-50">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-12 text-2xl font-semibold tracking-tight text-zinc-50">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-9 text-xl font-semibold tracking-tight text-zinc-100">{children}</h3>,
          p: ({ children }) => <p className="text-base leading-8 text-zinc-400">{children}</p>,
          a: ({ children, href }) => (
            <a
              className="text-violet-300 underline decoration-violet-500/40 underline-offset-4 transition hover:text-violet-200"
              href={href}
              rel="noreferrer"
              target={href?.startsWith('http') ? '_blank' : undefined}
            >
              {children}
            </a>
          ),
          img: ({ alt, src, title }) => (
            <span className="my-8 flex justify-center">
              <img
                alt={alt ?? ''}
                className="max-h-[34rem] max-w-full rounded-3xl border border-white/10 object-contain shadow-2xl shadow-black/20"
                loading="lazy"
                src={src ?? ''}
                style={{ width: widthFromTitle(title) }}
              />
            </span>
          ),
          ul: ({ children }) => <ul className="space-y-2 pl-5 text-zinc-400">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-2 pl-5 text-zinc-400">{children}</ol>,
          li: ({ children }) => <li className="list-disc leading-7 marker:text-violet-400">{children}</li>,
          blockquote: ({ children }) => <blockquote className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] px-5 py-4 text-zinc-300 italic">{children}</blockquote>,
          code: ({ children, className }) => {
            const isBlock = className?.startsWith('language-')

            if (isBlock) {
              return <code className={`${className} block whitespace-pre font-mono text-sm text-zinc-300`}>{children}</code>
            }

            return <code className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-sm text-violet-200">{children}</code>
          },
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          hr: () => <hr className="my-10 border-white/10" />,
          table: ({ children }) => <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full text-left text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-white/10 px-4 py-3 text-zinc-100">{children}</th>,
          td: ({ children }) => <td className="border-b border-white/5 px-4 py-3 text-zinc-400">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
