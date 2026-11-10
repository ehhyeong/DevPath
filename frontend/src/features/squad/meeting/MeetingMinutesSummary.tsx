import type { ReactNode } from 'react'

function emphasize(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index} className="font-semibold text-gray-100">{part.slice(2, -2)}</strong>
      : part,
  )
}

export default function MeetingMinutesSummary({ summary }: { summary: string }) {
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let items: string[] = []
  let ordered = false
  let listStart = 1

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push(<p key={blocks.length} className="whitespace-pre-line">{emphasize(paragraph.join('\n'))}</p>)
    paragraph = []
  }

  function flushList() {
    if (!items.length) return
    const children = items.map((item, index) => <li key={index} className="pl-1 marker:text-gray-500">{emphasize(item)}</li>)
    blocks.push(ordered
      ? <ol key={blocks.length} start={listStart} className="list-decimal space-y-2 pl-5">{children}</ol>
      : <ul key={blocks.length} className="list-disc space-y-2 pl-5">{children}</ul>)
    items = []
  }

  // 저장된 일반 문장도 보존하며 AI가 사용하는 제목·목록·강조만 해석한다.
  for (const rawLine of summary.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim()
    const heading = line.match(/^#{1,6}\s+(.+)$/) ?? line.match(/^\*\*([^*]+)\*\*[:：]?$/)
    const bullet = line.match(/^[-*•]\s+(.+)$/)
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/)

    if (!line || heading) {
      flushParagraph()
      flushList()
      if (heading) {
        blocks.push(<h5 key={blocks.length} className="border-l-2 border-brand pl-3 text-sm font-bold text-white [&:not(:first-child)]:mt-6">{emphasize(heading[1])}</h5>)
      }
    } else if (bullet || numbered) {
      flushParagraph()
      if (items.length && ordered !== Boolean(numbered)) flushList()
      ordered = Boolean(numbered)
      if (!items.length) listStart = numbered ? Number(numbered[1]) : 1
      items.push(numbered ? numbered[2] : bullet![1])
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()

  return <div className="meeting-minutes-summary min-w-0 space-y-3 text-sm leading-7 text-gray-300 [overflow-wrap:anywhere]">{blocks}</div>
}
