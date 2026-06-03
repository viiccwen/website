import { useEffect } from 'react'

import { routeFromPath, type Route } from '@/lib/routes'

export function usePopStateRoute(onRouteChange: (route: Route) => void) {
  useEffect(() => {
    function handlePopState() {
      onRouteChange(routeFromPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [onRouteChange])
}
