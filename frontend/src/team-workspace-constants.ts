import type { TaskStatus } from './team-workspace-types'

export const ROLE_FILTERS = ['전체 보기', '내 작업', 'Frontend', 'Backend']
export const QUESTION_STATUS_FILTERS = ['전체', '답변 대기', '답변 완료', '해결됨']
export const QUESTION_TAGS = ['전체', 'Frontend', 'Backend', '에러/버그', '기획/설계']
export const QUESTION_ASK_TAGS = ['Frontend', 'Backend', '에러/버그', '기획/설계']
export const KANBAN_COLUMNS: Array<{
  key: TaskStatus
  title: string
  shellClassName: string
  headerClassName: string
  titleClassName: string
  countClassName: string
  dotClassName: string
}> = [
  {
    key: 'TODO',
    title: '할 일 (To Do)',
    shellClassName: 'border-gray-200 bg-gray-100/50',
    headerClassName: 'border-gray-200',
    titleClassName: 'text-gray-800',
    countClassName: 'border-gray-200 text-gray-500',
    dotClassName: 'bg-gray-400',
  },
  {
    key: 'IN_PROGRESS',
    title: '진행 중 (In Progress)',
    shellClassName: 'border-blue-100 bg-blue-50/30',
    headerClassName: 'border-blue-100',
    titleClassName: 'text-blue-800',
    countClassName: 'border-blue-200 text-blue-600 shadow-sm',
    dotClassName: 'bg-blue-500',
  },
  {
    key: 'IN_REVIEW',
    title: '리뷰 대기 (In Review)',
    shellClassName: 'border-yellow-100 bg-yellow-50/30',
    headerClassName: 'border-yellow-100',
    titleClassName: 'text-yellow-800',
    countClassName: 'border-yellow-200 text-yellow-600 shadow-sm',
    dotClassName: 'bg-yellow-500',
  },
  {
    key: 'DONE',
    title: '완료 (Done)',
    shellClassName: 'border-green-100 bg-green-50/30',
    headerClassName: 'border-green-100',
    titleClassName: 'text-green-800',
    countClassName: 'border-green-200 text-green-600 shadow-sm',
    dotClassName: 'bg-green-500',
  },
]
