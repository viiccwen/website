import type { EducationItem, ExperienceItem, OpenSourceItem } from './types'

export const experience = [
  {
    company: 'Google Summer of Code',
    role: 'Mentee',
    period: 'May 2026 — Aug 2026',
    logo: '/gsoc-icon.png',
    points: ['Contributing to the automated API documentation pipeline for Apache Mahout.'],
  },
  {
    company: 'Taiwan Mobile',
    role: 'Software Engineer Internship',
    period: 'Mar 2026 — Present',
    logo: '/twm.webp',
    points: [
      'Built an ML/LLM-powered pipeline with vLLM to detect scam websites and automate review workflows.',
      'Designed architecture with Kafka and RabbitMQ to improve reliability, scalability, and service boundaries.',
    ],
  },
  {
    company: 'Fantasy X Games',
    role: 'Software Engineer Internship',
    period: 'Jul 2025 — Feb 2026',
    logo: '/fxgames.png',
    points: [
      'Optimized backend transaction merging with Kafka, achieving 3× throughput improvement and resolving transaction ordering issues.',
      'Eliminated N+1 queries in the alerting system, improving system response time from 30s to 10s.',
      'Migrated data storage to ClickHouse, cutting storage costs by 90% from 400GB to 40GB.',
    ],
  },
  {
    company: 'Kiwis Security',
    role: 'Cyber Security Internship',
    period: 'Mar 2024 — Jul 2024',
    logo: '/kiwissec.png',
    points: [
      'Used PHP, JavaScript, MySQL, and Burp Suite to design real-world web application vulnerabilities and attack scenarios.',
      'Developed 5+ entry-to-intermediate web penetration testing courses with hands-on labs.',
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

export const openSource = [
  {
    title: 'Apache Mahout',
    period: 'Jan 2026 — Present',
    logo: '/mahout.jpg',
    points: [
      'Optimized GPU amplitude encoding for CUDA tensors in zero-copy, reducing encoding time by 33%.',
      'Designed automated API documentation plus CI/CD pipelines.',
      'Established multi-language Rust/Python coverage testing infrastructure.',
      'Contributed 35+ PRs and reviewed 70+ PRs focused on code quality and performance.',
    ],
    links: [
      { label: 'Pull requests', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' },
      { label: 'Reviews', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+reviewed-by%3Aviiccwen+is%3Amerged' },
    ],
  },
  {
    title: 'vLLM',
    period: 'Jun 2026 — Present',
    logo: '/vllm.png',
    points: ['Improved API documentation accuracy for LLM completion outputs.'],
    links: [{ label: 'Pull requests', href: 'https://github.com/vllm-project/vllm/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' }],
  },
] satisfies readonly OpenSourceItem[]
