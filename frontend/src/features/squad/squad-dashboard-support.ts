import type { Notice, WorkspaceStatus } from './dashboard-types'

export function copyDocumentPictureInPictureStyles(pipWindow: Window) {
  const baseStyle = pipWindow.document.createElement('style')
  baseStyle.textContent = `
    html, body, #squad-dashboard-pip-root {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
    }

    body {
      background: #F8F9FA;
      font-family: 'Pretendard', sans-serif;
    }
  `
  pipWindow.document.head.appendChild(baseStyle)

  Array.from(document.styleSheets).forEach((styleSheet) => {
    if (styleSheet.href) {
      const link = pipWindow.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = styleSheet.href
      link.media = styleSheet.media.mediaText
      pipWindow.document.head.appendChild(link)
      return
    }

    try {
      const rules = Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join('\n')
      const style = pipWindow.document.createElement('style')
      style.textContent = rules
      pipWindow.document.head.appendChild(style)
    } catch {
      // Cross-origin or browser-managed inline styles can be skipped safely.
    }
  })
}

export function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function formatShortDate(value?: string | null) {
  if (!value) return '방금 전'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '방금 전'
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffHours < 1) return '방금 전'
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays === 1) return '어제'
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export function formatChatTime(value?: string | null) {
  const parsed = value ? new Date(value) : new Date()
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

export function formatEventMonth(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Now' : date.toLocaleString('en-US', { month: 'short' })
}

export function formatEventDay(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : String(date.getDate())
}

export function getDday(value: string) {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return 'D-?'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
  return diff <= 0 ? 'D-Day' : `D-${diff}`
}

export function stripScheduleCategoryDescription(value?: string | null) {
  return (value ?? '').replace(/^\[schedule-category:(milestone|meeting|task-fe|task-be)\]\n?/, '').trim()
}

export function stripNoticePrefix(title: string) {
  return title.replace(/^\[필독]\s*/, '')
}

export function isImportantNotice(notice: Notice, index: number) {
  return notice.title.startsWith('[필독]') || index === 0
}

export function percent(count: number, total: number) {
  return total <= 0 ? 0 : Math.max(8, Math.round((count / total) * 100))
}

export function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

export function activityIcon(type?: string | null) {
  switch (type) {
    case 'TASK_CREATED': return { icon: 'fa-tasks', className: 'bg-blue-50 text-blue-500' }
    case 'FILE_UPLOADED': return { icon: 'fa-folder-open', className: 'bg-purple-50 text-purple-500' }
    case 'MEETING_NOTE_CREATED': return { icon: 'fa-headset', className: 'bg-orange-50 text-orange-500' }
    case 'MEMBER_JOINED': return { icon: 'fa-user-plus', className: 'bg-brand/10 text-brand' }
    default: return { icon: 'fa-check', className: 'bg-brand/10 text-brand' }
  }
}

export function activityFallback(type?: string | null) {
  switch (type) {
    case 'TASK_CREATED': return '새 작업 카드가 생성되었습니다.'
    case 'FILE_UPLOADED': return '새 팀 자료가 업로드되었습니다.'
    case 'DOC_UPDATED': return '문서가 업데이트되었습니다.'
    case 'MEETING_NOTE_CREATED': return '회의록이 작성되었습니다.'
    case 'MILESTONE_CREATED': return '새 마일스톤이 생성되었습니다.'
    case 'MEMBER_JOINED': return '새 팀원이 합류했습니다.'
    default: return '팀 활동이 기록되었습니다.'
  }
}

export function statusLabel(status?: WorkspaceStatus | null) {
  return status === 'ARCHIVED' ? '완료' : '진행 중'
}

export function readSidebarPinned() {
  return typeof window !== 'undefined' && window.localStorage.getItem('sidebarPinned') === 'true'
}

export function storeSidebarPinned(value: boolean) {
  window.localStorage.setItem('sidebarPinned', value ? 'true' : 'false')
}
