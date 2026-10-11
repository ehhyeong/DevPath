import { useState, type FormEvent } from 'react'
import { resolveInterviewEvidence, taskEvidenceStyles, type InterviewEvidence, type InterviewEvidenceLinks } from './interview-evidence'
import type { InterviewQuestion } from './interview-practice'

export default function InterviewEvidenceEditor({ question, evidence, onSave, onClose }: {
  question: InterviewQuestion
  evidence: InterviewEvidence
  onSave: (links: InterviewEvidenceLinks) => Promise<boolean>
  onClose: () => void
}) {
  const linked = resolveInterviewEvidence(question, evidence)
  const [tasks, setTasks] = useState(linked.tasks.map((task) => task.id))
  const [apis, setApis] = useState(linked.apis.map((api) => `${api.method} ${api.path}`))
  const [erd, setErd] = useState(linked.table ?? '')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFailed(false)
    const saved = await onSave({ tasks, apis, erd })
    setSaving(false)
    if (saved) onClose()
    else setFailed(true)
  }
  return <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
    <form role="dialog" aria-modal="true" aria-labelledby="evidence-title" onSubmit={(event) => void save(event)} className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="border-b border-gray-100 p-6"><h2 id="evidence-title" className="text-lg font-extrabold text-gray-900">근거 코드 · 설계 연결</h2><p className="mt-2 text-sm text-gray-700">{question.id}. {question.question}</p><p className="mt-1 text-xs text-gray-500">관련된 실제 작업과 설계를 선택해 주세요. 구현 상태는 작업 현황판을 기준으로 표시됩니다.</p></header>
      <div className="custom-scrollbar min-h-0 space-y-5 overflow-y-auto p-6">
        <fieldset><legend className="mb-2 text-xs font-bold text-gray-700">작업 현황판</legend><div className="space-y-2">{evidence.tasks.map((task) => <label key={task.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-3"><input type="checkbox" aria-label={`${task.id} ${task.title}`} checked={tasks.includes(task.id)} disabled={saving} onChange={(event) => setTasks((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} /><span className="min-w-0 flex-1 text-xs text-gray-700">#{task.id} {task.title}</span><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${taskEvidenceStyles[task.status].badge}`}>{taskEvidenceStyles[task.status].label}</span></label>)}{!evidence.tasks.length ? <p className="text-xs text-gray-500">등록된 작업이 없습니다.</p> : null}</div></fieldset>
        <fieldset><legend className="mb-2 text-xs font-bold text-gray-700">API 명세서</legend><div className="space-y-2">{evidence.apis.map((api) => { const reference = `${api.method} ${api.path}`; return <label key={api.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-3"><input type="checkbox" aria-label={reference} checked={apis.includes(reference)} disabled={saving} onChange={(event) => setApis((current) => event.target.checked ? [...current, reference] : current.filter((value) => value !== reference))} /><span className="break-all font-mono text-xs text-gray-700">{reference}</span></label> })}{!evidence.apis.length ? <p className="text-xs text-gray-500">등록된 API가 없습니다.</p> : null}</div></fieldset>
        <label className="block"><span className="mb-2 block text-xs font-bold text-gray-700">ERD 테이블</span><select aria-label="근거 테이블" value={erd} disabled={saving} onChange={(event) => setErd(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="">연결 없음</option>{evidence.tables.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        {failed ? <p role="alert" className="text-xs text-red-600">연결을 저장하지 못했습니다. 선택한 내용을 유지했으니 다시 시도해 주세요.</p> : null}
      </div>
      <footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600">취소</button><button type="submit" disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{saving ? '저장 중...' : '연결 저장'}</button></footer>
    </form>
  </div>
}
