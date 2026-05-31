import type { TaskPriority, WorkspaceMember, WorkspaceTask } from './team-workspace-types'
export function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

export function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '일정 미정'

  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date)
}

export function formatTime(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '--:--'

  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function formatRelativeTime(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '방금 전'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간 전`

  return `${Math.floor(diffHours / 24)}일 전`
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function roleForTask(task: WorkspaceTask) {
  const text = `${task.title} ${task.description ?? ''}`.toLowerCase()
  if (/(front|react|next|ui|화면|프론트)/i.test(text)) return 'Frontend'
  if (/(back|api|server|spring|jpa|db|서버|백엔드)/i.test(text)) return 'Backend'
  if (/(design|designer|figma|wireframe|디자인|기획)/i.test(text)) return 'Designer'
  if (/(common|공통)/i.test(text)) return '공통'

  return '공통'
}

export function stripTaskRolePrefix(description?: string | null) {
  return (description ?? '').replace(/^\[(Frontend|Backend|Designer|Design|공통|Common|Planning)\]\s*/i, '')
}

export function priorityClass(priority?: TaskPriority | null) {
  if (priority === 'HIGH') return 'bg-red-50 text-red-500'
  if (priority === 'LOW') return 'bg-gray-100 text-gray-400'

  return 'bg-orange-50 text-orange-500'
}

export function taskRoleBadgeClass(role: string) {
  if (role === 'Backend') return 'border-purple-200 bg-purple-50 text-purple-600'
  if (role === 'Designer' || role === 'Design') return 'border-pink-200 bg-pink-50 text-pink-600'
  if (role === '공통' || role === 'Common' || role === 'Planning') return 'border-gray-200 bg-gray-100 text-gray-600'

  return 'border-blue-200 bg-blue-50 text-blue-600'
}

export function taskTicketCode(task: WorkspaceTask, role: string) {
  const prefix = role === 'Backend' ? 'BE' : role === 'Designer' || role === 'Design' ? 'DE' : role === '공통' || role === 'Common' ? 'CO' : 'FE'

  return `#${prefix}-${String(task.taskId).padStart(2, '0').slice(-2)}`
}

export function normalizeMemberPosition(value?: string | null) {
  const raw = value?.trim()
  if (!raw) return null

  const compact = raw.replace(/[\s_-]/g, '').toLowerCase()
  if (/^(fe|front|frontend|프론트|프론트엔드)$/.test(compact)) return 'FE'
  if (/^(be|back|backend|server|서버|백엔드)$/.test(compact)) return 'BE'
  if (/^(design|designer|de|uiux|ui|ux|디자인|디자이너)$/.test(compact)) return 'DE'
  if (/^(pm|planner|planning|기획|기획자)$/.test(compact)) return 'PM'
  if (/^(fullstack|full|fs|풀스택)$/.test(compact)) return 'FS'
  if (/^(leader|lead|팀장)$/.test(compact)) return 'LEAD'
  if (/^(common|co|공통)$/.test(compact)) return 'CO'

  return raw.length <= 6 ? raw.toUpperCase() : raw
}

export function memberAssignedPosition(member: WorkspaceMember, tasks: WorkspaceTask[]) {
  const explicit = normalizeMemberPosition(
    member.positionLabel ?? member.roleLabel ?? member.position ?? member.roleType ?? member.role,
  )
  if (explicit) return explicit

  const counts = new Map<string, number>()
  tasks
    .filter((task) => task.assigneeId === member.learnerId)
    .forEach((task) => {
      const nextPosition = normalizeMemberPosition(roleForTask(task))
      if (nextPosition) counts.set(nextPosition, (counts.get(nextPosition) ?? 0) + 1)
    })

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

export function fallbackMemberPosition(index: number) {
  return index % 2 === 0 ? 'FE' : 'BE'
}

export function memberPositionBadgeClass(position: string) {
  if (position === 'BE') return 'border border-purple-500/30 bg-purple-500/20 text-purple-400'
  if (position === 'DE') return 'border border-pink-500/30 bg-pink-500/20 text-pink-400'
  if (position === 'PM') return 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
  if (position === 'FS') return 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
  if (position === 'LEAD') return 'border border-red-500/30 bg-red-500/20 text-red-300'
  if (position === 'CO') return 'border border-gray-600 bg-gray-700 text-gray-300'

  return 'border border-blue-500/30 bg-blue-500/20 text-blue-400'
}

export function memberPositionLightBadgeClass(position: string) {
  if (position === 'BE') return 'border border-purple-100 bg-purple-50 text-purple-600'
  if (position === 'DE') return 'border border-pink-100 bg-pink-50 text-pink-600'
  if (position === 'PM') return 'border border-amber-100 bg-amber-50 text-amber-600'
  if (position === 'FS') return 'border border-emerald-100 bg-emerald-50 text-emerald-600'
  if (position === 'LEAD') return 'border border-red-100 bg-red-50 text-red-600'
  if (position === 'CO') return 'border border-gray-200 bg-gray-100 text-gray-600'

  return 'border border-blue-100 bg-blue-50 text-blue-600'
}

export function formatConnectionTime(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

export function formatVoiceChatTime(value: Date) {
  const hours = value.getHours()
  const minutes = String(value.getMinutes()).padStart(2, '0')
  const period = hours >= 12 ? '오후' : '오전'
  const displayHour = hours % 12 || 12

  return `${period} ${displayHour}:${minutes}`
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function liveMediaTracks(stream: MediaStream | null, kind: 'audio' | 'video') {
  return stream?.getTracks().filter((track) => track.kind === kind && track.readyState === 'live') ?? []
}

export function setMediaTrackEnabled(stream: MediaStream | null, kind: 'audio' | 'video', enabled: boolean) {
  liveMediaTracks(stream, kind).forEach((track) => {
    track.enabled = enabled
  })
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export async function measureBrowserPing() {
  const start = performance.now()
  await fetch(`${window.location.origin}/?voicePing=${Date.now()}`, { method: 'HEAD', cache: 'no-store' })

  return Math.max(1, Math.round(performance.now() - start))
}

export function priorityBadgeLabel(priority?: TaskPriority | null) {
  if (priority === 'HIGH') return '긴급'
  if (priority === 'LOW') return '낮음'

  return '보통'
}
