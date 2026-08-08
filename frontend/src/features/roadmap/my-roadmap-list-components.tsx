import { useState,type FormEvent,type ReactNode } from 'react'
import type { MyRoadmapSummary,RoadmapNodeItem } from '../../types/roadmap'
import { progressOf } from './my-roadmap-list-support'

export type NextLearningNode = Pick<RoadmapNodeItem, 'customNodeId' | 'title'> | null
export type RoadmapDetailPreview = {
  nextNode: NextLearningNode
  progressRate: number
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function nextModuleLabel(roadmap: MyRoadmapSummary): string {
  return roadmap.isBuilderOrigin ? '커스텀 노드 이어가기' : '다음 학습 모듈'
}

function buildRoadmapUrl(customRoadmapId: number, nodeId?: number) {
  const params = new URLSearchParams({ id: String(customRoadmapId) })
  if (nodeId) params.set('nodeId', String(nodeId))
  return `/roadmap?${params.toString()}`
}

function activityDate(roadmap: MyRoadmapSummary): string | null | undefined {
  return roadmap.lastStudiedAt ?? roadmap.updatedAt ?? roadmap.createdAt
}

export function StatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: string
  iconClass: string
  label: string
  value: number
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)]">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-lg ${iconClass}`}>
        <i className={icon} />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-gray-900">{value}개</p>
      </div>
    </div>
  )
}

export function Dropdown({
  id,
  openMenuId,
  onToggle,
  children,
}: {
  id: string
  openMenuId: string | null
  onToggle: () => void
  children: ReactNode
}) {
  const isOpen = openMenuId === id

  return (
    <div className="relative" data-roadmap-dropdown="true" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggle()
        }}
        className="my-roadmap-menu-button"
        aria-label="로드맵 메뉴 열기"
      >
        <i className="fas fa-ellipsis-v pointer-events-none" />
      </button>
      {isOpen ? (
        <div className="my-roadmap-menu-panel">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: string
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className={`my-roadmap-menu-item${danger ? ' my-roadmap-menu-item--danger' : ''}`}
    >
      <i className={icon} />
      {label}
    </button>
  )
}

export function LearningCard({
  roadmap,
  preview,
  openMenuId,
  setOpenMenuId,
  onDetail,
  onDelete,
}: {
  roadmap: MyRoadmapSummary
  preview: RoadmapDetailPreview | undefined
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onDetail: (roadmap: MyRoadmapSummary, typeLabel: string) => void
  onDelete: (roadmap: MyRoadmapSummary, label: string) => void
}) {
  const pct = preview ? clampProgress(preview.progressRate) : progressOf(roadmap)
  const typeLabel = roadmap.isBuilderOrigin ? '나만의 로드맵' : '공식 로드맵'
  const menuId = `learning-${roadmap.customRoadmapId}`
  const nextNodeTitle = preview === undefined ? '다음 학습 노드를 확인하는 중' : preview.nextNode?.title ?? '다음 학습 노드 없음'
  const showNextTitleTooltip = nextNodeTitle.length > 18
  const continueHref = buildRoadmapUrl(roadmap.customRoadmapId, preview?.nextNode?.customNodeId)

  return (
    <div className="my-roadmap-fixed-card">
      <div className="my-roadmap-card-header">
        <span className={`my-roadmap-card-badge ${roadmap.isBuilderOrigin ? 'my-roadmap-card-badge--custom' : 'my-roadmap-card-badge--official'}`}>
          {typeLabel}
        </span>
        <Dropdown id={menuId} openMenuId={openMenuId} onToggle={() => setOpenMenuId(openMenuId === menuId ? null : menuId)}>
          <DropdownButton icon="fas fa-info-circle" label="상세 정보" onClick={() => {
            setOpenMenuId(null)
            onDetail(roadmap, typeLabel)
          }} />
          <div className="my-roadmap-menu-divider" />
          <DropdownButton icon="fas fa-times-circle" label="수강 포기" danger onClick={() => {
            setOpenMenuId(null)
            onDelete(roadmap, '수강 포기')
          }} />
        </Dropdown>
      </div>
      <h3 className="my-roadmap-card-title">
        {roadmap.title}
      </h3>

      <div className="my-roadmap-card-body">
        <div className="my-roadmap-progress-row">
          <span className="my-roadmap-progress-label">진행률</span>
          <span className="my-roadmap-progress-value">{pct}%</span>
        </div>
        <div className="my-roadmap-progress-track">
          <div className="my-roadmap-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="my-roadmap-next-box">
          <p className="my-roadmap-next-label">{nextModuleLabel(roadmap)}</p>
          <div
            className={`my-roadmap-next-title-shell${showNextTitleTooltip ? ' my-roadmap-next-title-shell--tooltip' : ''}`}
            data-tooltip={showNextTitleTooltip ? nextNodeTitle : undefined}
            title={showNextTitleTooltip ? nextNodeTitle : undefined}
          >
            <p className="my-roadmap-next-title">
              <i className="fas fa-play-circle" />
              {nextNodeTitle}
            </p>
          </div>
        </div>
        <a href={continueHref} className="my-roadmap-card-action">
          이어서 학습
        </a>
      </div>
    </div>
  )
}

