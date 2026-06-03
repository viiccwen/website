import { ExternalLink, Moon, Sun } from 'lucide-react'
import type { ComponentType } from 'react'

import { socials } from '@/data/site'
import type { Theme } from '@/hooks/useTheme'
import { localeLabel, locales, type Locale } from '@/lib/i18n'
import { messages } from '@/lib/messages'
import { revealStyle } from '@/lib/reveal'
import type { Route } from '@/lib/routes'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .5a12 12 0 0 0-3.8 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05a3.75 3.75 0 0 1 3.37-1.85c3.61 0 4.27 2.38 4.27 5.47v6.28ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.04H3.54V8.98H7.1v11.47ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

const iconBySocial: Record<string, ComponentType<{ className?: string }>> = {
  GitHub: GitHubIcon,
  LinkedIn: LinkedInIcon,
}

export function AppHeader({ route, theme, onNavigate, onSwitchLocale, onToggleTheme }: { route: Route; theme: Theme; onNavigate: (route: Route) => void; onSwitchLocale: (locale: Locale) => void; onToggleTheme: () => void }) {
  const t = messages[route.locale]

  return (
    <header className="mb-24 flex items-center justify-between" data-reveal style={revealStyle(0)}>
      <nav className="flex items-center gap-5 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
        <button className={navClass(route.name === 'home')} onClick={() => onNavigate({ name: 'home', locale: route.locale })} type="button">
          {t.home}
        </button>
        <button className={navClass(route.name === 'blog' || route.name === 'post')} onClick={() => onNavigate({ name: 'blog', locale: route.locale })} type="button">
          {t.blog}
        </button>
      </nav>
      <div className="flex items-center gap-1">
        {socials.filter((social) => social.label === 'GitHub' || social.label === 'LinkedIn').map((social) => {
          const Icon = iconBySocial[social.label] ?? ExternalLink
          return (
            <a
              aria-label={social.label}
              className="header-icon-button rounded-full p-2 text-zinc-500 transition duration-300 hover:bg-violet-500/10 hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
              href={social.href}
              key={social.label}
              rel="noreferrer"
              target={social.href.startsWith('mailto:') ? undefined : '_blank'}
            >
              <Icon className="size-4" />
            </a>
          )
        })}
        <div className="mx-1 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.025] p-1">
          {locales.map((locale) => (
            <button
              aria-label={`Switch language to ${locale}`}
              className={["rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] transition", route.locale === locale ? "bg-violet-500/20 text-violet-200" : "text-zinc-500 hover:text-violet-300"].join(' ')}
              key={locale}
              onClick={() => onSwitchLocale(locale)}
              type="button"
            >
              {localeLabel(locale)}
            </button>
          ))}
        </div>
        <button
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="header-icon-button rounded-full p-2 text-zinc-500 transition duration-300 hover:bg-violet-500/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
          onClick={onToggleTheme}
          type="button"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </header>
  )
}

function navClass(active: boolean) {
  return [
    'relative transition-colors duration-300 hover:text-violet-300 focus-visible:outline-none focus-visible:text-violet-300',
    active ? 'text-zinc-100 after:absolute after:-bottom-2 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-violet-500' : '',
  ].join(' ')
}
