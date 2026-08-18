import { useState,type FormEvent } from 'react'
import { createInstructorWorkspaceFileLink,deleteInstructorWorkspaceFile,updateInstructorWorkspaceFile,uploadInstructorWorkspaceFile } from './instructor-workspace-api'
import { EmptyState,Modal,PageHeading } from './instructor-workspace-shared'
import { avatarUrl,buildHref,formatFileSize,pushWorkspaceNotification,relativeTime,workspaceFileKind,workspaceFileName,workspaceFileTone } from './instructor-workspace-support'
import type { WorkspaceData,WorkspaceFile } from './instructor-workspace-types'



export function FilesPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'official' | 'shared' | 'link'>('all')
  const [query, setQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null)
  const files = data.files.filter((file) => {
    const name = workspaceFileName(file)
    const kind = workspaceFileKind(file, data.dashboard?.ownerId)
    const filterMatched = filter === 'all' || kind === filter
    return filterMatched && name.toLowerCase().includes(query.toLowerCase())
  })

  async function deleteFile(file: WorkspaceFile) {
    if (!window.confirm(`'${workspaceFileName(file)}' 자료를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    setDeletingFileId(file.fileId)
    try {
      const deletedName = workspaceFileName(file)
      await deleteInstructorWorkspaceFile(file.fileId)
      if (selectedFile?.fileId === file.fileId) {
        setSelectedFile(null)
      }
      pushWorkspaceNotification(workspaceId, {
        title: '자료 삭제',
        description: `"${deletedName}" 자료가 삭제되었습니다.`,
        href: buildHref('files', workspaceId),
        icon: 'fas fa-trash-alt',
      })
      await reload()
    } finally {
      setDeletingFileId(null)
    }
  }

  return (
    <>
      <PageHeading
        page="files"
        description="수강생들에게 필요한 공식 가이드라인과 레퍼런스를 업로드하고, 공유된 자료들을 관리하세요."
        action={<button type="button" onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-cloud-upload-alt" /> 공식 자료 등록</button>}
      />
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex gap-6 overflow-x-auto px-2">
            {[
              ['all', '전체 자료'],
              ['official', '내가 올린 공식 자료'],
              ['shared', '수강생 공유 자료'],
              ['link', '외부 링크'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value as 'all' | 'official' | 'shared' | 'link')} className={`flex items-center gap-1.5 border-b-2 pb-2 text-sm font-extrabold whitespace-nowrap transition ${filter === value ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-500'}`}>{value === 'official' ? <span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> : null}{value === 'shared' ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}{value === 'link' ? <i className="fas fa-link text-gray-400" /> : null}{label}</button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-10 text-sm font-bold outline-none focus:border-[#7C3AED]" placeholder="파일명 또는 작성자 검색..." />
          </div>
        </div>
      </section>
      {files.length === 0 ? (
        <EmptyState icon="fas fa-folder-open" title="등록된 자료가 없습니다." description="수강생들에게 필요한 첫 번째 공식 가이드라인이나 참고 레퍼런스를 공유해주세요." action={<button type="button" onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-md"><i className="fas fa-cloud-upload-alt" /> 첫 공식 자료 등록하기</button>} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => {
            const kind = workspaceFileKind(file, data.dashboard?.ownerId)
            const tone = workspaceFileTone(file)
            return (
              <article key={file.fileId} role="button" tabIndex={0} onClick={() => setSelectedFile(file)} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedFile(file) }} className="group relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-lg">
                <div className={`absolute top-4 right-4 text-2xl opacity-20 ${tone.color}`}><i className={tone.icon} /></div>
                <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100" onClick={(event) => event.stopPropagation()}>
                  <button type="button" disabled={deletingFileId === file.fileId} onClick={() => void deleteFile(file)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:text-red-500 disabled:opacity-50" aria-label="자료 삭제"><i className="fas fa-trash text-[10px]" /></button>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${kind === 'shared' ? 'border-blue-200 bg-blue-50 text-blue-600' : kind === 'link' ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-purple-200 bg-[#EDE9FE] text-[#7C3AED]'}`}>{kind === 'shared' ? '수강생 공유' : kind === 'link' ? '외부 링크' : '멘토 공식'}</span>
                  <span className="text-[10px] font-medium text-gray-400">{file.itemType === 'LINK' ? <><i className="fas fa-external-link-alt mr-1" />새창 열기</> : formatFileSize(file.fileSize)}</span>
                </div>
                <h3 className="line-clamp-2 text-sm font-extrabold text-gray-900">{workspaceFileName(file)}</h3>
                <p className="mt-2 text-[10px] font-bold text-gray-400">{relativeTime(file.createdAt)}</p>
                <p className="mt-1 text-[10px] text-gray-400">{kind === 'official' ? '나 (멘토)' : file.uploadedByName ?? '수강생'}</p>
              </article>
            )
          })}
        </div>
      )}
      {uploadOpen ? <FileUploadModal workspaceId={workspaceId} uploading={uploading} setUploading={setUploading} onClose={() => setUploadOpen(false)} reload={reload} /> : null}
      {selectedFile ? <FileDetailModal file={selectedFile} ownerId={data.dashboard?.ownerId} deleting={deletingFileId === selectedFile.fileId} onClose={() => setSelectedFile(null)} onDelete={deleteFile} /> : null}
    </>
  )
}

