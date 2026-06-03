#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const validLocales = new Set(['en', 'zh-tw'])
const root = dirname(dirname(fileURLToPath(import.meta.url)))

function printHelp() {
  console.log(`Create a new blog post draft.

Usage:
  pnpm newpost "Post title"
  pnpm newpost "Post title" --locale en
  pnpm newpost "Post title" --locale zh-tw --slug custom-slug

Options:
  --locale <en|zh-tw>  Target locale. Defaults to zh-tw.
  --slug <slug>        Override the generated filename/route slug.
  --category <name>    Frontmatter category. Defaults to Notes/筆記.
  --tag <tag>          Add one tag. Can be used multiple times.
  --draft false        Create a published post instead of a draft.
  --help              Show this message.
`)
}

function parseArgs(argv) {
  const options = {
    category: undefined,
    draft: true,
    locale: 'zh-tw',
    slug: undefined,
    tags: [],
    titleParts: [],
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--locale' || arg === '-l') {
      options.locale = argv[++index]
      continue
    }

    if (arg === '--slug' || arg === '-s') {
      options.slug = argv[++index]
      continue
    }

    if (arg === '--category' || arg === '-c') {
      options.category = argv[++index]
      continue
    }

    if (arg === '--tag' || arg === '-t') {
      options.tags.push(argv[++index])
      continue
    }

    if (arg === '--draft') {
      options.draft = argv[++index] !== 'false'
      continue
    }

    options.titleParts.push(arg)
  }

  return options
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function slugify(value) {
  const asciiSlug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return asciiSlug || `${today()}-post`
}

function quoteYaml(value) {
  return JSON.stringify(value)
}

function uniquePath(locale, slug) {
  const postsDir = join(root, 'src', 'content', 'posts', locale)
  const firstPath = join(postsDir, `${slug}.md`)

  if (!existsSync(firstPath)) return { path: firstPath, slug }

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const nextSlug = `${slug}-${suffix}`
    const nextPath = join(postsDir, `${nextSlug}.md`)
    if (!existsSync(nextPath)) return { path: nextPath, slug: nextSlug }
  }

  throw new Error(`Could not find an unused filename for slug: ${slug}`)
}

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  printHelp()
  process.exit(0)
}

const title = options.titleParts.join(' ').trim()

if (!title) {
  console.error('Error: missing post title. Example: pnpm newpost "My Post Title"')
  process.exit(1)
}

if (!validLocales.has(options.locale)) {
  console.error(`Error: invalid locale "${options.locale}". Use en or zh-tw.`)
  process.exit(1)
}

const baseSlug = slugify(options.slug || title)
const { path: postPath, slug } = uniquePath(options.locale, baseSlug)
const category = options.category || (options.locale === 'zh-tw' ? '筆記' : 'Notes')
const lang = options.locale === 'zh-tw' ? 'zh-tw' : 'en'
const tags = options.tags.filter(Boolean)
const content = `---
title: ${quoteYaml(title)}
published: ${today()}
description: ""
image: ""
tags: [${tags.map(quoteYaml).join(', ')}]
category: ${quoteYaml(category)}
draft: ${options.draft}
lang: ${quoteYaml(lang)}
---

# ${title}

Write your post here.
`

mkdirSync(dirname(postPath), { recursive: true })
writeFileSync(postPath, content, 'utf8')

const relativePath = postPath.replace(`${root}/`, '')
const route = `/${options.locale}/blog/${slug}`

console.log(`Created ${relativePath}`)
console.log(`Route: ${route}`)
