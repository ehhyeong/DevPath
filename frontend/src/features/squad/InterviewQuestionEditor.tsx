import { useState, type FormEvent } from 'react'
import type { InterviewQuestion } from './interview-practice'

export default function InterviewQuestionEditor({ question, onSave, onClose }: {
  question: InterviewQuestion; onSave: (question: InterviewQuestion) => Promise<boolean>; onClose: () => void
}) {
  const [draft, setDraft] = useState({ ...question, keywordsText: question.keywords.join(', ') })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const control = 'mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand'
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const keywords = draft.keywordsText.split(',').map((keyword) => keyword.trim()).filter(Boolean)
    if (keywords.length > 20 || keywords.some((keyword) => keyword.length > 100)) {
      setError('키워드는 각각 100자 이내로 최대 20개까지 입력해 주세요.')
      setSaving(false)
      return
    }
    try {
      const updated = { ...question, question: draft.question.trim(), category: draft.category.trim(), answer: draft.answer.trim(), level: draft.level, keywords }
      if (await onSave(updated)) onClose()
      else setError('질문을 저장하지 못했습니다. 입력 내용은 유지되어 있으니 다시 시도해 주세요.')
    } catch (error) { setError(error instanceof Error ? error.message : '질문을 저장하지 못했습니다.') }
    finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="질문·모범답안 수정" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><form onSubmit={(event) => void submit(event)}>
    <div className="mb-5 flex items-center justify-between"><h3 className="text-base font-extrabold text-gray-900">{question.id} 질문·모범답안 수정</h3><button type="button" disabled={saving} onClick={onClose} aria-label="질문 수정 닫기" className="p-1 text-gray-400"><i className="fas fa-times" /></button></div>
    <p className="mb-4 text-xs text-gray-500">팀 질문을 수정합니다. 기존 질문 번호, 개인 답변과 근거 연결은 유지됩니다.</p>
    {error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
    <fieldset disabled={saving} className="space-y-4 text-xs font-bold text-gray-700">
      <label className="block">분류<input className={control} required maxLength={100} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
      <label className="block">질문<textarea aria-label="질문" className={control} required maxLength={4000} rows={3} value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} /></label>
      <label className="block">모범답안<textarea aria-label="모범답안" className={control} maxLength={12000} rows={6} value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} /></label>
      <label className="block">핵심 키워드 (쉼표로 구분)<input className={control} value={draft.keywordsText} onChange={(event) => setDraft({ ...draft, keywordsText: event.target.value })} /></label>
      <label className="block">질문 난이도<select className={control} value={draft.level} onChange={(event) => setDraft({ ...draft, level: Number(event.target.value) })}><option value={1}>기본</option><option value={2}>실전</option><option value={3}>심화</option></select></label>
    </fieldset><div className="mt-6 flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600">취소</button><button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? '저장 중...' : '질문 변경사항 저장'}</button></div>
  </form></section></div>
}
