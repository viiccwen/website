import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const postsRoot = path.resolve('src/content/posts')
const outputPath = path.resolve('src/content/post-index.json')

function estimateReadingTime(content, locale) {
  const zhChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latinWords = content.replace(/[\u4e00-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(zhChars > latinWords ? zhChars / 500 : latinWords / 220))
  return locale === 'zh-tw' ? `${minutes} 分鐘閱讀` : `${minutes} min read`
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  return String(value ?? '').slice(0, 10)
}

const posts = []
for (const localeEntry of await readdir(postsRoot, { withFileTypes: true })) {
  if (!localeEntry.isDirectory()) continue
  const locale = localeEntry.name
  const localePath = path.join(postsRoot, locale)

  for (const filename of await readdir(localePath)) {
    if (!/\.mdx?$/.test(filename)) continue
    const raw = await readFile(path.join(localePath, filename), 'utf8')
    const { data, content } = matter(raw)
    if (data.draft === true) continue

    posts.push({
      slug: filename.replace(/\.mdx?$/, ''), locale,
      title: data.title ?? filename.replace(/\.mdx?$/, ''),
      excerpt: data.excerpt ?? data.description ?? '',
      date: normalizeDate(data.date ?? data.published),
      category: data.category ?? (locale === 'zh-tw' ? '文章' : 'Notes'),
      featured: data.featured ?? false,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : data.tags ? [String(data.tags)] : [],
      readingTime: data.readingTime ?? estimateReadingTime(content, locale),
      image: data.image?.replace(/^\.\.\/\.\.\/\.\.\/assets\/posts\//, '/posts/'),
    })
  }
}

posts.sort((a, b) => b.date.localeCompare(a.date))
await writeFile(outputPath, `${JSON.stringify(posts, null, 2)}\n`)
