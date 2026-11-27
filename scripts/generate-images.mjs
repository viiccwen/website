import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const widths = [96, 192, 480, 960, 1600]
const webpOptions = { quality: 85, effort: 5 }

async function* imageFiles(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!prefix && entry.name === 'optimized') continue
    const relativePath = path.join(prefix, entry.name)
    if (entry.isDirectory()) {
      yield* imageFiles(path.join(directory, entry.name), relativePath)
    } else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
      yield relativePath
    }
  }
}

export async function generateImages(publicDirectory, manifestPath) {
  const outputDirectory = path.join(publicDirectory, 'optimized')
  await mkdir(outputDirectory, { recursive: true })
  const manifest = {}

  for await (const relativePath of imageFiles(publicDirectory)) {
    const input = await readFile(path.join(publicDirectory, relativePath))
    const image = sharp(input)
    const metadata = await image.metadata()
    if (metadata.pages > 1) continue
    const { width, height } = metadata.autoOrient
    const hash = createHash('sha256')
      .update(input)
      .update(JSON.stringify({ widths, webpOptions, versions: sharp.versions }))
      .digest('hex')
      .slice(0, 16)
    const targetWidths = [...new Set(widths.map((target) => Math.min(target, width)))]
    const variants = []

    for (const targetWidth of targetWidths) {
      const filename = `${hash}-${targetWidth}.webp`
      const outputPath = path.join(outputDirectory, filename)
      const exists = await stat(outputPath).then(() => true, (error) => {
        if (error.code === 'ENOENT') return false
        throw error
      })
      if (!exists) {
        await image.clone().autoOrient().resize({ width: targetWidth, withoutEnlargement: true }).webp(webpOptions).toFile(outputPath)
      }
      variants.push({ src: `/optimized/${filename}`, width: targetWidth })
    }

    manifest[`/${relativePath.split(path.sep).join('/')}`] = { width, height, variants }
  }

  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
  console.log(`Generated responsive WebP variants for ${Object.keys(manifest).length} images.`)
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--help')) {
    console.log('Usage: pnpm run generate:images\nGenerates cached WebP sizes (up to 1600px) from public PNG/JPEG/WebP files.\nOriginals, SVGs and animated images are preserved. Run again after adding or changing images.\nRuns automatically before pnpm dev and pnpm build. Outputs are gitignored.')
  } else {
    await generateImages(path.resolve('public'), path.resolve('src/generated/images.json'))
  }
}
