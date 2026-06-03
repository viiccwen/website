import type { Locale } from '@/lib/i18n'

const postModules = import.meta.glob('../content/posts/*/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
})

function localeAndSlugFromPath(path: string): { locale: Locale; slug: string } | undefined {
  const match = path.match(/\/posts\/([^/]+)\/([^/]+)\.(md|mdx)$/)
  if (!match) return undefined

  return { locale: match[1] as Locale, slug: match[2] }
}

const postSlugsByLocale = Object.keys(postModules).reduce<Record<string, Set<string>>>((index, path) => {
  const post = localeAndSlugFromPath(path)
  if (!post) return index

  index[post.locale] ??= new Set<string>()
  index[post.locale].add(post.slug)
  return index
}, {})

export function hasBlogPost(locale: Locale, slug: string) {
  return postSlugsByLocale[locale]?.has(slug) ?? false
}
