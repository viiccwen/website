export const locales = ['en', 'zh-tw'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

const traditionalChineseTimeZones = new Set(['Asia/Taipei', 'Asia/Hong_Kong', 'Asia/Macau'])

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale))
}

export function localeLabel(locale: Locale) {
  return locale === 'zh-tw' ? '繁中' : 'EN'
}

export function getPreferredLocale(options?: { languages?: readonly string[]; timeZone?: string }): Locale {
  const languages = options?.languages ?? getBrowserLanguages()
  const timeZone = options?.timeZone ?? getBrowserTimeZone()

  if (languages.some(isChineseLanguageTag)) return 'zh-tw'
  if (traditionalChineseTimeZones.has(timeZone ?? '')) return 'zh-tw'

  return defaultLocale
}

function getBrowserLanguages() {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : [navigator.language]
}

function getBrowserTimeZone() {
  if (typeof Intl === 'undefined') return undefined
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function isChineseLanguageTag(language: string) {
  return language.toLowerCase().startsWith('zh')
}
