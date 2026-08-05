import { useMemo,useState,type DragEvent,type FormEvent } from 'react';
import { createInstructorTeamFileLink,deleteInstructorTeamWorkspaceFile,updateInstructorTeamWorkspaceFile,uploadInstructorTeamWorkspaceFile } from './instructor-api';
import type { TeamData,WorkspaceFile } from './instructor-types';
import { avatarUrl,buildHref,downloadWorkspaceFile,formatDate,formatFileSize,INSTRUCTOR_TEAM_FILES_UI_LOCK_CLASSES,isOfficialWorkspaceFile,pushTeamNotification,workspaceFileExtension,workspaceFileIconClass,workspaceFileTitle,type FileFilter,type FileUploadMode,type FileViewMode } from './instructor-workspace-support';



export function FilesPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<FileFilter>('all')
  const [viewMode, setViewMode] = useState<FileViewMode>('grid')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  const files = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.files
      .filter((file) => file.itemType !== 'FOLDER')
      .sort((a, b) => {
        const officialDiff = Number(isOfficialWorkspaceFile(b, data)) - Number(isOfficialWorkspaceFile(a, data))
        if (officialDiff !== 0) return officialDiff
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      })
      .filter((file) => {
        const official = isOfficialWorkspaceFile(file, data)
        if (filter === 'official' && !official) return false
        if (filter === 'shared' && official) return false
        if (filter === 'link' && file.itemType !== 'LINK') return false
        if (!query) return true
        const target = `${workspaceFileTitle(file)} ${file.uploadedByName ?? ''} ${file.objectKey ?? ''}`.toLowerCase()
        return target.includes(query)
      })
  }, [data, filter, search])

  async function saveResource(form: { mode: FileUploadMode; title: string; url: string; file: File | null }) {
    if (!workspaceId) return
    const title = form.title.trim()
    if (form.mode === 'link') {
      await createInstructorTeamFileLink(workspaceId, { title, url: form.url.trim() })
    } else if (form.file) {
      const body = new FormData()
      body.append('file', form.file)
      const uploaded = await uploadInstructorTeamWorkspaceFile(workspaceId, body)
      if (title && title !== workspaceFileTitle(uploaded)) {
        await updateInstructorTeamWorkspaceFile(uploaded.fileId, { name: title })
      }
    }
    pushTeamNotification(workspaceId, {
      title: form.mode === 'link' ? '외부 링크 공유' : '자료 등록',
      description: `"${title || form.file?.name || '새 자료'}" 자료가 등록되었습니다.`,
      href: buildHref('files', workspaceId),
      icon: form.mode === 'link' ? 'fas fa-link' : 'fas fa-folder-open',
    })
    setUploadOpen(false)
    setSuccessOpen(true)
    await reload()
  }

  async function deleteFile(file: WorkspaceFile) {
    if (!window.confirm('이 자료를 삭제하시겠습니까?')) return
    await deleteInstructorTeamWorkspaceFile(file.fileId)
    pushTeamNotification(workspaceId, {
      title: '자료 삭제',
      description: `"${workspaceFileTitle(file)}" 자료가 삭제되었습니다.`,
      href: buildHref('files', workspaceId),
      icon: 'fas fa-trash-alt',
    })
    setSelectedFile(null)
    await reload()
  }

  async function openFile(file: WorkspaceFile) {
    if (file.itemType === 'LINK') {
      const url = file.objectKey ?? ''
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    await downloadWorkspaceFile(file)
  }

  const counts = {
    all: data.files.filter((file) => file.itemType !== 'FOLDER').length,
    official: data.files.filter((file) => file.itemType !== 'FOLDER' && isOfficialWorkspaceFile(file, data)).length,
    shared: data.files.filter((file) => file.itemType !== 'FOLDER' && !isOfficialWorkspaceFile(file, data)).length,
    link: data.files.filter((file) => file.itemType === 'LINK').length,
  }

  return (
    <div className={`instructor-team-files flex h-full flex-col ${INSTRUCTOR_TEAM_FILES_UI_LOCK_CLASSES}`}>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-gray-900"><i className="fas fa-folder-open text-[#7C3AED]" />팀 통합 자료실 관리</h1>
          <p className="mt-2 text-sm text-gray-500">팀원들에게 공식 가이드라인을 배포하고, 학생들이 공유한 자료들을 관리(조회/삭제)하세요.</p>
        </div>
        <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black hover:shadow-xl">
          <i className="fas fa-cloud-upload-alt mr-2" />공식 자료 배포
        </button>
      </div>

      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-6">
          <FilesFilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="전체 자료" count={counts.all} />
          <FilesFilterButton active={filter === 'official'} onClick={() => setFilter('official')} label="내가 올린 공식 자료" count={counts.official} dotClass="bg-[#7C3AED]" />
          <FilesFilterButton active={filter === 'shared'} onClick={() => setFilter('shared')} label="팀원 공유 자료" count={counts.shared} dotClass="bg-indigo-500" />
          <FilesFilterButton active={filter === 'link'} onClick={() => setFilter('link')} label="외부 링크" count={counts.link} icon="fas fa-link" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button type="button" aria-label="그리드 보기" onClick={() => setViewMode('grid')} className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition ${viewMode === 'grid' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}><i className="fas fa-th-large" /></button>
            <button type="button" aria-label="리스트 보기" onClick={() => setViewMode('list')} className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition ${viewMode === 'list' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}><i className="fas fa-list" /></button>
          </div>
          <div className="relative">
            <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-9 text-sm font-medium outline-none transition focus:border-[#7C3AED] focus:bg-white" placeholder="파일명 또는 작성자 검색..." />
          </div>
        </div>
      </section>

      {files.length === 0 ? (
        <section className="flex min-h-[420px] flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-purple-50 text-3xl text-[#7C3AED]"><i className="far fa-folder-open" /></div>
          <h3 className="text-lg font-extrabold text-gray-900">공유된 자료가 없습니다.</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">공식 자료를 배포하거나 팀원이 공유한 링크와 파일이 등록되면 이곳에서 관리할 수 있습니다.</p>
          <button type="button" onClick={() => setUploadOpen(true)} className="mt-6 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-black">
            <i className="fas fa-cloud-upload-alt mr-2" />첫 자료 배포하기
          </button>
        </section>
      ) : (
        <section className={viewMode === 'grid' ? 'grid flex-1 content-start grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4' : 'flex flex-1 flex-col gap-3'}>
          {files.map((file) => (
            <WorkspaceFileCard key={file.fileId} file={file} data={data} viewMode={viewMode} onOpen={() => setSelectedFile(file)} onDelete={() => void deleteFile(file)} />
          ))}
        </section>
      )}

      {uploadOpen ? <FileUploadModal onClose={() => setUploadOpen(false)} onSubmit={saveResource} /> : null}
      {selectedFile ? <FileDetailModal file={selectedFile} data={data} onClose={() => setSelectedFile(null)} onDelete={() => void deleteFile(selectedFile)} onOpen={() => void openFile(selectedFile)} /> : null}
      {successOpen ? <FileSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </div>
  )
}

export function FilesFilterButton({ active, onClick, label, count, dotClass, icon }: { active: boolean; onClick: () => void; label: string; count: number; dotClass?: string; icon?: string }) {
  return (
    <button type="button" onClick={onClick} className={`team-files-filter-tab ${active ? 'active' : ''}`}>
      {dotClass ? <span className={`h-2 w-2 rounded-full ${dotClass}`} /> : null}
      {icon ? <i className={`${icon} text-[11px] ${active ? 'text-[#7C3AED]' : 'text-gray-400'}`} /> : null}
      <span>{label}</span>
      <span className="text-[10px] font-black text-gray-400">{count}</span>
    </button>
  )
}

export function WorkspaceFileCard({ file, data, viewMode, onOpen, onDelete }: { file: WorkspaceFile; data: TeamData; viewMode: FileViewMode; onOpen: () => void; onDelete: () => void }) {
  const official = isOfficialWorkspaceFile(file, data)
  const title = workspaceFileTitle(file)
  const ext = workspaceFileExtension(file)
  const uploaderName = file.uploadedByName ?? (official ? data.dashboard?.ownerName : null) ?? '팀원'
  const meta = file.itemType === 'LINK' ? '새창 열기' : formatFileSize(file.fileSize)

  if (viewMode === 'list') {
    return (
      <article className="file-card group flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition" onClick={onOpen}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-xl"><i className={workspaceFileIconClass(file)} /></div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={official ? 'file-badge official' : 'file-badge shared'}>{official ? '멘토 공식' : '팀원 공유'}</span>
            <span className="file-ext-badge">{ext}</span>
          </div>
          <h3 className="truncate text-sm font-extrabold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs font-medium text-gray-400">{uploaderName} · {formatDate(file.createdAt)} · {meta}</p>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
          <i className="far fa-trash-alt" />
        </button>
      </article>
    )
  }

  return (
    <article className="file-card group relative flex min-h-[230px] cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition" onClick={onOpen}>
      <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-300 opacity-0 shadow-sm transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
        <i className="far fa-trash-alt text-xs" />
      </button>
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-2xl"><i className={workspaceFileIconClass(file)} /></div>
        <span className="file-ext-badge">{ext}</span>
      </div>
      <div className="min-h-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={official ? 'file-badge official' : 'file-badge shared'}>{official ? '멘토 공식' : '팀원 공유'}</span>
        </div>
        <h3 className="line-clamp-2 text-[15px] leading-snug font-extrabold text-gray-900">{title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{file.itemType === 'LINK' ? file.objectKey : file.contentType || '팀 프로젝트 공유 자료'}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <img src={file.uploaderProfileImage ?? avatarUrl(uploaderName)} className="h-7 w-7 shrink-0 rounded-full bg-gray-100" alt="" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-gray-700">{uploaderName}</p>
            <p className="text-[10px] font-medium text-gray-400">{official ? 'Mentor' : 'Member'}</p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-gray-400">{meta}</span>
      </div>
    </article>
  )
}

export function FileUploadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: { mode: FileUploadMode; title: string; url: string; file: File | null }) => Promise<void> }) {
  const [mode, setMode] = useState<FileUploadMode>('file')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [notify, setNotify] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'file' && !file) return
    setSaving(true)
    try {
      await onSubmit({ mode, title, url, file })
    } finally {
      setSaving(false)
    }
  }

  function pickFile(nextFile: File | undefined) {
    if (!nextFile) return
    setFile(nextFile)
    if (!title.trim()) setTitle(nextFile.name)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files[0])
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <i className="fas fa-cloud-upload-alt text-[#7C3AED]" />공식 자료 배포
          </h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs font-medium text-[#7C3AED]">
            <i className="fas fa-info-circle" />강사님이 업로드하는 자료는 '멘토 공식' 뱃지와 함께 최상단에 고정됩니다.
          </div>

          <div className="flex border-b border-gray-200">
            <button type="button" onClick={() => setMode('file')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${mode === 'file' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>파일 업로드</button>
            <button type="button" onClick={() => setMode('link')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${mode === 'link' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>외부 링크 공유</button>
          </div>

          {mode === 'file' ? (
            <label onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} className={`upload-zone flex cursor-pointer flex-col items-center justify-center rounded-2xl p-8 text-center transition ${dragging ? 'dragging' : ''}`}>
              <input type="file" className="hidden" onChange={(event) => pickFile(event.target.files?.[0])} />
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-[#7C3AED] shadow-sm">
                <i className="fas fa-file-upload text-xl" />
              </div>
              <p className="mb-1 text-sm font-bold text-gray-700">{file ? file.name : '클릭하거나 파일을 이곳에 드롭하세요'}</p>
              <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일 등 (최대 100MB)</p>
            </label>
          ) : (
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">URL 링크 <span className="text-red-500">*</span></label>
              <input value={url} onChange={(event) => setUrl(event.target.value)} required={mode === 'link'} placeholder="https://" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">자료 제목 <span className="text-red-500">*</span></label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="어떤 자료인지 짧고 명확하게 적어주세요." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="자료에 대한 부연 설명을 적어주세요." className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#7C3AED]" />
              <span className="select-none text-xs font-bold text-gray-700">배포 완료 시 모든 팀원에게 푸시 알림 발송</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">취소</button>
          <button type="submit" disabled={saving || (mode === 'file' && !file)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
            <i className="fas fa-check" />{saving ? '배포 중' : '배포하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function FileDetailModal({ file, data, onClose, onDelete, onOpen }: { file: WorkspaceFile; data: TeamData; onClose: () => void; onDelete: () => void; onOpen: () => void }) {
  const official = isOfficialWorkspaceFile(file, data)
  const title = workspaceFileTitle(file)
  const uploaderName = file.uploadedByName ?? (official ? data.dashboard?.ownerName : null) ?? '팀원'

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-6">
            <span className={official ? 'file-detail-badge official' : 'file-detail-badge shared'}>{official ? '멘토 공식 자료' : '팀원 공유 자료'}</span>
            <h3 className="text-lg leading-tight font-extrabold text-gray-900">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">{file.itemType === 'LINK' ? file.objectKey : file.contentType || '설명이 작성되지 않은 자료입니다.'}</p>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <p className="mb-1 text-[10px] font-bold text-gray-400">업로더</p>
              <div className="flex items-center gap-2">
                <i className="fas fa-user-circle text-gray-400" />
                <span className="text-xs font-bold text-gray-800">{uploaderName}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[10px] font-bold text-gray-400">파일 정보</p>
              <span className="text-xs font-bold text-gray-800">{file.itemType === 'LINK' ? '링크' : formatFileSize(file.fileSize)} · {formatDate(file.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-white p-5">
          <button type="button" onClick={onDelete} className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt" />삭제</button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200">닫기</button>
            <button type="button" onClick={onOpen} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
              <i className={file.itemType === 'LINK' ? 'fas fa-external-link-alt' : 'fas fa-download'} />{file.itemType === 'LINK' ? '원문 열기' : '다운로드'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FileSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#7C3AED] bg-purple-50 shadow-sm"><i className="fas fa-check text-3xl text-[#7C3AED]" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">배포 완료!</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">자료가 성공적으로 팀 공간에 공유되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}
