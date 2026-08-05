import { useMemo,useState,type FormEvent } from 'react'
import UserAvatar from '../../../components/UserAvatar'
import { createTeamWorkspaceFileLink,deleteTeamWorkspaceFile,downloadTeamWorkspaceFile,uploadTeamWorkspaceFile } from './api'
import { Modal,PageFrame } from './team-workspace-suite-shared'
import { fileIcon,fileSourceIcon } from './team-workspace-suite-support'
import type { SuiteData,WorkspaceFile } from './types'
import { formatDate,formatFileSize,parseDate } from './utils'


export function FilesPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('전체 자료')
  const [sort, setSort] = useState('최신순')
  const [sortOpen, setSortOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [linkForm, setLinkForm] = useState({ title: '', url: '' })
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [notifyMembers, setNotifyMembers] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const files = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const nextFiles = data.files.filter((file) => {
      if (filter === '멘토 공식 자료') return false
      if (filter === '외부 링크') return file.itemType === 'LINK'
      if (!normalized) return true

      return `${file.displayName ?? ''} ${file.originalFileName ?? ''} ${file.uploadedByName ?? ''}`.toLowerCase().includes(normalized)
    })

    if (sort === '이름순 (가나다)') {
      return nextFiles.sort((left, right) => (left.displayName ?? left.originalFileName ?? '').localeCompare(right.displayName ?? right.originalFileName ?? ''))
    }
    if (sort === '용량 큰 순') {
      return nextFiles.sort((left, right) => (right.fileSize ?? 0) - (left.fileSize ?? 0))
    }

    return nextFiles.sort((left, right) => (parseDate(right.createdAt)?.getTime() ?? 0) - (parseDate(left.createdAt)?.getTime() ?? 0))
  }, [data.files, filter, search, sort])

  function openUploadModal() {
    setUploadMode('file')
    setUploadFile(null)
    setLinkForm({ title: '', url: '' })
    setUploadTitle('')
    setUploadDescription('')
    setNotifyMembers(true)
    setUploadError(null)
    setUploadOpen(true)
  }

  function closeUploadModal() {
    setUploadOpen(false)
    setUploadError(null)
  }

  async function executeUpload(event: FormEvent) {
    event.preventDefault()
    const trimmedTitle = uploadTitle.trim()

    if (uploadMode === 'file' && !uploadFile) {
      setUploadError('업로드할 파일을 선택해주세요.')
      return
    }

    if (uploadMode === 'link' && !trimmedTitle) {
      setUploadError('자료 제목을 입력해주세요.')
      return
    }

    if (uploadMode === 'link' && !linkForm.url.trim()) {
      setUploadError('URL 링크를 입력해주세요.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      if (uploadMode === 'link') {
        await createTeamWorkspaceFileLink(workspaceId, trimmedTitle, linkForm.url.trim())
      } else {
        const body = new FormData()
        body.append('file', uploadFile as File)
        await uploadTeamWorkspaceFile(workspaceId, body)
      }

      setUploadOpen(false)
      setUploadFile(null)
      setLinkForm({ title: '', url: '' })
      setUploadTitle('')
      setUploadDescription('')
      setNotifyMembers(true)
      await reload()
    } catch (nextError) {
      setUploadError(nextError instanceof Error ? nextError.message : '자료 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  async function deleteSelectedFile() {
    if (!selectedFile) return

    await deleteTeamWorkspaceFile(selectedFile.fileId)
    setSelectedFile(null)
    await reload()
  }

  function downloadOrOpen(file: WorkspaceFile) {
    if (file.itemType === 'LINK' && file.objectKey) {
      window.open(file.objectKey, '_blank', 'noopener,noreferrer')
      return
    }

    void downloadTeamWorkspaceFile(file).catch((nextError) => {
      setDownloadError(nextError instanceof Error ? nextError.message : '다운로드에 실패했습니다.')
    })
  }

  return (
    <>
      <PageFrame
        activePage="files"
        title="팀 통합 자료실"
        subtitle="프로젝트에 필요한 기획안, 에셋 파일, 참고 링크 등을 팀원 및 멘토와 자유롭게 공유하세요."
        action={<button type="button" onClick={openUploadModal} className="team-ws-files-upload-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-cloud-upload-alt"></i>새 자료 업로드</button>}
        data={data}
        workspaceId={workspaceId}
      >
        <div className="mb-8 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-folder-open text-team"></i>
              팀 통합 자료실
            </h1>
            <p className="mt-2 text-sm text-gray-500">프로젝트에 필요한 기획안, 에셋 파일, 참고 링크 등을 팀원 및 멘토와 자유롭게 공유하세요.</p>
          </div>
          <button type="button" onClick={openUploadModal} className="team-ws-files-upload-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-cloud-upload-alt"></i>
            새 자료 업로드
          </button>
        </div>

        <div className="mb-6 flex shrink-0 flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="custom-scrollbar flex flex-1 gap-6 overflow-x-auto px-2">
            {[
              ['전체 자료', null],
              ['멘토 공식 자료', <span key="mentor" className="h-2 w-2 rounded-full bg-mentor"></span>],
              ['팀원 공유 자료', <span key="team" className="h-2 w-2 rounded-full bg-team"></span>],
              ['외부 링크', <i key="link" className="fas fa-link text-gray-400"></i>],
            ].map(([item, icon]) => (
              <button key={item as string} type="button" onClick={() => setFilter(item as string)} className={`filter-tab flex items-center gap-1.5 whitespace-nowrap pb-2 text-sm font-bold ${filter === item ? 'active' : 'text-gray-500'}`}>
                {icon}
                {item}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative w-full md:w-64">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="파일명 또는 작성자 검색..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm font-bold outline-none transition focus:border-team" />
            </div>

            <div className="relative inline-block text-left">
              <button type="button" onClick={() => setSortOpen((current) => !current)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
                <span>{sort}</span>
                <i className="fas fa-chevron-down text-xs text-gray-400"></i>
              </button>
              {sortOpen ? (
                <div className="dropdown-content active absolute right-0 z-20 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 text-sm shadow-lg">
                  {['최신순', '이름순 (가나다)', '용량 큰 순'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setSort(item)
                        setSortOpen(false)
                      }}
                      className={`block w-full px-4 py-2 text-left text-xs font-bold transition hover:bg-gray-50 ${sort === item ? 'text-team' : 'text-gray-600'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {data.files.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-24 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm">
              <i className="fas fa-folder-open text-2xl"></i>
            </div>
            <h3 className="mb-1 text-base font-extrabold text-gray-900">통합 자료실이 비어 있습니다.</h3>
            <p className="mb-6 text-xs font-medium text-gray-500">프로젝트 요구사항, 디자인 가이드라인, 참고 문서 등 팀원들과 공유할 첫 번째 자료를 올려보세요.</p>
            <button type="button" onClick={openUploadModal} className="team-ws-files-first-upload-button flex items-center gap-1.5 rounded-xl bg-team px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700">
              <i className="fas fa-cloud-upload-alt text-sm"></i>
              첫 번째 자료 업로드하기
            </button>
          </div>
        ) : (
          <div className="grid flex-1 content-start grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {files.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                  <i className="fas fa-search text-2xl text-gray-300"></i>
                </div>
                <p className="mb-1 text-sm font-bold text-gray-600">일치하는 자료가 없습니다.</p>
                <p className="text-[10px] text-gray-400">검색어를 변경하거나 다른 탭을 확인해 보세요.</p>
              </div>
            ) : files.map((file) => {
              const meta = fileSourceIcon(file)
              const isLink = file.itemType === 'LINK'

              return (
                <button key={file.fileId} type="button" onClick={() => { setDownloadError(null); setSelectedFile(file) }} className="file-card group relative rounded-2xl bg-white p-5 text-left">
                  <div className={`absolute right-4 top-4 text-2xl opacity-20 transition duration-300 group-hover:scale-110 ${meta.color}`}>
                    <i className={`fas ${meta.icon}`}></i>
                  </div>

                  <div className="relative z-10 mb-3 flex items-center gap-2">
                    <span className="rounded border border-indigo-200 bg-team-light px-1.5 py-0.5 text-[9px] font-extrabold text-team">팀원 공유</span>
                    <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">{meta.format}</span>
                  </div>
                  <h3 className={`relative z-10 mb-1 truncate pr-6 text-base font-bold text-gray-900 transition ${isLink ? 'group-hover:text-blue-500' : 'group-hover:text-team'}`}>{file.displayName || file.originalFileName || '이름 없는 자료'}</h3>
                  <p className="relative z-10 mb-4 line-clamp-2 min-h-[32px] text-[11px] text-gray-500">{file.contentType || (isLink ? '외부 링크 자료입니다.' : '팀원이 공유한 프로젝트 자료입니다.')}</p>
                  <div className="relative z-10 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex min-w-0 items-center gap-1.5 pr-2">
                      <UserAvatar name={file.uploadedByName || '팀원'} imageUrl={file.uploaderProfileImage} className="h-5 w-5 shrink-0 border border-gray-200 bg-gray-50" iconClassName="text-[8px]" />
                      <span className="truncate text-[10px] font-bold text-gray-700">{file.uploadedByName || '팀원'} <span className="font-normal text-gray-400">(Member)</span></span>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] ${isLink ? 'font-bold text-blue-500' : 'font-medium text-gray-400'}`}>
                      {isLink ? <i className="fas fa-external-link-alt"></i> : null}
                      {isLink ? '새창 열기' : formatFileSize(file.fileSize)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PageFrame>

      {uploadOpen ? (
        <div id="uploadModal" className="team-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={executeUpload} className="modal-content team-ws-files-upload-modal relative w-full max-w-[512px]! overflow-hidden rounded-[24px]! bg-white shadow-2xl [&_.text-team]:text-[#4F46E5]! [&_.border-team]:border-[#4F46E5]! [&_.team-ws-files-upload-zone.dragover]:border-[#4F46E5]! [&_.team-ws-files-upload-zone.dragover]:bg-[#EEF2FF]!">
            <div className="team-ws-files-upload-modal-header flex items-center justify-between border-b border-gray-100 bg-gray-50 p-[24px]!">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-cloud-upload-alt text-team"></i>
                자료 업로드
              </h3>
              <button type="button" onClick={closeUploadModal} className="team-ws-files-upload-close flex h-[32px]! w-[32px]! items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="team-ws-files-upload-modal-body space-y-5 p-[24px]!">
              <div className="flex border-b border-gray-200">
                <button type="button" onClick={() => setUploadMode('file')} className={`team-ws-files-upload-tab flex-1 border-b-2 pb-[8px]! text-[14px]! leading-[20px]! font-bold! ${uploadMode === 'file' ? 'border-team text-team' : 'border-transparent text-gray-400 transition hover:text-gray-600'}`}>파일 업로드</button>
                <button type="button" onClick={() => setUploadMode('link')} className={`team-ws-files-upload-tab flex-1 border-b-2 pb-[8px]! text-[14px]! leading-[20px]! font-bold! ${uploadMode === 'link' ? 'border-team text-team' : 'border-transparent text-gray-400 transition hover:text-gray-600'}`}>외부 링크 공유</button>
              </div>

              {uploadMode === 'file' ? (
                <div id="area-file" className="space-y-5">
                  <label id="dropZone" className="upload-zone team-ws-files-upload-zone relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[2px]! border-dashed! border-[#D1D5DB]! bg-[#F9FAFB]! p-8 text-center [transition:all_0.2s_ease]! hover:border-[#D1D5DB]! hover:bg-[#F9FAFB]!">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-team shadow-sm">
                      <i className="fas fa-file-upload text-xl"></i>
                    </div>
                    <p className="mb-1 text-sm font-bold text-gray-700">클릭하거나 파일을 끌어다 놓으세요</p>
                    <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일 (최대 50MB)</p>
                    <input type="file" id="fileInput" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
                  </label>
                </div>
              ) : (
                <div id="area-link" className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-gray-600">URL 링크 <span className="text-red-500">*</span></label>
                    <input type="url" value={linkForm.url} onChange={(event) => setLinkForm((current) => ({ ...current, url: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#4F46E5]!" placeholder="https://" />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">자료 제목 <span className="text-red-500">*</span></label>
                <input type="text" id="uploadTitle" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#4F46E5]!" placeholder="어떤 자료인지 짧고 명확하게 적어주세요" />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</label>
                <textarea id="uploadDesc" value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#4F46E5]!" placeholder="자료에 대한 부가 설명을 적어주세요"></textarea>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <input type="checkbox" id="notifyMembers" checked={notifyMembers} onChange={(event) => setNotifyMembers(event.target.checked)} className="h-4 w-4 cursor-pointer rounded border-blue-300 text-team accent-team accent-[#4F46E5]! focus:ring-team" />
                <label htmlFor="notifyMembers" className="cursor-pointer select-none text-xs font-bold text-team">
                  업로드 완료 후 팀원들에게 알림 보내기
                </label>
              </div>

              {uploadError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{uploadError}</p> : null}
            </div>

            <div className="team-ws-files-upload-modal-footer flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-[20px]! [&_button]:min-h-[40px]! [&_button]:rounded-[12px]! [&_button]:text-[14px]! [&_button]:leading-[20px]!">
              <button type="button" onClick={closeUploadModal} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">취소</button>
              <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
                <i className="fas fa-check"></i>
                공유하기
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedFile ? (
        <Modal title="자료 상세" panelClassName="w-full max-w-sm" headerClassName="items-start" onClose={() => setSelectedFile(null)}>
          <div className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-3xl">
                <i className={`fas ${fileIcon(selectedFile)}`}></i>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[18px] font-black text-gray-900">{selectedFile.displayName || selectedFile.originalFileName}</h3>
                <p className="mt-1 text-[12px] font-semibold text-gray-400">{formatFileSize(selectedFile.fileSize)} · {selectedFile.uploadedByName || '팀원'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-[13px] font-semibold text-gray-500">
              등록일 {formatDate(selectedFile.createdAt)} · 저장소 {selectedFile.storageProvider || 'LOCAL'}
            </div>
            {downloadError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{downloadError}</p> : null}
            <div className="mt-6 flex justify-between gap-2">
              <button type="button" onClick={() => void deleteSelectedFile()} className="h-10 rounded-xl border border-red-100 bg-red-50 px-5 text-[13px] font-black text-red-500">삭제</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setDownloadError(null); setSelectedFile(null) }} className="h-10 rounded-xl border border-gray-200 bg-white px-5 text-[13px] font-black text-gray-600">닫기</button>
                {selectedFile.itemType !== 'FOLDER' ? (
                  <button type="button" onClick={() => downloadOrOpen(selectedFile)} className="h-10 rounded-xl bg-gray-900 px-6 text-[13px] font-black text-white">
                    {selectedFile.itemType === 'LINK' ? '열기' : '다운로드'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
