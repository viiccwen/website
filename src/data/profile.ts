import type { Profile, SocialLink } from './types'

export const profile = {
  location: 'Taipei, Taiwan',
  headline: 'Designing scalable cloud architecture, AI systems, distributed systems, and open-source software.',
  portrait: '/vicwen.webp',
  portraitAlt: 'Portrait of Vic Wen',
} satisfies Profile

export const socials = [
  { label: 'GitHub', href: 'https://github.com/viiccwen' },
  { label: 'Email', href: 'mailto:vicwen@apache.org' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/viiccwen/' },
] satisfies readonly SocialLink[]
