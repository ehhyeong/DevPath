import { aiWorkspacePageHref } from './ai-workspace-navigation'
import { apiTaskReference } from './api-workspace-links'
import type { WorkspaceTask } from './dashboard-types'

type Props = {
  workspaceId: number | null
  features: string[]
  featureIds?: string[]
  tasks: WorkspaceTask[]
}

const taskTones = {
  TODO: 'border-gray-200 bg-gray-50 text-gray-600',
  IN_PROGRESS: 'border-blue-100 bg-blue-50 text-blue-700',
  IN_REVIEW: 'border-purple-100 bg-purple-50 text-purple-700',
  DONE: 'border-green-100 bg-green-50 text-green-700',
}

export default function MvpFeatureProgress({ workspaceId, features, featureIds, tasks }: Props) {
  const boardHref = aiWorkspacePageHref('/squad-workspace', workspaceId)
  return <section aria-label="MVP 검증 기능 진행률" className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-star text-yellow-500" />MVP 검증 기능 진행률</h3>
      <a href={`${aiWorkspacePageHref('/squad-blueprint', workspaceId)}#scenario`} className="shrink-0 text-[10px] font-bold text-teal-700">기획 &amp; 시나리오 →</a>
    </div>
    <p className="mb-5 text-[10px] text-gray-500">팀 전체 · 기능별 완료 작업 / 연결 작업 기준</p>
    <div className="space-y-4">{features.map((feature, index) => {
      const id = featureIds?.[index] ?? `F${index + 1}`
      const linkedTasks = tasks.filter((task) => task.featureIds?.includes(id))
      const completed = linkedTasks.filter((task) => task.status === 'DONE').length
      // 복수 기능에 연결된 카드도 각 기능에서 한 번만 세며 완료 상태만 분자에 포함한다.
      const progress = linkedTasks.length ? Math.round(completed / linkedTasks.length * 100) : 0
      return <div key={id}>
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <p className="text-xs font-bold text-gray-700">{id}. {feature}</p>
          {linkedTasks.length ? <span className={`shrink-0 text-xs font-extrabold ${progress === 100 ? 'text-brand' : 'text-gray-700'}`}>{progress}%</span> : null}
        </div>
        {linkedTasks.length ? <>
          <p className="text-[10px] text-gray-500">완료 {completed} / 연결 작업 {linkedTasks.length}개</p>
          <div role="progressbar" aria-label={`${id}. ${feature}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} /></div>
          <div className="mt-2 flex flex-wrap gap-1.5">{linkedTasks.map((task) => <a key={task.taskId} href={`${boardHref}#${apiTaskReference(task.taskId)}`} title={task.title} className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${taskTones[task.status]}`}>{apiTaskReference(task.taskId)} · {task.title}</a>)}</div>
        </> : <a href={boardHref} className="text-[10px] text-gray-400 hover:text-brand">작업 연결 전 · 작업 현황판에서 연결하기 →</a>}
      </div>
    })}</div>
  </section>
}
