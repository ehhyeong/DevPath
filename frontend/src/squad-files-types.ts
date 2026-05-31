export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type FileFilter = 'all' | 'folder' | 'pdf' | 'image' | 'doc'
export type SortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'

export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

export type WorkspaceDashboard = {
  workspaceId: number
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
}

export type WorkspaceFileItem = {
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

export type StorageSummary = {
  usedBytes: number
  quotaBytes: number
  storageProvider: string
}

export type ApiResponse<T> = {
  data: T
}

export type ArchiveEntry = {
  name: string
  directory: boolean
  size?: number | null
  compressedSize?: number | null
}

export type ArchivePreview = {
  entries: ArchiveEntry[]
  truncated: boolean
}

export type PresentationElement = {
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

export type PresentationSlide = {
  slideNumber: number
  width: number
  height: number
  backgroundColor?: string | null
  elements: PresentationElement[]
}

export type DocumentPreview = {
  documentType: string
  text: string
  truncated: boolean
  renderedContentType?: string | null
  renderedDataUri?: string | null
  slides?: PresentationSlide[] | null
}

export type FolderCrumb = {
  id: number
  name: string
}

export type ActionMenuState = {
  fileId: number
  top: number
  left: number
}
