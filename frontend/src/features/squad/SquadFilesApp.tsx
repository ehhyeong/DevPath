

import { type CSSProperties } from 'react'


import SquadWorkspaceAside from '../../components/SquadWorkspaceAside'
import SquadWorkspaceHeader from '../../components/SquadWorkspaceHeader'


import type { FileFilter, PresentationElement, PresentationSlide, SortMode, WorkspaceFileItem } from './files-types'


function displayName(item: WorkspaceFileItem) {
  return item.displayName || item.originalFileName
}

function fileExtension(name: string) {
  const index = name.lastIndexOf('.')

  return index >= 0 ? name.slice(index + 1).toLowerCase() : ''
}

function itemKind(item: WorkspaceFileItem): FileFilter | 'archive' | 'file' {
  if (item.itemType === 'FOLDER') {
    return 'folder'
  }

  const contentType = item.contentType?.toLowerCase() ?? ''
  const extension = fileExtension(displayName(item))

  if (contentType.includes('pdf') || extension === 'pdf') {
    return 'pdf'
  }

  if (contentType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
    return 'image'
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'archive'
  }

  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'hwp', 'hwpx', 'txt', 'md', 'csv'].includes(extension)) {
    return 'doc'
  }

  return 'file'
}

function iconClass(item: WorkspaceFileItem) {
  const kind = itemKind(item)

  if (kind === 'folder') {
    return 'fas fa-folder text-yellow-400'
  }

  if (kind === 'pdf') {
    return 'fas fa-file-pdf text-red-500'
  }

  if (kind === 'image') {
    return 'fas fa-file-image text-blue-500'
  }

  if (kind === 'archive') {
    return 'fas fa-file-archive text-purple-500'
  }

  if (kind === 'doc') {
    return 'fas fa-file-alt text-green-500'
  }

  return 'fas fa-file text-gray-400'
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return '-'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`
}


function formatArchiveBytes(bytes?: number | null) {
  if (typeof bytes !== 'number' || bytes < 0) {
    return '-'
  }

  if (bytes === 0) {
    return '0 B'
  }

  return formatBytes(bytes)
}

function presentationPercent(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return '0%'
  }

  return `${(value / total) * 100}%`
}

function presentationElementStyle(
  slide: PresentationSlide,
  element: PresentationElement,
): CSSProperties {
  const fontSize = element.fontSize
    ? `${Math.max(10, Math.min(42, element.fontSize * 1.25))}px`
    : undefined

  return {
    left: presentationPercent(element.x, slide.width),
    top: presentationPercent(element.y, slide.height),
    width: presentationPercent(element.width, slide.width),
    height: presentationPercent(element.height, slide.height),
    backgroundColor: element.type === 'shape' || element.fillColor ? element.fillColor ?? 'transparent' : 'transparent',
    color: element.textColor ?? '#111827',
    fontSize,
    fontWeight: element.bold ? 800 : 600,
    fontStyle: element.italic ? 'italic' : 'normal',
  }
}

import { useSquadFilesController } from './useSquadFilesController'

export default function SquadFilesApp() {
  const { workspaceId, session, folderStack, searchText, setSearchText, filter, setFilter, sortMode, setSortMode, loading, error, folderModalOpen, setFolderModalOpen, folderName, setFolderName, uploadModalOpen, setUploadModalOpen, selectedFile, dragOver, setDragOver, submitting, actionMenu, previewItem, setPreviewItem, previewUrl, previewText, previewArchive, previewDocument, previewUnsupportedMessage, previewLoading, previewError, members, projectName, usedBytes, quotaBytes, storagePercent, actionMenuItem, visibleFiles, handleLogout, renderAuthModal, goToRoot, goToCrumb, goToParentFolder, createFolder, uploadFile, selectUploadFile, handleDrop, downloadItem, renameItem, renderFileRow } = useSquadFilesController()


  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
        {renderAuthModal()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
        {renderAuthModal()}
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-files-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-[16px] text-gray-800 [&_.squad-files-fade-in]:[animation:squadDashboardFadeIn_0.4s_ease-in-out_forwards]">
      <SquadWorkspaceAside activePage="files" workspaceId={workspaceId} projectName={projectName} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          workspaceId={workspaceId}
          projectName={projectName}
          members={members}
          statusLabel="진행 중"
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="squad-files-toolbar z-10 flex min-h-[129px] shrink-0 flex-col justify-between gap-[16px]! border-b border-gray-100 bg-white px-[32px]! py-[24px]! shadow-sm md:flex-row md:items-center [@media(max-width:768px)]:px-[20px]!">
            <div>
              <h1 className="mb-[8px]! flex items-center gap-[8px]! text-[24px]! leading-[32px]! font-extrabold text-gray-900">
                <i className="fas fa-folder-open text-[24px]! leading-[32px]! text-brand"></i> 팀 자료실
              </h1>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                  <div className="bg-brand h-2 rounded-full transition-all duration-500" style={{ width: `${storagePercent}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-gray-500 tracking-wide">
                  {formatBytes(usedBytes)} / {quotaBytes ? formatBytes(quotaBytes) : '-'} 사용 중
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  className="squad-files-search-input h-[38px]! w-[256px]! rounded-[12px]! border border-gray-200 bg-gray-50 py-0! pr-[16px]! pl-[32px]! text-[12px]! leading-[16px]! outline-none transition focus:border-brand focus:bg-white [@media(max-width:768px)]:w-[min(256px,calc(100vw-72px))]!"
                  placeholder="파일 및 폴더 이름 검색"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </div>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button
                type="button"
                onClick={() => setFolderModalOpen(true)}
                className="squad-files-new-folder-button flex h-[42px]! items-center gap-2 rounded-[12px]! border border-gray-200 bg-white px-[16px]! py-0! text-[14px]! leading-[20px]! font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <i className="fas fa-folder-plus text-yellow-500"></i> 새 폴더
              </button>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="squad-files-upload-button flex h-[42px]! items-center gap-2 rounded-[12px]! bg-gray-900 px-[20px]! py-0! text-[14px]! leading-[20px]! font-bold text-white shadow-lg transition hover:bg-black"
              >
                <i className="fas fa-cloud-upload-alt"></i> 업로드
              </button>
            </div>
          </div>

          <div className="squad-files-content custom-scrollbar flex-1 overflow-y-auto bg-[#F3F4F6] p-[32px]! [@media(max-width:768px)]:px-[20px]!">
            <div className="squad-files-inner mx-auto max-w-[1152px]!">
              <div className="flex justify-between items-center mb-4 px-2 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {folderStack.length ? (
                    <button
                      type="button"
                      onClick={goToParentFolder}
                      className="squad-files-parent-button inline-flex h-[32px]! shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand"
                    >
                      <i className="fas fa-arrow-left text-[10px]"></i>
                      뒤로가기
                    </button>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-600 min-w-0">
                  <button type="button" onClick={goToRoot} className="hover:text-brand cursor-pointer transition truncate">
                    {projectName}
                  </button>
                  <i className="fas fa-chevron-right text-[10px] text-gray-400"></i>
                  <button type="button" onClick={goToRoot} className={folderStack.length ? 'text-gray-500 hover:text-brand transition' : 'text-gray-900'}>
                    최상위 폴더
                  </button>
                  {folderStack.map((crumb, index) => (
                    <span key={crumb.id} className="flex items-center gap-2 min-w-0">
                      <i className="fas fa-chevron-right text-[10px] text-gray-400"></i>
                      <button
                        type="button"
                        onClick={() => goToCrumb(index)}
                        className={index === folderStack.length - 1 ? 'text-gray-900 truncate max-w-[220px]' : 'text-gray-500 hover:text-brand transition truncate max-w-[180px]'}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="squad-files-filter-bar flex gap-[4px]! rounded-[8px]! border border-gray-200 bg-white p-[4px]! shadow-sm">
                    {([
                      ['all', '전체', 'fas fa-layer-group text-gray-500'],
                      ['folder', '폴더', 'fas fa-folder text-yellow-500'],
                      ['pdf', 'PDF', 'fas fa-file-pdf text-red-500'],
                      ['image', '이미지', 'fas fa-file-image text-blue-500'],
                      ['doc', '문서', 'fas fa-file-alt text-green-500'],
                    ] as Array<[FileFilter, string, string]>).map(([value, label, icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`filter-btn h-[24px]! rounded-[6px]! px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold transition ${
                          filter === value ? 'active bg-gray-900 text-white border-gray-900' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <i className={`${icon} mr-1`}></i>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="squad-files-sort-select h-[30px]! cursor-pointer appearance-none rounded-[8px]! border border-gray-200 bg-white py-0! pr-[32px]! pl-[12px]! text-[12px]! leading-[16px]! font-bold text-gray-700 shadow-sm outline-none focus:border-brand"
                    >
                      <option value="date-desc">최신 등록순</option>
                      <option value="date-asc">오래된 등록순</option>
                      <option value="name-asc">이름 오름차순</option>
                      <option value="name-desc">이름 내림차순</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
                  </div>
                </div>
              </div>

              <div className="squad-files-table overflow-hidden rounded-[16px]! border border-gray-100 bg-white shadow-sm">
                <div className="squad-files-table-header grid min-h-[49px] grid-cols-12 gap-[16px]! border-b border-gray-100 bg-gray-50/50 p-[16px]! text-[11px]! leading-[16px]! font-extrabold tracking-wider text-gray-500 uppercase">
                  <div className="col-span-6 pl-2">이름</div>
                  <div className="col-span-2 text-center">크기</div>
                  <div className="col-span-2 text-center">업로드</div>
                  <div className="col-span-2 text-right pr-4">수정일</div>
                </div>

                <div className="flex flex-col min-h-[300px]">
                  {visibleFiles.length > 0 ? (
                    visibleFiles.map((item) => renderFileRow(item))
                  ) : (
                    <div className="squad-files-fade-in flex h-48 flex-col items-center justify-center text-gray-400">
                      <i className="fas fa-folder-open text-4xl mb-3 opacity-50"></i>
                      <p className="text-sm font-bold">이 폴더가 비어있거나 조건에 맞는 파일이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {actionMenu && actionMenuItem ? (
        <div
          className="fixed z-50 w-36 rounded-xl border border-gray-200 bg-white py-1 text-left shadow-xl transition-opacity"
          style={{ top: actionMenu.top, left: actionMenu.left }}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-brand transition flex items-center gap-2"
            style={{ fontSize: '12px', lineHeight: '16px', fontWeight: 700 }}
            onClick={(event) => {
              event.stopPropagation()
              void renameItem(actionMenuItem)
            }}
          >
            <i className="fas fa-edit w-3 text-center"></i>
            이름 변경
          </button>
        </div>
      ) : null}

      {previewItem ? (
        <div className="modal active squad-files-preview-modal fixed inset-0 z-[1200] flex items-center justify-center bg-gray-900/80 p-[16px]! backdrop-blur-md">
          <div className="squad-files-preview-panel squad-files-fade-in relative flex h-[85vh]! max-h-[85vh]! w-[min(1024px,calc(100vw-32px))]! max-w-[1024px]! flex-col overflow-hidden rounded-[16px]! bg-white shadow-2xl">
            <div className="squad-files-preview-header flex min-h-[65px] shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-[24px]! py-[16px]!">
              <div className="flex items-center gap-3 min-w-0">
                <i className={`${iconClass(previewItem)} text-xl w-6 text-center shrink-0`}></i>
                <h3 className="max-w-[576px]! truncate text-[18px]! leading-[28px]! font-extrabold text-gray-900">{displayName(previewItem)}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="box-border flex h-[32px]! items-center gap-2 rounded-[8px]! bg-gray-900 px-[16px]! py-0! text-[12px]! leading-[16px]! font-bold text-white shadow-sm transition hover:bg-black"
                  onClick={() => void downloadItem(previewItem)}
                >
                  <i className="fas fa-download"></i> 다운로드
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="flex h-[32px]! w-[32px]! box-border items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-900"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            <div className="squad-files-preview-body flex flex-1 items-center justify-center overflow-auto bg-gray-200 p-[24px]!">
              {previewLoading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-brand"></div>
              ) : previewError ? (
                <div className="text-sm font-bold text-gray-500">{previewError}</div>
              ) : previewUrl && itemKind(previewItem) === 'image' ? (
                <img src={previewUrl} className="max-w-full max-h-full rounded-xl shadow-md object-contain" alt={displayName(previewItem)} />
              ) : previewUrl && itemKind(previewItem) === 'pdf' ? (
                <iframe src={previewUrl} title={displayName(previewItem)} className="w-full h-full bg-white rounded-xl shadow-xl border border-gray-200" />
              ) : previewDocument?.renderedDataUri && previewDocument.renderedContentType === 'application/pdf' ? (
                <iframe src={previewDocument.renderedDataUri} title={displayName(previewItem)} className="w-full h-full bg-white rounded-xl shadow-xl border border-gray-200" />
              ) : previewDocument?.renderedDataUri && previewDocument.renderedContentType?.startsWith('image/') ? (
                <img src={previewDocument.renderedDataUri} className="max-w-full max-h-full rounded-xl shadow-md object-contain bg-white" alt={displayName(previewItem)} />
              ) : previewDocument?.slides?.length ? (
                <div className="w-full h-full overflow-auto">
                  <div className="max-w-5xl mx-auto space-y-6">
                    {previewDocument.slides.map((slide) => (
                      <div key={slide.slideNumber} className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-100 text-xs font-extrabold text-gray-600">
                          Slide {slide.slideNumber}
                        </div>
                        <div
                          className="relative w-full overflow-hidden"
                          style={{
                            aspectRatio: `${slide.width} / ${slide.height}`,
                            backgroundColor: slide.backgroundColor ?? '#ffffff',
                          }}
                        >
                          {slide.elements.map((element, index) => (
                            <div
                              key={`${slide.slideNumber}-${index}`}
                              className={`absolute overflow-hidden ${
                                element.type === 'image'
                                  ? ''
                                  : 'p-1.5 flex items-center whitespace-pre-wrap leading-tight'
                              }`}
                              style={presentationElementStyle(slide, element)}
                            >
                              {element.type === 'image' && element.imageDataUri ? (
                                <img
                                  src={element.imageDataUri}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                element.text
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {previewDocument.truncated ? (
                      <div className="text-xs font-bold text-gray-500 text-center">
                        미리보기 일부만 표시됩니다.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : previewText !== null ? (
                <pre className="w-full h-full bg-white rounded-xl shadow-xl border border-gray-200 p-5 overflow-auto text-sm leading-6 text-gray-800 whitespace-pre-wrap font-mono">
                  {previewText}
                </pre>
              ) : previewArchive ? (
                <div className="w-full h-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <i className="fas fa-file-archive text-purple-500"></i>
                      <span className="text-sm font-extrabold text-gray-900 truncate">압축 파일 내용</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500 shrink-0">
                      {previewArchive.entries.length}
                      {previewArchive.truncated ? '+ ' : ' '}
                      개 항목
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto divide-y divide-gray-100">
                    {previewArchive.entries.length > 0 ? (
                      previewArchive.entries.map((entry, index) => (
                        <div key={`${entry.name}-${index}`} className="px-5 py-3 flex items-center gap-3 text-sm">
                          <i className={`${entry.directory ? 'fas fa-folder text-yellow-400' : 'fas fa-file text-gray-400'} w-5 text-center shrink-0`}></i>
                          <span className="font-bold text-gray-800 truncate flex-1 min-w-0">{entry.name}</span>
                          <span className="text-xs font-bold text-gray-400 shrink-0">{formatArchiveBytes(entry.size)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">표시할 항목이 없습니다.</div>
                    )}
                  </div>
                  {previewArchive.truncated ? (
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs font-bold text-gray-500 shrink-0">
                      목록이 길어 500개까지만 표시됩니다.
                    </div>
                  ) : null}
                </div>
              ) : previewUnsupportedMessage ? (
                <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <i className={`${iconClass(previewItem)} text-5xl mb-4`}></i>
                  <h4 className="font-extrabold text-gray-900 mb-2 truncate">{displayName(previewItem)}</h4>
                  <p className="text-xs text-gray-500 font-bold mb-6">{previewUnsupportedMessage}</p>
                  <button
                    type="button"
                    onClick={() => void downloadItem(previewItem)}
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold"
                  >
                    다운로드
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <i className={`${iconClass(previewItem)} text-5xl mb-4`}></i>
                  <h4 className="font-extrabold text-gray-900 mb-2 truncate">{displayName(previewItem)}</h4>
                  <p className="text-xs text-gray-500 font-bold mb-6">이 파일 형식은 미리보기를 지원하지 않습니다.</p>
                  <button
                    type="button"
                    onClick={() => void downloadItem(previewItem)}
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold"
                  >
                    다운로드
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {uploadModalOpen ? (
        <div className="modal active squad-files-upload-modal fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-[16px]! backdrop-blur-sm">
          <form onSubmit={uploadFile} className="squad-files-upload-panel squad-files-fade-in relative flex w-[min(512px,calc(100vw-32px))]! max-w-[512px]! flex-col overflow-hidden rounded-[24px]! bg-white p-[32px]! shadow-2xl">
            <div className="mb-[24px]! flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[20px]! leading-[28px]! font-extrabold text-gray-900">
                <i className="fas fa-cloud-upload-alt text-brand"></i> 현재 폴더에 업로드
              </h3>
              <button type="button" onClick={() => setUploadModalOpen(false)} className="h-[42px]! box-border py-0! text-[14px]! leading-[20px]! text-gray-400 transition hover:text-gray-900">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div
              className={`dropzone squad-files-upload-dropzone flex min-h-[196px] cursor-pointer flex-col items-center justify-center rounded-[16px]! border-2 border-dashed px-[16px]! py-[48px]! [transition:background-color_0.2s_ease,border-color_0.2s_ease] ${
                dragOver ? 'dragover border-[#00C471]! bg-[#EBFDF5]!' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => document.getElementById('squadFileInput')?.click()}
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setDragOver(false)
              }}
              onDrop={handleDrop}
            >
              <div className="mb-[16px]! flex h-[64px]! w-[64px]! items-center justify-center rounded-full border border-gray-100 bg-white text-[24px]! leading-[32px]! text-brand shadow-sm">
                <i className="fas fa-file-upload"></i>
              </div>
              <h4 className="mb-[4px]! text-[14px]! leading-[20px]! font-bold text-gray-800">
                {selectedFile ? selectedFile.name : '여기로 파일을 드래그하거나 클릭하세요.'}
              </h4>
              <p className="text-[12px]! leading-[16px]! font-medium text-gray-500">선택한 파일은 실제 저장소에 업로드됩니다.</p>
              <input
                id="squadFileInput"
                type="file"
                className="hidden"
                onChange={(event) => selectUploadFile(event.target.files?.item(0) ?? null)}
              />
            </div>
            {selectedFile ? (
              <div className="mt-5 flex justify-between text-xs font-bold text-gray-700">
                <span className="truncate">{selectedFile.name}</span>
                <span className="text-brand">{formatBytes(selectedFile.size)}</span>
              </div>
            ) : null}
            <div className="mt-8 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="h-[42px]! box-border rounded-xl border border-gray-200 bg-white px-5 py-0! text-[14px]! leading-[20px]! font-bold text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!selectedFile || submitting}
                className="h-[42px]! box-border rounded-xl bg-gray-900 px-5 py-0! text-[14px]! leading-[20px]! font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? '업로드 중' : '업로드'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {folderModalOpen ? (
        <div className="modal active squad-files-folder-modal fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-[16px]! backdrop-blur-sm">
          <form onSubmit={createFolder} className="squad-files-folder-panel squad-files-fade-in relative flex w-[min(384px,calc(100vw-32px))]! max-w-[384px]! flex-col overflow-hidden rounded-[24px]! bg-white p-[24px]! shadow-2xl">
            <h3 className="mb-[16px]! flex items-center gap-2 text-[18px]! leading-[28px]! font-extrabold text-gray-900">
              <i className="fas fa-folder-plus text-yellow-500"></i> 새 폴더 만들기
            </h3>
            <input
              type="text"
              className="mb-[24px]! h-[46px]! w-full rounded-[12px]! border border-gray-200 px-[16px]! py-0! text-[14px]! leading-[20px]! font-bold shadow-sm outline-none transition focus:border-brand"
              placeholder="폴더 이름을 입력하세요."
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFolderModalOpen(false)}
                className="h-[38px]! box-border rounded-[12px]! border border-gray-200 bg-white px-4 py-0! text-[14px]! leading-[20px]! font-bold text-gray-600 transition hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!folderName.trim() || submitting}
                className="h-[38px]! box-border rounded-[12px]! bg-gray-900 px-5 py-0! text-[14px]! leading-[20px]! font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                생성하기
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {renderAuthModal()}
    </div>
  )
}
