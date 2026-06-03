import { Check, Copy } from 'lucide-react'
import { Children, isValidElement, useState, type ReactElement, type ReactNode } from 'react'

type CodeElementProps = {
  children?: ReactNode
  className?: string
}

type CopyState = 'idle' | 'copied'

function getCodeElement(children: ReactNode) {
  const child = Children.toArray(children)[0]
  if (!isValidElement(child)) return undefined

  return child as ReactElement<CodeElementProps>
}

function languageFromClassName(className?: string) {
  return className?.match(/language-([^\s]+)/)?.[1]
}

function labelForLanguage(language?: string) {
  if (!language) return 'text'

  const labels: Record<string, string> = {
    bash: 'bash',
    cjs: 'cjs',
    css: 'css',
    html: 'html',
    js: 'javascript',
    json: 'json',
    jsx: 'jsx',
    md: 'markdown',
    mdx: 'mdx',
    py: 'python',
    sh: 'shell',
    shell: 'shell',
    ts: 'typescript',
    tsx: 'tsx',
    yaml: 'yaml',
    yml: 'yaml',
  }

  return labels[language] ?? language
}

function codeToText(children: ReactNode) {
  return Children.toArray(children).join('').replace(/\n$/, '')
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function CodeBlock({ children }: { children: ReactNode }) {
  const codeElement = getCodeElement(children)
  const language = languageFromClassName(codeElement?.props.className)
  const codeText = codeToText(codeElement?.props.children)
  const [copyState, setCopyState] = useState<CopyState>('idle')

  async function copyCode() {
    if (!codeText) return

    setCopyState('copied')
    window.setTimeout(() => setCopyState('idle'), 1600)

    try {
      await writeClipboard(codeText)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = codeText
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  return (
    <div className="markdown-codeblock group overflow-hidden rounded-2xl border border-white/10 bg-black/45 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          {labelForLanguage(language)}
        </span>
        <button
          aria-label={copyState === 'copied' ? 'Code copied' : 'Copy code'}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-zinc-400 transition hover:border-violet-400/40 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
          onClick={copyCode}
          type="button"
        >
          {copyState === 'copied' ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
          {copyState === 'copied' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-sm leading-7 text-zinc-300 [&>code]:block [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0 [&>code]:font-mono [&>code]:text-inherit">
        {children}
      </pre>
    </div>
  )
}
