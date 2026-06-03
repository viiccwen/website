import { lazy, Suspense, useState } from 'react'

import { AppHeader } from '@/components/AppHeader'
import { getPreferredTheme, type Theme, useTheme } from '@/hooks/useTheme'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { usePopStateRoute } from '@/hooks/usePopStateRoute'
import { useRevealEffect } from '@/hooks/useReveal'
import { pathForRoute, routeFromPath, switchLocale, type Route } from '@/lib/routes'

const HomePage = lazy(() => import('@/components/home/HomePage'))
const BlogPage = lazy(() => import('@/pages/BlogPage'))
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'))

function App() {
  const [route, setRoute] = useState<Route>(() => routeFromPath())
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme())

  useTheme(theme)
  useDocumentMeta(route)
  usePopStateRoute(setRoute)
  useRevealEffect(route)

  function navigate(next: Route) {
    window.history.pushState({}, '', pathForRoute(next))
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`min-h-svh overflow-hidden bg-background text-foreground antialiased theme-${theme}`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_15%_82%,rgba(124,58,237,0.10),transparent_24%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,72px_72px,72px_72px]" />
      <div className="relative mx-auto w-full max-w-3xl px-6 py-10 sm:px-8 sm:py-16">
        <AppHeader route={route} theme={theme} onNavigate={navigate} onSwitchLocale={(locale) => navigate(switchLocale(route, locale))} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
        <Suspense fallback={<main aria-hidden="true" className="min-h-[50svh]" />}>
          {route.name === 'blog' ? <BlogPage locale={route.locale} onNavigate={navigate} /> : route.name === 'post' ? <BlogPostPage locale={route.locale} onNavigate={navigate} slug={route.slug} /> : <HomePage />}
        </Suspense>
      </div>
    </div>
  )
}

export default App
