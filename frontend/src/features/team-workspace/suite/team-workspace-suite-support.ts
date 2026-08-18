import { KANBAN_COLUMNS } from './constants'
import { TEAM_WORKSPACE_PAGE_META } from './nav'
import type { ArchitectureApiEndpoint,CalendarEvent,DocForm,MeetingNote,QuestionContextSelection,QuestionDetail,QuestionSummary,SuiteData,TaskStatus,WorkspaceFile } from './types'
import { formatDate,formatTime,parseDate } from './utils'


export const PAGE_META = TEAM_WORKSPACE_PAGE_META

export const DEFAULT_DATA: SuiteData = {
  dashboard: null,
  tasks: [],
  files: [],
  storage: null,
  questions: [],
  events: [],
  apiSpec: null,
  erdDoc: null,
  infraDoc: null,
  notes: [],
  activities: [],
  voiceChannels: [],
}

export function taskStatusTitle(status: TaskStatus) {
  return KANBAN_COLUMNS.find((column) => column.key === status)?.title ?? status
}

export function workspaceFileName(file: WorkspaceFile) {
  return file.displayName || file.originalFileName || `파일 #${file.fileId}`
}

export function isQuestionResolved(question: QuestionSummary | QuestionDetail) {
  const detailAnswers = 'answers' in question ? question.answers : undefined

  return Boolean(question.adoptedAnswerId) || Boolean(detailAnswers?.some((answer) => answer.adopted))
}

export function questionUiStatus(question: QuestionSummary | QuestionDetail) {
  const detailAnswers = 'answers' in question ? question.answers : undefined

  if (isQuestionResolved(question)) return 'resolved'
  if (question.qnaStatus === 'ANSWERED' || question.answerCount > 0 || (detailAnswers?.length ?? 0) > 0) return 'done'

  return 'wait'
}

export function fileIcon(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return 'fa-link text-indigo-500'
  if (file.itemType === 'FOLDER') return 'fa-folder text-yellow-500'
  if (file.contentType?.includes('image')) return 'fa-file-image text-blue-500'
  if (file.contentType?.includes('pdf')) return 'fa-file-pdf text-red-500'
  if (file.contentType?.includes('zip')) return 'fa-file-archive text-purple-500'

  return 'fa-file-lines text-gray-500'
}

export function fileSourceIcon(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return { icon: 'fa-link', color: 'text-gray-600', format: 'LINK' }
  if (file.contentType?.includes('pdf')) return { icon: 'fa-file-pdf', color: 'text-red-500', format: 'PDF' }
  if (file.contentType?.includes('zip')) return { icon: 'fa-file-archive', color: 'text-yellow-600', format: 'ZIP' }
  if (file.contentType?.includes('image')) return { icon: 'fa-file-image', color: 'text-blue-500', format: 'IMG' }

  return { icon: file.itemType === 'FOLDER' ? 'fa-folder' : 'fa-file-lines', color: file.itemType === 'FOLDER' ? 'text-yellow-600' : 'text-gray-600', format: file.itemType === 'FOLDER' ? 'DIR' : 'DOC' }
}

export function questionSourceStatus(question: QuestionSummary) {
  const status = questionUiStatus(question)

  if (status === 'resolved') {
    return {
      label: '해결됨',
      className: 'bg-green-50 text-green-600 border-green-200',
      icon: 'fa-check-circle',
      cardClassName: 'resolved',
    }
  }

  if (status === 'done') {
    return {
      label: '답변 완료',
      className: 'bg-blue-50 text-blue-600 border-blue-200',
      icon: 'fa-comment-dots',
      cardClassName: 'done',
    }
  }

  return {
    label: '답변 대기',
    className: 'bg-red-50 text-red-500 border-red-200',
    icon: 'fa-hourglass-half',
    cardClassName: 'wait',
  }
}

export function questionSourceTags(question: QuestionSummary) {
  const tags: string[] = []

  if (question.templateType === 'IMPLEMENTATION') tags.push('Frontend')
  if (question.templateType === 'CODE_REVIEW') tags.push('Backend')
  if (question.templateType === 'DEBUGGING') tags.push('에러/버그')
  if (question.templateType === 'PROJECT') tags.push('기획/설계')

  if (tags.length === 0) return ['Frontend']

  return tags
}

