import { useAuthSession } from '../../lib/useAuthSession'
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import AuthModal, { type AuthView } from '../../components/AuthModal'


import UserAvatar from '../../components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { projectApiRequest } from '../project/api'
import { createSquadNotification, squadActorName } from './notifications'

import type { ActionMenuState, ApiResponse, ArchivePreview, DocumentPreview, FileFilter, FolderCrumb, SortMode, StorageSummary, WorkspaceDashboard, WorkspaceFileItem } from './files-types'
import { readWorkspaceIdFromLocation as getWorkspaceIdFromUrl } from '../../lib/location-state'
import { requestRaw } from '../../lib/api/client'

const SQUAD_FILES_MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const SQUAD_FILES_TEXT_PREVIEW_MAX_BYTES = 512 * 1024

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

function formatRelativeDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }

  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diffDays = Math.floor((startToday - startDate) / 86400000)

  if (diffDays === 0) {
    return '오늘'
  }

  if (diffDays === 1) {
    return '어제'
  }

  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays}일 전`
  }

  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function previewable(item: WorkspaceFileItem) {
  const kind = itemKind(item)
  return (
    kind === 'image'
    || kind === 'pdf'
    || archivePreviewable(item)
    || textPreviewable(item)
    || officeDocumentPreviewable(item)
    || unsupportedDocumentPreviewMessage(item) !== null
  )
}

function archivePreviewable(item: WorkspaceFileItem) {
  const contentType = item.contentType?.toLowerCase() ?? ''
  const extension = fileExtension(displayName(item))

  return contentType.includes('zip') || extension === 'zip'
}

function textPreviewable(item: WorkspaceFileItem) {
  const contentType = item.contentType?.toLowerCase() ?? ''
  const extension = fileExtension(displayName(item))

  return contentType.startsWith('text/') || extension === 'txt'
}

function officeDocumentPreviewable(item: WorkspaceFileItem) {
  return ['docx', 'pptx', 'hwpx'].includes(fileExtension(displayName(item)))
}

function unsupportedDocumentPreviewMessage(item: WorkspaceFileItem) {
  const extension = fileExtension(displayName(item))

  if (extension === 'doc') {
    return 'DOC 미리보기는 전용 Office 변환기가 필요합니다. DOCX 파일은 텍스트 미리보기를 지원합니다.'
  }

  if (extension === 'ppt') {
    return 'PPT 미리보기는 전용 Office 변환기가 필요합니다. PPTX 파일은 텍스트 미리보기를 지원합니다.'
  }

  if (extension === 'hwp') {
    return 'HWP 미리보기는 전용 한글 문서 파서나 변환기가 필요합니다. HWPX 파일은 텍스트 미리보기를 지원합니다.'
  }

  return null
}

function createPreviewBlob(item: WorkspaceFileItem, blob: Blob) {
  if (itemKind(item) === 'pdf' && blob.type !== 'application/pdf') {
    return new Blob([blob], { type: 'application/pdf' })
  }

  return blob
}


async function authenticatedFetch(path: string, init: RequestInit = {}) {
  return requestRaw(path, init, { auth: true })
}export function useSquadFilesController() {
  const workspaceId = getWorkspaceIdFromUrl()
  const [session,setSession] = useAuthSession()
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [files, setFiles] = useState<WorkspaceFileItem[]>([])
  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null)
  const [folderStack, setFolderStack] = useState<FolderCrumb[]>([])
  const [searchText, setSearchText] = useState('')
  const [filter, setFilter] = useState<FileFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date-desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null)
  const [previewItem, setPreviewItem] = useState<WorkspaceFileItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewArchive, setPreviewArchive] = useState<ArchivePreview | null>(null)
  const [previewDocument, setPreviewDocument] = useState<DocumentPreview | null>(null)
  const [previewUnsupportedMessage, setPreviewUnsupportedMessage] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const root = document.getElementById('root')
    const appViewport = document.querySelector<HTMLElement>('.app-viewport')
    html.classList.add('h-full!', 'overflow-hidden!')
    body.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    root?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    appViewport?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')

    return () => {
      html.classList.remove('h-full!', 'overflow-hidden!')
      body.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      root?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      appViewport?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    const currentSession = readStoredAuthSession()

    if (!currentSession?.accessToken) {
      setLoading(false)
      setAuthView('login')
      showAuthToast({ message: '팀 자료실은 로그인 후 이용할 수 있습니다.', durationMs: 2200 })
      return
    }

    let ignore = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const query = currentFolderId ? `?parentId=${currentFolderId}` : ''
        const [dashboardData, fileData, storageData] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, {}, 'required'),
          projectApiRequest<WorkspaceFileItem[]>(`/api/workspaces/${workspaceId}/files${query}`, {}, 'required'),
          projectApiRequest<StorageSummary>(`/api/workspaces/${workspaceId}/files/storage`, {}, 'required'),
        ])

        if (ignore) {
          return
        }

        setDashboard(dashboardData)
        setFiles(fileData)
        setStorage(storageData)
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : '팀 자료실을 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [workspaceId, currentFolderId, refreshKey])

  useEffect(() => {
    if (!actionMenu) {
      return
    }

    function closeActionMenu() {
      setActionMenu(null)
    }

    document.addEventListener('click', closeActionMenu)

    return () => {
      document.removeEventListener('click', closeActionMenu)
    }
  }, [actionMenu])

  useEffect(() => {
    if (!previewItem || !previewable(previewItem)) {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewArchive(null)
      setPreviewDocument(null)
      setPreviewUnsupportedMessage(null)
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }

    const item = previewItem
    let objectUrl: string | null = null
    let ignore = false

    async function loadPreview() {
      setPreviewLoading(true)
      setPreviewError(null)
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewArchive(null)
      setPreviewDocument(null)
      setPreviewUnsupportedMessage(null)

      try {
        const unsupportedMessage = unsupportedDocumentPreviewMessage(item)
        if (unsupportedMessage) {
          setPreviewUnsupportedMessage(unsupportedMessage)
          return
        }

        if (archivePreviewable(item)) {
          const response = await authenticatedFetch(`/api/workspace-files/${item.fileId}/archive`)
          const payload = (await response.json()) as ApiResponse<ArchivePreview>

          if (ignore) {
            return
          }

          setPreviewArchive(payload.data ?? { entries: [], truncated: false })
          return
        }

        if (officeDocumentPreviewable(item)) {
          const response = await authenticatedFetch(`/api/workspace-files/${item.fileId}/document-preview`)
          const payload = (await response.json()) as ApiResponse<DocumentPreview>

          if (ignore) {
            return
          }

          const documentPreview = payload.data ?? {
            documentType: 'document',
            text: '미리보기할 텍스트가 없습니다.',
            truncated: false,
          }
          const text = documentPreview.text ?? '미리보기할 텍스트가 없습니다.'
          const suffix = documentPreview.truncated ? '\n\n... 미리보기 일부만 표시됩니다.' : ''
          if (documentPreview.renderedDataUri || documentPreview.slides?.length) {
            setPreviewDocument(documentPreview)
          } else {
            setPreviewText(`${text}${suffix}`)
          }
          return
        }

        const response = await authenticatedFetch(`/api/workspace-files/${item.fileId}/download`)
        const blob = await response.blob()

        if (ignore) {
          return
        }

        if (textPreviewable(item)) {
          const previewBlob =
              blob.size > SQUAD_FILES_TEXT_PREVIEW_MAX_BYTES
                ? blob.slice(0, SQUAD_FILES_TEXT_PREVIEW_MAX_BYTES)
                : blob
          const text = await previewBlob.text()
          const suffix =
            blob.size > SQUAD_FILES_TEXT_PREVIEW_MAX_BYTES
              ? '\n\n... 미리보기는 512KB까지만 표시됩니다.'
              : ''

          if (!ignore) {
            setPreviewText(`${text}${suffix}`)
          }
          return
        }

        objectUrl = URL.createObjectURL(createPreviewBlob(item, blob))
        setPreviewUrl(objectUrl)
      } catch {
        if (!ignore) {
          setPreviewError('미리보기를 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) {
          setPreviewLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      ignore = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [previewItem])

  const members = dashboard?.members ?? []
  const projectName = dashboard?.name ?? '팀 자료실'
  const usedBytes = storage?.usedBytes ?? 0
  const quotaBytes = storage?.quotaBytes ?? 0
  const storagePercent = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0
  const actionMenuItem = actionMenu ? files.find((file) => file.fileId === actionMenu.fileId) ?? null : null

  const visibleFiles = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return files
      .filter((item) => {
        if (!normalizedSearch) {
          return true
        }

        return displayName(item).toLowerCase().includes(normalizedSearch)
      })
      .filter((item) => {
        if (filter === 'all') {
          return true
        }

        if (filter === 'folder') {
          return item.itemType === 'FOLDER'
        }

        return itemKind(item) === filter
      })
      .sort((a, b) => {
        const folderCompare = (a.itemType === 'FOLDER' ? 0 : 1) - (b.itemType === 'FOLDER' ? 0 : 1)

        if (folderCompare !== 0) {
          return folderCompare
        }

        if (sortMode === 'name-asc') {
          return displayName(a).localeCompare(displayName(b))
        }

        if (sortMode === 'name-desc') {
          return displayName(b).localeCompare(displayName(a))
        }

        const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
        const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()

        return sortMode === 'date-asc' ? aTime - bTime : bTime - aTime
      })
  }, [files, filter, searchText, sortMode])

  function handleLogout() {
    clearStoredAuthSession()
    navigateTo('/')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()
    setSession(nextSession)
    setAuthView(null)

    if (!nextSession) {
      navigateTo(getPostLoginRedirect(null))
      return
    }

    setRefreshKey((value) => value + 1)
  }

  function renderAuthModal() {
    return authView ? (
      <AuthModal
        view={authView}
        onClose={() => setAuthView(null)}
        onViewChange={setAuthView}
        onAuthenticated={handleAuthenticated}
      />
    ) : null
  }


  function openFolder(item: WorkspaceFileItem) {
    setCurrentFolderId(item.fileId)
    setFolderStack((stack) => [...stack, { id: item.fileId, name: displayName(item) }])
    setSearchText('')
  }

  function goToRoot() {
    setCurrentFolderId(null)
    setFolderStack([])
    setSearchText('')
  }

  function goToCrumb(index: number) {
    const nextStack = folderStack.slice(0, index + 1)
    setFolderStack(nextStack)
    setCurrentFolderId(nextStack.at(-1)?.id ?? null)
    setSearchText('')
  }

  function goToParentFolder() {
    const nextStack = folderStack.slice(0, -1)
    setFolderStack(nextStack)
    setCurrentFolderId(nextStack.at(-1)?.id ?? null)
    setSearchText('')
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !folderName.trim()) {
      return
    }

    setSubmitting(true)

    try {
      await projectApiRequest<WorkspaceFileItem>(
        `/api/workspaces/${workspaceId}/files/folders`,
        {
          method: 'POST',
          body: JSON.stringify({ name: folderName.trim(), parentId: currentFolderId }),
        },
        'required',
      )
      setFolderName('')
      setFolderModalOpen(false)
      setRefreshKey((value) => value + 1)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-files',
        message: `${squadActorName(session?.name)}님이 폴더 "${folderName.trim()}"를 생성했습니다.`,
        targetPath: '/squad-files',
      })
      showAuthToast({ message: '폴더가 생성되었습니다.', durationMs: 1600 })
    } catch (createError) {
      showAuthToast({
        message: createError instanceof Error ? createError.message : '폴더를 만들지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !selectedFile) {
      return
    }

    if (selectedFile.size > SQUAD_FILES_MAX_UPLOAD_BYTES) {
      showAuthToast({
        message: `50MB 이하 파일만 업로드할 수 있습니다. 현재 파일은 ${formatBytes(selectedFile.size)}입니다.`,
        durationMs: 2200,
      })
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)

    if (currentFolderId) {
      formData.append('parentId', String(currentFolderId))
    }

    setSubmitting(true)

    try {
      await projectApiRequest<WorkspaceFileItem>(
        `/api/workspaces/${workspaceId}/files`,
        {
          method: 'POST',
          body: formData,
        },
        'required',
      )
      setSelectedFile(null)
      setUploadModalOpen(false)
      setRefreshKey((value) => value + 1)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-files',
        message: `${squadActorName(session?.name)}님이 파일 "${selectedFile.name}"을 업로드했습니다.`,
        targetPath: '/squad-files',
      })
      showAuthToast({ message: '파일 업로드가 완료되었습니다.', durationMs: 1600 })
    } catch (uploadError) {
      showAuthToast({
        message: uploadError instanceof Error ? uploadError.message : '파일을 업로드하지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setSubmitting(false)
    }
  }

  function selectUploadFile(file: File | null) {
    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.size > SQUAD_FILES_MAX_UPLOAD_BYTES) {
      setSelectedFile(null)
      showAuthToast({
        message: `50MB 이하 파일만 업로드할 수 있습니다. 현재 파일은 ${formatBytes(file.size)}입니다.`,
        durationMs: 2200,
      })
      return
    }

    setSelectedFile(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)

    const file = event.dataTransfer.files.item(0)

    selectUploadFile(file)
  }

  async function downloadItem(item: WorkspaceFileItem) {
    try {
      const response = await authenticatedFetch(`/api/workspace-files/${item.fileId}/download`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = objectUrl
      link.download = displayName(item)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (downloadError) {
      showAuthToast({
        message: downloadError instanceof Error ? downloadError.message : '다운로드를 시작하지 못했습니다.',
        durationMs: 2200,
      })
    }
  }

  async function deleteItem(item: WorkspaceFileItem) {
    const targetName = displayName(item)

    if (!window.confirm(`"${targetName}" 항목을 삭제할까요?`)) {
      return
    }

    try {
      await projectApiRequest<void>(`/api/workspace-files/${item.fileId}`, { method: 'DELETE' }, 'required')
      setRefreshKey((value) => value + 1)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-files',
        message: `${squadActorName(session?.name)}님이 자료 "${targetName}"을 삭제했습니다.`,
        targetPath: '/squad-files',
      })
      showAuthToast({ message: '항목이 삭제되었습니다.', durationMs: 1600 })
    } catch (deleteError) {
      showAuthToast({
        message: deleteError instanceof Error ? deleteError.message : '항목을 삭제하지 못했습니다.',
        durationMs: 2200,
      })
    }
  }

  async function renameItem(item: WorkspaceFileItem) {
    const currentName = displayName(item)
    const nextName = window.prompt('새 이름을 입력하세요.', currentName)?.trim()

    setActionMenu(null)

    if (!nextName || nextName === currentName) {
      return
    }

    try {
      const updatedItem = await projectApiRequest<WorkspaceFileItem>(
        `/api/workspace-files/${item.fileId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: nextName }),
        },
        'required',
      )

      setFiles((currentFiles) => currentFiles.map((file) => (file.fileId === item.fileId ? updatedItem : file)))
      setFolderStack((stack) =>
        stack.map((crumb) => (crumb.id === item.fileId ? { ...crumb, name: displayName(updatedItem) } : crumb)),
      )
      setPreviewItem((currentItem) => (currentItem?.fileId === item.fileId ? updatedItem : currentItem))
      setRefreshKey((value) => value + 1)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-files',
        message: `${squadActorName(session?.name)}님이 자료 "${currentName}"의 이름을 "${displayName(updatedItem)}"로 변경했습니다.`,
        targetPath: '/squad-files',
      })
      showAuthToast({ message: '이름이 변경되었습니다.', durationMs: 1600 })
    } catch (renameError) {
      showAuthToast({
        message: renameError instanceof Error ? renameError.message : '이름을 변경하지 못했습니다.',
        durationMs: 2200,
      })
    }
  }

  function renderFileRow(item: WorkspaceFileItem) {
    const kind = itemKind(item)
    const isFolder = item.itemType === 'FOLDER'

    return (
      <div
        key={item.fileId}
        role="button"
        tabIndex={0}
        onClick={() => (isFolder ? openFolder(item) : setPreviewItem(item))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (isFolder) {
              openFolder(item)
            } else {
              setPreviewItem(item)
            }
          }
        }}
        className="file-row squad-files-row squad-files-fade-in group/file-row grid min-h-[56px] cursor-pointer grid-cols-12 items-center gap-[16px]! border-b border-gray-50 p-[16px]! [transition:background-color_0.15s_ease] hover:bg-[#F9FAFB]"
      >
        <div className="col-span-6 flex items-center gap-3 pl-2 min-w-0">
          <i className={`${iconClass(item)} text-xl w-[24px]! shrink-0 text-center text-[20px]! leading-[28px]!`}></i>
          <span className="text-sm truncate text-[14px]! leading-[20px]! font-bold text-gray-900 transition hover:text-brand">{displayName(item)}</span>
        </div>
        <div className="text-xs col-span-2 mx-4 rounded bg-gray-50 py-1 text-center text-[12px]! leading-[16px]! font-bold text-gray-500">
          {isFolder ? '-' : formatBytes(item.fileSize)}
        </div>
        <div className="col-span-2 flex justify-center items-center gap-1.5 min-w-0">
          <UserAvatar
            name={item.uploadedByName ?? '팀원'}
            imageUrl={item.uploaderProfileImage}
            className="w-5 h-5 rounded-full border border-gray-200 bg-gray-100 shrink-0"
            iconClassName="text-[8px]"
          />
          <span className="truncate text-[10px]! leading-[16px]! font-bold text-gray-600">{item.uploadedByName ?? '팀원'}</span>
        </div>
        <div className="text-xs col-span-2 flex items-center justify-end gap-4 pr-2 text-right text-[12px]! leading-[16px]! font-medium text-gray-500">
          <span>{formatRelativeDate(item.updatedAt ?? item.createdAt)}</span>
          <div
            className={`file-action-btn relative flex gap-2 opacity-0 [transition:opacity_0.1s_ease] group-hover/file-row:opacity-100 group-focus-within/file-row:opacity-100${actionMenu?.fileId === item.fileId ? ' is-open opacity-100!' : ''}`}
            onMouseDown={(event) => {
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            {!isFolder ? (
              <button
                type="button"
                className="text-gray-400 hover:text-brand transition"
                onClick={(event) => {
                  event.stopPropagation()
                  void downloadItem(item)
                }}
                title="다운로드"
              >
                <i className="fas fa-download"></i>
              </button>
            ) : null}
            <button
              type="button"
              className="text-gray-400 hover:text-red-500 transition px-1"
              onClick={(event) => {
                event.stopPropagation()
                void deleteItem(item)
              }}
              title="삭제"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-900 transition px-1"
              onClick={(event) => {
                event.stopPropagation()
                const rect = event.currentTarget.getBoundingClientRect()
                const left = rect.left - 110
                const top = rect.bottom + window.scrollY

                setActionMenu((currentMenu) =>
                  currentMenu?.fileId === item.fileId ? null : { fileId: item.fileId, top, left },
                )
              }}
              aria-haspopup="menu"
              aria-expanded={actionMenu?.fileId === item.fileId}
              title="더보기"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </div>
        <span className="sr-only">{kind}</span>
      </div>
    )
  }
  return { workspaceId, session, setSession, authView, setAuthView, dashboard, setDashboard, files, setFiles, storage, setStorage, currentFolderId, setCurrentFolderId, folderStack, setFolderStack, searchText, setSearchText, filter, setFilter, sortMode, setSortMode, loading, setLoading, error, setError, refreshKey, setRefreshKey, folderModalOpen, setFolderModalOpen, folderName, setFolderName, uploadModalOpen, setUploadModalOpen, selectedFile, setSelectedFile, dragOver, setDragOver, submitting, setSubmitting, actionMenu, setActionMenu, previewItem, setPreviewItem, previewUrl, setPreviewUrl, previewText, setPreviewText, previewArchive, setPreviewArchive, previewDocument, setPreviewDocument, previewUnsupportedMessage, setPreviewUnsupportedMessage, previewLoading, setPreviewLoading, previewError, setPreviewError, members, projectName, usedBytes, quotaBytes, storagePercent, actionMenuItem, visibleFiles, handleLogout, handleAuthenticated, renderAuthModal, openFolder, goToRoot, goToCrumb, goToParentFolder, createFolder, uploadFile, selectUploadFile, handleDrop, downloadItem, deleteItem, renameItem, renderFileRow }
}