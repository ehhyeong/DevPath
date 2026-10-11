import { useEffect, useState } from 'react'
import { getWorkspaceAiDesign, type WorkspaceAiDesign } from '../project/api'
import type { SortMode } from './files-types'

const folderName = '00_AI_설계서 (자동 생성)'

function documents(design: WorkspaceAiDesign) {
  // 저장된 설계를 문서로 읽어 내보내므로 파일 저장소의 사용량에는 포함하지 않는다.
  return [
    { name: '01_기획_시나리오.md', content: { title: design.title, summary: design.summary, scenario: design.scenario } },
    { name: '02_아키텍처.md', content: { stack: design.stack, architecture: design.architecture } },
    { name: '03_DB_설계.md', content: { database: design.stack.database, entities: design.architecture.entities, erdMermaid: design.architecture.erdMermaid } },
    { name: '04_API_명세서.md', content: design.apis },
    { name: '05_개발_로드맵_면접.md', content: { roadmap: design.roadmap, interview: design.interviewQuestions } },
  ].map((document) => ({ name: document.name, text: `# ${design.title}\n\n## ${document.name.slice(3, -3).replaceAll('_', ' ')}\n\n\`\`\`json\n${JSON.stringify(document.content, null, 2)}\n\`\`\`\n` }))
}

export default function WorkspaceAiDesignFiles({ workspaceId, open, onOpen, onReady, searchText, sortMode, ownerName }: { workspaceId: number; open: boolean; onOpen: () => void; onReady: (available: boolean) => void; searchText: string; sortMode: SortMode; ownerName: string }) {
  const [source, setSource] = useState<{ design: WorkspaceAiDesign; createdAt: string } | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getWorkspaceAiDesign(workspaceId, controller.signal)
      .then((response) => { if (!controller.signal.aborted) { setSource(response); onReady(true) } })
      .catch(() => { if (!controller.signal.aborted) { setError('AI 설계서 문서를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.'); onReady(false) } })
    return () => controller.abort()
  }, [workspaceId, onReady])

  if (error) return open ? <p role="alert" className="p-10 text-center text-xs text-red-500">{error}</p> : null
  if (!source) return open ? <p className="p-10 text-center text-xs text-gray-400">AI 설계서 문서를 불러오는 중입니다...</p> : null
  const date = new Date(source.createdAt).toLocaleDateString('ko-KR')
  const query = searchText.trim().toLowerCase()
  const docs = documents(source.design).filter((document) => document.name.toLowerCase().includes(query))
  if (sortMode === 'name-desc') docs.reverse()

  function download(document: { name: string; text: string }) {
    const url = URL.createObjectURL(new Blob([document.text], { type: 'text/markdown;charset=utf-8' }))
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = document.name
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  if (!open) return folderName.toLowerCase().includes(query) ? (
    <button type="button" onClick={onOpen} className="squad-files-row grid min-h-[56px] w-full grid-cols-12 items-center gap-[16px]! border-b border-gray-50 p-[16px]! text-left hover:bg-[#F9FAFB]">
      <span className="col-span-6 flex min-w-0 items-center gap-3 pl-2"><i className="fas fa-folder text-xl text-teal-500" /><span className="truncate text-sm font-bold text-gray-900">{folderName}</span><span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-600">AI</span></span>
      <span className="col-span-2 text-center text-xs text-gray-500">문서 {documents(source.design).length}개</span><span className="col-span-2 truncate text-center text-[10px] font-bold text-gray-600">{ownerName}</span><span className="col-span-2 pr-4 text-right text-xs text-gray-500">{date}</span>
    </button>
  ) : null

  return <>
    {docs.length ? docs.map((document) => <div key={document.name} className="squad-files-row grid min-h-[56px] grid-cols-12 items-center gap-[16px]! border-b border-gray-50 p-[16px]! hover:bg-[#F9FAFB]">
      <button type="button" onClick={() => setPreview(document)} className="col-span-6 flex min-w-0 items-center gap-3 pl-2 text-left"><i className="fas fa-file-alt text-xl text-teal-500" /><span className="truncate text-sm font-bold text-gray-900">{document.name}</span></button>
      <span className="col-span-2 text-center text-xs text-gray-500">{(new Blob([document.text]).size / 1024).toFixed(1)} KB</span><span className="col-span-2 truncate text-center text-[10px] font-bold text-gray-600">{ownerName}</span><span className="col-span-2 flex items-center justify-end gap-3 pr-4 text-xs text-gray-500">{date}<button type="button" onClick={() => download(document)} aria-label={`${document.name} 다운로드`} className="text-gray-400 hover:text-brand"><i className="fas fa-download" /></button></span>
    </div>) : <p className="p-10 text-center text-xs text-gray-400">조건에 맞는 AI 설계서 문서가 없습니다.</p>}
    {preview ? <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-md"><section role="dialog" aria-modal="true" aria-label={preview.name} className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4"><h3 className="truncate text-lg font-extrabold text-gray-900"><i className="fas fa-file-alt mr-3 text-teal-500" />{preview.name}</h3><div className="flex shrink-0 items-center gap-3"><button type="button" onClick={() => download(preview)} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white"><i className="fas fa-download mr-2" />다운로드</button><button type="button" aria-label="설계서 미리보기 닫기" onClick={() => setPreview(null)} className="text-xl text-gray-400 hover:text-gray-900"><i className="fas fa-times" /></button></div></div><div className="custom-scrollbar flex-1 overflow-auto bg-gray-200 p-6"><pre className="min-h-full whitespace-pre-wrap break-words rounded-xl bg-white p-6 text-sm leading-relaxed text-gray-800">{preview.text}</pre></div></section></div> : null}
  </>
}
