import type { Profile, SocialLink } from './types'

export const profile = {
  location: 'Taipei, Taiwan',
  headline: 'Building AI infrastructure, backend systems, and open-source software with a community-first mindset.',
  summary:
    "I’m Vic, a software engineer building scalable infrastructure for AI. My work spans AI / data infra, backend systems, and open source.",
  portrait: '/vicwen.webp',
  portraitAlt: 'Portrait of Vic Wen',
} satisfies Profile

export const socials = [
  { label: 'GitHub', href: 'https://github.com/viiccwen' },
  { label: 'Email', href: 'mailto:vicwen@apache.org' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/viiccwen/' },
] satisfies readonly SocialLink[]
