import { useEffect } from 'react'

export function useRevealEffect(dependency: unknown) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      const showRevealItems = () => {
        document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((item) => item.classList.add('is-visible'))
      }

      showRevealItems()
      const mutationObserver = new MutationObserver(showRevealItems)
      mutationObserver.observe(document.body, { childList: true, subtree: true })

      return () => mutationObserver.disconnect()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )

    const observeRevealItems = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)').forEach((item) => observer.observe(item))
    }

    const frame = window.requestAnimationFrame(observeRevealItems)
    const mutationObserver = new MutationObserver(observeRevealItems)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.cancelAnimationFrame(frame)
      mutationObserver.disconnect()
      observer.disconnect()
    }
  }, [dependency])
}
