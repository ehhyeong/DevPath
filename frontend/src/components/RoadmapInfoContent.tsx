import { sanitizeHtml } from '../lib/html-sanitizer'

type RoadmapInfoContentProps = {
  content: string | null | undefined
}

export default function RoadmapInfoContent({ content }: RoadmapInfoContentProps) {
  const normalized = content?.trim()

  if (!normalized) {
    return null
  }

  if (!normalized.includes('<')) {
    return <div className="roadmap-info-html"><p>{normalized}</p></div>
  }

  return (
    <div
      className="roadmap-info-html"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalized) }}
    />
  )
}
