import { defaultLocale, isLocale, type Locale } from '@/lib/i18n'
import { hasBlogPost } from '@/lib/postManifest'

export type Route =
  | { name: 'home'; locale: Locale }
  | { name: 'blog'; locale: Locale }
  | { name: 'post'; locale: Locale; slug: string }

export function routeFromPath(pathname = window.location.pathname): Route {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] === 'blog') {
    if (segments[1]) return { name: 'post', locale: defaultLocale, slug: segments[1] }
    return { name: 'blog', locale: defaultLocale }
  }

  const [localeCandidate, section, slug] = segments
  const locale = isLocale(localeCandidate) ? localeCandidate : defaultLocale

  if (section === 'blog') {
    if (slug) return { name: 'post', locale, slug }
    return { name: 'blog', locale }
  }

  return { name: 'home', locale }
}

export function pathForRoute(route: Route) {
  if (route.name === 'blog') return `/${route.locale}/blog`
  if (route.name === 'post') return `/${route.locale}/blog/${route.slug}`
  return `/${route.locale}`
}

export function switchLocale(route: Route, nextLocale: Locale): Route {
  if (route.name === 'post') {
    if (hasBlogPost(nextLocale, route.slug)) return { ...route, locale: nextLocale }
    return { name: 'blog', locale: nextLocale }
  }

  return { ...route, locale: nextLocale }
}
