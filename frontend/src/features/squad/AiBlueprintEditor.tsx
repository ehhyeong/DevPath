import { useState, type FormEvent } from 'react'
import { workspaceFeatureId, type WorkspaceAiDesign, type WorkspaceAiDesignEdit } from '../project/api'

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)
const inputStyle = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand'

function Field({ label, value, onChange, multiline = false, required = true, maxLength = 5000 }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; required?: boolean; maxLength?: number
}) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-gray-700">{label}</span>{multiline
    ? <textarea aria-label={label} required={required} maxLength={maxLength} rows={3} value={value} onChange={(event) => onChange(event.target.value)} className={inputStyle} />
    : <input aria-label={label} required={required} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={inputStyle} />}</label>
}

export default function AiBlueprintEditor({ design, section, onSave, onCancel }: {
  design: WorkspaceAiDesign; section: 'scenario' | 'arch' | 'roadmap'
  onSave: (request: WorkspaceAiDesignEdit) => Promise<void>; onCancel: () => void
}) {
  const [original] = useState(design)
  const [title, setTitle] = useState(design.title)
  const [summary, setSummary] = useState(design.summary)
  const [flows, setFlows] = useState(design.scenario.userFlows.map((flow) => ({ ...flow })))
  const [features, setFeatures] = useState(design.scenario.coreFeatures.map((title, index) => ({ id: workspaceFeatureId(design.scenario, index) as string | null, title })))
  const [architecture, setArchitecture] = useState({
    ...design.stack, style: design.architecture.style, description: design.architecture.description,
    components: design.architecture.components.map((component) => ({ ...component })),
    librariesText: design.stack.libraries.join('\n'), challengesText: design.architecture.technicalChallenges.join('\n'),
  })
  const [phases, setPhases] = useState(design.roadmap.map((phase) => ({ ...phase, tasksText: phase.tasks.join('\n') })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const request: WorkspaceAiDesignEdit = { expectedDesign: original }
      if (section === 'scenario') request.planning = { title, summary, userFlows: flows, features }
      if (section === 'arch') request.architecture = {
        frontend: architecture.frontend, backend: architecture.backend, database: architecture.database,
        libraries: lines(architecture.librariesText), selectionReason: architecture.selectionReason,
        style: architecture.style, description: architecture.description, components: architecture.components,
        technicalChallenges: lines(architecture.challengesText),
      }
      if (section === 'roadmap') request.roadmap = phases.map((phase) => ({ phase: phase.phase, title: phase.title, goal: phase.goal, tasks: lines(phase.tasksText) }))
      await onSave(request)
      onCancel()
    } catch (error) { setError(error instanceof Error ? error.message : '설계를 저장하지 못했습니다.') }
    finally { setSaving(false) }
  }

  return <form onSubmit={(event) => void submit(event)} className="rounded-xl border border-gray-200 bg-white p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-extrabold text-gray-900">{section === 'scenario' ? '기획 & 시나리오 수정' : section === 'arch' ? '아키텍처 설명 수정' : '개발 로드맵 수정'}</h3><p className="mt-1 text-xs text-gray-500">저장하면 팀 워크스페이스에 반영됩니다. 기존 작업 카드와 담당자는 유지됩니다.</p></div><div className="flex gap-2"><button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 disabled:opacity-50">취소</button><button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? '저장 중...' : '변경사항 저장'}</button></div></div>
    {error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
    <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
      {section === 'scenario' ? <>
        <Field label="프로젝트 이름" value={title} onChange={setTitle} maxLength={180} />
        <Field label="서비스 설명" value={summary} onChange={setSummary} multiline />
        <section className="space-y-3"><h4 className="text-xs font-extrabold text-gray-900">사용자 흐름</h4>{flows.map((flow, index) => <div key={index} className="grid items-end gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_3fr_auto]">
          <Field label={`${index + 1} 사용자`} value={flow.actor} maxLength={100} onChange={(actor) => setFlows(flows.map((item, i) => i === index ? { ...item, actor } : item))} />
          <Field label={`${index + 1} 행동`} value={flow.action} onChange={(action) => setFlows(flows.map((item, i) => i === index ? { ...item, action } : item))} />
          <button type="button" disabled={flows.length === 1} aria-label={`${index + 1} 사용자 흐름 삭제`} onClick={() => setFlows(flows.filter((_, i) => i !== index))} className="p-2 text-xs text-red-500 disabled:opacity-30">삭제</button>
        </div>)}<button type="button" disabled={flows.length >= 50} onClick={() => setFlows([...flows, { actor: '', action: '' }])} className="text-xs font-bold text-brand">+ 사용자 흐름 추가</button></section>
        <section className="space-y-3"><h4 className="text-xs font-extrabold text-gray-900">MVP 기능</h4><p className="text-xs text-gray-500">기능 번호는 유지됩니다. 작업이 연결된 기능은 작업 현황판에서 연결을 해제한 뒤 삭제할 수 있습니다.</p>{features.map((feature, index) => <div key={feature.id ?? `new-${index}`} className="flex items-end gap-3"><div className="flex-1"><Field label={feature.id ?? '새 기능'} value={feature.title} maxLength={1000} onChange={(title) => setFeatures(features.map((item, i) => i === index ? { ...item, title } : item))} /></div><button type="button" disabled={features.length === 1} aria-label={`${feature.id ?? '새 기능'} 기능 삭제`} onClick={() => setFeatures(features.filter((_, i) => i !== index))} className="p-2 text-xs text-red-500 disabled:opacity-30">삭제</button></div>)}<button type="button" disabled={features.length >= 100} onClick={() => setFeatures([...features, { id: null, title: '' }])} className="text-xs font-bold text-brand">+ MVP 기능 추가</button></section>
      </> : null}
      {section === 'arch' ? <>
        <div className="grid gap-4 sm:grid-cols-3">{(['frontend', 'backend', 'database'] as const).map((key) => <Field key={key} label={{ frontend: '프론트엔드', backend: '백엔드', database: '데이터베이스' }[key]} value={architecture[key]} maxLength={200} onChange={(value) => setArchitecture({ ...architecture, [key]: value })} />)}</div>
        <Field label="라이브러리 (한 줄에 하나)" value={architecture.librariesText} onChange={(librariesText) => setArchitecture({ ...architecture, librariesText })} multiline required={false} maxLength={10000} />
        <Field label="기술 선택 근거" value={architecture.selectionReason} onChange={(selectionReason) => setArchitecture({ ...architecture, selectionReason })} multiline />
        <Field label="아키텍처 스타일" value={architecture.style} onChange={(style) => setArchitecture({ ...architecture, style })} maxLength={200} />
        <Field label="아키텍처 설명" value={architecture.description} onChange={(description) => setArchitecture({ ...architecture, description })} multiline maxLength={10000} />
        <section className="space-y-3"><h4 className="text-xs font-extrabold text-gray-900">구성 요소</h4>{architecture.components.map((component, index) => <div key={index} className="grid items-end gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_3fr_auto]"><Field label={`${index + 1} 구성 요소`} value={component.name} maxLength={200} onChange={(name) => setArchitecture({ ...architecture, components: architecture.components.map((item, i) => i === index ? { ...item, name } : item) })} /><Field label={`${index + 1} 역할`} value={component.responsibility} onChange={(responsibility) => setArchitecture({ ...architecture, components: architecture.components.map((item, i) => i === index ? { ...item, responsibility } : item) })} /><button type="button" aria-label={`${index + 1} 구성 요소 삭제`} onClick={() => setArchitecture({ ...architecture, components: architecture.components.filter((_, i) => i !== index) })} className="p-2 text-xs text-red-500">삭제</button></div>)}<button type="button" disabled={architecture.components.length >= 50} onClick={() => setArchitecture({ ...architecture, components: [...architecture.components, { name: '', responsibility: '' }] })} className="text-xs font-bold text-brand">+ 구성 요소 추가</button></section>
        <Field label="기술적 난제 (한 줄에 하나)" value={architecture.challengesText} onChange={(challengesText) => setArchitecture({ ...architecture, challengesText })} multiline required={false} maxLength={10000} />
        <p className="text-xs text-gray-500">테이블과 관계는 ERD 설계에서, 엔드포인트는 API 명세서에서 수정합니다.</p>
      </> : null}
      {section === 'roadmap' ? <><p className="text-xs text-gray-500">Phase의 날짜는 일정 관리에서 수정합니다. 아래 작업 계획을 바꿔도 기존 작업 카드가 추가되거나 삭제되지 않습니다.</p>{phases.map((phase, index) => <section key={phase.phase} className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4"><h4 className="text-xs font-extrabold text-gray-900">Phase {phase.phase}</h4><Field label={`Phase ${phase.phase} 이름`} value={phase.title} maxLength={200} onChange={(title) => setPhases(phases.map((item, i) => i === index ? { ...item, title } : item))} /><Field label={`Phase ${phase.phase} 목표`} value={phase.goal} multiline onChange={(goal) => setPhases(phases.map((item, i) => i === index ? { ...item, goal } : item))} /><Field label={`Phase ${phase.phase} 작업 계획 (한 줄에 하나)`} value={phase.tasksText} multiline required={false} maxLength={10000} onChange={(tasksText) => setPhases(phases.map((item, i) => i === index ? { ...item, tasksText } : item))} /></section>)}</> : null}
    </fieldset>
  </form>
}
