import type { EducationItem, ExperienceItem, OpenSourceItem, ProjectItem } from './types'

export const experience = [
  {
    company: 'Microsoft',
    role: 'Research and Development Intern',
    period: 'Jul 2026 — Present',
    logo: '/microsoft.svg',
    href: 'https://www.microsoft.com/',
    points: [],
  },
  {
    company: 'Google Summer of Code',
    role: 'Mentee',
    period: 'May 2026 — Aug 2026',
    logo: '/gsoc-icon.png',
    href: 'https://summerofcode.withgoogle.com/',
    points: ['Contributing to the automated API documentation pipeline for Apache Mahout.'],
  },
  {
    company: 'Taiwan Mobile',
    role: 'Software Engineer Intern',
    period: 'Mar 2026 — Jul 2026',
    logo: '/twm.webp',
    href: 'https://www.taiwanmobile.com/',
    points: [
      'Built an ML/LLM-powered pipeline with vLLM to detect scam websites and automate review workflows.',
      'Designed architecture with Kafka and RabbitMQ to improve reliability, scalability, and service boundaries.',
    ],
  },
  {
    company: 'Fantasy X Games',
    role: 'Software Engineer Intern',
    period: 'Jul 2025 — Feb 2026',
    logo: '/fxgames.png',
    points: [
      'Optimized backend transaction merging with Kafka, achieving 3× throughput improvement and resolving transaction ordering issues.',
      'Eliminated N+1 queries in the alerting system, improving system response time from 30s to 10s.',
      'Migrated data storage to ClickHouse, cutting storage costs by 90% from 400GB to 40GB.',
    ],
  },
] satisfies readonly ExperienceItem[]

export const education = [
  {
    school: 'National Taiwan University of Science and Technology',
    credential: 'Bachelor of Science in Computer Science',
    period: 'Sep 2023 — Jun 2027',
    logo: '/ntust.png',
    focus: [
      "Third-year CSIE student with GPA 4.20/4.30, ranked 3rd in the department (Top 4%), and awarded Dean's List 3 times.",
      'NLP Lab (Prof. Kuan-Yu Chen), researching Multimodal Emotion Recognition in Conversations.',
    ],
    labHref: 'https://nlp.csie.ntust.edu.tw/',
  },
] satisfies readonly EducationItem[]

export const projects = [
  {
    title: 'NTUAI - Ian Agent',
    description: "Maintainer",
    period: 'Jul. 2026 - Present',
    logo: '/ian.webp',
    href: 'https://github.com/ntuaiclub/ian',
    points: [
      "Integrated multiple messaging platforms to provide 24/7 intelligent support as Taiwan's first multi-platform AI Agent built by a student club.",
      'Built the testing, evaluation, observability, and CI/CD pipelines for the agent platform.',
      'Served 500+ users and significantly reduced administrative workload for staff.',
    ],
  },
] satisfies readonly ProjectItem[]

export const openSource = [
  {
    title: 'Apache Mahout - Committer',
    period: 'Jan 2026 — Present',
    logo: '/mahout.jpg',
    points: [
      'Optimized GPU amplitude encoding for CUDA tensors in zero-copy, reducing encoding time by 33%.',
      'Designed automated API documentation plus CI/CD pipelines.',
      'Established multi-language Rust/Python coverage testing infrastructure.',
      'Served as an apache committer with 40+ merged PRs and 70+ reviews.'
    ],
    links: [
      { label: 'Pull requests', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' },
      { label: 'Reviews', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+reviewed-by%3Aviiccwen+is%3Amerged' },
    ],
  },
  {
    title: 'vLLM - Contributor',
    period: 'Jun 2026 — Present',
    logo: '/vllm.png',
    points: ['Improved API documentation accuracy for LLM completion outputs.'],
    links: [{ label: 'Pull requests', href: 'https://github.com/vllm-project/vllm/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' }],
  },
] satisfies readonly OpenSourceItem[]
