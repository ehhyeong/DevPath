/* eslint-disable react-refresh/only-export-components */
import { TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME } from './suite/constants'
import type { Milestone,WorkspaceTask } from './suite/types'

type RoleKey = 'frontend' | 'backend' | 'design' | 'planning'
type SubmissionStatus = 'none' | 'wait' | 'pass'

type ParsedMilestoneFeedbackEntry = {
  speaker: 'mentor' | 'learner'
  time: string
  text: string
}

type TeamStatusView = {
  id: number
  name: string
  roleKey: RoleKey
  roleLabel: string
  seed: string
  profileImage?: string | null
  status: 'pass' | 'wait' | 'working' | 'none'
}

export const WEEK_COUNT = 4
export const KANBAN_ROLE_MARKER = '\n\n---DEVPATH_KANBAN_ROLE---\n'
export const MILESTONE_FEEDBACK_MARKER = '\n\n---DEVPATH_MILESTONE_FEEDBACK---\n'

export const ROLE_META: Record<RoleKey, {
  label: string
  shortLabel: string
  seed: string
  keywords: string[]
  roleBadgeClass: string
  missionBadgeClass: string
  teamBadgeClass: string
}> = {
  frontend: {
    label: 'Frontend',
    shortLabel: 'FE',
    seed: 'Taehyeong',
    keywords: ['frontend', 'front', 'react', 'next', 'vue', 'ui', '화면', '프론트'],
    roleBadgeClass: 'text-blue-600 bg-blue-50 border-blue-100',
    missionBadgeClass: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    teamBadgeClass: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  backend: {
    label: 'Backend',
    shortLabel: 'BE',
    seed: 'John',
    keywords: ['backend', 'back', 'api', 'server', 'spring', 'jpa', 'db', '서버', '백엔드'],
    roleBadgeClass: 'text-purple-600 bg-purple-50 border-purple-100',
    missionBadgeClass: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    teamBadgeClass: 'text-purple-600 bg-purple-50 border-purple-100',
  },
  design: {
    label: 'Designer',
    shortLabel: 'UX/UI',
    seed: 'Sarah',
    keywords: ['design', 'figma', 'wireframe', 'prototype', '디자인', '와이어프레임'],
    roleBadgeClass: 'text-pink-600 bg-pink-50 border-pink-100',
    missionBadgeClass: 'bg-pink-500/20 border-pink-500/50 text-pink-300',
    teamBadgeClass: 'text-pink-600 bg-pink-50 border-pink-100',
  },
  planning: {
    label: 'Planning',
    shortLabel: 'PM',
    seed: 'Mike',
    keywords: ['plan', 'docs', 'document', '기획', '문서', '요구사항', '회의'],
    roleBadgeClass: 'text-orange-600 bg-orange-50 border-orange-100',
    missionBadgeClass: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
    teamBadgeClass: 'text-orange-600 bg-orange-50 border-orange-100',
  },
}

export const DEFAULT_MEMBER_ROLES: RoleKey[] = ['frontend', 'backend', 'backend', 'design']

export function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatShortDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '일정 미정'

  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
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

export function roleKeyForText(text: string): RoleKey {
  const normalized = text.toLowerCase()
  const matched = (Object.keys(ROLE_META) as RoleKey[]).find((key) =>
    ROLE_META[key].keywords.some((keyword) => normalized.includes(keyword)),
  )

  return matched ?? 'planning'
}

export function roleKeyForTask(task: WorkspaceTask) {
  return roleKeyForText(`${task.title} ${task.description ?? ''}`)
}

export function roleKeyForMember(index: number) {
  return DEFAULT_MEMBER_ROLES[index] ?? 'planning'
}

export function tabSuffix(title?: string | null) {
  if (!title) return ''
  if (/(기획|설계|와이어|요구사항)/i.test(title)) return ' (기획/설계)'
  if (/(mvp|개발|구현|초기)/i.test(title)) return ' (MVP 개발)'
  if (/(고도화|개선|피드백|리팩토링)/i.test(title)) return ' (고도화)'
  if (/(배포|테스트|qa|출시)/i.test(title)) return ' (배포)'

  const compact = title.replace(/[()[\]]/g, '').trim().split(/\s+/).slice(0, 2).join(' ')
  return compact ? ` (${compact.slice(0, 8)})` : ''
}

export function isClosedMilestone(milestone: Milestone) {
  return milestone.status === 'DONE' || milestone.status === 'CLOSED'
}

export function isTaskInWeek(task: WorkspaceTask, milestone: Milestone | undefined) {
  if (!milestone) return true
  if (!task.dueDate) return false

  const dueDate = parseDate(task.dueDate)
  const startDate = parseDate(milestone.startDate)
  const endDate = parseDate(milestone.dueDate)

  if (!dueDate) return false
  if (startDate && dueDate < startDate) return false
  if (endDate && dueDate > endDate) return false

  return true
}

export function submissionStatus(tasks: WorkspaceTask[]): SubmissionStatus {
  if (tasks.length === 0) return 'none'
  if (tasks.every((task) => task.status === 'DONE')) return 'pass'
  if (tasks.some((task) => task.status === 'IN_PROGRESS' || task.status === 'DONE')) return 'wait'

  return 'none'
}

export function teamTaskStatus(tasks: WorkspaceTask[]): TeamStatusView['status'] {
  if (tasks.length === 0) return 'none'
  if (tasks.every((task) => task.status === 'DONE')) return 'pass'
  if (tasks.some((task) => task.status === 'IN_PROGRESS')) return 'working'
  if (tasks.some((task) => task.status === 'DONE')) return 'wait'

  return 'none'
}

export function findSubmissionLink(description?: string | null) {
  const matched = description?.match(/https?:\/\/\S+/)
  return matched?.[0] ?? ''
}

export function parseMilestoneTaskFeedbackDescription(description?: string | null) {
  const [beforeFeedback, feedbackMeta] = (description ?? '').split(MILESTONE_FEEDBACK_MARKER)
  const visibleDescription = beforeFeedback.split(KANBAN_ROLE_MARKER)[0].trim()
  const feedback = (feedbackMeta ?? '')
    .split('\n')
    .map((line, index) => {
      const [speakerRaw, , timeRaw, ...textParts] = line.split('|')
      const text = textParts.join('|').trim()
      if (!text) return null

      return {
        speaker: speakerRaw?.trim() === 'mentor' ? 'mentor' : 'learner',
        time: timeRaw?.trim() || `${index + 1}번째 코멘트`,
        text,
      } satisfies ParsedMilestoneFeedbackEntry
    })
    .filter((entry): entry is ParsedMilestoneFeedbackEntry => Boolean(entry))

  return { description: visibleDescription, feedback }
}

export function buildSubmissionDescription(task: WorkspaceTask | null, link: string, comment: string) {
  const base = parseMilestoneTaskFeedbackDescription(task?.description).description
  const sections = base ? [base] : []

  sections.push(`[제출 링크]\n${link}`)

  if (comment.trim()) {
    sections.push(`[제출 코멘트]\n${comment.trim()}`)
  }

  return sections.join('\n\n')
}

export function sortedMilestones(milestones: Milestone[]) {
  return [...milestones].sort((left, right) => {
    const leftTime = parseDate(left.dueDate ?? left.createdAt)?.getTime() ?? 0
    const rightTime = parseDate(right.dueDate ?? right.createdAt)?.getTime() ?? 0

    return leftTime - rightTime
  })
}

export function sortedTasks(tasks: WorkspaceTask[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = parseDate(left.dueDate ?? left.createdAt)?.getTime() ?? 0
    const rightTime = parseDate(right.dueDate ?? right.createdAt)?.getTime() ?? 0

    return leftTime - rightTime
  })
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className={`${TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME} team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800`}>
      <div className="team-ws-card w-[420px] border border-gray-100 bg-white p-8 text-center shadow-sm">
        <i className="fas fa-circle-exclamation mb-3 text-3xl text-red-400"></i>
        <h1 className="text-xl font-black text-gray-900">팀 마일스톤을 열 수 없습니다</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-gray-500">{message}</p>
        <a
          href="/workspace-hub"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-gray-900 px-5 text-sm font-black text-white hover:bg-black"
        >
          워크스페이스 허브로 이동
        </a>
      </div>
    </div>
  )
}
