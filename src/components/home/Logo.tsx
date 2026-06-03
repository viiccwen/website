export function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="logo-frame grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white shadow-lg shadow-black/20">
      <img alt={`${alt} logo`} className="size-full rounded-md object-contain" src={src} />
    </div>
  )
}
