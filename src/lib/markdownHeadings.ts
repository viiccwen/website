export type MarkdownHeading = {
  depth: 2 | 3
  id: string
  text: string
}

export function headingId(value: string) {
  return value
    .toLocaleLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function headingText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const seen = new Map<string, number>()

  return Array.from(content.matchAll(/^(#{2,3})\s+(.+?)\s*#*$/gm), (match) => {
    const text = headingText(match[2])
    const baseId = headingId(text) || 'section'
    const occurrence = seen.get(baseId) ?? 0
    seen.set(baseId, occurrence + 1)

    return {
      depth: match[1].length as 2 | 3,
      id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`,
      text,
    }
  })
}
