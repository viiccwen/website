import { education, experience, honors, profile, talks } from '@/data/site'

import { OpenSourceSection } from './OpenSourceSection'
import { ProfileHero } from './ProfileHero'
import { Section } from './Section'
import { Timeline } from './Timeline'

export function HomePage() {
  return (
    <main>
      <ProfileHero />

      <Section id="about" index="01" label="About" order={0}>
        <div className="space-y-5 text-base leading-8 text-zinc-400">
          <p>{profile.summary}</p>
        </div>
      </Section>

      <Section id="experience" index="02" label="Experience" order={1}>
        <Timeline items={experience.map((item) => ({
          title: item.company,
          subtitle: item.role,
          period: item.period,
          logo: item.logo,
          points: item.points,
        }))} />
      </Section>

      <Section id="opensource" index="03" label="Open Source" order={2}>
        <OpenSourceSection />
      </Section>

      <Section id="education" index="04" label="Education" order={3}>
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

      <Section id="honors" index="05" label="Honors" order={4}>
        <Timeline items={honors.map((item) => ({
          title: item.title,
          subtitle: item.subtitle,
          period: item.period,
          logo: item.logo,
          summary: item.description,
          href: item.href,
          points: [],
        }))} />
      </Section>

      <Section id="talks" index="06" label="Talks" order={5}>
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
