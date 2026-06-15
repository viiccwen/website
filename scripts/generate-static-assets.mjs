#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import matter from 'gray-matter'

const repoRoot = process.cwd()
const contentRoot = path.join(repoRoot, 'src/content/posts')
const distRoot = path.join(repoRoot, 'dist')
const siteUrl = (process.env.SITE_URL ?? 'https://vicwen.app').replace(/\/$/, '')
const locales = ['en', 'zh-tw']
const defaultLocale = 'en'

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function slugFromFilename(filename) {
  return filename.replace(/\.(md|mdx)$/i, '')
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function estimateReadingTime(content, locale) {
  const zhChars = content.match(/[\u4e00-\u9fff]/g)?.length ?? 0
  const latinWords = content.replace(/[\u4e00-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const units = zhChars > latinWords ? zhChars / 500 : latinWords / 220
  const minutes = Math.max(1, Math.ceil(units))
  return locale === 'zh-tw' ? `${minutes} 分鐘閱讀` : `${minutes} min read`
}

function dateOnly(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

async function listPostFiles() {
  const files = []

  for (const locale of locales) {
    const localeDir = path.join(contentRoot, locale)
    const entries = await readdir(localeDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !/\.(md|mdx)$/i.test(entry.name)) continue
      files.push({ locale, filename: entry.name, filePath: path.join(localeDir, entry.name) })
    }
  }

  return files
}

async function loadPosts() {
  const files = await listPostFiles()
  const posts = []

  for (const file of files) {
    const raw = await readFile(file.filePath, 'utf8')
    const { data, content } = matter(raw)
    if (data.draft === true) continue

    const slug = slugFromFilename(file.filename)
    const plainText = stripMarkdown(content)
    const published = dateOnly(data.published ?? data.date)

    posts.push({
      locale: file.locale,
      slug,
      url: `/${file.locale}/blog/${slug}`,
      title: String(data.title ?? slug),
      excerpt: String(data.excerpt ?? data.description ?? ''),
      date: published ?? '',
      category: String(data.category ?? (file.locale === 'zh-tw' ? '文章' : 'Notes')),
      tags: normalizeTags(data.tags),
      readingTime: String(data.readingTime ?? estimateReadingTime(content, file.locale)),
      content: plainText,
    })
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date))
}

function sitemapUrl(url, lastmod, priority = '0.7') {
  const lastmodXml = lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : ''
  return `  <url>\n    <loc>${xmlEscape(`${siteUrl}${url}`)}</loc>${lastmodXml}\n    <priority>${priority}</priority>\n  </url>`
}

function sitemapEntries(posts) {
  const newestByLocale = Object.fromEntries(
    locales.map((locale) => [locale, posts.find((post) => post.locale === locale)?.date]),
  )

  return [
    ...locales.flatMap((locale) => [
      { url: `/${locale}`, lastmod: newestByLocale[locale], priority: locale === defaultLocale ? '1.0' : '0.9' },
      { url: `/${locale}/blog`, lastmod: newestByLocale[locale], priority: '0.9' },
    ]),
    ...posts.map((post) => ({ url: post.url, lastmod: post.date, priority: '0.8' })),
  ]
}

function buildSitemap(entries) {
  const urls = entries.map((entry) => sitemapUrl(entry.url, entry.lastmod, entry.priority))

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

async function writeStaticRouteFallbacks(entries) {
  const indexHtml = await readFile(path.join(distRoot, 'index.html'), 'utf8')

  await Promise.all(entries.map(async ({ url }) => {
    const route = url.replace(/^\//, '')
    const routeDir = path.join(distRoot, route)

    await mkdir(routeDir, { recursive: true })
    await writeFile(path.join(routeDir, 'index.html'), indexHtml)
    await writeFile(path.join(distRoot, `${route}.html`), indexHtml)
  }))
}

async function main() {
  const posts = await loadPosts()
  const entries = sitemapEntries(posts)
  await mkdir(distRoot, { recursive: true })
  await writeFile(path.join(distRoot, 'sitemap.xml'), buildSitemap(entries))
  await writeStaticRouteFallbacks(entries)
  await writeFile(
    path.join(distRoot, 'search-index.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), siteUrl, posts }, null, 2)}\n`,
  )
  console.log(`Generated sitemap.xml, ${entries.length} static route fallbacks, and search-index.json for ${posts.length} posts`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
