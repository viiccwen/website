import type { ComponentProps } from 'react'

import imageManifest from '@/generated/images.json'

type ImageAsset = {
  width: number
  height: number
  variants: { src: string; width: number }[]
}

const images: Record<string, ImageAsset> = imageManifest

export function Image({ src, alt, sizes = '(min-width: 768px) 704px, calc(100vw - 48px)', loading = 'lazy', decoding = 'async', ...props }: ComponentProps<'img'>) {
  const asset = src ? images[src] : undefined

  return (
    <img
      alt={alt}
      decoding={decoding}
      height={asset?.height}
      loading={loading}
      sizes={asset ? sizes : undefined}
      src={asset ? asset.variants[asset.variants.length - 1].src : src}
      srcSet={asset?.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ')}
      width={asset?.width}
      {...props}
    />
  )
}
