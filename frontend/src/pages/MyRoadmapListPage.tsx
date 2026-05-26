import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import AuthModal, { type AuthView } from '../components/AuthModal'
import LoginRequiredView from '../components/LoginRequiredView'
import SiteHeader from '../components/SiteHeader'
import { authApi, roadmapApi, userApi } from '../lib/api'
import {
  AUTH_SESSION_SYNC_EVENT,
  clearStoredAuthSession,
  getPostLoginRedirect,
  readStoredAuthSession,
} from '../lib/auth-session'
import type { MyRoadmapSummary, RoadmapNodeItem } from '../types/roadmap'

type RoadmapTab = 'learning' | 'created' | 'completed'
type NextLearningNode = Pick<RoadmapNodeItem, 'customNodeId' | 'title'> | null
type RoadmapDetailPreview = {
  nextNode: NextLearningNode
  progressRate: number
}
type ModalState =
  | { kind: 'detail'; roadmap: MyRoadmapSummary; typeLabel: string }
  | { kind: 'rename'; roadmap: MyRoadmapSummary }
  | { kind: 'delete'; roadmap: MyRoadmapSummary; label: string }
  | null

const tabs: RoadmapTab[] = ['learning', 'created', 'completed']

const tabMeta: Record<RoadmapTab, { label: string; icon: string }> = {
  learning: { label: '수강 중인 로드맵', icon: 'fas fa-book-open' },
  created: { label: '내가 만든 로드맵', icon: 'fas fa-map-marked-alt' },
  completed: { label: '수강 완료', icon: 'fas fa-trophy' },
}

function tabButtonClass(tab: RoadmapTab, activeTab: RoadmapTab) {
  return `my-roadmap-tab-button${activeTab === tab ? ' my-roadmap-tab-button--active' : ''}`
}

