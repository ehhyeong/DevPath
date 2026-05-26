import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type FormEvent } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceAside from './components/SquadWorkspaceAside'
import SquadWorkspaceHeader from './components/SquadWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { projectApiRequest } from './project-api'
import { createSquadNotification, squadActorName } from './squad-notifications'

type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type FileFilter = 'all' | 'folder' | 'pdf' | 'image' | 'doc'
type SortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

type WorkspaceDashboard = {
  workspaceId: number
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
}

type WorkspaceFileItem = {
  fileId: number
  workspaceId: number
  parentId?: number | null
  itemType: 'FILE' | 'FOLDER'
  originalFileName: string
  displayName?: string | null
  fileSize: number
  contentType?: string | null
  storageProvider?: string | null
  objectKey?: string | null
  uploadedById: number
  uploadedByName?: string | null
  uploaderProfileImage?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type StorageSummary = {
  usedBytes: number
  quotaBytes: number
  storageProvider: string
}

type ApiResponse<T> = {
  data: T
}

type ArchiveEntry = {
  name: string
  directory: boolean
  size?: number | null
  compressedSize?: number | null
}

type ArchivePreview = {
  entries: ArchiveEntry[]
  truncated: boolean
}

type PresentationElement = {
  type: 'text' | 'image' | 'shape'
  x: number
  y: number
  width: number
  height: number
  text?: string | null
  imageDataUri?: string | null
  fillColor?: string | null
  textColor?: string | null
  fontSize?: number | null
  bold: boolean
  italic: boolean
}

type PresentationSlide = {
  slideNumber: number
  width: number
  height: number
  backgroundColor?: string | null
  elements: PresentationElement[]
}

type DocumentPreview = {
  documentType: string
  text: string
  truncated: boolean
  renderedContentType?: string | null
  renderedDataUri?: string | null
  slides?: PresentationSlide[] | null
}

type FolderCrumb = {
  id: number
  name: string
}

type ActionMenuState = {
  fileId: number
  top: number
  left: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const SQUAD_FILES_MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const SQUAD_FILES_TEXT_PREVIEW_MAX_BYTES = 512 * 1024

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

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

async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const session = readStoredAuthSession()

  if (!session?.accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response
}

export default function SquadFilesApp() {
  const workspaceId = getWorkspaceIdFromUrl()
  const [session, setSession] = useState(() => readStoredAuthSession())
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

    html.classList.add('squad-dashboard-document')
    body.classList.add('squad-dashboard-body')

    return () => {
      html.classList.remove('squad-dashboard-document')
      body.classList.remove('squad-dashboard-body')
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
    window.location.href = '/'
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()
    setSession(nextSession)
    setAuthView(null)

    if (!nextSession) {
      window.location.href = getPostLoginRedirect(null)
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
        className="file-row squad-files-row grid grid-cols-12 gap-4 p-4 border-b border-gray-50 items-center cursor-pointer fade-in"
      >
        <div className="col-span-6 flex items-center gap-3 pl-2 min-w-0">
          <i className={`${iconClass(item)} text-xl w-6 text-center shrink-0`}></i>
          <span className="font-bold text-gray-900 text-sm hover:text-brand transition truncate">{displayName(item)}</span>
        </div>
        <div className="col-span-2 text-center text-xs font-bold text-gray-500 bg-gray-50 rounded py-1 mx-4">
          {isFolder ? '-' : formatBytes(item.fileSize)}
        </div>
        <div className="col-span-2 flex justify-center items-center gap-1.5 min-w-0">
          <UserAvatar
            name={item.uploadedByName ?? '팀원'}
            imageUrl={item.uploaderProfileImage}
            className="w-5 h-5 rounded-full border border-gray-200 bg-gray-100 shrink-0"
            iconClassName="text-[8px]"
          />
          <span className="text-[10px] font-bold text-gray-600 truncate">{item.uploadedByName ?? '팀원'}</span>
        </div>
        <div className="col-span-2 text-right text-xs font-medium text-gray-500 pr-2 flex justify-end items-center gap-4">
          <span>{formatRelativeDate(item.updatedAt ?? item.createdAt)}</span>
          <div
            className={`file-action-btn relative flex gap-2${actionMenu?.fileId === item.fileId ? ' is-open' : ''}`}
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

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
        {renderAuthModal()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
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
    <div className="squad-dashboard-page squad-files-page flex h-screen overflow-hidden text-gray-800">
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
          <div className="squad-files-toolbar px-8 py-6 shrink-0 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-2">
                <i className="fas fa-folder-open text-brand"></i> 팀 자료실
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
                  className="squad-files-search-input pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand focus:bg-white transition w-64"
                  placeholder="파일 및 폴더 이름 검색"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </div>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button
                type="button"
                onClick={() => setFolderModalOpen(true)}
                className="squad-files-new-folder-button px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
              >
                <i className="fas fa-folder-plus text-yellow-500"></i> 새 폴더
              </button>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="squad-files-upload-button px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-black transition shadow-lg flex items-center gap-2"
              >
                <i className="fas fa-cloud-upload-alt"></i> 업로드
              </button>
            </div>
          </div>

          <div className="squad-files-content flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#F3F4F6]">
            <div className="squad-files-inner max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-4 px-2 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {folderStack.length ? (
                    <button
                      type="button"
                      onClick={goToParentFolder}
                      className="squad-files-parent-button inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand"
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
                  <div className="squad-files-filter-bar flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
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
                        className={`filter-btn px-3 py-1 text-xs font-bold rounded-md transition ${
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
                      className="squad-files-sort-select appearance-none bg-white border border-gray-200 text-xs font-bold text-gray-700 py-1.5 pl-3 pr-8 rounded-lg shadow-sm outline-none focus:border-brand cursor-pointer"
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

              <div className="squad-files-table bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="squad-files-table-header grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-6 pl-2">이름</div>
                  <div className="col-span-2 text-center">크기</div>
                  <div className="col-span-2 text-center">업로드</div>
                  <div className="col-span-2 text-right pr-4">수정일</div>
                </div>

                <div className="flex flex-col min-h-[300px]">
                  {visibleFiles.length > 0 ? (
                    visibleFiles.map((item) => renderFileRow(item))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 fade-in">
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
        <div className="modal active squad-files-preview-modal fixed inset-0 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md z-[1200]">
          <div className="squad-files-preview-panel bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col fade-in">
            <div className="squad-files-preview-header px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <i className={`${iconClass(previewItem)} text-xl w-6 text-center shrink-0`}></i>
                <h3 className="text-lg font-extrabold text-gray-900 truncate max-w-xl">{displayName(previewItem)}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition flex items-center gap-2 shadow-sm"
                  onClick={() => void downloadItem(previewItem)}
                >
                  <i className="fas fa-download"></i> 다운로드
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="text-gray-400 hover:text-gray-900 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            <div className="squad-files-preview-body flex-1 bg-gray-200 flex items-center justify-center p-6 overflow-auto">
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
        <div className="modal active squad-files-upload-modal fixed inset-0 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm z-[1050]">
          <form onSubmit={uploadFile} className="squad-files-upload-panel bg-white w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden flex flex-col p-8 fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-cloud-upload-alt text-brand"></i> 현재 폴더에 업로드
              </h3>
              <button type="button" onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div
              className={`dropzone squad-files-upload-dropzone border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-12 px-4 cursor-pointer transition ${
                dragOver ? 'dragover bg-green-50 border-brand' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
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
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-brand text-2xl mb-4 border border-gray-100">
                <i className="fas fa-file-upload"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">
                {selectedFile ? selectedFile.name : '여기로 파일을 드래그하거나 클릭하세요.'}
              </h4>
              <p className="text-xs text-gray-500 font-medium">선택한 파일은 실제 저장소에 업로드됩니다.</p>
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
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!selectedFile || submitting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '업로드 중' : '업로드'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {folderModalOpen ? (
        <div className="modal active squad-files-folder-modal fixed inset-0 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm z-[1050]">
          <form onSubmit={createFolder} className="squad-files-folder-panel bg-white w-full max-w-sm rounded-3xl shadow-2xl relative overflow-hidden flex flex-col p-6 fade-in">
            <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-folder-plus text-yellow-500"></i> 새 폴더 만들기
            </h3>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm mb-6 font-bold"
              placeholder="폴더 이름을 입력하세요."
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFolderModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!folderName.trim() || submitting}
                className="px-5 py-2 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
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
