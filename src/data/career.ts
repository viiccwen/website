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
    points: [],
  },
  {
    company: 'Taiwan Mobile',
    role: 'Software Engineer Intern',
    period: 'Mar 2026 — Jul 2026',
    logo: '/twm.webp',
    href: 'https://www.taiwanmobile.com/',
    points: [],
  },
  {
    company: 'Fantasy X Games',
    role: 'Software Engineer Intern',
    period: 'Jul 2025 — Feb 2026',
    logo: '/fxgames.png',
    points: [],
  },
] satisfies readonly ExperienceItem[]

export const education = [
  {
    school: 'National Taiwan University of Science and Technology',
    credential: 'Bachelor of Science in Computer Science',
    period: 'Sep 2023 — Jun 2027',
    logo: '/ntust.png',
    focus: [
      "Final-year CSIE student with GPA 4.20/4.30, ranked 3rd in the department (Top 4%), and awarded Dean's List 3 times.",
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
    points: [],
    links: [
      { label: 'Pull requests', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' },
      { label: 'Reviews', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+reviewed-by%3Aviiccwen+is%3Amerged' },
    ],
  },
  {
    title: 'Ray Data - Contributor',
    period: 'Aug 2026 — Present',
    logo: 'https://github.com/ray-project.png',
    points: [],
    links: [{ label: 'Pull requests', href: 'https://github.com/ray-project/ray/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' }],
  },
  {
    title: 'Apache Airflow - Contributor',
    period: 'Jul 2026 — Present',
    logo: '/airflow.png',
    points: [],
    links: [{ label: 'Pull requests', href: 'https://github.com/apache/airflow/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' }],
  },
  {
    title: 'Apache TVM - Contributor',
    period: 'Jul 2026 — Present',
    logo: '/tvm.png',
    points: [],
    links: [{ label: 'Pull requests', href: 'https://github.com/apache/tvm/pulls?q=is%3Apr+is%3Amerged+author%3Aviiccwen' }],
  },
] satisfies readonly OpenSourceItem[]