export function FileUploadModal({ workspaceId, uploading, setUploading, onClose, reload }: { workspaceId: number | null; uploading: boolean; setUploading: (uploading: boolean) => void; onClose: () => void; reload: () => Promise<void> }) {
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  function selectFile(file: File | null) {
    setSelectedFile(file)
    if (file && !title.trim()) {
      setTitle(file.name)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!workspaceId || !title.trim()) return
    if (uploadType === 'file' && !selectedFile) return
    if (uploadType === 'link' && !linkUrl.trim()) return

    setUploading(true)
    try {
      if (uploadType === 'link') {
        await createInstructorWorkspaceFileLink(workspaceId, { title: title.trim(), url: linkUrl.trim() })
      } else if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        const created = await uploadInstructorWorkspaceFile(workspaceId, formData)
        if (title.trim() && title.trim() !== selectedFile.name) {
          await updateInstructorWorkspaceFile(created.fileId, { name: title.trim() })
        }
      }
      void notifyStudents
      void description
      pushWorkspaceNotification(workspaceId, {
        title: uploadType === 'link' ? '링크 자료 등록' : '파일 자료 등록',
        description: `"${title.trim()}" 자료가 등록되었습니다.`,
        href: buildHref('files', workspaceId),
        icon: uploadType === 'link' ? 'fas fa-link' : 'fas fa-file-upload',
      })
      await reload()
      onClose()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal title="공식 자료 등록" icon="fas fa-cloud-upload-alt" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-5 p-6">
          <div className="flex border-b border-gray-200">
            <button type="button" onClick={() => setUploadType('file')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${uploadType === 'file' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>파일 업로드</button>
            <button type="button" onClick={() => setUploadType('link')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${uploadType === 'link' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>외부 링크 공유</button>
          </div>
          {uploadType === 'file' ? (
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition ${dragOver ? 'border-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-300 bg-gray-50'}`}
              onDragOver={(event) => { event.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOver(false)
                selectFile(event.dataTransfer.files[0] ?? null)
              }}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-[#7C3AED] shadow-sm"><i className="fas fa-file-upload" /></div>
              <p className="mb-1 text-sm font-bold text-gray-700">{selectedFile ? selectedFile.name : '클릭하거나 파일을 이곳에 드롭하세요'}</p>
              <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일</p>
              <input type="file" className="hidden" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-gray-600">URL 링크 <span className="text-red-500">*</span></span>
              <input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="https://" />
            </label>
          )}
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">자료 제목 <span className="text-red-500">*</span></span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="자료의 핵심 내용을 요약해주세요." />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="수강생들이 이 자료를 어떻게 활용하면 좋을지 가이드라인을 적어주세요." />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
            <input type="checkbox" checked={notifyStudents} onChange={(event) => setNotifyStudents(event.target.checked)} className="h-4 w-4 accent-[#7C3AED]" />
            <span className="text-xs font-bold text-[#7C3AED]">등록 즉시 전체 수강생에게 알림 발송</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">취소</button>
          <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60"><i className="fas fa-check" /> {uploading ? '배포 중' : '공식 자료 배포'}</button>
        </div>
      </form>
    </Modal>
  )
}

export function FileDetailModal({ file, ownerId, deleting, onClose, onDelete }: { file: WorkspaceFile; ownerId?: number | null; deleting: boolean; onClose: () => void; onDelete: (file: WorkspaceFile) => Promise<void> }) {
  const kind = workspaceFileKind(file, ownerId)
  const name = workspaceFileName(file)
  const info = file.itemType === 'LINK' ? '외부 링크' : `${formatFileSize(file.fileSize)} · ${relativeTime(file.createdAt)}`

  function openResource() {
    if (file.itemType === 'LINK' && file.objectKey) {
      window.open(file.objectKey, '_blank', 'noopener,noreferrer')
      return
    }
    window.location.href = `/api/workspace-files/${file.fileId}/download`
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-6">
            <span className={`mb-2 inline-block rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${kind === 'official' ? 'border-purple-200 bg-[#EDE9FE] text-[#7C3AED]' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>{kind === 'official' ? '멘토 공식 자료' : kind === 'link' ? '외부 링크' : '수강생 공유 자료'}</span>
            <h3 className="text-lg font-extrabold leading-tight text-gray-900">{name}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <img src={file.uploaderProfileImage ?? avatarUrl(file.uploadedByName)} className="h-10 w-10 rounded-full bg-white" alt="" />
              <div>
                <p className="mb-1 text-[10px] font-bold text-gray-400">업로더</p>
                <span className="text-xs font-bold text-gray-800">{kind === 'official' ? '나 (멘토)' : file.uploadedByName ?? '수강생'}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[10px] font-bold text-gray-400">파일 정보</p>
              <span className="text-xs font-bold text-gray-800">{info}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-white p-5">
          <button type="button" disabled={deleting} onClick={() => void onDelete(file)} className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-100 disabled:opacity-50"><i className="fas fa-trash-alt" /> {deleting ? '삭제 중' : '삭제'}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200">닫기</button>
            <button type="button" onClick={openResource} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className={file.itemType === 'LINK' ? 'fas fa-external-link-alt' : 'fas fa-download'} /> {file.itemType === 'LINK' ? '열기' : '다운로드'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
