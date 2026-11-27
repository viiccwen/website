import { Image } from '@/components/Image'

export function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="logo-frame grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg shadow-lg shadow-black/20">
      <Image alt={`${alt} logo`} className="size-full rounded-md object-contain" height={44} sizes="44px" src={src} width={44} />
    </div>
  )
}
