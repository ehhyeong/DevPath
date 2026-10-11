import type { InterviewQuestion } from './interview-practice'

const categoryColors: Record<string, string> = {
  '핵심 난제': 'border-purple-100 bg-purple-50 text-purple-600', 성능: 'border-blue-100 bg-blue-50 text-blue-600',
  보안: 'border-red-100 bg-red-50 text-red-600', 설계: 'border-teal-100 bg-teal-50 text-teal-700',
  인프라: 'border-gray-200 bg-gray-50 text-gray-600', 협업: 'border-orange-100 bg-orange-50 text-orange-600',
}

export default function AiInterviewGenerationModal({ ready, error, questions, selected, saving, taskCount, apiCount, tableCount, onToggle, onRetry, onClose, onAdd }: {
  ready: boolean
  error: string
  questions: InterviewQuestion[]
  selected: string[]
  saving: boolean
  taskCount: number
  apiCount: number
  tableCount: number
  onToggle: (id: string, checked: boolean) => void
  onRetry: () => void
  onClose: () => void
  onAdd: () => void
}) {
  return <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="generate-question-title" className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 p-6">
        <div><h2 id="generate-question-title" className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-magic text-teal-500" />AI에게 질문 더 받기</h2><p className="mt-0.5 text-xs text-gray-500">설계서의 작업 · API · 테이블에서 아직 다루지 않은 주제를 찾아 질문을 만듭니다.</p></div>
        <button aria-label="AI 질문 생성 닫기" onClick={onClose} disabled={saving} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40" type="button"><i className="fas fa-times" /></button>
      </header>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6">
        {error ? <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5 text-center"><p className="text-sm font-bold text-gray-900">질문을 생성하지 못했어요.</p><p className="mt-2 text-xs leading-relaxed text-red-700">{error}</p><button onClick={onRetry} type="button" className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><i className="fas fa-redo mr-1" />다시 시도</button></div>
          : !ready ? <div role="status" className="py-10 text-center"><i aria-hidden="true" className="fas fa-magic animate-pulse text-3xl text-teal-500" /><p className="mt-4 text-sm font-bold text-teal-700">설계서를 바탕으로 질문을 만들고 있어요.</p><div className="mx-auto mt-5 w-fit space-y-1.5 text-left">{[`개발 로드맵의 작업 ${taskCount}개 확인`, `API 명세 ${apiCount}개 · ERD ${tableCount}개 테이블 분석`, '기존 질문과 겹치는 주제 제외'].map((step) => <p key={step} className="text-xs font-bold text-gray-500"><i aria-hidden="true" className="fas fa-check mr-1.5 text-brand" />{step}</p>)}</div></div>
            : questions.length ? <><p className="mb-3 text-xs text-gray-500">질문 {questions.length}개를 찾았어요. 연습할 질문을 골라 주세요.</p><div className="space-y-2">{questions.map((question) => <label key={question.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition hover:border-teal-200 hover:bg-teal-50/50 ${selected.includes(question.id) ? 'border-teal-200 bg-teal-50/50' : 'border-gray-200'}`}>
              <input aria-label={`${question.id} 질문 선택`} checked={selected.includes(question.id)} onChange={(event) => onToggle(question.id, event.target.checked)} disabled={saving} type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-emerald-500" />
              <span className="min-w-0 flex-1"><span className="mb-1 flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${categoryColors[question.category] ?? 'border-gray-200 bg-gray-50 text-gray-600'}`}>{question.category}</span><span aria-label={`난이도 ${question.level}단계`} className="text-[10px] font-bold text-gray-400">{'●'.repeat(question.level)}{'○'.repeat(3 - question.level)}</span>{question.from ? <span className="text-[10px] font-bold text-teal-600"><i className="fas fa-link mr-1" />{question.from}</span> : null}</span><span className="block text-sm font-bold text-gray-900">{question.question}</span></span>
            </label>)}</div></> : <p className="py-10 text-center text-sm font-bold text-gray-500">새로 추가할 질문이 없습니다. 다시 생성해 보세요.</p>}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-5">
        <span aria-live="polite" className="text-xs font-bold text-gray-500">{selected.length ? `${selected.length}개 선택` : ''}</span>
        <div className="flex gap-2">{ready && !questions.length && !error ? <button onClick={onRetry} type="button" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600">다시 생성</button> : null}<button onClick={onClose} disabled={saving} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40" type="button">닫기</button><button disabled={!ready || !!error || saving || !selected.length} onClick={onAdd} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-black disabled:opacity-40" type="button">{saving ? '질문 추가 중...' : '선택한 질문 추가'}</button></div>
      </footer>
    </section>
  </div>
}
