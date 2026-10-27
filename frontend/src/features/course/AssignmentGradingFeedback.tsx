type RubricFeedback = { title: string; score: string; comments: string[] }

const sentenceSegmenter = new Intl.Segmenter('ko', { granularity: 'sentence' })

function splitSentences(lines: string[]) {
  return lines.flatMap((line) => Array.from(sentenceSegmenter.segment(line), ({ segment }) => segment.trim())).filter(Boolean)
}

function parseFeedback(content: string) {
  const summary: string[] = []
  const rubrics: RubricFeedback[] = []

  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    // 저장된 자동 채점 결과의 '- 기준명: 획득/최대점수점 - 의견' 형식을 분리한다.
    const rubric = line.match(/^\s*-\s+(.+?):\s*(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)점(?:\s*-\s*(.*))?\s*$/)
    if (rubric) {
      rubrics.push({ title: rubric[1].trim(), score: `${rubric[2]}점`, comments: rubric[3] ? [rubric[3]] : [] })
    } else if (line.trim()) {
      const current = rubrics.at(-1)
      if (current) current.comments.push(line.trim())
      else summary.push(line.trim())
    }
  }

  return { summary: splitSentences(summary), rubrics }
}

export default function AssignmentGradingFeedback({ content }: { content: string }) {
  const { summary, rubrics } = parseFeedback(content)

  return (
    <div className="space-y-5 [overflow-wrap:anywhere]">
      {summary.length > 0 ? (
        <section aria-label="종합 의견">
          <h5 className="mb-2 text-[13px] font-bold text-emerald-900">종합 의견</h5>
          <div className="space-y-2 text-[13px] leading-6 text-gray-700">
            {summary.map((sentence, index) => <p key={index}>{sentence}</p>)}
          </div>
        </section>
      ) : null}
      {rubrics.length > 0 ? (
        <section aria-label="채점 항목별 평가">
          <h5 className="mb-3 text-[13px] font-bold text-emerald-900">채점 항목별 평가</h5>
          <div className="space-y-3">
            {rubrics.map((rubric, index) => (
              <article key={index} aria-label={rubric.title} className="rounded-xl border border-emerald-100 bg-white p-3.5">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h6 className="min-w-0 flex-1 text-[13px] font-bold leading-5 text-gray-900">{rubric.title}</h6>
                  <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-800">{rubric.score}</span>
                </div>
                {rubric.comments.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-4 text-[13px] leading-6 text-gray-700 marker:text-emerald-500">
                    {splitSentences(rubric.comments).map((sentence, commentIndex) => <li key={commentIndex}>{sentence}</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
