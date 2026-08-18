import { useState,type ChangeEvent,type FormEvent,type ReactNode } from 'react'
import { showAuthToast } from '../../../lib/auth-toast'
import type { WorkspaceFile } from './common-types'
import { SourceFormModal } from './common-workspace-shared'
import { formatFileSize,formatRelativeTime } from './common-workspace-support'



export function FilesPage({
  files,
  onUploadFile,
  onCreateLink,
  submitting,
}: {
  files: WorkspaceFile[]
  onUploadFile: (file: File) => Promise<void>
  onCreateLink: (payload: { title: string; url: string }) => Promise<void>
  submitting: boolean
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'official' | 'shared' | 'link'>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadUrl, setUploadUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const loweredSearch = search.trim().toLowerCase()
  const fileFilterTabs: Array<{ key: 'all' | 'official' | 'shared' | 'link'; label: string; icon: ReactNode }> = [
    { key: 'all', label: '전체 자료', icon: null },
    { key: 'official', label: '멘토 공식 자료', icon: <span className="h-2 w-2 rounded-full bg-mentor"></span> },
    { key: 'shared', label: '멘티 공유 자료', icon: <span className="h-2 w-2 rounded-full bg-blue-500"></span> },
    { key: 'link', label: '외부 링크', icon: <i className="fas fa-link text-gray-400"></i> },
  ]
  const decoratedFiles = files.map((file, index) => {
    const kind: 'official' | 'shared' | 'link' =
      file.itemType === 'LINK'
        ? 'link'
        : index < 2 || file.uploadedByName?.includes('멘토')
          ? 'official'
          : 'shared'

    return { file, kind }
  })
  const filteredFiles = decoratedFiles.filter(({ file, kind }) => {
    const matchesFilter = filter === 'all' || kind === filter
    const matchesSearch = loweredSearch
      ? `${file.displayName ?? file.originalFileName ?? ''} ${file.uploadedByName ?? ''}`.toLowerCase().includes(loweredSearch)
      : true

    return matchesFilter && matchesSearch
  })

  function openUploadModal() {
    setUploadMode('file')
    setUploadTitle('')
    setUploadDescription('')
    setUploadUrl('')
    setSelectedFile(null)
    setUploadOpen(true)
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setSelectedFile(file)
    setUploadTitle((current) => current || file.name)
    event.target.value = ''
  }

  async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (uploadMode === 'link') {
      await onCreateLink({ title: uploadTitle, url: uploadUrl })
    } else if (selectedFile) {
      await onUploadFile(selectedFile)
    } else {
      showAuthToast({ message: '업로드할 파일을 선택해주세요.', variant: 'error' })
      return
    }

    setUploadOpen(false)
    setUploadTitle('')
    setUploadDescription('')
    setUploadUrl('')
    setSelectedFile(null)
  }

  function fileBadge(kind: 'official' | 'shared' | 'link') {
    switch (kind) {
      case 'official':
        return { label: '멘토 공식 자료', className: 'border-purple-100 bg-purple-50 text-mentor' }
      case 'shared':
        return { label: '멘티 공유 자료', className: 'border-blue-100 bg-blue-50 text-blue-600' }
      case 'link':
        return { label: '외부 링크', className: 'border-gray-200 bg-gray-50 text-gray-500' }
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-folder-open text-brand"></i>
            자료실 (Files)
          </h1>
          <p className="mt-2 text-sm text-gray-500">멘토님이 올려주신 공식 가이드라인과 동료들이 공유한 자료를 확인하세요.</p>
        </div>
        <button type="button" onClick={openUploadModal} className="inline-flex h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
          <i className="fas fa-cloud-upload-alt"></i>
          자료 업로드 / 링크 공유
        </button>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="custom-scrollbar flex gap-6 overflow-x-auto px-2">
          {fileFilterTabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={
                filter === tab.key
                  ? 'flex items-center gap-1.5 border-b-2 border-brand pb-2 text-sm font-extrabold text-brand'
                  : 'flex items-center gap-1.5 border-b-2 border-transparent pb-2 text-sm font-medium text-gray-500 transition hover:text-gray-800'
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full shrink-0 md:w-72">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-[42px] w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="파일명 또는 작성자 검색..."
          />
        </div>
      </div>

      {files.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-2xl text-gray-300">
            <i className="fas fa-folder-open"></i>
          </div>
          <h3 className="mb-2 text-sm font-extrabold text-gray-900">등록된 자료가 없습니다</h3>
          <p className="mb-6 max-w-sm text-center text-xs leading-relaxed text-gray-500">
            팀원들과 공유할 첫 번째 파일을 업로드하거나 참고 링크를 추가해 보세요.
          </p>
          <button type="button" onClick={openUploadModal} className="inline-flex h-[38px] items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-bold text-white shadow-sm shadow-green-100 transition hover:bg-green-600">
            <i className="fas fa-cloud-upload-alt"></i>
            자료 업로드하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFiles.length === 0 ? (
            <div className="col-span-full flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-xs font-bold text-gray-400">
              조건에 맞는 자료가 없습니다.
            </div>
          ) : null}
          {filteredFiles.map(({ file, kind }) => {
            const badge = fileBadge(kind)
            const title = file.displayName ?? file.originalFileName ?? '자료'

            return (
              <article key={file.fileId} className="file-card group relative min-h-[260px]! overflow-hidden rounded-[16px]! border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-md">
                <i className={`${file.itemType === 'LINK' ? 'fas fa-link' : file.itemType === 'FOLDER' ? 'fas fa-folder' : 'fas fa-file-alt'} absolute right-4 top-4 text-4xl text-gray-100 transition group-hover:text-green-50`}></i>
                <span className={`relative z-10 mb-4 inline-flex rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${badge.className}`}>
                  {badge.label}
                </span>
                <h3 className="relative z-10 mb-2 line-clamp-2 min-h-[40px] text-sm leading-[20px]! font-extrabold text-gray-900">{title}</h3>
                <p className="relative z-10 mb-6 line-clamp-3 min-h-[48px] text-xs leading-relaxed text-gray-500">
                  {file.contentType ? `${file.contentType} 형식의 학습 자료입니다.` : file.itemType === 'LINK' ? '외부 참고 링크를 통해 내용을 확인할 수 있습니다.' : '멘토링 진행에 필요한 참고 자료입니다.'}
                </p>
                <div className="relative z-10 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {file.uploaderProfileImage ? (
                      <img src={file.uploaderProfileImage} alt="" className="h-6 w-6 rounded-full border border-gray-200 object-cover" />
                    ) : (
                      <i className="fas fa-user-circle text-xl text-gray-300"></i>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-gray-700">{file.uploadedByName ?? '업로더 정보 없음'}</p>
                      <p className="text-[9px] font-bold text-gray-400">{formatRelativeTime(file.createdAt)}</p>
                    </div>
                  </div>
                  {file.itemType === 'FILE' ? (
                    <a
                      href={`/api/workspace-files/${file.fileId}/download`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-bold text-gray-500 transition hover:bg-gray-50"
                    >
                      {formatFileSize(file.fileSize)}
                    </a>
                  ) : (
                    <a
                      href={file.objectKey ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-bold text-gray-500 transition hover:bg-gray-50"
                    >
                      열기
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <SourceFormModal
        open={uploadOpen}
        title="자료 업로드"
        icon="fas fa-cloud-upload-alt"
        widthClass="max-w-lg"
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUploadSubmit}
        footer={
          <>
            <button type="button" onClick={() => setUploadOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              등록하기
            </button>
          </>
        }
      >
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={uploadMode === 'file' ? 'flex-1 border-b-2 border-brand pb-2 text-sm font-bold text-brand' : 'flex-1 border-b-2 border-transparent pb-2 text-sm font-bold text-gray-400 transition hover:text-gray-600'}
          >
            파일 업로드
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('link')}
            className={uploadMode === 'link' ? 'flex-1 border-b-2 border-brand pb-2 text-sm font-bold text-brand' : 'flex-1 border-b-2 border-transparent pb-2 text-sm font-bold text-gray-400 transition hover:text-gray-600'}
          >
            외부 링크 공유
          </button>
        </div>

        {uploadMode === 'file' ? (
          <div className="space-y-5">
            <label className="upload-zone relative flex cursor-pointer flex-col items-center justify-center rounded-2xl bg-gray-50 p-8">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm">
                <i className="fas fa-file-upload text-xl"></i>
              </div>
              <p className="mb-1 text-sm font-bold text-gray-700">클릭하거나 파일을 이곳에 드롭하세요</p>
              <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일 (최대 50MB)</p>
              {selectedFile ? <p className="mt-3 max-w-full truncate rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-sm">{selectedFile.name}</p> : null}
              <input type="file" className="hidden" disabled={submitting} onChange={handleFileSelect} />
            </label>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">
                URL 링크 <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={uploadUrl}
                onChange={(event) => setUploadUrl(event.target.value)}
                required={uploadMode === 'link'}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="https://"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            자료 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={uploadTitle}
            onChange={(event) => setUploadTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="자료의 핵심 내용을 요약해주세요."
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</label>
          <textarea
            value={uploadDescription}
            onChange={(event) => setUploadDescription(event.target.value)}
            className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="다른 팀원들이 이 자료를 어떻게 활용하면 좋을지 적어주세요."
          ></textarea>
        </div>
      </SourceFormModal>
    </div>
  )
}
