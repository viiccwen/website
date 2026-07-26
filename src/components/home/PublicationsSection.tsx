import { publications } from '@/data/publications'

export function PublicationsSection() {
  return (
    <div className="divide-y divide-white/10">
      {publications.map((publication) => (
        <article className="group py-7 first:pt-0 last:pb-0" key={publication.title}>
          <div className="flex items-start gap-4">
            <div className="mt-1 grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white shadow-lg shadow-black/20">
              <img alt={publication.logoAlt} className="size-full object-contain" src={publication.logo} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <h3 className="text-base font-semibold leading-7 text-zinc-100 transition-colors duration-300 group-hover:text-violet-200">
                  {publication.href ? (
                    <a className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70" href={publication.href} rel="noreferrer" target="_blank">
                      {publication.title}
                    </a>
                  ) : publication.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {publication.authors.split('Guan-Hua Wen').map((part, index, parts) => (
                  <span key={`${publication.title}-author-${index}`}>
                    {part}
                    {index < parts.length - 1 ? <strong className="font-semibold text-zinc-200">Guan-Hua Wen</strong> : null}
                  </span>
                ))}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {publication.href ? (
                  <a className="underline decoration-violet-400/40 underline-offset-4 transition hover:text-violet-300 hover:decoration-violet-300" href={publication.href} rel="noreferrer" target="_blank">
                    {publication.venue}
                  </a>
                ) : publication.venue}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