export function CreatedCard({
  roadmap,
  openMenuId,
  setOpenMenuId,
  onDetail,
  onDelete,
}: {
  roadmap: MyRoadmapSummary
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onDetail: (roadmap: MyRoadmapSummary, typeLabel: string) => void
  onDelete: (roadmap: MyRoadmapSummary, label: string) => void
}) {
  const menuId = `created-${roadmap.customRoadmapId}`
  const editHref = roadmap.builderRoadmapId ? `/my-roadmap?edit=${roadmap.builderRoadmapId}` : '/my-roadmap'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col h-full relative group">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-t-2xl" />
      <div className="flex justify-between items-start mb-3 mt-1">
        <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2 py-1 rounded border border-indigo-200">
          내 커스텀
        </span>
        <Dropdown id={menuId} openMenuId={openMenuId} onToggle={() => setOpenMenuId(openMenuId === menuId ? null : menuId)}>
          <DropdownButton icon="fas fa-info-circle" label="상세 정보" onClick={() => {
            setOpenMenuId(null)
            onDetail(roadmap, '내 커스텀')
          }} />
          <div className="my-roadmap-menu-divider" />
          <DropdownButton icon="fas fa-trash-alt" label="삭제하기" danger onClick={() => {
            setOpenMenuId(null)
            onDelete(roadmap, '삭제하기')
          }} />
        </Dropdown>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-6 leading-tight line-clamp-2">{roadmap.title}</h3>
      <div className="mt-auto">
        <a href={editHref} className="block w-full py-2.5 bg-brand hover:bg-[#00A35E] text-white text-sm font-bold rounded-xl shadow-sm transition-colors text-center">
          로드맵 편집하기
        </a>
      </div>
    </div>
  )
}

export function CompletedCard({
  roadmap,
  openMenuId,
  setOpenMenuId,
  onDetail,
  onDelete,
}: {
  roadmap: MyRoadmapSummary
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onDetail: (roadmap: MyRoadmapSummary, typeLabel: string) => void
  onDelete: (roadmap: MyRoadmapSummary, label: string) => void
}) {
  const menuId = `completed-${roadmap.customRoadmapId}`

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full group relative opacity-90 hover:opacity-100 transition-opacity">
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-400 rounded-t-2xl" />
      <div className="flex justify-between items-start mb-3 mt-1">
        <span className="bg-gray-200 text-gray-700 text-[11px] font-bold px-2 py-1 rounded border border-gray-300 flex items-center gap-1">
          <i className="fas fa-check-circle" />
          수강 완료
        </span>
        <Dropdown id={menuId} openMenuId={openMenuId} onToggle={() => setOpenMenuId(openMenuId === menuId ? null : menuId)}>
          <DropdownButton icon="fas fa-info-circle" label="상세 정보" onClick={() => {
            setOpenMenuId(null)
            onDetail(roadmap, '수강 완료')
          }} />
          <div className="my-roadmap-menu-divider" />
          <DropdownButton icon="fas fa-trash-alt" label="목록에서 삭제" danger onClick={() => {
            setOpenMenuId(null)
            onDelete(roadmap, '목록에서 삭제')
          }} />
        </Dropdown>
      </div>
      <h3 className="text-lg font-bold text-gray-500 mb-6 leading-tight line-through decoration-gray-300">{roadmap.title}</h3>
      <div className="mt-auto">
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
          <div className="bg-gray-400 h-2 rounded-full" style={{ width: '100%' }} />
        </div>
        <div className="bg-white rounded-lg p-2.5 mb-4 border border-gray-200 text-center">
          <p className="text-xs font-semibold text-gray-500">
            <i className="fas fa-calendar-check mr-1" />
            {formatDate(activityDate(roadmap))} 마스터 완료
          </p>
        </div>
        <a href={buildRoadmapUrl(roadmap.customRoadmapId)} className="block w-full py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl border border-gray-300 shadow-sm transition-all text-center">
          다시 복습하기
        </a>
      </div>
    </div>
  )
}