export function templateTypeFromQuestionTags(tags: string[]) {
  if (tags.includes('에러/버그')) return 'DEBUGGING'
  if (tags.includes('Backend')) return 'CODE_REVIEW'
  if (tags.includes('Frontend')) return 'IMPLEMENTATION'

  return 'PROJECT'
}

export function buildQuestionContent(content: string, contexts: QuestionContextSelection[]) {
  const trimmedContent = content.trim()

  if (contexts.length === 0) return trimmedContent

  const contextLines = contexts.map((context) => `- ${context.label}: ${context.description}`)

  return `${trimmedContent}\n\n---\n관련 컨텍스트\n${contextLines.join('\n')}`
}

export function parseQuestionContent(content?: string | null) {
  const normalized = content?.trim() ?? ''
  const marker = '\n---\n관련 컨텍스트\n'
  const markerIndex = normalized.indexOf(marker)

  if (markerIndex < 0) {
    return { body: normalized, contexts: [] as string[] }
  }

  return {
    body: normalized.slice(0, markerIndex).trim(),
    contexts: normalized
      .slice(markerIndex + marker.length)
      .split('\n')
      .map((line) => line.trim().replace(/^- /, ''))
      .filter(Boolean),
  }
}

export function eventSourceType(event?: CalendarEvent | null) {
  const text = `${event?.title ?? ''} ${event?.description ?? ''}`.toLowerCase()
  const type = event?.description?.match(/^\[team-schedule-type:(scrum|deadline|vacation)\]/)?.[1]

  if (type === 'deadline') {
    return { kind: 'deadline', label: '내부 마감일', dot: 'bg-orange-500', badge: 'bg-orange-500', shell: 'bg-orange-50/50 border-orange-100' }
  }
  if (/(mentor|멘토|공식|밋업|라이브)/i.test(text)) {
    return { kind: 'official', label: '멘토 공식 일정', dot: 'bg-purple-500', badge: 'bg-purple-500', shell: 'bg-purple-50/50 border-purple-100' }
  }
  if (/(deadline|마감|제출|due)/i.test(text)) {
    return { kind: 'deadline', label: '내부 마감일', dot: 'bg-orange-500', badge: 'bg-orange-500', shell: 'bg-orange-50/50 border-orange-100' }
  }

  return { kind: 'team', label: '팀 스크럼', dot: 'bg-blue-500', badge: 'bg-blue-500', shell: 'bg-blue-50/50 border-blue-100' }
}

export function stripTeamScheduleType(value?: string | null) {
  return (value ?? '').replace(/^\[team-schedule-type:(scrum|deadline|vacation)\]\n?/, '').trim()
}

export function buildTeamScheduleDescription(type: string, description: string) {
  return `[team-schedule-type:${type}]\n${description.trim()}`.trim()
}

export function isUpcomingScheduleEvent(event: CalendarEvent) {
  const date = parseDate(event.startAt)
  if (!date) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date.getTime() >= today.getTime()
}

export function scheduleEventTooltip(event: CalendarEvent) {
  const description = stripTeamScheduleType(event.description)
  const parts = [
    event.title,
    `${formatDate(event.startAt)} ${formatTime(event.startAt)}`,
    description,
  ].filter(Boolean)

  return parts.join('\n')
}

export function scheduleEventTime(event: CalendarEvent) {
  return parseDate(event.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
}

export function sortScheduleSidebarEvents(events: CalendarEvent[], pinnedEventIds: number[]) {
  const pinnedIds = new Set(pinnedEventIds)

  return [...events].sort((left, right) => {
    const leftPinned = pinnedIds.has(left.eventId)
    const rightPinned = pinnedIds.has(right.eventId)

    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1

    const leftUpcoming = isUpcomingScheduleEvent(left)
    const rightUpcoming = isUpcomingScheduleEvent(right)

    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1

    const leftTime = scheduleEventTime(left)
    const rightTime = scheduleEventTime(right)

    return leftUpcoming ? leftTime - rightTime : rightTime - leftTime
  })
}

export function isOfficialLiveEvent(event?: CalendarEvent | null) {
  const text = `${event?.title ?? ''} ${event?.description ?? ''}`.toLowerCase()

  return /(mentor|멘토|공식|밋업|라이브|live|meetup)/i.test(text)
}

export function meetingNoteKind(note: MeetingNote) {
  const text = `${note.title ?? ''} ${note.content ?? ''}`.toLowerCase()

  return /(mentor|멘토|공식|피드백|밋업)/i.test(text) ? 'mentor' : 'team'
}

export function formatMeetingNoteDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '날짜 미정'

  return `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${`${date.getDate()}`.padStart(2, '0')}`
}

