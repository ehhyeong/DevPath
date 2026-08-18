import { useCallback } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { SkillModule, BuilderNode, ActiveDrag } from './roadmap-builder-model'
import { getModuleUsageKey, getTopicSummary, getCategoryBadgeVisual } from './roadmap-builder-model'

export function TrashZone() {
  const { isOver, setNodeRef } = useDroppable({ id: 'trash' })
  return (
    <div
      ref={setNodeRef}
      className={[
        'fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-4 text-sm font-bold shadow-2xl transition-all duration-200',
        isOver
          ? 'scale-110 border-red-400 bg-red-100 text-red-600'
          : 'border-red-300 bg-white text-red-400',
      ].join(' ')}
    >
      <i className={`fas fa-trash-alt text-lg ${isOver ? 'animate-bounce' : ''}`} />
      {isOver ? '놓아서 삭제' : '드래그하여 삭제'}
    </div>
  )
}

export function TerminalDropZone({
  id,
  showGaps,
  forModule,
  forSpineNode,
  draggedModule,
}: {
  id: string
  showGaps: boolean
  forModule: boolean
  forSpineNode: boolean
  draggedModule: SkillModule | null
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  // 드래그 없음 → 기존 힌트 박스
  if (!showGaps) {
    return (
      <div ref={setNodeRef} className="relative z-10 mt-6 flex items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white text-gray-300">
          <i className="fas fa-mouse-pointer translate-x-0.5" />
        </div>
        <div className="ml-10 flex flex-1 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-white px-6 pb-5 pt-6 text-center font-bold text-[#94A3B8] shadow-sm">
          <i className="fas fa-hand-pointer shrink-0 -translate-y-1 text-2xl text-gray-300" />
          <span className="whitespace-nowrap">왼쪽 패널에서 모듈을 클릭하거나 드래그하세요</span>
        </div>
      </div>
    )
  }

  // MODULE 드래그 + hover → 반투명 미리보기
  if (isOver && forModule && draggedModule) {
    return (
      <div ref={setNodeRef} className="z-20 mt-6">
        <ModuleDropPreview module={draggedModule} />
      </div>
    )
  }

  // MODULE 드래그 중 (not hover) → 초록 점선 초대
  if (forModule) {
    return (
      <div ref={setNodeRef} className="relative z-10 mt-6 flex items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#00C471] bg-white text-xl text-[#00C471]">
          <i className="fas fa-plus" />
        </div>
        <div className="ml-8 flex-1 rounded-2xl border-2 border-dashed border-[#00C471] bg-green-50 p-6 text-center font-bold text-[#00C471]">
          <i className="fas fa-arrow-down mb-2 block text-2xl opacity-60" />
          여기에 드래그하여 끝에 추가
        </div>
      </div>
    )
  }

  // Spine NODE 드래그 + hover → 파란 강조
  if (isOver && forSpineNode) {
    return (
      <div ref={setNodeRef} className="relative z-10 mt-6 flex items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-50 text-xl text-blue-500">
          <i className="fas fa-arrows-alt-v" />
        </div>
        <div className="ml-8 flex-1 rounded-2xl border-2 border-blue-400 bg-blue-50 p-6 text-center font-bold text-blue-500">
          여기에 놓기
        </div>
      </div>
    )
  }

  // Spine NODE 드래그 중 (not hover) → 연한 파란 점선
  return (
    <div ref={setNodeRef} className="relative z-10 mt-6 flex items-center">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-blue-300 bg-white text-xl text-blue-300">
        <i className="fas fa-arrows-alt-v" />
      </div>
      <div className="ml-8 flex-1 rounded-2xl border-2 border-dashed border-blue-200 bg-white p-6 text-center font-bold text-blue-300">
        <i className="fas fa-arrow-down mb-2 block text-2xl opacity-40" />
        여기에 드래그하여 끝으로 이동
      </div>
    </div>
  )
}

export function DroppableGap({
  id,
  forModule,
  forSpineNode,
  draggedModule,
}: {
  id: string
  forModule: boolean
  forSpineNode: boolean
  draggedModule: SkillModule | null
}) {
  const active = forModule || forSpineNode
  const { isOver, setNodeRef } = useDroppable({ id })

  // MODULE 드래그 중 hover → 반투명 미리보기
  if (isOver && forModule && draggedModule) {
    return (
      <div ref={setNodeRef} className="z-20 my-3">
        <ModuleDropPreview module={draggedModule} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={[
        'relative z-20 flex items-center justify-center transition-all duration-150',
        active ? 'my-2 min-h-[56px]' : 'h-2',
      ].join(' ')}
    >
      {active && (
        isOver && forSpineNode ? (
          <div className="mx-8 w-full rounded-xl border-2 border-blue-400 bg-blue-50 py-2 text-center text-xs font-bold text-blue-500">
            <i className="fas fa-arrows-alt-v mr-1" />여기에 이동
          </div>
        ) : (
          <div className={[
            'absolute inset-x-0 mx-8 rounded-full transition-all duration-150',
            forModule ? 'border border-dashed border-[#00C471] opacity-40' : 'border border-dashed border-blue-300 opacity-40',
          ].join(' ')} />
        )
      )}
    </div>
  )
}

export function MiniDragPreview({
  title, icon, color, bgColor,
}: {
  title: string; icon: string; color: string; bgColor: string
}) {
  return (
    <div className="flex cursor-grabbing items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-2xl">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
        <i className={`${icon} ${color} text-lg`} />
      </div>
      <span className="text-sm font-bold text-gray-800">{title}</span>
    </div>
  )
}

function ModuleDropPreview({ module }: { module: SkillModule }) {
  return (
    <div className="pointer-events-none flex items-start opacity-50">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#00C471] bg-white text-xl text-[#00C471]">
        <i className="fas fa-plus" />
      </div>
      <div className="relative ml-8 w-full rounded-2xl border-2 border-dashed border-[#00C471] bg-green-50 p-5">
        <div className="flex items-start gap-4">
          <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 text-2xl ${module.bgColor}`}>
            <i className={`${module.icon} ${module.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <ModuleTitleTooltip title={module.title} className="mb-2 text-lg font-bold text-gray-700" />
            <div className="flex flex-wrap gap-1.5">
              {module.topics.map((topic) => (
                <ModuleTopicChip key={topic} topic={topic} tone="green" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModuleTitleTooltip({
  title,
  className,
}: {
  title: string
  className: string
}) {
  return (
    <div className="group/title relative min-w-0 max-w-full">
      <div className={`truncate ${className}`} aria-label={title}>
        {title}
      </div>
      <div className="pointer-events-none absolute left-0 top-full z-[1200] mt-1 hidden w-max min-w-56 max-w-96 whitespace-normal break-keep rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold leading-relaxed text-gray-700 shadow-xl group-hover/title:block">
        {title}
      </div>
    </div>
  )
}

function ModuleCategoryBadge({
  category,
  compact = false,
  className = '',
}: {
  category: string
  compact?: boolean
  className?: string
}) {
  const visual = getCategoryBadgeVisual(category)

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-bold',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[10px]',
        visual.className,
        className,
      ].join(' ')}
    >
      <i className={`fas ${visual.icon} text-[9px]`} />
      {category}
    </span>
  )
}

function ModuleTopicChip({
  topic,
  compact = false,
  tone = 'gray',
  elevated = false,
}: {
  topic: string
  compact?: boolean
  tone?: 'gray' | 'green'
  elevated?: boolean
}) {
  const toneClassName = tone === 'green'
    ? 'border-transparent bg-green-100 text-gray-500'
    : 'border-gray-200 bg-gray-100 text-gray-600'

  return (
    <span
      title={topic}
      className={[
        'inline-flex min-w-0 max-w-full items-center rounded-md border text-[10px] font-medium',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        elevated ? 'shadow-sm' : '',
        toneClassName,
      ].join(' ')}
    >
      <span className="truncate"># {topic}</span>
    </span>
  )
}

export function ModulePreviewPanel({
  module,
  isUsed,
  isAvailableForBranch,
  onAdd,
}: {
  module: SkillModule | null
  isUsed: boolean
  isAvailableForBranch: boolean
  onAdd: (module: SkillModule) => void
}) {
  if (!module) {
    return (
      <div className="shrink-0 border-t border-gray-100 bg-white p-4">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-semibold text-gray-400">
          모듈을 선택하면 포함 주제가 여기에 표시됩니다.
        </div>
      </div>
    )
  }

  const previewTopics = module.topics.slice(0, 4)
  const actionLabel = isUsed ? '추가됨' : isAvailableForBranch ? '분기로 추가' : '단계로 추가'

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white p-4 shadow-[0_-4px_12px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 ${module.bgColor}`}>
          <i className={`${module.icon} ${module.color} text-lg`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-extrabold leading-snug text-gray-900">
            {module.title}
          </p>
          <ModuleCategoryBadge category={module.category} compact className="mt-1" />
        </div>
      </div>

      <div className="space-y-1.5">
        {previewTopics.map((topic) => (
          <div key={topic} className="flex gap-2 text-[11px] leading-relaxed text-gray-500">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#00C471]" />
            <span className="line-clamp-2">{topic}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => !isUsed && onAdd(module)}
          disabled={isUsed}
          className={[
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-white transition disabled:cursor-not-allowed',
            isUsed
              ? 'bg-gray-300'
              : isAvailableForBranch
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-[#00C471] hover:bg-green-600',
          ].join(' ')}
        >
          <i className={`fas ${isUsed ? 'fa-check' : isAvailableForBranch ? 'fa-code-branch' : 'fa-plus'}`} />
          {actionLabel}
        </button>
        <span className="shrink-0 text-[10px] font-semibold text-gray-400">
          드래그 가능
        </span>
      </div>
    </div>
  )
}

export function DraggableModuleCard({
  module,
  isUsed,
  isPreviewed,
  isAvailableForBranch,
  onPreview,
  onAdd,
}: {
  module: SkillModule
  isUsed: boolean
  isPreviewed: boolean
  isAvailableForBranch: boolean
  onPreview: (module: SkillModule) => void
  onAdd: (module: SkillModule) => void
}) {
  const topicSummaries = module.topics.map(getTopicSummary)
  const visibleTopics = topicSummaries.slice(0, 2)
  const hiddenTopicCount = Math.max(topicSummaries.length - visibleTopics.length, 0)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `module-${getModuleUsageKey(module)}`,
    data: { kind: 'MODULE', module } as ActiveDrag,
    disabled: isUsed,
  })

  return (
    <div
      ref={setNodeRef}
      onClick={() => onPreview(module)}
      onFocus={() => onPreview(module)}
      onMouseEnter={() => onPreview(module)}
      className={[
        'group flex min-h-[68px] items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200',
        isUsed
          ? 'cursor-default border-dashed border-[#CBD5E1] bg-[#F1F5F9] opacity-70'
          : isAvailableForBranch
            ? 'cursor-grab border-amber-300 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-[0_4px_12px_rgba(245,158,11,0.15)]'
            : 'cursor-grab border-[#E2E8F0] hover:-translate-y-0.5 hover:border-[#00C471] hover:shadow-[0_4px_12px_rgba(0,196,113,0.1)]',
        isPreviewed ? 'border-[#00C471] ring-2 ring-[#00C471]/15' : '',
        isDragging ? 'opacity-40 scale-95' : '',
      ].join(' ')}
      {...(!isUsed ? attributes : {})}
      {...(!isUsed ? listeners : {})}
    >
      <div className={[
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-100',
        isUsed ? 'bg-gray-100' : `${module.bgColor} transition-transform group-hover:scale-110`,
      ].join(' ')}>
        <i className={`${module.icon} ${isUsed ? 'text-gray-400' : module.color} text-base`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <ModuleTitleTooltip
            title={module.title}
            className={`text-sm font-bold ${isUsed ? 'text-gray-500' : 'text-gray-800'}`}
          />
          <ModuleCategoryBadge category={module.category} compact />
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          {visibleTopics.map((topic) => (
            <span key={topic} className="max-w-[102px] truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
              {topic}
            </span>
          ))}
          {hiddenTopicCount > 0 && (
            <span className="shrink-0 text-[10px] font-bold text-gray-400">+{hiddenTopicCount}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          if (!isUsed) onAdd(module)
        }}
        disabled={isUsed}
        aria-label={isUsed ? `${module.title} 추가됨` : `${module.title} 추가`}
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs transition',
          isUsed
            ? 'cursor-not-allowed bg-green-100 text-[#00C471]'
            : isAvailableForBranch
              ? 'bg-amber-100 text-amber-500 hover:bg-amber-500 hover:text-white'
              : 'bg-gray-100 text-gray-400 hover:bg-[#00C471] hover:text-white',
        ].join(' ')}
      >
        <i className={`fas ${isUsed ? 'fa-check' : isAvailableForBranch ? 'fa-code-branch' : 'fa-plus'}`} />
      </button>
    </div>
  )
}

export function DraggableSpineCard({
  node,
  onRemove,
  onBranch,
  isBranchActive,
  isDraggingModule,
}: {
  node: BuilderNode
  onRemove: (id: string) => void
  onBranch: (sortOrder: number) => void
  isBranchActive: boolean
  isDraggingModule: boolean
}) {
  const { module, sortOrder, instanceId } = node

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `node-${instanceId}`,
    data: { kind: 'NODE', instanceId, sortOrder, branchGroup: null } as ActiveDrag,
  })

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `on-spine-${sortOrder}`,
  })

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDragRef(el)
      setDropRef(el)
    },
    [setDragRef, setDropRef],
  )

  const showBranchHighlight = isOver && isDraggingModule

  return (
    <div
      ref={setRef}
      {...attributes}
      {...listeners}
      className={[
        'group/card relative ml-8 w-full cursor-grab rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 active:cursor-grabbing',
        isDragging
          ? 'scale-[0.98] border-dashed border-blue-300 opacity-30'
          : showBranchHighlight
            ? '-translate-y-0.5 border-amber-400 bg-amber-50 shadow-[0_4px_16px_rgba(245,158,11,0.2)]'
            : 'border-gray-200 hover:-translate-y-1 hover:border-[#00C471] hover:shadow-xl',
      ].join(' ')}
    >
      {/* 분기 드롭 힌트 오버레이 */}
      {showBranchHighlight && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-lg">
            <i className="fas fa-code-branch mr-1" />여기에 분기 추가
          </span>
        </div>
      )}

      <div className="absolute -left-2 top-7 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-gray-200 bg-white transition-colors duration-300 group-hover/card:border-[#00C471]" />

      {/* 우측 액션 버튼 */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 opacity-0 transition-all group-hover/card:opacity-100">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onBranch(sortOrder) }}
          title="이 위치에 분기 추가"
          className={[
            'rounded-md px-2 py-1 text-[11px] font-bold transition',
            isBranchActive
              ? 'bg-amber-100 text-amber-600'
              : 'text-amber-400 hover:bg-amber-50 hover:text-amber-500',
          ].join(' ')}
        >
          <i className="fas fa-code-branch mr-1" />분기
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(instanceId) }}
          className="text-gray-300 transition hover:text-red-500"
        >
          <i className="fas fa-trash-alt text-lg" />
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 text-2xl shadow-inner ${module.bgColor}`}>
          <i className={`${module.icon} ${module.color}`} />
        </div>
        <div className="min-w-0 flex-1 pr-24">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ModuleTitleTooltip title={module.title} className="text-lg font-bold text-gray-900" />
            <ModuleCategoryBadge category={module.category} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {module.topics.map((topic) => (
              <ModuleTopicChip key={topic} topic={topic} elevated />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const BRANCH_COLORS: Record<string, { border: string; badge: string }> = {
  A: { border: 'border-amber-300 hover:border-amber-400', badge: 'bg-amber-100 text-amber-600' },
  B: { border: 'border-purple-300 hover:border-purple-400', badge: 'bg-purple-100 text-purple-600' },
}

export function DraggableBranchCard({
  node,
  label,
  onRemove,
  isDraggingBranchSibling,
}: {
  node: BuilderNode
  label: 'A' | 'B'
  onRemove: (id: string) => void
  isDraggingBranchSibling: boolean
}) {
  const { module, instanceId, sortOrder, branchGroup } = node
  const colors = BRANCH_COLORS[label]

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `node-${instanceId}`,
    data: { kind: 'NODE', instanceId, sortOrder, branchGroup } as ActiveDrag,
  })

  const { isOver: isSwapOver, setNodeRef: setSwapRef } = useDroppable({
    id: `branch-swap-${instanceId}`,
    disabled: !isDraggingBranchSibling,
  })

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDragRef(el)
      setSwapRef(el)
    },
    [setDragRef, setSwapRef],
  )

  const showSwapHighlight = isSwapOver && isDraggingBranchSibling

  return (
    <div
      ref={setRef}
      {...attributes}
      {...listeners}
      className={[
        `group/card relative cursor-grab rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 active:cursor-grabbing ${colors.border}`,
        isDragging
          ? 'scale-[0.98] border-dashed opacity-30'
          : showSwapHighlight
            ? '-translate-y-0.5 border-amber-400 bg-amber-50 shadow-lg'
            : 'hover:-translate-y-1 hover:shadow-lg',
      ].join(' ')}
    >
      {/* 스왑 하이라이트 오버레이 */}
      {showSwapHighlight && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
          <span className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-black text-white shadow-lg">
            <i className="fas fa-exchange-alt mr-1" />여기로 이동
          </span>
        </div>
      )}

      <span className={`absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-black ${colors.badge}`}>
        {label}
      </span>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(instanceId) }}
        className="absolute right-3 top-3 z-10 text-gray-300 opacity-0 transition-all group-hover/card:opacity-100 hover:text-red-500"
      >
        <i className="fas fa-trash-alt" />
      </button>

      <div className="flex items-start gap-3 pt-1">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 text-xl shadow-inner ${module.bgColor}`}>
          <i className={`${module.icon} ${module.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <ModuleTitleTooltip title={module.title} className="text-sm font-bold text-gray-900" />
            <ModuleCategoryBadge category={module.category} compact />
          </div>
          <div className="flex flex-wrap gap-1">
            {module.topics.map((topic) => (
              <ModuleTopicChip key={topic} topic={topic} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
