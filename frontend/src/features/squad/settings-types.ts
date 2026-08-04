export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type SettingsTab = 'general' | 'members' | 'integrations' | 'danger'
export type IntegrationProvider = 'GITHUB' | 'SLACK' | 'DISCORD' | 'JIRA'

export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  joinedAt?: string | null
  lastActiveAt?: string | null
  online?: boolean
}

export type WorkspaceSettings = {
  workspaceId: number
  name: string
  description?: string | null
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  deleted: boolean
  canManage: boolean
  memberCount: number
  members: WorkspaceMember[]
  createdAt?: string | null
  updatedAt?: string | null
}

export type ExternalIntegration = {
  id: number
  workspaceId: number
  provider: IntegrationProvider
  active?: boolean
  isActive?: boolean
  connectedAt?: string | null
  repositoryUrl?: string | null
  repositoryOwner?: string | null
  repositoryName?: string | null
  lastSyncedAt?: string | null
  lastSyncMessage?: string | null
  githubTokenConfigured?: boolean
}

export type SettingsForm = {
  name: string
  description: string
}
