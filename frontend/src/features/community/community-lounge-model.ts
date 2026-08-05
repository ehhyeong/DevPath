import { type ProjectAsideSquad } from '../../components/ProjectAside'


export type LoungeType = 'project' | 'join_wish' | 'study' | 'networking'
export type ActiveFilter = 'all' | 'my_posts' | LoungeType
export type SortFilter = 'latest' | 'views' | 'deadline' | 'available'
export type StatusTab = 'sent' | 'received'

export type LoungeShellResponse = {
  user?: {
    name?: string | null
    profileImage?: string | null
  } | null
  mySquads?: ProjectAsideSquad[]
}

export type SquadMemberResponse = {
  userId?: number | null
  userName?: string | null
  profileImage?: string | null
  role?: string | null
}

export type SquadLoungePostResponse = {
  id: number
  authorId?: number | null
  authorName?: string | null
  authorProfileImage?: string | null
  title?: string | null
  type?: string | null
  deadline?: string | null
  tags?: string[] | null
  description?: string | null
  roles?: string[] | null
  currentMembers?: number | null
  maxMembers?: number | null
  views?: number | null
  closed?: boolean | null
  workspaceId?: number | null
  workspaceUrl?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  members?: SquadMemberResponse[] | null
}

export type LoungeApplicationSummary = {
  applicationId: number
  type: 'SQUAD_APPLICATION' | 'SQUAD_PROPOSAL'
  targetId: number
  targetTitle?: string | null
  senderId?: number | null
  senderName?: string | null
  senderProfileImage?: string | null
  receiverId?: number | null
  receiverName?: string | null
  receiverProfileImage?: string | null
  title?: string | null
  content?: string | null
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null
  createdAt?: string | null
}

export type LoungeApplication = {
  id: number
  type: 'project_apply' | 'scout'
  title: string
  sender: string
  senderImageUrl: string | null
  date: string
  status: string
  content: string
}

export type SquadMember = {
  userId: number | null
  name: string
  role: string
  img: string
  imageUrl: string | null
}

export type SquadPost = {
  id: number
  authorId: number | null
  author: string
  authorImg: string
  authorProfileImage: string | null
  title: string
  type: LoungeType
  deadline: string
  iconClass: string
  iconBg: string
  iconCol: string
  tags: string[]
  desc: string
  roles: string[]
  members: SquadMember[]
  current: number
  max: number
  views: number
  date: string
  sortDate: string
  isClosed: boolean
  isMine: boolean
  workspaceId: number | null
  workspaceUrl: string | null
}

export type CreateForm = {
  editId: number | null
  title: string
  type: LoungeType
  deadline: string
  maxMembers: string
  tags: string
  roles: string
  desc: string
}

export type ApplyForm = {
  role: string
  portfolio: string
  content: string
}

export const ITEMS_PER_PAGE = 6

export const templates: Record<LoungeType, string> = {
  project: '[프로젝트 핵심 목표 (한줄 소개)]\n- \n\n[상세 기획 및 주요 기능]\n- \n\n[모집 역할 및 진행 방식]\n- ',
  join_wish: '[자기소개]\n- 보유 기술: \n- 가용 시간: \n\n[희망 프로젝트]\n- ',
  study: '[스터디 목표]\n- \n- 진행 시간: \n\n[모집 대상]\n- ',
  networking: '[모임 주제]\n- \n- 일시 및 장소: ',
}

export const typeConfig: Record<LoungeType, { iconClass: string; iconBg: string; iconCol: string }> = {
  project: { iconClass: 'fa-laptop-code', iconBg: 'bg-blue-50', iconCol: 'text-blue-600' },
  join_wish: { iconClass: 'fa-user-check', iconBg: 'bg-green-50', iconCol: 'text-brand' },
  study: { iconClass: 'fa-book', iconBg: 'bg-purple-50', iconCol: 'text-purple-600' },
  networking: { iconClass: 'fa-coffee', iconBg: 'bg-orange-50', iconCol: 'text-orange-600' },
}

