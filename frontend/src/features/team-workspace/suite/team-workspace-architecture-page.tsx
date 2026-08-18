import { useMemo,useState,type FormEvent } from 'react'
import UserAvatar from '../../../components/UserAvatar'
import { readStoredAuthSession } from '../../../lib/auth-session'
import { saveTeamWorkspaceDoc } from './api'
import { EmptyPanel,Modal,PageFrame } from './team-workspace-suite-shared'
import { apiMethodClass,apiStatusMeta,architectureDocTitle,buildApiEndpointLine,extractFirstUrl,parseArchitectureApiEndpoints,stripMarkdownHeading } from './team-workspace-suite-support'
import type { ArchitectureApiEndpoint,DocForm,SuiteData } from './types'
import { formatRelativeTime } from './utils'


export function ArchitecturePage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [tab, setTab] = useState<'api' | 'erd' | 'infra'>('api')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedApi, setSelectedApi] = useState<ArchitectureApiEndpoint | null>(null)
  const session = readStoredAuthSession()
  const currentMember = data.dashboard?.members.find((member) => member.learnerId === session?.userId)
  const defaultOwner = currentMember?.learnerName || ''
  const [form, setForm] = useState<DocForm>({
    mode: 'api',
    title: '',
    content: '',
    method: 'GET',
    endpoint: '',
    status: '설계 중',
    owner: defaultOwner,
    request: '',
    response: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const apiEndpoints = useMemo(() => parseArchitectureApiEndpoints(data.apiSpec?.content), [data.apiSpec?.content])

  async function saveDoc(event: FormEvent) {
    event.preventDefault()

    if (form.mode === 'api' && (!form.endpoint.trim() || !form.content.trim())) {
      setError('엔드포인트와 설명을 입력해주세요.')
      return
    }

    if (form.mode !== 'api' && !form.content.trim()) {
      setError('저장할 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const endpoint = form.mode === 'erd'
        ? `/api/workspaces/${workspaceId}/docs/erd`
        : form.mode === 'infra'
          ? `/api/workspaces/${workspaceId}/docs/infra`
          : `/api/workspaces/${workspaceId}/api-spec`
      const previousContent = form.mode === 'api' ? data.apiSpec?.content?.trim() : ''
      const nextApiLine = form.mode === 'api' ? buildApiEndpointLine(form) : ''
      const nextContent = form.mode === 'api'
        ? form.editingApiId
          ? (() => {
              const lines = (data.apiSpec?.content ?? '').split('\n')
              const target = apiEndpoints.find((endpoint) => endpoint.id === form.editingApiId)

              if (!target || target.sourceIndex < 0 || target.sourceIndex >= lines.length) {
                return [previousContent, nextApiLine].filter(Boolean).join('\n')
              }

              lines[target.sourceIndex] = nextApiLine

              return lines.join('\n').trim()
            })()
          : [previousContent, nextApiLine].filter(Boolean).join('\n')
        : `${form.title.trim() ? `# ${form.title.trim()}\n\n` : ''}${form.content.trim()}`
      await saveTeamWorkspaceDoc(endpoint, nextContent)
      setModalOpen(false)
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '문서 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function openDocModal(mode: 'api' | 'erd' | 'infra') {
    setForm({
      mode,
      title: mode === 'api' ? '새 API 명세' : mode === 'erd' ? 'ERD 원본 링크' : '인프라 구조도',
      content: mode === 'api' ? '' : mode === 'erd' ? stripMarkdownHeading(data.erdDoc?.content) : stripMarkdownHeading(data.infraDoc?.content),
      method: 'GET',
      endpoint: '',
      status: '설계 중',
      owner: defaultOwner,
      request: '',
      response: '',
      editingApiId: undefined,
    })
    setError(null)
    setModalOpen(true)
  }

  function openApiEditModal(endpoint: ArchitectureApiEndpoint) {
    setForm({
      mode: 'api',
      title: 'API 명세',
      content: endpoint.description,
      method: endpoint.method,
      endpoint: endpoint.endpoint,
      status: endpoint.status,
      owner: endpoint.owner,
      request: endpoint.request ?? '',
      response: endpoint.response ?? '',
      editingApiId: endpoint.id,
    })
    setSelectedApi(null)
    setError(null)
    setModalOpen(true)
  }

  const activeContent = tab === 'api' ? data.apiSpec?.content : tab === 'erd' ? data.erdDoc?.content : data.infraDoc?.content
  const activeDocTitle = tab === 'erd'
    ? architectureDocTitle(data.erdDoc?.content, '데이터베이스 ERD')
    : architectureDocTitle(data.infraDoc?.content, '시스템 인프라 아키텍처')
  const activeDocUrl = tab === 'api' ? extractFirstUrl(data.apiSpec?.content) : extractFirstUrl(activeContent)

  return (
    <>
      <PageFrame
        activePage="architecture"
        title="아키텍처 & API 설계"
        subtitle="프론트엔드와 백엔드가 데이터 구조와 API 스펙을 공유하고 합의하는 공간입니다."
        action={<div className="flex gap-2">{tab === 'api' ? <><button type="button" onClick={() => openDocModal('erd')} className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-[13px] font-black text-gray-700 shadow-sm hover:bg-gray-50"><i className="fas fa-link mr-1.5 text-gray-400"></i>외부 링크 연동</button><button type="button" onClick={() => openDocModal('api')} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-plus mr-1.5"></i>새 API 추가</button></> : <button type="button" onClick={() => openDocModal(tab)} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-link mr-1.5"></i>{tab === 'erd' ? 'ERD 링크 연동' : '구조도 연동'}</button>}</div>}
        data={data}
        workspaceId={workspaceId}
        mainClassName="flex-1 flex overflow-hidden relative"
        contentClassName="flex h-full min-w-0 flex-1"
      >
        <section className="z-10 flex h-full min-w-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="shrink-0 px-8 pt-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="mb-2 flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className="fas fa-project-diagram text-team"></i>
                  아키텍처 & API 설계
                </h1>
                <p className="mb-4 text-sm text-gray-500">프론트엔드와 백엔드가 데이터 구조와 API 스펙을 공유하고 합의하는 공간입니다.</p>
              </div>
              <div className="mb-4 flex shrink-0 gap-2">
                {tab === 'api' ? (
                  <>
                    <button type="button" onClick={() => openDocModal('erd')} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
                      <i className="fas fa-link text-gray-400"></i>
                      외부 링크 연동
                    </button>
                    <button type="button" onClick={() => openDocModal('api')} className="flex items-center gap-1.5 rounded-lg bg-team px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700">
                      <i className="fas fa-plus"></i>
                      새 API 추가
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => openDocModal(tab)} className="flex items-center gap-1.5 rounded-lg bg-team px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700">
                    <i className="fas fa-link"></i>
                    {tab === 'erd' ? 'ERD 링크 연동' : '구조도 연동'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-6 border-b border-gray-200 px-8">
              {[
                ['api', 'API 명세서'],
                ['erd', 'ERD (DB 설계)'],
                ['infra', '인프라 구조도'],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key as 'api' | 'erd' | 'infra')} className={`arch-tab pb-3 text-sm font-bold ${tab === key ? 'active' : 'text-gray-500'}`}>
                  {label}
                </button>
              ))}
          </div>

          <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-gray-50 p-6">
              {tab === 'api' ? (
                apiEndpoints.length > 0 ? (
                  <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-extrabold text-gray-800">REST API Endpoints</h3>
                      <div className="flex items-center gap-3">
                        {activeDocUrl ? (
                          <a href={activeDocUrl} target="_blank" rel="noreferrer" className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm transition hover:text-team">
                            <i className="fas fa-external-link-alt mr-1"></i>
                            문서 링크 열기
                          </a>
                        ) : null}
                        <button type="button" onClick={() => openDocModal('api')} className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm transition hover:text-team">
                          <i className="fas fa-plus mr-1"></i>
                          엔드포인트 추가
                        </button>
                      </div>
                    </div>
                    <div className="custom-scrollbar flex-1 overflow-y-auto">
                      <table className="w-full border-collapse text-left">
                        <thead className="border-b border-gray-100 bg-white text-[10px] font-bold uppercase text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3">Endpoint</th>
                            <th className="px-4 py-3">설명</th>
                            <th className="px-4 py-3">상태</th>
                            <th className="px-4 py-3">담당</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                          {apiEndpoints.map((endpoint) => {
                            const statusMeta = apiStatusMeta(endpoint.status)

                            return (
                              <tr key={endpoint.id} onClick={() => setSelectedApi(endpoint)} className="api-row cursor-pointer transition hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodClass(endpoint.method)}`}>{endpoint.method}</span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-800">{endpoint.endpoint}</td>
                                <td className="px-4 py-3 text-xs font-medium text-gray-600">{endpoint.description}</td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}>
                                    {statusMeta.icon ? <i className={`fas ${statusMeta.icon} mr-0.5 ${statusMeta.icon === 'fa-spinner' ? 'fa-spin' : ''}`}></i> : null}
                                    {statusMeta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <UserAvatar name={endpoint.owner} imageUrl={null} className="h-5 w-5 border border-gray-200 bg-gray-50" iconClassName="text-[8px]" />
                                    <span className="text-xs text-gray-700">{endpoint.owner}</span>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : activeContent ? (
                  <div className="min-h-[520px] rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-extrabold text-gray-800">API 명세 원문</h3>
                      <button type="button" onClick={() => openDocModal('api')} className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm transition hover:text-team">
                        <i className="fas fa-plus mr-1"></i>
                        엔드포인트 추가
                      </button>
                    </div>
                    <pre className="custom-scrollbar whitespace-pre-wrap p-6 text-[13px] font-medium leading-6 text-gray-700">{activeContent}</pre>
                  </div>
                ) : (
                  <EmptyPanel icon="fa-network-wired" title="아직 등록된 API 명세서가 없습니다." description="프론트엔드와 통신할 첫 번째 API 규격을 추가해보세요." actionLabel="새 API 추가하기" actionTone="team" onAction={() => openDocModal('api')} />
                )
              ) : activeContent ? (
                <div className="group relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-extrabold text-gray-800">{activeDocTitle}</h3>
                      <span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-600">최근 수정: {formatRelativeTime(tab === 'erd' ? data.erdDoc?.updatedAt : data.infraDoc?.updatedAt)}</span>
                    </div>
                    {activeDocUrl ? (
                      <a href={activeDocUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:text-team">
                        <i className="fas fa-external-link-alt"></i>
                        원본 보기
                      </a>
                    ) : (
                      <button type="button" onClick={() => openDocModal(tab)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:text-team">
                        <i className="fas fa-pen"></i>
                        내용 수정
                      </button>
                    )}
                  </div>
                  <div className="custom-scrollbar flex flex-1 items-center justify-center overflow-auto bg-[#f8f9fa] p-6">
                    {activeDocUrl ? (
                      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                        <i className={`fas ${tab === 'erd' ? 'fa-database text-purple-500' : 'fa-sitemap text-indigo-500'} mb-4 text-5xl opacity-70`}></i>
                        <p className="text-sm font-extrabold text-gray-900">{activeDocTitle}</p>
                        <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs font-medium text-gray-500">{activeDocUrl}</p>
                        <a href={activeDocUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                          <i className="fas fa-external-link-alt"></i>
                          외부 툴에서 전체화면 보기
                        </a>
                      </div>
                    ) : (
                      <pre className="w-full whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-6 text-[13px] font-medium leading-6 text-gray-700 shadow-sm">{stripMarkdownHeading(activeContent)}</pre>
                    )}
                  </div>
                </div>
              ) : tab === 'erd' ? (
                <EmptyPanel icon="fa-database" title="연동된 ERD 다이어그램이 없습니다." description="데이터베이스 모델링 문서(ERDCloud, Draw.io 등)를 연동해 공유하세요." actionLabel="외부 링크 연동하기" onAction={() => openDocModal('erd')} />
              ) : (
                <EmptyPanel icon="fa-sitemap" title="시스템 아키텍처 구조도가 없습니다." description="서버, 배포, 외부 API 연동 등 전체 시스템 아키텍처 다이어그램을 연동하세요." actionLabel="아키텍처 링크 연동하기" onAction={() => openDocModal('infra')} />
              )}
          </div>
        </section>

          <aside className="hidden h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-gray-50 lg:flex">
            <div className="border-b border-gray-200 bg-white px-6 py-5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                <i className="fas fa-history text-team"></i>
                변경 이력 (Changelog)
              </h3>
              <p className="mt-1 text-[10px] text-gray-500">API 명세 및 설계 수정 내역 타임라인</p>
            </div>
            {data.activities.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 pb-10 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-300 shadow-inner">
                  <i className="fas fa-wind"></i>
                </div>
                <p className="text-xs font-bold text-gray-500">아직 변경 이력이 없습니다.</p>
                <p className="mt-1 text-[10px] leading-relaxed text-gray-400">API나 아키텍처 문서가<br />수정되면 이곳에 기록됩니다.</p>
              </div>
            ) : (
              <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
                <div className="team-ws-architecture-changelog-list relative ml-3 space-y-6">
                  {data.activities.slice(0, 8).map((activity, index) => (
                    <div key={activity.logId} className="team-ws-architecture-changelog-item relative pl-5">
                      <span className={`team-ws-architecture-changelog-dot absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${index === 0 ? 'bg-team shadow-[0_0_0_3px_rgba(79,70,229,0.12)]' : 'bg-gray-300'}`}></span>
                      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <p className="text-[12px] font-black leading-5 text-gray-800">{activity.description}</p>
                        <p className="mt-1 text-[10px] font-bold text-gray-400">{formatRelativeTime(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
      </PageFrame>

      {modalOpen ? (
        <Modal
          title={form.mode === 'api' ? (form.editingApiId ? 'API 수정' : '새 API 추가') : form.mode === 'erd' ? 'ERD 외부 링크 연동' : '구조도 외부 링크 연동'}
          iconClassName={form.mode === 'api' ? (form.editingApiId ? 'fa-pen' : 'fa-plus') : 'fa-link'}
          description={form.mode === 'api' ? '프론트와 백엔드가 함께 확인할 REST API 명세를 정리하세요.' : '팀원이 바로 열어볼 수 있는 외부 문서 링크와 설명을 연결하세요.'}
          panelClassName="team-ws-architecture-doc-modal flex max-h-[90vh]! w-full! max-w-[672px]! flex-col overflow-hidden! rounded-[24px]! bg-white! [--team-ws-primary:#4F46E5] [--team-ws-primary-dark:#4338CA] [&_.text-team]:text-[#4F46E5]! [&>div:first-child]:shrink-0! [&>div:first-child]:items-center! [&>div:first-child]:justify-between! [&>div:first-child]:border-b-[1px]! [&>div:first-child]:border-b-[#F3F4F6]! [&>div:first-child]:bg-[#F9FAFB]! [&>div:first-child]:p-[24px]! [&>div:first-child_h3]:m-0! [&>div:first-child_h3]:gap-[8px]! [&>div:first-child_h3]:text-[18px]! [&>div:first-child_h3]:leading-[28px]! [&>div:first-child_h3]:font-extrabold! [&>div:first-child_h3]:text-[#111827]! [&>div:first-child_h3_i]:text-[#4F46E5]! [&>div:first-child_p]:mt-[4px]! [&>div:first-child_p]:text-[12px]! [&>div:first-child_p]:leading-[16px]! [&>div:first-child_p]:font-normal! [&>div:first-child_p]:text-[#6B7280]! [&>div:first-child_button]:h-[32px]! [&>div:first-child_button]:min-h-[32px]! [&>div:first-child_button]:w-[32px]! [&>div:first-child_button]:min-w-[32px]! [&>div:first-child_button]:rounded-[9999px]! [&>div:first-child_button]:border-[1px]! [&>div:first-child_button]:border-[#E5E7EB]! [&>div:first-child_button]:bg-white! [&>div:first-child_button]:text-[#9CA3AF]! [&>div:first-child_button]:[box-shadow:0_1px_2px_rgba(15,23,42,0.05)]!"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={saveDoc} className="team-ws-architecture-doc-form flex min-h-0! flex-1 flex-col">
            <div className="team-ws-architecture-doc-body custom-scrollbar min-h-0! flex-1 overflow-y-auto p-[24px]! [&>*+*]:mt-[24px]!">
              {form.mode === 'api' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                    <div>
                      <label className="team-ws-architecture-doc-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">Method</label>
                      <select value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))} className="team-ws-architecture-doc-select h-[46px]! w-full cursor-pointer! rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! font-bold! text-[#111827]! outline-none focus:border-team">
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="team-ws-architecture-doc-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">Endpoint</label>
                      <input value={form.endpoint} onChange={(event) => setForm((current) => ({ ...current, endpoint: event.target.value }))} placeholder="/api/workspaces/{workspaceId}/..." className="team-ws-architecture-doc-input h-[46px]! w-full rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! font-mono text-[14px]! leading-[20px]! font-semibold! text-[#111827]! outline-none placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-team" />
                    </div>
                  </div>
                  <div>
                    <label className="team-ws-architecture-doc-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">설명</label>
                    <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="이 API를 어떤 화면과 동작에 사용하는지 적어주세요." className="team-ws-architecture-doc-textarea h-24 min-h-[128px]! w-full resize-none rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-[#F9FAFB]! p-[16px]! text-[14px]! leading-[22px]! font-medium! text-[#111827]! outline-none placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-team"></textarea>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="team-ws-architecture-doc-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">상태</label>
                      <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="team-ws-architecture-doc-select h-[46px]! w-full cursor-pointer! rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! font-bold! text-[#111827]! outline-none focus:border-team">
                        {['설계 중', '프론트 연동 중', '개발 완료'].map((statusOption) => (
                          <option key={statusOption} value={statusOption}>{statusOption}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="team-ws-architecture-doc-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">담당</label>
                      <input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} placeholder="담당자 이름" className="team-ws-architecture-doc-input h-[46px]! w-full rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-semibold! text-[#111827]! outline-none placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-team" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="team-ws-architecture-code-label mb-[8px]! block text-[10px]! leading-[15px]! font-bold! tracking-[0]! text-[#9CA3AF]! uppercase">Request 예시</label>
                      <textarea value={form.request} onChange={(event) => setForm((current) => ({ ...current, request: event.target.value }))} placeholder='{"keyword":"react"}' className="team-ws-architecture-code-textarea h-[112px]! w-full resize-none rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-[#F9FAFB]! p-[12px]! font-mono text-[12px]! leading-[18px]! font-medium! text-[#111827]! outline-none placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-team"></textarea>
                    </div>
                    <div>
                      <label className="team-ws-architecture-code-label mb-[8px]! block text-[10px]! leading-[15px]! font-bold! tracking-[0]! text-[#9CA3AF]! uppercase">Response 예시</label>
                      <textarea value={form.response} onChange={(event) => setForm((current) => ({ ...current, response: event.target.value }))} placeholder='{"status":200,"data":{}}' className="team-ws-architecture-code-textarea h-[112px]! w-full resize-none rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-[#F9FAFB]! p-[12px]! font-mono text-[12px]! leading-[18px]! font-medium! text-[#111827]! outline-none placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-team"></textarea>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="team-ws-architecture-doc-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">문서 제목</label>
                    <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={form.mode === 'erd' ? '데이터베이스 ERD' : '인프라 구조도'} className="team-ws-architecture-doc-input h-[46px]! w-full rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-semibold! text-[#111827]! outline-none placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-team" />
                  </div>
                  <div>
                    <label className="team-ws-architecture-doc-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">외부 서비스 URL 또는 설명</label>
                    <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="https://... 또는 팀원이 참고할 설명을 입력하세요." className="team-ws-architecture-doc-textarea h-28 min-h-[128px]! w-full resize-none rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-[#F9FAFB]! p-[16px]! text-[14px]! leading-[22px]! font-medium! text-[#111827]! outline-none placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-team"></textarea>
                  </div>
                </>
              )}
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>
            <div className="team-ws-architecture-doc-footer flex shrink-0 justify-end gap-[12px]! border-t-[1px]! border-gray-100 border-t-[#F3F4F6]! bg-white! p-[16px]!">
              <button type="button" onClick={() => setModalOpen(false)} className="team-ws-architecture-cancel-button inline-flex min-h-[42px]! items-center! justify-center! rounded-[12px]! border border-gray-200 bg-white px-[24px]! py-[10px]! text-[14px]! leading-[20px]! font-bold! text-gray-600 transition hover:bg-gray-50">취소</button>
              <button type="submit" disabled={submitting} className="team-ws-architecture-submit-button inline-flex min-h-[42px]! items-center justify-center! gap-[8px]! rounded-[12px]! border-[1px]! border-[#4F46E5]! bg-[#4F46E5]! px-[24px]! py-[10px]! text-[14px]! leading-[20px]! font-bold! text-white! [box-shadow:0_4px_6px_-1px_rgba(79,70,229,0.25),0_2px_4px_-2px_rgba(79,70,229,0.25)]! transition hover:border-[#4338CA]! hover:bg-[#4338CA]! disabled:border-[#4F46E5]! disabled:bg-[#4F46E5]! disabled:text-white! disabled:opacity-60! [&_i]:text-white! [&_span]:text-white!">
                <i className="fas fa-save"></i>
                저장
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {selectedApi ? (() => {
        const statusMeta = apiStatusMeta(selectedApi.status)

        return (
          <Modal
            title={selectedApi.endpoint}
            panelClassName="flex max-h-[90vh] w-full max-w-2xl flex-col"
            headerClassName="items-center"
            onClose={() => setSelectedApi(null)}
          >
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodClass(selectedApi.method)}`}>
                  {selectedApi.method}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}>
                  {statusMeta.icon ? <i className={`fas ${statusMeta.icon} mr-0.5 ${statusMeta.icon === 'fa-spinner' ? 'fa-spin' : ''}`}></i> : null}
                  {statusMeta.label}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <UserAvatar name={selectedApi.owner} imageUrl={null} className="h-6 w-6 border border-gray-200 bg-gray-50" iconClassName="text-[9px]" />
                  <span className="text-xs font-bold text-gray-600">{selectedApi.owner}</span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">Description</h4>
                <p className="text-sm font-medium leading-6 text-gray-800">{selectedApi.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-400">Request Body / Query</h4>
                  <pre className="custom-scrollbar min-h-[132px] overflow-x-auto rounded border border-gray-200 bg-white p-3 font-mono text-xs leading-5 text-gray-800">{selectedApi.request || '등록된 Request 예시가 없습니다.'}</pre>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-400">Response</h4>
                  <pre className="custom-scrollbar min-h-[132px] overflow-x-auto rounded border border-gray-200 bg-white p-3 font-mono text-xs leading-5 text-gray-800">{selectedApi.response || '등록된 Response 예시가 없습니다.'}</pre>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setSelectedApi(null)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">닫기</button>
              <button type="button" onClick={() => openApiEditModal(selectedApi)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">수정하기</button>
            </div>
          </Modal>
        )
      })() : null}
    </>
  )
}
