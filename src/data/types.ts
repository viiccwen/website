export type SocialLink = {
  label: string
  href: string
}

export type Profile = {
  location: string
  headline: string
  summary: string
  portrait: string
  portraitAlt: string
}

export type ExperienceItem = {
  company: string
  role: string
  period: string
  logo: string
  href?: string
  points: readonly string[]
}

export type EducationItem = {
  school: string
  credential: string
  period: string
  logo: string
  focus: readonly string[]
  labHref?: string
}

export type OpenSourceItem = {
  title: string
  period: string
  logo: string
  points: readonly string[]
  links: readonly SocialLink[]
}

export type Honor = {
  title: string
  subtitle: string
  period: string
  logo: string
  description: string
  href?: string
}

export type Talk = {
  title: string
  topic: string
  period: string
  logo: string
  href: string
}
