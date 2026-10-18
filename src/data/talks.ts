import type { Talk } from './types'

export const talks = [
  {
    title: 'MOPCON x JSDC',
    topic: 'Beyond the Agent：當模型越來越強，我們該刪掉什麼、留下什麼？',
    href: 'https://mopcon.org/2026/agenda.html?id=2026_Vic-Wen',
    period: 'Oct 2026',
    logo: '/mopcon.svg',
  },
  {
    title: 'Community Over Code Asia',
    topic: 'Accelerating Quantum Machine Learning: Building a GPU-Accelerated Data Plane in Apache Mahout',
    href: 'https://sessionize.com/s/vic-wen/accelerating-quantum-machine-learning-building-a-g/174748',
    period: 'Aug 2026',
    logo: '/community-over-code-asia.svg',
  },
  {
    title: 'SITCON',
    topic: 'Apache Mahout：釋放 QML 的 GPU 潛能',
    href: 'https://sitcon.org/2026/agenda/fd8209/',
    period: 'Mar 2026',
    logo: '/sitcon.webp',
  },
  {
    title: 'SITCON',
    topic: '上線是起點：觀測×重構×擴充的系統迭代術',
    href: 'https://sitcon.org/2026/agenda/d06ebf/',
    period: 'Mar 2026',
    logo: '/sitcon.webp',
  },
  {
    title: 'SITCON',
    topic: '從「經營」到「領導」：社群領導經驗分享',
    href: 'https://sitcon.org/2025/agenda/62f54e/',
    period: 'Mar 2025',
    logo: '/sitcon.webp',
  },
  {
    title: 'GDG DevFest Taipei',
    topic: 'Using LIT to Analyze Gemma Models in Keras',
    href: 'https://www.facebook.com/photo.php?fbid=974863934668392&id=100064343845138&set=a.464222692399188',
    period: 'Nov 2024',
    logo: '/devfest.webp',
  },
  {
    title: 'COSCUP',
    topic: '破除教育鴻溝：透過開源，偏鄉職生也能跳脫舒適框架',
    href: 'https://coscup.org/2024/zh-TW/session/RR9NV8',
    period: 'Aug 2024',
    logo: '/coscup.png',
  },
] satisfies readonly Talk[]
