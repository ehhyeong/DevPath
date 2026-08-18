import { useState,type ReactNode } from 'react'
import { saveInstructorTeamWorkspaceDoc } from './instructor-api'
import { Modal } from './instructor-team-workspace-shared'
import type { ActivityLogItem,TeamData,WorkspaceMember } from './instructor-types'
import { apiMethodTone,apiStatusMeta,architectureDocFor,architectureEndpointFor,architectureLabel,avatarUrl,buildHref,INSTRUCTOR_TEAM_ARCHITECTURE_UI_LOCK_CLASSES,membersOnly,pushTeamNotification,relativeTime,serializeArchitectureDoc,type ApiEndpointSpec,type ArchitectureDocData,type ArchitectureFeedback,type ArchitectureTab } from './instructor-workspace-support'



export function ArchitecturePage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [mode, setMode] = useState<ArchitectureTab>('api')
  const [selectedApi, setSelectedApi] = useState<ApiEndpointSpec | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [apiModalOpen, setApiModalOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const members = membersOnly(data)
  const doc = architectureDocFor(data, mode)
  const currentDoc = architectureDocFor(data, mode)

  async function saveDoc(nextDoc: ArchitectureDocData, targetMode: ArchitectureTab = mode) {
    if (!workspaceId) return
    await saveInstructorTeamWorkspaceDoc(architectureEndpointFor(targetMode, workspaceId), serializeArchitectureDoc(nextDoc))
    pushTeamNotification(workspaceId, {
      title: '아키텍처 문서 저장',
      description: `${architectureLabel(targetMode)} 문서가 업데이트되었습니다.`,
      href: buildHref('architecture', workspaceId),
      icon: 'fas fa-project-diagram',
    })
    await reload()
  }

  async function sendFeedback(target?: ApiEndpointSpec | null, explicitText?: string) {
    const content = (explicitText ?? feedbackText).trim()
    if (!content) return
    const next: ArchitectureFeedback = {
      id: String(Date.now()),
      author: data.dashboard?.ownerName ?? '나',
      role: 'PM',
      content: target ? `[${target.method} ${target.url}] ${content}` : content,
      createdAt: new Date().toISOString(),
      mine: true,
    }
    const nextDoc = {
      ...currentDoc,
      feedback: [...currentDoc.feedback, next],
      logs: [{ id: `log-${Date.now()}`, actor: '나', role: 'PM', message: target ? `${target.url} API에 코멘트를 남겼습니다.` : '설계 리뷰 코멘트를 남겼습니다.', createdAt: new Date().toISOString() }, ...currentDoc.logs],
    }
    setFeedbackText('')
    setSelectedApi(null)
    await saveDoc(nextDoc)
  }

  async function saveApiEndpoint(form: Omit<ApiEndpointSpec, 'id'>) {
    const nextEndpoint = { ...form, id: String(Date.now()) }
    await saveDoc({
      ...currentDoc,
      endpoints: [...currentDoc.endpoints, nextEndpoint],
      logs: [{ id: `log-${Date.now()}`, actor: '나', role: 'PM', message: `${form.url} API 명세를 등록했습니다.`, createdAt: new Date().toISOString() }, ...currentDoc.logs],
    }, 'api')
    setApiModalOpen(false)
  }

  async function saveExternalLink(form: { externalLink: string; notes: string }) {
    await saveDoc({
      ...currentDoc,
      externalLink: form.externalLink,
      notes: form.notes,
      logs: [{ id: `log-${Date.now()}`, actor: '나', role: 'PM', message: `${mode === 'erd' ? 'ERD' : mode === 'infra' ? '인프라 구조도' : 'API 명세서'} 원본 링크를 업데이트했습니다.`, createdAt: new Date().toISOString() }, ...currentDoc.logs],
    })
    setLinkModalOpen(false)
  }

  function openExternalLink() {
    if (doc.externalLink) window.open(doc.externalLink, '_blank', 'noopener,noreferrer')
    else setLinkModalOpen(true)
  }

  return (
    <div className={`instructor-team-architecture flex h-full min-h-0 overflow-hidden ${INSTRUCTOR_TEAM_ARCHITECTURE_UI_LOCK_CLASSES}`}>
      <div className="z-10 flex h-full flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex shrink-0 flex-col justify-between gap-4 px-8 pt-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-2 flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-project-diagram text-[#7C3AED]" />아키텍처 & API 설계 리뷰</h1>
            <p className="mb-4 text-sm text-gray-500">팀원들이 작성한 데이터베이스 구조와 API 스펙을 점검하고 코멘트를 남기세요.</p>
          </div>
          <div className="mb-4 flex shrink-0 gap-2">
            {mode === 'api' ? <button type="button" onClick={() => setApiModalOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"><i className="fas fa-plus text-gray-400" />API 항목 추가</button> : null}
            <button type="button" onClick={openExternalLink} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"><i className="fas fa-external-link-alt text-gray-400" />{doc.externalLink ? '원본 링크 확인' : '외부 툴 열기'}</button>
            {mode !== 'api' ? <button type="button" onClick={() => setLinkModalOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-[#7C3AED] shadow-sm transition hover:bg-purple-100"><i className="fas fa-pen" />링크/노트 수정</button> : null}
          </div>
        </div>

        <div className="flex shrink-0 gap-6 border-b border-gray-200 px-8">
          {(['api', 'erd', 'infra'] as const).map((tab) => <button key={tab} type="button" onClick={() => setMode(tab)} className={`arch-tab pb-3 text-sm font-bold ${mode === tab ? 'active text-[#7C3AED]' : 'text-gray-500'}`}>{tab === 'api' ? 'API 명세서' : tab === 'erd' ? 'ERD (DB 설계)' : '인프라 구조도'}</button>)}
        </div>

        <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-gray-50 p-6">
          {mode === 'api' ? <ApiSpecView doc={doc} members={members} onOpen={setSelectedApi} /> : <DiagramView mode={mode} doc={doc} onEdit={() => setLinkModalOpen(true)} />}
        </div>
      </div>

      <ArchitectureFeedbackPanel doc={doc} value={feedbackText} onChange={setFeedbackText} onSend={() => void sendFeedback()} />
      <ArchitectureActivityPanel doc={doc} fallbackLogs={data.activityLogs} />

      {selectedApi ? <ApiDetailModal endpoint={selectedApi} onClose={() => setSelectedApi(null)} onSend={(text) => sendFeedback(selectedApi, text)} /> : null}
      {apiModalOpen ? <ApiEndpointModal members={members} onClose={() => setApiModalOpen(false)} onSubmit={saveApiEndpoint} /> : null}
      {linkModalOpen ? <ArchitectureLinkModal mode={mode} doc={doc} onClose={() => setLinkModalOpen(false)} onSubmit={saveExternalLink} /> : null}
    </div>
  )
}

export function ApiSpecView({ doc, members, onOpen }: { doc: ArchitectureDocData; members: WorkspaceMember[]; onOpen: (endpoint: ApiEndpointSpec) => void }) {
  if (doc.endpoints.length === 0) {
    return <ArchitectureEmpty icon="fas fa-network-wired" title="등록된 API 명세서가 없습니다" description="팀원들이 API 명세서를 작성하면 이곳에 목록이 표시됩니다." />
  }
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-extrabold text-gray-800">REST API Endpoints</h3>
        <span className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm">총 {doc.endpoints.length}개 항목</span>
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-white text-[10px] font-bold text-gray-400 uppercase">
            <tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Endpoint</th><th className="px-4 py-3">설명</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">담당 (BE)</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {doc.endpoints.map((endpoint) => {
              const owner = members.find((member) => member.learnerId === endpoint.ownerId)
              const status = apiStatusMeta(endpoint.status)
              return (
                <tr key={endpoint.id} className="api-row cursor-pointer transition hover:bg-gray-50" onClick={() => onOpen(endpoint)}>
                  <td className="px-4 py-3"><span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodTone(endpoint.method)}`}>{endpoint.method}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{endpoint.url}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-600">{endpoint.description}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>{status.icon ? <i className={status.icon} /> : null}{status.label}</span></td>
                  <td className="flex items-center gap-1.5 px-4 py-3"><img src={owner?.profileImage ?? avatarUrl(owner?.learnerName)} className="h-5 w-5 rounded-full border border-gray-200 bg-gray-50" alt="" /><span className="text-xs text-gray-700">{owner?.learnerName ?? '미지정'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DiagramView({ mode, doc, onEdit }: { mode: Exclude<ArchitectureTab, 'api'>; doc: ArchitectureDocData; onEdit: () => void }) {
  const title = mode === 'erd' ? '데이터베이스 ERD' : '클라우드 인프라 아키텍처'
  const emptyTitle = mode === 'erd' ? '등록된 ERD가 없습니다' : '등록된 인프라 구조도가 없습니다'
  const emptyDescription = mode === 'erd' ? '팀원들이 데이터베이스 스키마를 설계하면 이곳에서 다이어그램을 확인할 수 있습니다.' : '시스템 아키텍처 및 클라우드 인프라 설계가 등록되면 이곳에 표시됩니다.'
  const icon = mode === 'erd' ? 'fas fa-database' : 'fas fa-cloud'
  if (!doc.externalLink && !doc.notes) return <ArchitectureEmpty icon={icon} title={emptyTitle} description={emptyDescription} action={<button type="button" onClick={onEdit} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md">링크 등록</button>} />
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center gap-3"><h3 className="text-sm font-extrabold text-gray-800">{title}</h3><span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-600">문서 연결됨</span></div>
        <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:text-[#7C3AED]"><i className="fas fa-pen" />수정</button>
      </div>
      <div className={`custom-scrollbar flex flex-1 items-center justify-center overflow-auto p-6 ${mode === 'erd' ? 'bg-[#2C2C2C]' : 'bg-white'}`}>
        {doc.externalLink ? (
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <p className="mb-3 text-[10px] font-bold text-gray-400 uppercase">Connected Source</p>
            <a href={doc.externalLink} target="_blank" rel="noreferrer" className="break-all font-mono text-sm font-bold text-[#7C3AED] hover:underline">{doc.externalLink}</a>
            <pre className="mt-5 whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">{doc.notes || '원본 링크가 연결되어 있습니다. 외부 툴에서 다이어그램을 확인하세요.'}</pre>
          </div>
        ) : <pre className="w-full max-w-3xl whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-6 text-sm leading-6 text-gray-700 shadow-lg">{doc.notes}</pre>}
      </div>
    </div>
  )
}

export function ArchitectureEmpty({ icon, title, description, action }: { icon: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-purple-100 bg-purple-50 shadow-sm"><i className={`${icon} text-3xl text-[#7C3AED] opacity-60`} /></div>
      <h3 className="mb-2 text-lg font-extrabold text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm whitespace-pre-line text-sm leading-relaxed text-gray-500">{description}</p>
      {action}
    </div>
  )
}

export function ArchitectureFeedbackPanel({ doc, value, onChange, onSend }: { doc: ArchitectureDocData; value: string; onChange: (value: string) => void; onSend: () => void }) {
  return (
    <aside className="relative z-20 flex w-80 shrink-0 flex-col bg-white shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.03)]">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 bg-purple-50 px-5"><i className="fas fa-comments text-[#7C3AED]" /><h3 className="text-sm font-extrabold text-gray-900">강사 피드백 및 논의</h3></div>
      <div className="custom-scrollbar flex flex-1 flex-col space-y-5 overflow-y-auto p-5 pb-24">
        {doc.feedback.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center text-center opacity-70"><i className="far fa-comment-dots mb-3 text-4xl text-gray-300" /><p className="text-xs font-bold text-gray-500">아직 등록된 코멘트가 없습니다.</p><p className="mt-1 text-[10px] text-gray-400">설계에 대한 첫 피드백을 남겨주세요.</p></div> : doc.feedback.map((item) => (
          <div key={item.id} className={`flex gap-3 ${item.mine ? 'flex-row-reverse' : ''}`}>
            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${item.mine ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50'}`}>{item.mine ? <i className="fas fa-user-tie text-xs" /> : <img src={avatarUrl(item.author)} className="h-8 w-8 rounded-full" alt="" />}</div>
            <div className={item.mine ? 'flex flex-col items-end' : ''}>
              <div className={`mb-1 flex items-center gap-1.5 ${item.mine ? 'flex-row-reverse' : ''}`}><span className="text-xs font-bold text-gray-900">{item.mine ? '나' : item.author}</span><span className={`rounded px-1 py-0.5 text-[9px] ${item.mine ? 'bg-[#7C3AED] text-white' : 'border border-purple-100 bg-purple-50 text-purple-600'}`}>{item.role}</span><span className="text-[9px] text-gray-400">{relativeTime(item.createdAt)}</span></div>
              <p className={`break-words rounded-xl border p-3 text-xs font-medium leading-relaxed ${item.mine ? 'rounded-tr-none border-purple-200 bg-purple-50 text-right text-gray-900 shadow-sm' : 'rounded-tl-none border-gray-100 bg-gray-50 text-gray-700'}`}>{item.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full shrink-0 border-t border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 shadow-sm transition focus-within:border-[#7C3AED]">
          <textarea value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend() } }} className="custom-scrollbar h-10 flex-1 resize-none border-none bg-transparent p-2 text-xs leading-relaxed outline-none" placeholder="팀 설계에 대한 강사 피드백 코멘트 남기기 (Enter)" />
          <button type="button" onClick={onSend} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white shadow-md transition hover:bg-black"><i className="fas fa-paper-plane text-xs" /></button>
        </div>
      </div>
    </aside>
  )
}

export function ArchitectureActivityPanel({ doc, fallbackLogs }: { doc: ArchitectureDocData; fallbackLogs: ActivityLogItem[] }) {
  const logs = doc.logs.length > 0 ? doc.logs : fallbackLogs.slice(0, 5).map((log) => ({ id: String(log.logId), actor: log.actorName ?? '시스템', role: 'SYS', message: log.description ?? log.targetTitle ?? '워크스페이스 활동이 기록되었습니다.', createdAt: log.createdAt ?? new Date().toISOString() }))
  return (
    <aside className="relative z-30 flex w-72 shrink-0 flex-col border-l border-gray-100 bg-white shadow-[-5px_0_15px_-3px_rgba(0,0,0,0.02)]">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50 px-5"><i className="fas fa-history text-gray-500" /><h3 className="text-sm font-extrabold text-gray-900">활동 로그</h3></div>
      {logs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-white p-5 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50"><i className="fas fa-inbox text-2xl text-gray-300" /></div><p className="mb-1 text-xs font-bold text-gray-500">기록된 활동이 없습니다</p><p className="text-[10px] leading-relaxed text-gray-400">설계안 추가, 상태 변경 등의<br />활동 내역이 여기에 기록됩니다.</p></div>
      ) : (
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5">{logs.map((log, index) => <div key={log.id} className={`relative border-l-2 pb-2 pl-5 ${index === logs.length - 1 ? 'border-transparent' : 'border-gray-100'}`}><div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-[#7C3AED] ring-4 ring-white" /><p className="mb-1 text-[10px] font-bold text-gray-400">{relativeTime(log.createdAt)}</p><p className="flex items-center gap-1 text-xs font-bold text-gray-900">{log.actor}<span className="rounded bg-purple-50 px-1 py-0.5 text-[8px] text-purple-600">{log.role}</span></p><p className="mt-1.5 rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs leading-relaxed text-gray-600">{log.message}</p></div>)}</div>
      )}
    </aside>
  )
}

export function ApiDetailModal({ endpoint, onClose, onSend }: { endpoint: ApiEndpointSpec; onClose: () => void; onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6"><div className="flex items-center gap-3"><span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodTone(endpoint.method)}`}>{endpoint.method}</span><h3 className="font-mono text-lg font-bold text-gray-900">{endpoint.url}</h3></div><button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button></div>
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6"><div><h4 className="mb-2 text-xs font-bold text-gray-500 uppercase">Description</h4><p className="text-sm font-medium text-gray-800">{endpoint.description}</p></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><h4 className="mb-2 text-[10px] font-bold text-gray-400 uppercase">Request (Body/Query)</h4><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-gray-200 bg-white p-3 font-mono text-xs text-gray-800">{endpoint.request || 'No Request Body'}</pre></div><div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><h4 className="mb-2 text-[10px] font-bold text-gray-400 uppercase">Response</h4><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-gray-200 bg-white p-3 font-mono text-xs text-[#00C471]">{endpoint.response || 'No Response Data'}</pre></div></div><div className="mt-2 border-t border-gray-200 pt-4"><h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-[#7C3AED]"><i className="fas fa-comment-dots" />이 API에 대한 피드백 남기기</h4><textarea value={text} onChange={(event) => setText(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="해당 API 명세의 수정이 필요하거나 보완점이 있다면 코멘트를 남겨주세요." /></div></div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">닫기</button><button type="button" onClick={() => void onSend(text)} className="flex items-center gap-1 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-paper-plane" />피드백 전송</button></div>
      </div>
    </div>
  )
}

export function ApiEndpointModal({ members, onClose, onSubmit }: { members: WorkspaceMember[]; onClose: () => void; onSubmit: (form: Omit<ApiEndpointSpec, 'id'>) => Promise<void> }) {
  const [form, setForm] = useState<Omit<ApiEndpointSpec, 'id'>>({ method: 'GET', url: '', description: '', request: '', response: '', status: 'DESIGNING', ownerId: members[0]?.learnerId ?? null })
  return <Modal title="API 명세 등록" icon="fas fa-network-wired" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }} className="space-y-5 p-6"><div className="grid grid-cols-[120px_1fr] gap-3"><select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as ApiEndpointSpec['method'] })} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select><input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required placeholder="/api/v1/example" className="rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm outline-none focus:border-[#7C3AED]" /></div><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required placeholder="API 설명" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><div className="grid grid-cols-2 gap-3"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ApiEndpointSpec['status'] })} className="rounded-xl border border-gray-200 px-4 py-3 text-sm"><option value="DESIGNING">설계 중</option><option value="SYNCING">프론트 연동 중</option><option value="DONE">개발 완료</option><option value="NEEDS_FIX">수정 필요</option></select><select value={form.ownerId ?? ''} onChange={(event) => setForm({ ...form, ownerId: event.target.value ? Number(event.target.value) : null })} className="rounded-xl border border-gray-200 px-4 py-3 text-sm"><option value="">담당자 없음</option>{members.map((member) => <option key={member.memberId} value={member.learnerId}>{member.learnerName}</option>)}</select></div><textarea value={form.request} onChange={(event) => setForm({ ...form, request: event.target.value })} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 font-mono text-xs" placeholder="Request JSON 또는 Query 예시" /><textarea value={form.response} onChange={(event) => setForm({ ...form, response: event.target.value })} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 font-mono text-xs" placeholder="Response JSON 예시" /><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold">취소</button><button className="rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white">등록</button></div></form></Modal>
}

export function ArchitectureLinkModal({ mode, doc, onClose, onSubmit }: { mode: ArchitectureTab; doc: ArchitectureDocData; onClose: () => void; onSubmit: (form: { externalLink: string; notes: string }) => Promise<void> }) {
  const [form, setForm] = useState({ externalLink: doc.externalLink, notes: doc.notes })
  return <Modal title={mode === 'erd' ? 'ERD 원본 연결' : mode === 'infra' ? '인프라 구조도 연결' : 'API 원본 연결'} icon="fas fa-external-link-alt" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }} className="space-y-5 p-6"><input value={form.externalLink} onChange={(event) => setForm({ ...form, externalLink: event.target.value })} placeholder="https://..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="h-40 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-6 outline-none focus:border-[#7C3AED]" placeholder="설계 요약, 리뷰 포인트, 확인할 내용" /><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold">취소</button><button className="rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white">저장</button></div></form></Modal>
}
