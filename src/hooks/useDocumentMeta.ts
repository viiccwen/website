import { useEffect } from 'react'

import { getBlogPost } from '@/lib/blog'
import type { Route } from '@/lib/routes'

const siteTitle = 'Vic Wen — Software Engineer & Open Source Contributor'
const siteDescription = 'Profile and engineering blog of Vic Wen, covering backend engineering, data infrastructure, open source contributions, and technical communities.'
const blogTitle = 'Vic Wen Blog — Engineering Notes'

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  const selector = `meta[${attribute}="${name}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }

  element.content = content
}

export function useDocumentMeta(route: Route) {
  useEffect(() => {
    const post = route.name === 'post' ? getBlogPost(route.locale, route.slug) : undefined
    const title = route.name === 'post' && post ? `${post.title} — Vic Wen Blog` : route.name === 'blog' ? blogTitle : siteTitle
    const description = route.name === 'post' && post?.excerpt ? post.excerpt : siteDescription

    document.documentElement.lang = route.locale === 'zh-tw' ? 'zh-Hant-TW' : 'en'
    document.title = title
    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
  }, [route])
}