export function toDateText(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

export function toDateTime(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

export function toDeadlineTime(value: string | null | undefined) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER
  }

  const time = Date.parse(value)
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER
}

export function normalizeType(value: string | null | undefined): LoungeType {
  if (value === 'join_wish' || value === 'study' || value === 'networking') {
    return value
  }

  return 'project'
}

export function formatViews(views: number) {
  return views > 1000 ? `${(views / 1000).toFixed(1)}k` : String(views)
}

export function parseTokenList(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.replace(/^#/, '').trim())
    .filter(Boolean)
}

export function mapApplication(item: LoungeApplicationSummary): LoungeApplication {
  return {
    id: Number(item.applicationId),
    type: item.type === 'SQUAD_APPLICATION' ? 'project_apply' : 'scout',
    title: item.targetTitle || item.title || '제목 없음',
    sender: item.senderName || '사용자',
    senderImageUrl: item.senderProfileImage ?? null,
    date: toDateText(item.createdAt),
    status: item.status === 'APPROVED' ? '승인됨' : item.status === 'REJECTED' ? '거절됨' : '대기중',
    content: item.content || item.title || '',
  }
}

export function mapSquadPost(post: SquadLoungePostResponse, currentUserId: number | null): SquadPost {
  const type = normalizeType(post.type)
  const cfg = typeConfig[type]
  const members = Array.isArray(post.members) ? post.members : []
  const currentMembers = Number(post.currentMembers) || members.length || 0
  const maxMembers = Number(post.maxMembers) || Math.max(currentMembers, 1)

  return {
    id: Number(post.id),
    authorId: post.authorId ?? null,
    author: post.authorName || '사용자',
    authorImg: `squad-${post.authorId ?? post.id}`,
    authorProfileImage: post.authorProfileImage ?? null,
    title: post.title || '제목 없음',
    type,
    deadline: toDateText(post.deadline),
    iconClass: cfg.iconClass,
    iconBg: cfg.iconBg,
    iconCol: cfg.iconCol,
    tags: Array.isArray(post.tags) ? post.tags : [],
    desc: post.description || '',
    roles: Array.isArray(post.roles) ? post.roles : [],
    members: members.map((member) => ({
      userId: member.userId ?? null,
      name: member.userName || `사용자 #${member.userId || ''}`,
      role: member.role || 'Member',
      img: `member-${member.userId || member.userName || 'Member'}`,
      imageUrl: member.profileImage ?? null,
    })),
    current: currentMembers,
    max: maxMembers,
    views: Number(post.views) || 0,
    date: toDateText(post.createdAt),
    sortDate: post.createdAt || post.updatedAt || '',
    isClosed: post.closed === true,
    isMine: currentUserId !== null && Number(post.authorId) === currentUserId,
    workspaceId: post.workspaceId ?? null,
    workspaceUrl: post.workspaceUrl ?? null,
  }
}

export function authorToMember(squad: SquadPost, currentUserProfileImage: string | null = null): SquadMember {
  return {
    userId: squad.authorId,
    name: squad.author,
    role: '작성자',
    img: squad.authorImg,
    imageUrl: squad.isMine ? currentUserProfileImage : squad.authorProfileImage,
  }
}

export function emptyCreateForm(): CreateForm {
  return {
    editId: null,
    title: '',
    type: 'project',
    deadline: '',
    maxMembers: '',
    tags: '',
    roles: '',
    desc: templates.project,
  }
}

export function readInitialDetailSquadId() {
  const params = new URLSearchParams(window.location.search)
  const rawId = params.get('squadId')
  const id = rawId ? Number(rawId) : Number.NaN

  return Number.isInteger(id) && id > 0 ? id : null
}

export function clearInitialDetailSquadId() {
  const url = new URL(window.location.href)
  url.searchParams.delete('squadId')
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}