function tabCountClass(tab: RoadmapTab, activeTab: RoadmapTab) {
  return `my-roadmap-tab-count${activeTab === tab ? ' my-roadmap-tab-count--active' : ''}`
}

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')
  return value === 'login' || value === 'signup' ? value : null
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)
  if (view) {
    url.searchParams.set('auth', view)
  } else {
    url.searchParams.delete('auth')
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function readTabFromLocation(): RoadmapTab {
  const value = new URLSearchParams(window.location.search).get('tab')
  return tabs.includes(value as RoadmapTab) ? (value as RoadmapTab) : 'learning'
}

function syncTabInLocation(tab: RoadmapTab, replace = false) {
  const url = new URL(window.location.href)
  url.searchParams.set('tab', tab)
  const next = `${url.pathname}${url.search}${url.hash}`
  if (replace) window.history.replaceState({ tab }, '', next)
  else window.history.pushState({ tab }, '', next)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function progressOf(roadmap: MyRoadmapSummary): number {
  return Math.max(0, Math.min(100, Math.round(roadmap.progressRate)))
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function nextModuleLabel(roadmap: MyRoadmapSummary): string {
  if (roadmap.isBuilderOrigin) return '커스텀 노드 이어가기'
  return '다음 학습 모듈'
}

function findNextLearningNode(nodes: RoadmapNodeItem[], progressRate: number): NextLearningNode {
  const sortedNodes = [...nodes].sort((a, b) => a.sortOrder - b.sortOrder || a.customNodeId - b.customNodeId)
  const activeNode = sortedNodes.find((node) => node.status === 'IN_PROGRESS')
  if (activeNode) return activeNode

  const isAvailable = (node: RoadmapNodeItem) => node.status !== 'COMPLETED' && node.status !== 'LOCKED'
  const progressIndex = Math.min(
    Math.max(Math.floor((progressRate / 100) * sortedNodes.length), 0),
    Math.max(sortedNodes.length - 1, 0),
  )
  const progressNode = sortedNodes.slice(progressIndex).find(isAvailable)
  if (progressNode) return progressNode

  return sortedNodes.find((node) => node.status === 'PENDING' || node.status === 'NOT_STARTED') ?? null
}

function buildRoadmapUrl(customRoadmapId: number, nodeId?: number) {
  const params = new URLSearchParams({ id: String(customRoadmapId) })
  if (nodeId) params.set('nodeId', String(nodeId))
  return `/roadmap?${params.toString()}`
}

function activityDate(roadmap: MyRoadmapSummary): string | null | undefined {
  return roadmap.lastStudiedAt ?? roadmap.updatedAt ?? roadmap.createdAt
}

function contentClass(tab: RoadmapTab, activeTab: RoadmapTab) {
  return `tab-content ${
    activeTab === tab ? 'tab-active' : 'tab-hidden'
  } my-roadmap-card-grid`
}

function RoadmapListStyle() {
  return (
    <style>
      {`
        .my-roadmap-list-page {
          font-family: 'Pretendard', sans-serif;
          background-color: #F9FAFB;
          color: #111827;
        }

        html.my-roadmap-list-scroll-lock,
        body.my-roadmap-list-scroll-lock {
          height: 100%;
          overflow: hidden;
        }

        body.my-roadmap-list-scroll-lock {
          scrollbar-width: none;
        }

        body.my-roadmap-list-scroll-lock::-webkit-scrollbar {
          display: none;
        }

        .my-roadmap-tab-shell {
          margin-bottom: 32px;
          border-bottom: 1px solid #E5E7EB;
        }

        .my-roadmap-tab-nav {
          display: flex;
          gap: 32px;
        }

        .my-roadmap-tab-button {
          display: flex;
          align-items: center;
          min-width: 0;
          padding: 16px 4px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: #6B7280;
          font-size: 15px;
          line-height: 20px;
          font-weight: 500;
          transition: color 200ms ease, border-color 200ms ease;
          cursor: pointer;
        }

        .my-roadmap-tab-button:hover {
          border-bottom-color: #D1D5DB;
          color: #1F2937;
        }

        .my-roadmap-tab-button--active {
          border-bottom-color: #00C471;
          color: #00C471;
          font-weight: 700;
        }

        .my-roadmap-tab-button--active:hover {
          border-bottom-color: #00C471;
          color: #00C471;
        }

        .my-roadmap-tab-icon {
          margin-right: 8px;
        }

        .my-roadmap-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 20px;
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 9999px;
          background: #F3F4F6;
          color: #4B5563;
          font-size: 11px;
          line-height: 16px;
          font-weight: 700;
        }

        .my-roadmap-tab-count--active {
          background: rgba(0, 196, 113, 0.1);
          color: #00C471;
        }

        .my-roadmap-list-page .tab-content {
          transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        }

        .my-roadmap-list-page .tab-hidden {
          display: none;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          visibility: hidden;
        }

        .my-roadmap-list-page .tab-active {
          display: grid;
          opacity: 1;
          transform: translateY(0);
          position: relative;
          visibility: visible;
        }

        .my-roadmap-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, 318px);
          gap: 20px;
          align-items: stretch;
        }

        .my-roadmap-fixed-card {
          width: 318px;
          height: 288px;
          padding: 20px;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          background: #FFFFFF;
          box-shadow: 0 2px 10px -3px rgba(6, 81, 237, 0.05);
          display: flex;
          flex-direction: column;
          position: relative;
          transition: box-shadow 300ms ease, transform 300ms ease;
        }

        .my-roadmap-fixed-card:hover {
          box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.1);
        }

        .my-roadmap-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .my-roadmap-card-badge {
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
          line-height: 16px;
          font-weight: 700;
        }

        .my-roadmap-card-badge--official {
          color: #00A35E;
          background: #E6F9F1;
          border: 1px solid rgba(0, 196, 113, 0.2);
        }

        .my-roadmap-card-badge--custom {
          color: #7E22CE;
          background: #FAF5FF;
          border: 1px solid #E9D5FF;
        }

        .my-roadmap-menu-button {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
          font-size: 14px;
          line-height: 20px;
          transition: color 150ms ease, background-color 150ms ease;
          outline: none;
        }

        .my-roadmap-menu-button:hover {
          color: #111827;
          background: #F3F4F6;
        }

        .my-roadmap-menu-panel {
          position: absolute;
          right: 0;
          top: 32px;
          z-index: 20;
          width: 144px;
          padding: 6px 0;
          border: 1px solid #F3F4F6;
          border-radius: 12px;
          background: #FFFFFF;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
          transform-origin: top right;
        }

        .my-roadmap-menu-item {
          display: flex;
          align-items: center;
          width: 100%;
          height: 32px;
          padding: 8px 16px;
          border: 0;
          background: transparent;
          color: #374151;
          text-align: left;
          font-size: 13px;
          line-height: 16px;
          font-weight: 400;
          white-space: nowrap;
          cursor: pointer;
        }

        .my-roadmap-menu-item:hover {
          background: #F9FAFB;
          color: #00C471;
        }

        .my-roadmap-menu-item--danger {
          color: #DC2626;
        }

        .my-roadmap-menu-item--danger:hover {
          background: #FEF2F2;
          color: #DC2626;
        }

        .my-roadmap-menu-item i {
          width: 16px;
          margin-right: 8px;
          text-align: center;
          line-height: 16px;
          flex: 0 0 16px;
        }

        .my-roadmap-menu-divider {
          height: 1px;
          margin: 4px 0;
          border: 0;
          background: #F3F4F6;
        }

        .my-roadmap-card-title {
          margin: 0 0 24px;
          color: #111827;
          font-size: 18px;
          line-height: 22.5px;
          font-weight: 700;
          letter-spacing: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 150ms ease;
        }

        .my-roadmap-fixed-card:hover .my-roadmap-card-title {
          color: #00C471;
        }

        .my-roadmap-card-body {
          margin-top: auto;
        }

        .my-roadmap-progress-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .my-roadmap-progress-label {
          color: #4B5563;
          font-size: 11px;
          line-height: 16px;
          font-weight: 600;
        }

        .my-roadmap-progress-value {
          color: #00C471;
          font-size: 12px;
          line-height: 16px;
          font-weight: 700;
        }

        .my-roadmap-progress-track {
          width: 100%;
          height: 8px;
          margin-bottom: 16px;
          overflow: hidden;
          border-radius: 9999px;
          background: #F3F4F6;
        }

        .my-roadmap-progress-fill {
          height: 8px;
          border-radius: 9999px;
          background: #00C471;
          transition: width 1000ms ease-out;
        }

        .my-roadmap-next-box {
          height: 54px;
          margin-bottom: 16px;
          padding: 10px;
          border: 1px solid #F3F4F6;
          border-radius: 8px;
          background: #F9FAFB;
        }

        .my-roadmap-next-title-shell {
          position: relative;
          min-width: 0;
        }

        .my-roadmap-next-title-shell--tooltip:hover::before {
          content: '';
          position: absolute;
          left: 16px;
          bottom: calc(100% + 3px);
          z-index: 31;
          width: 8px;
          height: 8px;
          background: #111827;
          transform: rotate(45deg);
          pointer-events: none;
        }

        .my-roadmap-next-title-shell--tooltip:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 0;
          bottom: calc(100% + 7px);
          z-index: 30;
          width: max-content;
          max-width: 260px;
          padding: 8px 10px;
          border-radius: 8px;
          background: #111827;
          color: #FFFFFF;
          box-shadow: 0 10px 24px rgba(17, 24, 39, 0.18);
          font-size: 12px;
          line-height: 16px;
          font-weight: 500;
          white-space: normal;
          word-break: keep-all;
          overflow-wrap: anywhere;
          pointer-events: none;
        }

        .my-roadmap-next-label {
          margin: 0 0 2px;
          color: #9CA3AF;
          font-size: 10px;
          line-height: 14px;
          font-weight: 500;
        }

        .my-roadmap-next-title {
          margin: 0;
          color: #1F2937;
          font-size: 12px;
          line-height: 16px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .my-roadmap-next-title i {
          margin-right: 4px;
          color: #00C471;
          opacity: 0.7;
        }

        .my-roadmap-card-action {
          display: block;
          width: 100%;
          height: 40px;
          padding: 10px 0;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          background: #FFFFFF;
          color: #111827;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          text-align: center;
          font-size: 14px;
          line-height: 20px;
          font-weight: 700;
          transition: background-color 150ms ease, box-shadow 150ms ease;
        }

        .my-roadmap-card-action:hover {
          background: #F9FAFB;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
        }

        .my-roadmap-detail-modal-shell {
          width: calc(100% - 32px);
          max-width: 512px;
          margin-left: 16px;
          margin-right: 16px;
          padding: 28px;
          border-radius: 16px;
          background: #FFFFFF;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          z-index: 10;
          transform: scale(1);
          opacity: 1;
          transition: transform 200ms ease, opacity 200ms ease;
        }

        .my-roadmap-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 150ms ease, background-color 150ms ease;
        }

        .my-roadmap-modal-close:hover {
          color: #374151;
          background: #F3F4F6;
        }

        .my-roadmap-detail-modal-type {
          display: inline-block;
          margin-bottom: 12px;
          padding: 4px 10px;
          border-radius: 6px;
          background: #F3F4F6;
          color: #4B5563;
          font-size: 12px;
          line-height: 16px;
          font-weight: 700;
        }

        .my-roadmap-detail-modal-title {
          color: #111827;
          font-size: 24px;
          line-height: 32px;
          font-weight: 700;
        }

        .my-roadmap-detail-modal-info {
          margin: 16px 0;
          padding: 16px 0;
          border-top: 1px solid #F3F4F6;
          border-bottom: 1px solid #F3F4F6;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .my-roadmap-detail-modal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          line-height: 20px;
        }

        .my-roadmap-detail-modal-label {
          color: #6B7280;
          font-weight: 500;
        }

        .my-roadmap-detail-modal-value {
          color: #1F2937;
          font-weight: 700;
        }

        .my-roadmap-detail-modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .my-roadmap-detail-modal-button {
          flex: 1;
          padding: 12px 0;
          border-radius: 12px;
          text-align: center;
          font-size: 14px;
          line-height: 20px;
          font-weight: 700;
          transition: background-color 150ms ease;
        }

        .my-roadmap-detail-modal-button--secondary {
          border: 1px solid #E5E7EB;
          background: #FFFFFF;
          color: #374151;
        }

        .my-roadmap-detail-modal-button--secondary:hover {
          background: #F9FAFB;
        }

        .my-roadmap-detail-modal-button--primary {
          background: #111827;
          color: #FFFFFF;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        }

        .my-roadmap-detail-modal-button--primary:hover {
          background: #1F2937;
        }

        @media (max-width: 639px) {
          .my-roadmap-card-grid {
            grid-template-columns: 318px;
            justify-content: center;
          }
        }
      `}
    </style>
  )
}

function StatCard({
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

function Dropdown({
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

function DropdownButton({
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

function LearningCard({
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

function CreatedCard({
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

function CompletedCard({
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

function FindRoadmapCard() {
  return (
    <a href="/roadmap-hub" className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand hover:bg-gray-50 transition-all duration-300 p-5 flex flex-col items-center justify-center text-center h-full min-h-[280px] group outline-none">
      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <i className="fas fa-search text-xl text-gray-400 group-hover:text-brand transition-colors" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">새로운 로드맵 찾기</h3>
    </a>
  )
}

function NewCustomRoadmapCard() {
  return (
    <a href="/my-roadmap" className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand hover:bg-gray-50 transition-all duration-300 p-5 flex flex-col items-center justify-center text-center h-full min-h-[280px] group outline-none">
      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <i className="fas fa-plus text-xl text-gray-400 group-hover:text-brand transition-colors" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">새 커스텀 로드맵</h3>
    </a>
  )
}

function EmptyCard({ label }: { label: string }) {
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

function DetailModal({
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

function RenameModal({
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

function DeleteModal({
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

function MyRoadmapListPage() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [activeTab, setActiveTab] = useState<RoadmapTab>(() => readTabFromLocation())
  const [roadmaps, setRoadmaps] = useState<MyRoadmapSummary[]>([])
  const [detailPreviewsByRoadmapId, setDetailPreviewsByRoadmapId] = useState<Record<number, RoadmapDetailPreview | undefined>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [renameLoading, setRenameLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    document.title = 'DevPath - 내 로드맵 관리'
    syncTabInLocation(readTabFromLocation(), true)
    document.documentElement.classList.add('my-roadmap-list-scroll-lock')
    document.body.classList.add('my-roadmap-list-scroll-lock')

    const handlePopState = () => {
      setActiveTab(readTabFromLocation())
      setOpenMenuId(null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.documentElement.classList.remove('my-roadmap-list-scroll-lock')
      document.body.classList.remove('my-roadmap-list-scroll-lock')
    }
  }, [])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      return
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((profile) => {
        setProfileImage(profile.profileImage)
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileImage(null)
      })

    return () => controller.abort()
  }, [session])

  useEffect(() => {
    if (!session) {
      setRoadmaps([])
      setDetailPreviewsByRoadmapId({})
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    roadmapApi
      .getMyRoadmaps(controller.signal)
      .then((result) => setRoadmaps(result.roadmaps))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : '로드맵 목록을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [session])

  useEffect(() => {
    if (!session || roadmaps.length === 0) {
      setDetailPreviewsByRoadmapId({})
      return
    }

    const learningRoadmaps = roadmaps.filter((roadmap) => progressOf(roadmap) < 100)
    if (learningRoadmaps.length === 0) {
      setDetailPreviewsByRoadmapId({})
      return
    }

    const controller = new AbortController()
    const learningIds = new Set(learningRoadmaps.map((roadmap) => roadmap.customRoadmapId))

    setDetailPreviewsByRoadmapId((prev) => {
      const retained: Record<number, RoadmapDetailPreview | undefined> = {}
      learningRoadmaps.forEach((roadmap) => {
        retained[roadmap.customRoadmapId] = prev[roadmap.customRoadmapId]
      })
      return retained
    })

    Promise.all(
      learningRoadmaps.map(async (roadmap) => {
        try {
          const detail = await roadmapApi.getMyRoadmapDetail(roadmap.customRoadmapId, controller.signal)
          return {
            customRoadmapId: roadmap.customRoadmapId,
            preview: {
              nextNode: findNextLearningNode(detail.nodes, detail.progressRate),
              progressRate: detail.progressRate,
            },
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError' || controller.signal.aborted) return null
          return {
            customRoadmapId: roadmap.customRoadmapId,
            preview: {
              nextNode: null,
              progressRate: roadmap.progressRate,
            },
          }
        }
      }),
    ).then((results) => {
      if (controller.signal.aborted) return

      setDetailPreviewsByRoadmapId((prev) => {
        const next: Record<number, RoadmapDetailPreview | undefined> = { ...prev }
        learningIds.forEach((id) => {
          if (!(id in next)) next[id] = undefined
        })
        results.forEach((result) => {
          if (result) next[result.customRoadmapId] = result.preview
        })
        return next
      })
    })

    return () => controller.abort()
  }, [roadmaps, session])

  const grouped = useMemo(() => {
    const learning = roadmaps.filter((roadmap) => progressOf(roadmap) < 100)
    const created = roadmaps.filter((roadmap) => roadmap.isBuilderOrigin)
    const completed = roadmaps.filter((roadmap) => progressOf(roadmap) >= 100)
    return { learning, created, completed }
  }, [roadmaps])

  function switchTab(tab: RoadmapTab) {
    setActiveTab(tab)
    setOpenMenuId(null)
    syncTabInLocation(tab)
  }

  function handleAuthenticated() {
    const next = readStoredAuthSession()
    if (next?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(next.role))
      return
    }
    setSession(next)
    setAuthView(null)
  }

  async function handleLogout() {
    const currentSession = readStoredAuthSession()
    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃 실패와 관계없이 로컬 세션은 정리한다.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
    }
  }

  async function handleRename(title: string) {
    if (modal?.kind !== 'rename') return
    setRenameLoading(true)
    try {
      const updated = await roadmapApi.renameMyRoadmap(modal.roadmap.customRoadmapId, title)
      setRoadmaps((prev) =>
        prev.map((roadmap) => (roadmap.customRoadmapId === modal.roadmap.customRoadmapId ? { ...roadmap, ...updated } : roadmap)),
      )
      setModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '이름 변경에 실패했습니다.')
    } finally {
      setRenameLoading(false)
    }
  }

  async function handleDelete() {
    if (modal?.kind !== 'delete') return
    setDeleteLoading(true)
    try {
      await roadmapApi.deleteMyRoadmap(modal.roadmap.customRoadmapId)
      setRoadmaps((prev) => prev.filter((roadmap) => roadmap.customRoadmapId !== modal.roadmap.customRoadmapId))
      setModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!session) {
    return <LoginRequiredView message="내 로드맵은 로그인 후 확인할 수 있습니다." />
  }

  return (
    <div className="my-roadmap-list-page min-h-screen bg-[#F9FAFB] text-gray-900">
      <RoadmapListStyle />
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => setAuthView('login')}
        activeNavHref="/roadmap-hub"
      />
      <main className="app-main flex-grow flex flex-col">
        <div className="bg-white border-b border-gray-200 py-12 px-4 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">내 로드맵 관리</h1>
          <p className="text-gray-500 font-medium text-sm max-w-2xl mx-auto mb-8">
            수강 중인 공식 로드맵과 직접 만든 커스텀 로드맵의 진행 상황을 한눈에 파악하세요.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href="/my-roadmap" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
              <i className="fas fa-tools text-sm" />
              나만의 로드맵 만들기
            </a>
            <a href="/roadmap-hub" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 transform hover:-translate-y-0.5">
              <i className="fas fa-compass text-sm text-brand" />
              공식 로드맵 둘러보기
            </a>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <StatCard icon="fas fa-layer-group" iconClass="bg-gray-50 border-gray-100 text-gray-500" label="총 보유 로드맵" value={roadmaps.length} />
            <StatCard icon="fas fa-sync-alt" iconClass="bg-[#00C471]/10 border-[#00C471]/5 text-brand" label="학습 진행 중" value={grouped.learning.length} />
            <StatCard icon="fas fa-trophy" iconClass="bg-blue-50 border-blue-100/5 text-blue-500" label="학습 완료" value={grouped.completed.length} />
          </div>

          <div className="my-roadmap-tab-shell">
            <nav className="my-roadmap-tab-nav" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={tabButtonClass(tab, activeTab)}
                >
                  <i className={`${tabMeta[tab].icon} my-roadmap-tab-icon`} />
                  {tabMeta[tab].label}
                  <span className={tabCountClass(tab, activeTab)}>
                    {grouped[tab].length}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {session && loading && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] text-sm font-bold text-gray-400">
              <i className="fas fa-circle-notch animate-spin mr-2" />
              로드맵 목록을 불러오는 중입니다.
            </div>
          )}

          {session && !loading && error && (
            <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)]">
              <p className="text-sm font-bold text-red-600 mb-5">{error}</p>
              <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl shadow-sm transition-all duration-200">
                다시 불러오기
              </button>
            </div>
          )}

          {session && !loading && !error && (
            <div className="relative">
              <div className={contentClass('learning', activeTab)}>
                {grouped.learning.map((roadmap) => (
                  <LearningCard
                    key={roadmap.customRoadmapId}
                    roadmap={roadmap}
                    preview={detailPreviewsByRoadmapId[roadmap.customRoadmapId]}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onDetail={(target, typeLabel) => setModal({ kind: 'detail', roadmap: target, typeLabel })}
                    onDelete={(target, label) => setModal({ kind: 'delete', roadmap: target, label })}
                  />
                ))}
                {grouped.learning.length === 0 ? <EmptyCard label="수강 중인 로드맵 없음" /> : null}
                <FindRoadmapCard />
              </div>

              <div className={contentClass('created', activeTab)}>
                {grouped.created.map((roadmap) => (
                  <CreatedCard
                    key={roadmap.customRoadmapId}
                    roadmap={roadmap}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onDetail={(target, typeLabel) => setModal({ kind: 'detail', roadmap: target, typeLabel })}
                    onDelete={(target, label) => setModal({ kind: 'delete', roadmap: target, label })}
                  />
                ))}
                {grouped.created.length === 0 ? <EmptyCard label="내가 만든 로드맵 없음" /> : null}
                <NewCustomRoadmapCard />
              </div>

              <div className={contentClass('completed', activeTab)}>
                {grouped.completed.map((roadmap) => (
                  <CompletedCard
                    key={roadmap.customRoadmapId}
                    roadmap={roadmap}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onDetail={(target, typeLabel) => setModal({ kind: 'detail', roadmap: target, typeLabel })}
                    onDelete={(target, label) => setModal({ kind: 'delete', roadmap: target, label })}
                  />
                ))}
                {grouped.completed.length === 0 ? <EmptyCard label="완료한 로드맵 없음" /> : null}
              </div>
            </div>
          )}
        </div>
      </main>

      {modal?.kind === 'detail' && <DetailModal roadmap={modal.roadmap} typeLabel={modal.typeLabel} onClose={() => setModal(null)} />}
      {modal?.kind === 'rename' && <RenameModal roadmap={modal.roadmap} onConfirm={handleRename} onClose={() => setModal(null)} loading={renameLoading} />}
      {modal?.kind === 'delete' && <DeleteModal roadmap={modal.roadmap} label={modal.label} onConfirm={handleDelete} onClose={() => setModal(null)} loading={deleteLoading} />}
      {authView && <AuthModal view={authView} onClose={() => setAuthView(null)} onViewChange={setAuthView} onAuthenticated={handleAuthenticated} />}
    </div>
  )
}

export default MyRoadmapListPage