export function meetingNoteSummary(note: MeetingNote) {
  const text = (note.content || '회의록 내용이 없습니다.').trim()

  return text.length > 80 ? `${text.slice(0, 80)}...` : text
}

export function appendQueryParam(href: string, key: string, value?: string | number | null) {
  if (value == null || value === '') return href

  return `${href}${href.includes('?') ? '&' : '?'}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
}

export function extractFirstUrl(content?: string | null) {
  return content?.match(/https?:\/\/[^\s)]+/)?.[0] ?? null
}

export function stripMarkdownHeading(content?: string | null) {
  return (content ?? '').replace(/^# .+?\n\n/s, '').trim()
}

export function architectureDocTitle(content: string | null | undefined, fallback: string) {
  const heading = content?.match(/^#\s+(.+)$/m)?.[1]?.trim()

  return heading || fallback
}

export function apiMethodClass(method: string) {
  const normalized = method.toUpperCase()

  if (normalized === 'GET') return 'bg-blue-50 text-blue-600 border-blue-200'
  if (normalized === 'POST') return 'bg-green-50 text-green-600 border-green-200'
  if (normalized === 'DELETE') return 'bg-red-50 text-red-600 border-red-200'

  return 'bg-orange-50 text-orange-600 border-orange-200'
}

export function apiStatusMeta(status: string) {
  if (/완료|done|complete/i.test(status)) {
    return { label: status || '개발 완료', className: 'bg-green-50 text-green-600', icon: 'fa-check' }
  }

  if (/연동|진행|progress|working/i.test(status)) {
    return { label: status || '프론트 연동 중', className: 'bg-yellow-50 text-yellow-600', icon: 'fa-spinner' }
  }

  return { label: status || '설계 중', className: 'bg-gray-100 text-gray-500', icon: null }
}

export function parseArchitectureApiEndpoints(content?: string | null): ArchitectureApiEndpoint[] {
  if (!content?.trim()) return []

  return content
    .split('\n')
    .map((line) => line.trim().replace(/^[-*]\s*/, ''))
    .map<ArchitectureApiEndpoint | null>((line, index) => {
      const columns = line.split('|').map((part) => part.trim())
      const firstColumn = columns[0] ?? ''
      const match = firstColumn.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/i)

      if (!match) return null

      return {
        id: `${index}-${match[1]}-${match[2]}`,
        sourceIndex: index,
        method: match[1].toUpperCase(),
        endpoint: match[2],
        description: columns[1] || '설명이 등록되지 않았습니다.',
        status: columns[2] || '설계 중',
        owner: columns[3] || '담당자 미정',
        request: columns[4] || undefined,
        response: columns[5] || undefined,
      } satisfies ArchitectureApiEndpoint
    })
    .filter((endpoint): endpoint is ArchitectureApiEndpoint => endpoint !== null)
}

export function buildApiEndpointLine(form: DocForm) {
  return [
    `${form.method.toUpperCase()} ${form.endpoint.trim()}`,
    form.content.trim(),
    form.status.trim() || '설계 중',
    form.owner.trim() || '담당자 미정',
    form.request.trim(),
    form.response.trim(),
  ].filter((part) => part.length > 0).join(' | ')
}

export function toLocalDateTime(date: string, time: string) {
  return `${date}T${time || '09:00'}:00`
}

export function addMinutes(localDateTime: string, minutes: number) {
  const date = new Date(localDateTime)
  if (Number.isNaN(date.getTime())) return localDateTime

  date.setMinutes(date.getMinutes() + minutes)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

export function todayDateInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}