export function FindRoadmapCard() {
  return (
    <a href="/roadmap-hub" className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand hover:bg-gray-50 transition-all duration-300 p-5 flex flex-col items-center justify-center text-center h-full min-h-[280px] group outline-none">
      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <i className="fas fa-search text-xl text-gray-400 group-hover:text-brand transition-colors" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">새로운 로드맵 찾기</h3>
    </a>
  )
}

export function NewCustomRoadmapCard() {
  return (
    <a href="/my-roadmap" className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand hover:bg-gray-50 transition-all duration-300 p-5 flex flex-col items-center justify-center text-center h-full min-h-[280px] group outline-none">
      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <i className="fas fa-plus text-xl text-gray-400 group-hover:text-brand transition-colors" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">새 커스텀 로드맵</h3>
    </a>
  )
}

export function EmptyCard({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <i className="fas fa-map text-xl text-gray-300" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">{label}</h3>
      <p className="text-xs font-medium text-gray-400">로드맵을 시작하면 이곳에 표시됩니다.</p>
    </div>
  )
}

export function DetailModal({
  roadmap,
  typeLabel,
  onClose,
}: {
  roadmap: MyRoadmapSummary
  typeLabel: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="my-roadmap-detail-modal-shell">
        <button type="button" onClick={onClose} className="my-roadmap-modal-close">
          <i className="fas fa-times text-lg" />
        </button>

        <div className="mb-4">
          <span className="my-roadmap-detail-modal-type">{typeLabel}</span>
          <h2 className="my-roadmap-detail-modal-title">{roadmap.title}</h2>
        </div>

        <div className="my-roadmap-detail-modal-info">
          <div className="my-roadmap-detail-modal-row">
            <span className="my-roadmap-detail-modal-label">생성일</span>
            <span className="my-roadmap-detail-modal-value">{formatDate(roadmap.createdAt)}</span>
          </div>
          <div className="my-roadmap-detail-modal-row">
            <span className="my-roadmap-detail-modal-label">최근 접속</span>
            <span className="my-roadmap-detail-modal-value">{formatDate(activityDate(roadmap))}</span>
          </div>
          <div className="my-roadmap-detail-modal-row">
            <span className="my-roadmap-detail-modal-label">로드맵 상태</span>
            <span className="text-brand font-bold flex items-center gap-1">
              <i className="fas fa-circle text-[8px]" />
              활성화됨
            </span>
          </div>
        </div>

        <div className="my-roadmap-detail-modal-actions">
          <button type="button" onClick={onClose} className="my-roadmap-detail-modal-button my-roadmap-detail-modal-button--secondary">
            닫기
          </button>
          <a href={buildRoadmapUrl(roadmap.customRoadmapId)} className="my-roadmap-detail-modal-button my-roadmap-detail-modal-button--primary">
            해당 로드맵으로 이동
          </a>
        </div>
      </div>
    </div>
  )
}

export function RenameModal({
  roadmap,
  onConfirm,
  onClose,
  loading,
}: {
  roadmap: MyRoadmapSummary
  onConfirm: (newTitle: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [title, setTitle] = useState(roadmap.title)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTitle = title.trim()
    if (!nextTitle || nextTitle === roadmap.title) {
      onClose()
      return
    }
    onConfirm(nextTitle)
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative z-10 p-7">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
          <i className="fas fa-times text-lg" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-5">로드맵 이름 변경</h2>
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand"
        />
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-colors">
            닫기
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors disabled:opacity-60">
            {loading ? '저장 중' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function DeleteModal({
  roadmap,
  label,
  onConfirm,
  onClose,
  loading,
}: {
  roadmap: MyRoadmapSummary
  label: string
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative z-10 p-7">
        <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-3">{label}</h2>
        <p className="text-sm font-medium text-gray-500 leading-6">
          {roadmap.title} 로드맵을 목록에서 삭제할까요?
        </p>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-colors">
            닫기
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors disabled:opacity-60">
            {loading ? '삭제 중' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
