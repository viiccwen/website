import type { Profile, SocialLink } from './types'

export const profile = {
  location: 'Taipei, Taiwan',
  headline: 'Building AI infrastructure, backend systems, and open-source software with a community-first mindset.',
  summary:
    "I’m Vic, a software engineer passionate about building AI infrastructure, scalable backend systems, and open-source communities. My work spans distributed systems, data infrastructure, GPU computing, and LLM inference.",
  portrait: '/vicwen.webp',
  portraitAlt: 'Portrait of Vic Wen',
} satisfies Profile

export const socials = [
  { label: 'GitHub', href: 'https://github.com/viiccwen' },
  { label: 'Email', href: 'mailto:vicwen@apache.org' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/viiccwen/' },
] satisfies readonly SocialLink[]
