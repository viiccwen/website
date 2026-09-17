import { education, experience, honors, projects, talks } from '@/data/site'

import { OpenSourceSection } from './OpenSourceSection'
import { PublicationsSection } from './PublicationsSection'
import { ProfileHero } from './ProfileHero'
import { Section } from './Section'
import { Timeline } from './Timeline'

export function HomePage() {
  return (
    <main>
      <ProfileHero />

      <Section id="experience" index="01" label="Experience" order={0}>
        <Timeline items={experience.map((item) => ({
          title: item.company,
          subtitle: item.role,
          period: item.period,
          logo: item.logo,
          href: item.href,
          fullItemHref: true,
          points: item.points,
        }))} />
      </Section>

      <Section id="opensource" index="02" label="Open Source" order={1}>
        <OpenSourceSection />
      </Section>

      <Section id="education" index="03" label="Education" order={2}>
        <Timeline items={education.map((item) => ({
          title: item.school,
          subtitle: item.credential,
          period: item.period,
          logo: item.logo,
          points: item.focus.map((point) => {
            if (item.labHref && point.startsWith('NLP Lab')) {
              return (
                <>
                  <a className="text-violet-300 underline-offset-4 transition hover:text-violet-200 hover:underline" href={item.labHref} rel="noreferrer" target="_blank">
                    NLP Lab
                  </a>
                  {point.slice('NLP Lab'.length)}
                </>
              )
            }

            return point
          }),
        }))} />
      </Section>

      <Section id="publications" index="04" label="Publications" order={3}>
        <PublicationsSection />
      </Section>

      <Section id="projects" index="05" label="Projects" order={4}>
        <Timeline items={projects.map((item) => ({
          title: item.title,
          subtitle: item.description,
          period: item.period,
          logo: item.logo,
          href: item.href,
          fullItemHref: Boolean(item.href),
          points: item.points,
        }))} />
      </Section>

      <Section id="honors" index="06" label="Honors" order={5}>
        <Timeline items={honors.map((item) => ({
          title: item.title,
          subtitle: item.subtitle,
          period: item.period,
          logo: item.logo,
          href: item.href,
          points: [],
        }))} />
      </Section>

      <Section id="talks" index="07" label="Talks" order={6}>
        <Timeline items={talks.map((item) => ({
          title: item.title,
          subtitle: item.topic,
          period: item.period,
          logo: item.logo,
          href: item.href,
          fullItemHref: true,
          points: [],
        }))} />
      </Section>
    </main>
  )
}

export default HomePage
