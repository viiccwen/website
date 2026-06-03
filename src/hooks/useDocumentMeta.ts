import { useEffect } from 'react'

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

function setDocumentMeta(title: string, description: string) {
  document.title = title
  setMeta('description', description)
  setMeta('og:title', title, 'property')
  setMeta('og:description', description, 'property')
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
}

export function useDocumentMeta(route: Route) {
  useEffect(() => {
    let cancelled = false

    document.documentElement.lang = route.locale === 'zh-tw' ? 'zh-Hant-TW' : 'en'

    if (route.name === 'post') {
      setDocumentMeta(blogTitle, siteDescription)

      import('@/lib/blog').then(async ({ getBlogPost }) => {
        const post = await getBlogPost(route.locale, route.slug)
        if (cancelled) return

        const title = post ? `${post.title} — Vic Wen Blog` : blogTitle
        const description = post?.excerpt || siteDescription
        setDocumentMeta(title, description)
      })

      return () => {
        cancelled = true
      }
    }

    const title = route.name === 'blog' ? blogTitle : siteTitle
    setDocumentMeta(title, siteDescription)

    return () => {
      cancelled = true
    }
  }, [route])
}
