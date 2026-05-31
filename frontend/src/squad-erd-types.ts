export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

export type ErdColumn = {
  name: string
  type: string
  pk?: boolean
  fk?: boolean
  notNull?: boolean
  unique?: boolean
  indexed?: boolean
  defaultValue?: string
  autoIncrement?: boolean
  check?: string
}

export type ErdTable = {
  id: string
  name: string
  columns: ErdColumn[]
}

export type ErdRelationship = {
  id: string
  from: string
  to: string
  type: string
  label: string
  fromColumn?: string
  toColumn?: string
  onDelete?: 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION'
}

export type ErdSchema = {
  tables: ErdTable[]
  relationships: ErdRelationship[]
}

export type ErdDocument = {
  workspaceId: number
  projectName: string
  mermaidCode: string
  schemaJson: string
  version: number
  updatedById?: number | null
  updatedByName?: string | null
  updatedAt?: string | null
  members: WorkspaceMember[]
}

export type TeamMessage = {
  messageId: number
  loungeId: number
  senderId: number
  senderName: string
  content: string
  createdAt?: string | null
  isMine: boolean
}

export type ErdVersion = {
  versionId: number
  workspaceId: number
  version: number
  mermaidCode: string
  schemaJson: string
  summary?: string | null
  updatedById?: number | null
  updatedByName?: string | null
  discussionMessageId?: number | null
  createdAt?: string | null
}

export type ErdComment = {
  commentId: number
  workspaceId: number
  targetType: string
  targetId: string
  targetLabel?: string | null
  authorId: number
  authorName: string
  body: string
  isMine: boolean
  createdAt?: string | null
}

export type ErdCommentTarget = {
  targetType: string
  targetId: string
  targetLabel: string
}

export type MermaidApi = {
  initialize: (options: Record<string, unknown>) => void
  render: (id: string, code: string) => Promise<{ svg: string }> | { svg: string }
}

declare global {
  interface Window {
    mermaid?: MermaidApi
  }
}
