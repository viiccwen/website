import type { Locale } from '@/lib/i18n'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

type BackToBlogButtonProps = {
  label: string
  locale: Locale
  onNavigate: (route: Route) => void
}

export function BackToBlogButton({ label, locale, onNavigate }: BackToBlogButtonProps) {
  return (
    <button className="mb-10 text-xs uppercase tracking-[0.28em] text-zinc-500 transition hover:text-violet-300" data-reveal onClick={() => onNavigate({ name: 'blog', locale })} style={revealStyle(0)} type="button">
      {label}
    </button>
  )
}
