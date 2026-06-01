export type SocialLink = {
  label: string
  href: string
  handle: string
}

export type Profile = {
  name: string
  role: string
  location: string
  availability: string
  headline: string
  summary: string
  portrait: string
  portraitAlt: string
  email: string
  website: string
}

export type ExperienceItem = {
  company: string
  role: string
  period: string
  location: string
  logo: string
  summary: string
  points: readonly string[]
}

export type EducationItem = {
  school: string
  credential: string
  period: string
  logo: string
  focus: readonly string[]
}

export type Highlight = {
  metric: string
  label: string
  detail: string
}

export type Project = {
  title: string
  year: string
  status: 'open-source' | 'product' | 'award' | 'active'
  description: string
  imageUrl: string
  stack: readonly string[]
  links: readonly SocialLink[]
}

export type OpenSourceItem = {
  title: string
  subtitle: string
  period: string
  logo: string
  repository: string
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
  subtitle: string
  topic: string
  period: string
  logo: string
  href: string
}

export type TechStackItem = {
  name: string
  logo: string
}

export const profile = {
  name: 'Vic Wen',
  role: 'Software Engineer · Open Source Contributor · Community Builder',
  location: 'Taipei, Taiwan',
  availability: 'Currently employed · Open to open source collaboration and technical communities',
  headline: 'Building backend systems, data pipelines, and open source software with a community-first mindset.',
  summary:
    "I am Vic, a passionate Software Engineer who loves open source contribution and community building. My work spans backend engineering, distributed systems, data infrastructure, CUDA/quantum-adjacent performance work, and developer communities.",
  portrait: '/vicwen.webp',
  portraitAlt: 'Portrait of Vic Wen',
  email: 'viiccwen@gmail.com',
  website: 'https://blog.vicwen.app',
} satisfies Profile

export const socials = [
  { label: 'Email', href: 'mailto:viiccwen@gmail.com', handle: 'viiccwen@gmail.com' },
  { label: 'GitHub', href: 'https://github.com/viiccwen', handle: '@viiccwen' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/viiccwen/', handle: 'Vic Wen' },
  { label: 'Instagram', href: 'https://instagram.com/viiccwen', handle: '@viiccwen' },
  { label: 'Blog', href: 'https://blog.vicwen.app', handle: 'blog.vicwen.app' },
] satisfies readonly SocialLink[]

export const experience = [
  {
    company: 'Google Summer of Code',
    role: 'Mentee',
    period: 'May 2026 — Aug 2026',
    location: 'Remote',
    logo: '/gsoc-icon.png',
    summary: 'Selected for Google Summer of Code 2026, primarily contributing to Apache Mahout.',
    points: ['Contributing to the automated API documentation pipeline for Apache Mahout.'],
  },
  {
    company: 'Taiwan Mobile',
    role: 'Software Engineer Internship',
    period: 'Mar 2026 — Present',
    location: 'Taipei, Taiwan',
    logo: '/twm.webp',
    summary: 'Designing event-driven architecture for decoupled services and more reliable messaging.',
    points: ['Designed architecture with Kafka and RabbitMQ to improve reliability, scalability, and service boundaries.'],
  },
  {
    company: 'Fantasy X Games',
    role: 'Software Engineer Internship',
    period: 'Jul 2025 — Feb 2026',
    location: 'Taipei, Taiwan',
    logo: '/fxgames.png',
    summary: 'Worked on backend performance, data infrastructure, alerting, and ETL pipelines.',
    points: [
      'Optimized backend transaction merging with Kafka, achieving 3× throughput improvement and resolving transaction ordering issues.',
      'Eliminated N+1 queries in the alerting system, improving system response time from 30s to 10s.',
      'Migrated data storage to ClickHouse, cutting storage costs by 90% from 400GB to 40GB.',
      "Designed 20+ ETL pipelines using Apache Airflow, reducing the data team's preprocessing workload by 20 hours per month.",
    ],
  },
  {
    company: 'Kiwis Security',
    role: 'Cyber Security Internship',
    period: 'Mar 2024 — Jul 2024',
    location: 'Taipei, Taiwan',
    logo: '/kiwissec.png',
    summary: 'Built security education labs and realistic vulnerability scenarios for web security training.',
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
      'Third-year CSIE student with GPA 4.20/4.30, ranked 3rd in the department (Top 4%).',
      'At NLP Lab (Prof. Kuan-Yu Chen), researching Multimodal Emotion Recognition in Conversations.',
    ],
  },
] satisfies readonly EducationItem[]

