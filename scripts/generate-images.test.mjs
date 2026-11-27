import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

import { generateImages } from './generate-images.mjs'

test('generates responsive images without upscaling and reuses unchanged outputs', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'website-images-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const publicDirectory = path.join(directory, 'public')
  const manifestPath = path.join(directory, 'generated', 'images.json')
  await mkdir(path.join(publicDirectory, 'posts'), { recursive: true })
  await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#abcdef' } })
    .png().toFile(path.join(publicDirectory, 'posts', 'diagram.png'))
  await sharp({ create: { width: 40, height: 20, channels: 4, background: '#00000000' } })
    .png().toFile(path.join(publicDirectory, 'logo.png'))
  await writeFile(path.join(publicDirectory, 'vector.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')

  const manifest = await generateImages(publicDirectory, manifestPath)
  assert.deepEqual(Object.keys(manifest).sort(), ['/logo.png', '/posts/diagram.png'])
  assert.deepEqual(manifest['/posts/diagram.png'].variants.map(({ width }) => width), [96, 192, 480, 960, 1600])
  assert.deepEqual(manifest['/logo.png'].variants.map(({ width }) => width), [40])
  assert.deepEqual(JSON.parse(await readFile(manifestPath, 'utf8')), manifest)

  for (const asset of Object.values(manifest)) {
    for (const variant of asset.variants) {
      const metadata = await sharp(path.join(publicDirectory, variant.src)).metadata()
      assert.equal(metadata.format, 'webp')
      assert.equal(metadata.width, variant.width)
      assert.equal(metadata.height, variant.width * asset.height / asset.width)
    }
  }
  const logoPath = path.join(publicDirectory, manifest['/logo.png'].variants[0].src)
  assert.equal((await sharp(logoPath).metadata()).hasAlpha, true)
  const { mtimeMs } = await stat(logoPath)
  assert.deepEqual(await generateImages(publicDirectory, manifestPath), manifest)
  assert.equal((await stat(logoPath)).mtimeMs, mtimeMs)

  await sharp({ create: { width: 40, height: 20, channels: 4, background: '#ff0000' } })
    .png().toFile(path.join(publicDirectory, 'logo.png'))
  const updated = await generateImages(publicDirectory, manifestPath)
  assert.notEqual(updated['/logo.png'].variants[0].src, manifest['/logo.png'].variants[0].src)
})

test('uses display dimensions for EXIF-rotated photos and reports corrupt inputs', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'website-images-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const manifestPath = path.join(directory, 'images.json')
  await sharp({ create: { width: 200, height: 100, channels: 3, background: '#abcdef' } })
    .jpeg().withMetadata({ orientation: 6 }).toFile(path.join(directory, 'photo.jpg'))
  const manifest = await generateImages(directory, manifestPath)
  assert.equal(manifest['/photo.jpg'].width, 100)
  assert.equal(manifest['/photo.jpg'].height, 200)
  const output = await sharp(path.join(directory, manifest['/photo.jpg'].variants[0].src)).metadata()
  assert.equal(output.width, 96)
  assert.equal(output.height, 192)

  await writeFile(path.join(directory, 'broken.png'), 'not an image')
  await assert.rejects(generateImages(directory, manifestPath), /unsupported image format/i)
})
