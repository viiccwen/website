import { defaultLocale, isLocale, type Locale } from '@/lib/i18n'

export const POSTS_PER_PAGE = 10

export type BlogFrontmatter = {
  title?: string
  excerpt?: string
  description?: string
  date?: string
  published?: string
  category?: string
  featured?: boolean
  tags?: readonly string[]
  readingTime?: string
  draft?: boolean
  image?: string
  lang?: string
}

export type BlogPost = {
  slug: string
  locale: Locale
  title: string
  excerpt: string
  date: string
  category: string
  featured: boolean
  tags: readonly string[]
  readingTime: string
  draft: boolean
  image?: string
  content: string
}

const postModules = import.meta.glob<string>('../content/posts/*/*.{md,mdx}', {
  eager: true,
  query: '?raw',
  import: 'default',
})

function slugFromPath(path: string) {
  return path
    .split('/')
    .pop()
    ?.replace(/\.(md|mdx)$/, '') ?? ''
}

function localeAndSlugFromPath(path: string): { locale: Locale; slug: string } {
  const match = path.match(/\/posts\/([^/]+)\/([^/]+)\.(md|mdx)$/)
  if (!match) return { locale: defaultLocale, slug: slugFromPath(path) }

  const [, localeCandidate, filename] = match
  return {
    locale: isLocale(localeCandidate) ? localeCandidate : defaultLocale,
    slug: filename,
  }
}

function estimateReadingTime(content: string, locale: Locale) {
  const zhChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latinWords = content.replace(/[\u4e00-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const units = zhChars > latinWords ? zhChars / 500 : latinWords / 220
  const minutes = Math.max(1, Math.ceil(units))
  return locale === 'zh-tw' ? `${minutes} 分鐘閱讀` : `${minutes} min read`
}

function parseScalar(value: string): string | boolean | string[] {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }
  return trimmed.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatter(raw: string): { data: BlogFrontmatter; content: string } {
  if (!raw.startsWith('---')) return { data: {}, content: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { data: {}, content: raw }

  const lines = raw.slice(3, end).trim().split('\n')
  const data: Record<string, unknown> = {}

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || line.startsWith('  - ')) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (value) {
      data[key] = parseScalar(value)
      continue
    }

    const list: string[] = []
    while (lines[index + 1]?.startsWith('  - ')) {
      index += 1
      list.push(lines[index].replace(/^\s*-\s*/, '').trim().replace(/^['"]|['"]$/g, ''))
    }
    data[key] = list
  }

  return { data: data as BlogFrontmatter, content: raw.slice(end + 4).replace(/^\s*\n/, '') }
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value ? [value] : []
  return []
}

function normalizeAssetPath(path?: string) {
  if (!path) return undefined
  return path.replace(/^\.\.\/\.\.\/\.\.\/assets\/posts\//, '/posts/')
}

function htmlImageToMarkdown(attributes: string) {
  const src = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1]
  if (!src) return ''

  const alt = attributes.match(/\balt=["']([^"']*)["']/i)?.[1] ?? ''
  const width = attributes.match(/\bwidth=["']?([^"'\s>]+)["']?/i)?.[1]
  const title = width ? ` "width=${width}"` : ''

  return `![${alt}](${src}${title})`
}

function cleanContent(content: string, locale: Locale) {
  return content
    .replace(/^::github\{repo=['"]?([^'"}]+)['"]?\}\s*$/gm, (_, repo: string) => `[GitHub: ${repo}](https://github.com/${repo})`)
    .replace(/^::github\{repo=([^}]+)\}\s*$/gm, (_, repo: string) => `[GitHub: ${repo}](https://github.com/${repo})`)
    .replace(/^:::(note|warning|important|tip|caution|danger)\s*$/gim, (_, kind: string) => `> **${kind.toUpperCase()}**${locale === 'zh-tw' ? '：' : ':'}`)
    .replace(/^:::$/gm, '')
    .replace(/\.\.\/\.\.\/\.\.\/assets\/posts\//g, '/posts/')
    .replace(/src="\.\.\/\.\.\/\.\.\/assets\/posts\//g, 'src="/posts/')
    .replace(/<img\b([^>]*)\/?\s*>/gim, (_, attributes: string) => htmlImageToMarkdown(attributes))
    .replace(/<video\b[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/video>/gim, (_, src: string) => `[Video](${src})`)
    .replace(/<br\s*\/?\s*>/gim, '\n')
    .replace(/https:\/\/blog\.vicwen\.app\/posts\/([^/)]+)\/?/g, `/${locale}/blog/$1`)
}

function parsePost(path: string, raw: string): BlogPost {
  const { locale, slug } = localeAndSlugFromPath(path)
  const { data: frontmatter, content: rawContent } = parseFrontmatter(raw)
  const content = cleanContent(rawContent, locale)
  const date = String(frontmatter.date ?? frontmatter.published ?? '').slice(0, 10)

  return {
    slug,
    locale,
    title: frontmatter.title ?? slug,
    excerpt: frontmatter.excerpt ?? frontmatter.description ?? '',
    date,
    category: frontmatter.category ?? (locale === 'zh-tw' ? '文章' : 'Notes'),
    featured: frontmatter.featured ?? false,
    tags: normalizeTags(frontmatter.tags),
    draft: frontmatter.draft ?? false,
    readingTime: frontmatter.readingTime ?? estimateReadingTime(content, locale),
    image: normalizeAssetPath(frontmatter.image),
    content,
  }
}

export const blogPosts = Object.entries(postModules)
  .map(([path, raw]) => parsePost(path, raw))
  .filter((post) => !post.draft)
  .sort((a, b) => b.date.localeCompare(a.date))

const postsByLocale = blogPosts.reduce<Record<Locale, BlogPost[]>>(
  (posts, post) => {
    posts[post.locale].push(post)
    return posts
  },
  { en: [], 'zh-tw': [] },
)

const postKey = (locale: Locale, slug: string) => `${locale}/${slug}`

const postsByKey = new Map(blogPosts.map((post) => [postKey(post.locale, post.slug), post]))

export function getBlogPosts(locale: Locale) {
  return postsByLocale[locale]
}

export function getBlogPost(locale: Locale, slug: string) {
  return postsByKey.get(postKey(locale, slug))
}

export function getAdjacentBlogPosts(locale: Locale, slug: string) {
  const posts = getBlogPosts(locale)
  const postIndex = posts.findIndex((post) => post.slug === slug)

  return {
    previousPost: postIndex > 0 ? posts[postIndex - 1] : undefined,
    nextPost: postIndex >= 0 && postIndex < posts.length - 1 ? posts[postIndex + 1] : undefined,
  }
}

export function hasBlogPost(locale: Locale, slug: string) {
  return postsByKey.has(postKey(locale, slug))
}