export const openSource = [
  {
    title: 'Apache Airflow',
    subtitle: 'Contributor',
    period: 'Jul 2025 — Present',
    logo: '/airflow.png',
    repository: 'apache/airflow',
    points: [
      'Optimized UI API request performance with selective auto-refresh, reducing requests by up to 78%.',
    ],
    links: [{ label: 'Pull requests', href: 'https://github.com/apache/airflow/pulls?q=is%3Apr+author%3Aviiccwen', handle: 'apache/airflow' }],
  },
  {
    title: 'Apache Mahout',
    subtitle: 'Top 24 Contributor',
    period: 'Jan 2026 — Present',
    logo: '/mahout.jpg',
    repository: 'apache/mahout',
    points: [
      'Optimized GPU amplitude encoding for CUDA tensors in zero-copy, reducing encoding time by 33%.',
      'Designed automated API documentation plus CI/CD pipelines.',
      'Established multi-language Rust/Python coverage testing infrastructure.',
      'Contributed 30+ PRs and reviewed 60+ PRs focused on code quality and performance.',
    ],
    links: [
      { label: 'Pull requests', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+author%3Aviiccwen', handle: '30+ PRs' },
      { label: 'Reviews', href: 'https://github.com/apache/mahout/pulls?q=is%3Apr+reviewed-by%3Aviiccwen', handle: '60+ reviews' },
    ],
  },
  {
    title: 'Astronomer Dag-factory',
    subtitle: 'Top 6 Contributor',
    period: 'Jul 2025 — Present',
    logo: '/astronomer.jpeg',
    repository: 'astronomer/dag-factory',
    points: ['Simplified scheduling by removing deprecated settings, improving compatibility with newer Airflow versions.'],
    links: [{ label: 'Pull requests', href: 'https://github.com/astronomer/dag-factory/pulls?q=is%3Apr+author%3Aviiccwen', handle: 'astronomer/dag-factory' }],
  },
] satisfies readonly OpenSourceItem[]

export const honors = [
  {
    title: 'Database Bottom-Level Architecture to Application Practice',
    subtitle: '2025 iThome Ironman Challenge',
    period: 'Aug 2025',
    logo: '/clickhouse.svg',
    href: 'https://ithelp.ithome.com.tw/users/20168031/ironman/8221',
    description: 'Completed 30 days of ClickHouse writing from columnar storage and MergeTree internals to Kafka ingestion and Kubernetes deployment.',
  },
  {
    title: 'Software Engineering Practice Award',
    subtitle: '2025 Coding 101',
    period: 'Mar 2025',
    logo: '/coding101.png',
    description: 'Built an AI-powered full-stack learning platform with React, TypeScript, TailwindCSS, Express.js, MongoDB, LangChain, Docker, and GitHub Actions.',
  },
  {
    title: '5th Place',
    subtitle: '2023 ITSA National Software Development Contest',
    period: 'Dec 2023',
    logo: '/itsa.png',
    description: 'National software development contest recognition.',
  },
  {
    title: 'Outstanding Youth',
    subtitle: 'National Taiwan University of Science and Technology',
    period: 'Dec 2024',
    logo: '/ntust.png',
    description: 'Recognized by NTUST for outstanding youth achievement.',
  },
] satisfies readonly Honor[]

export const highlights = [
  { metric: '30+', label: 'Mahout PRs', detail: 'Open source contributions focused on docs automation, testing infrastructure, CUDA/GPU performance, and QDP APIs.' },
  { metric: '78%', label: 'API reduction', detail: 'Reduced Airflow UI API requests with selective auto-refresh strategies.' },
  { metric: '3×', label: 'Throughput', detail: 'Improved backend transaction merging throughput with Kafka while resolving ordering issues.' },
] satisfies readonly Highlight[]

export const projects = [
  {
    title: 'PartyTimes',
    year: '2026',
    status: 'product',
    description: 'A web application that helps users arrange meetings and party schedules.',
    imageUrl: '/partytimes.webp',
    stack: ['Scheduling UX', 'Web app', 'Collaboration'],
    links: [{ label: 'Repository', href: 'https://github.com/viiccwen/partytimes', handle: 'GitHub' }],
  },
  {
    title: 'NeoAcademy AI',
    year: '2025',
    status: 'award',
    description: 'An AI-powered platform that helps students learn knowledge more effectively.',
    imageUrl: '/neoacademy.jpg',
    stack: ['React', 'TypeScript', 'TailwindCSS', 'Express.js', 'MongoDB', 'LangChain'],
    links: [{ label: 'Repository', href: 'https://github.com/viiccwen/neoAcademy/', handle: 'GitHub' }],
  },
  {
    title: 'FindOne',
    year: '2025',
    status: 'product',
    description: 'A real-time AI detection game powered by Vue.js and ASP.NET.',
    imageUrl: '/findone.webp',
    stack: ['Vue.js', 'ASP.NET', 'Realtime', 'AI game'],
    links: [{ label: 'Repository', href: 'https://github.com/viiccwen/findone', handle: 'GitHub' }],
  },
  {
    title: 'GPA Calculator',
    year: '2024',
    status: 'active',
    description: 'A web application that helps students calculate their GPA easily.',
    imageUrl: '/gpa-calculator.png',
    stack: ['Student tools', 'Web app'],
    links: [{ label: 'Website', href: 'https://gpa-calculator.vicwen.app/', handle: 'Live app' }],
  },
  {
    title: 'Help Dream Scholarship Notify Bot',
    year: '2024',
    status: 'open-source',
    description: 'A Telegram bot that helps students get the latest scholarship information.',
    imageUrl: '/help-dream.png',
    stack: ['Telegram bot', 'Automation', 'Scholarship data'],
    links: [{ label: 'Repository', href: 'https://github.com/viiccwen/help-dream-scholarship-notify-bot', handle: 'GitHub' }],
  },
] satisfies readonly Project[]

export const talks = [
  {
    title: 'Community Over Code Asia',
    subtitle: 'Speaker',
    topic: 'Accelerating Quantum Machine Learning: Building a GPU-Accelerated Data Plane in Apache Mahout',
    href: 'https://sessionize.com/s/vic-wen/accelerating-quantum-machine-learning-building-a-g/174748',
    period: 'Aug 2026',
    logo: '/community-over-code-asia.svg',
  },
  {
    title: 'SITCON',
    subtitle: 'Speaker',
    topic: 'Apache Mahout：釋放 QML 的 GPU 潛能',
    href: 'https://sitcon.org/2026/agenda/fd8209/',
    period: 'Mar 2026',
    logo: '/sitcon.webp',
  },
  {
    title: 'SITCON',
    subtitle: 'Speaker',
    topic: '上線是起點：觀測×重構×擴充的系統迭代術',
    href: 'https://sitcon.org/2026/agenda/d06ebf/',
    period: 'Mar 2026',
    logo: '/sitcon.webp',
  },
  {
    title: 'SITCON',
    subtitle: 'Speaker',
    topic: '從「經營」到「領導」：社群領導經驗分享',
    href: 'https://sitcon.org/2025/agenda/62f54e/',
    period: 'Mar 2025',
    logo: '/sitcon.webp',
  },
  {
    title: 'GDG DevFest Taipei',
    subtitle: 'Speaker',
    topic: 'Using LIT to Analyze Gemma Models in Keras',
    href: 'https://www.facebook.com/photo.php?fbid=974863934668392&id=100064343845138&set=a.464222692399188',
    period: 'Nov 2024',
    logo: '/devfest.webp',
  },
  {
    title: 'COSCUP',
    subtitle: 'Speaker',
    topic: '破除教育鴻溝：透過開源，偏鄉職生也能跳脫舒適框架',
    href: 'https://coscup.org/2024/zh-TW/session/RR9NV8',
    period: 'Aug 2024',
    logo: '/coscup.png',
  },
] satisfies readonly Talk[]

export const techStack = [
  { name: 'Golang', logo: '/golang.png' },
  { name: 'Fiber', logo: '/fiber.webp' },
  { name: 'Next.js', logo: '/nextjs.png' },
  { name: 'TypeScript', logo: '/typescript.png' },
  { name: 'JavaScript', logo: '/javascript.png' },
  { name: 'FastAPI', logo: '/fastapi.png' },
  { name: 'Prisma', logo: '/prisma.png' },
  { name: 'Kubernetes', logo: '/k8s.png' },
  { name: 'ClickHouse', logo: '/clickhouse.svg' },
  { name: 'PostgreSQL', logo: '/postgresql.png' },
  { name: 'MongoDB', logo: '/mongo_db.png' },
  { name: 'Python', logo: '/python.png' },
  { name: 'LangChain', logo: '/langchain.webp' },
  { name: 'Redis', logo: '/redis.png' },
] satisfies readonly TechStackItem[]
