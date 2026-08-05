import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AuthModal, { type AuthView } from '../../components/AuthModal'
import LoginRequiredView from '../../components/LoginRequiredView'
import RoadmapInfoContent from '../../components/RoadmapInfoContent'
import SiteHeader from '../../components/SiteHeader'
import { authApi, userApi } from '../../lib/api/auth'
import { roadmapApi } from '../../lib/api/roadmap'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from '../../lib/auth-session'
import { useInternalPageScroll } from '../../lib/useInternalPageScroll'
import type { ProofCardSummary } from '../../types/learner'
import type { MyRoadmapSummary, RecommendationChange, RecommendationChangeHistory, RecommendStatus, RoadmapDetail, RoadmapNodeItem } from '../../types/roadmap'
import { buildRoadmapLayout, findRoadmapByOriginalId, readAuthViewFromLocation, readPositiveNumberParam, roadmapContentClassName, roadmapDoneNodeCountCardClassName, roadmapHeaderMetricsShellClassName, roadmapHeaderMetricsShellInnerClassName, roadmapMainClassName, roadmapNodeCountCardClassName, roadmapNodeCountLabelClassName, roadmapNodeCountNumberClassName, roadmapNodeCountWrapClassName, roadmapPageClassName, roadmapTotalNodeCountCardClassName, syncAuthViewInLocation } from './roadmap-detail-support'
import { RoadmapGraph, NodeDrawer, ChangesPanel, RoadmapHeaderMetrics, RoadmapSwitcherDropdown, RoadmapPageToolbar } from './roadmap-detail-components'

export default function RoadmapDetailPage() {
  useInternalPageScroll()

  const params = new URLSearchParams(window.location.search)
  const customRoadmapId = readPositiveNumberParam(params, 'id')
  const originalRoadmapId = readPositiveNumberParam(params, 'original')
  const initialNodeId = readPositiveNumberParam(params, 'nodeId')

  const [session, setSession]       = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView]     = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [roadmap, setRoadmap]       = useState<RoadmapDetail | null>(null)
  const [changes, setChanges]       = useState<RecommendationChange[]>([])
  const [histories, setHistories]   = useState<RecommendationChangeHistory[]>([])
  const [proofCards, setProofCards] = useState<ProofCardSummary[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [panelOpen, setPanelOpen]   = useState(false)
  const [infoOpen, setInfoOpen]     = useState(false)
  const [processing, setProcessing] = useState(false)
  const [drawerNode, setDrawerNode] = useState<RoadmapNodeItem | null>(null)
  const [myRoadmaps, setMyRoadmaps] = useState<MyRoadmapSummary[]>([])
  const [editMode, setEditMode] = useState(false)
  const [recommendPolling, setRecommendPolling] = useState(false)
  const [recommendStatus, setRecommendStatus] = useState<RecommendStatus | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const resetRoadmapPageState = useCallback((options?: { keepRoadmap?: boolean }) => {
    if (!options?.keepRoadmap) {
      setRoadmap(null)
    }
    setChanges([])
    setHistories([])
    setProofCards([])
    setMyRoadmaps([])
    setError(null)
    setPanelOpen(false)
    setInfoOpen(false)
    setProcessing(false)
    setDrawerNode(null)
    setRecommendPolling(false)
    setRecommendStatus(null)
  }, [])

  // 노드 클리어 후 백그라운드 추천 생성의 진행 상태를 폴링한다.
  // 시간 상한(매직넘버) 없이, DONE/FAILED 또는 RUNNING 후 IDLE(=TTL 만료=작업 종료)일 때만 종료한다.
  // 페이지에 머무는 동안은 생성이 얼마가 걸리든 완료되면 자동 반영된다(언마운트 시 정리).
  useEffect(() => {
    if (!recommendPolling) return
    const recommendationRoadmapId = roadmap?.originalRoadmapId ?? customRoadmapId
    const recommendationCustomRoadmapId = roadmap?.originalRoadmapId == null ? customRoadmapId : null
    if (recommendationRoadmapId == null) {
      setRecommendPolling(false)
      return
    }

    let cancelled = false
    let sawRunning = false
    let idleCount = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const reflectChanges = async () => {
      try {
        const changesData = await roadmapApi.getPendingChanges(
          roadmap?.originalRoadmapId ?? null,
          undefined,
          recommendationCustomRoadmapId,
        )
        if (!cancelled) setChanges(changesData)
      } catch { /* 무시 */ }
    }

    const poll = async () => {
      try {
        const status = await roadmapApi.getRecommendStatus(recommendationRoadmapId)
        if (cancelled) return
        if (status.status === 'RUNNING') {
          sawRunning = true
          idleCount = 0
          setRecommendStatus(status)
        } else if (status.status === 'DONE') {
          setRecommendStatus(status)
          await reflectChanges()
          setRecommendPolling(false)
          return
        } else if (status.status === 'FAILED') {
          setRecommendStatus(status)
          setRecommendPolling(false)
          return
        } else {
          // IDLE: RUNNING을 본 적 있으면 TTL 만료(=작업 종료)로 간주해 마지막 반영 후 종료.
          // 아직 RUNNING을 못 봤으면 트리거가 늦는 경우이므로 잠시만 재시도한다.
          idleCount += 1
          if (sawRunning || idleCount > 5) {
            await reflectChanges()
            if (!cancelled) setRecommendStatus(null)
            setRecommendPolling(false)
            return
          }
        }
      } catch { /* 무시하고 재시도 */ }
      if (!cancelled) timer = setTimeout(poll, 3000)
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [customRoadmapId, recommendPolling, roadmap?.originalRoadmapId])

  // 결과 없음/실패 상태 칩은 잠시 후 자동으로 사라진다.
  useEffect(() => {
    if (!recommendStatus) return
    const isEmptyDone = recommendStatus.status === 'DONE' && recommendStatus.count === 0
    if (!isEmptyDone && recommendStatus.status !== 'FAILED') return
    const timer = setTimeout(() => setRecommendStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [recommendStatus])

  useEffect(() => {
    const syncSession = () => {
      setSession(readStoredAuthSession())
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

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
        setProfileImage(null)
      })

    return () => {
      controller.abort()
    }
  }, [session])

  useEffect(() => {
    if (!session?.userId) {
      abortRef.current?.abort()
      resetRoadmapPageState({ keepRoadmap: true })
      setLoading(false)
      return
    }

    resetRoadmapPageState()
    setLoading(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    if (!customRoadmapId) {
      ;(async () => {
        try {
          if (originalRoadmapId) {
            try {
              const data = await roadmapApi.copyRoadmap(originalRoadmapId)
      window.location.replace(`/roadmap?id=${data.customRoadmapId}`)
            } catch (copyError) {
              const isAlreadyExists =
                typeof copyError === 'object'
                && copyError !== null
                && 'status' in copyError
                && (copyError as { status?: unknown }).status === 409
              if (isAlreadyExists) {
                // 이미 복사된 로드맵이면 안내 화면 없이 기존 로드맵으로 이동한다.
                const list = await roadmapApi.getMyRoadmaps(ctrl.signal)
                const existingRoadmap = findRoadmapByOriginalId(list.roadmaps, originalRoadmapId)
                if (existingRoadmap) {
                  window.location.replace(`/roadmap?id=${existingRoadmap.customRoadmapId}`)
                } else {
                  setError('이미 복사된 로드맵을 찾을 수 없습니다.')
                  setLoading(false)
                }
              } else {
                setError(copyError instanceof Error ? copyError.message : '로드맵을 생성할 수 없습니다.')
                setLoading(false)
              }
            }
          } else {
            const list = await roadmapApi.getMyRoadmaps(ctrl.signal)
            if (list.roadmaps.length > 0) {
        window.location.replace(`/roadmap?id=${list.roadmaps[0].customRoadmapId}`)
            } else {
              window.location.replace('/roadmap-hub')
            }
          }
        } catch {
          window.location.replace('/roadmap-hub')
        }
      })()
      return () => ctrl.abort()
    }

    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    roadmapApi.getMyRoadmapDetail(customRoadmapId, signal)
      .then(async (roadmapData) => {
        const scopedRoadmapId = roadmapData.originalRoadmapId
        const scopedCustomRoadmapId = scopedRoadmapId == null ? customRoadmapId : null
        const [changesData, historiesData, proofCardsData, roadmapsData] = await Promise.all([
          roadmapApi.getPendingChanges(scopedRoadmapId, signal, scopedCustomRoadmapId),
          roadmapApi.getChangeHistories(scopedRoadmapId, signal, scopedCustomRoadmapId),
          roadmapApi.getProofCards(signal),
          roadmapApi.getMyRoadmaps(signal),
        ])

        return { roadmapData, changesData, historiesData, proofCardsData, roadmapsData }
      })
      .then(({ roadmapData, changesData, historiesData, proofCardsData, roadmapsData }) => {
        setRoadmap(roadmapData)
        setChanges(changesData)
        setHistories(historiesData)
        setProofCards(proofCardsData)
        setMyRoadmaps(roadmapsData.roadmaps)
        setDrawerNode(
          initialNodeId
            ? roadmapData.nodes.find((node) => node.customNodeId === initialNodeId && node.status !== 'LOCKED') ?? null
            : null,
        )

        if (changesData.length > 0) {
          setTimeout(() => setPanelOpen(true), 800)
        }
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false)
      })

    return () => abortRef.current?.abort()
  }, [customRoadmapId, initialNodeId, originalRoadmapId, resetRoadmapPageState, session?.userId])

  // ── 이벤트 핸들러 ────────────────────────────────────────────────────────────

  async function handleApply(changeId: number) {
    setProcessing(true)
    try {
      await roadmapApi.applyChange(changeId)
      const applied = changes.find((c) => c.changeId === changeId)
      setChanges((prev) => prev.filter((c) => c.changeId !== changeId))
      if (applied) {
        setHistories((prev) => [
          {
            changeId: applied.changeId,
            nodeId: applied.nodeId,
            nodeTitle: applied.nodeTitle,
            nodeChangeType: applied.nodeChangeType,
            decisionStatus: 'APPLIED',
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ])
      }
      // 로드맵 새로고침 (DELETE인 경우 백엔드가 아직 노드를 제거하지 않으므로 로컬에서 필터링)
      const updated = await roadmapApi.getMyRoadmapDetail(customRoadmapId)
      if (applied?.nodeChangeType === 'DELETE') {
        setRoadmap({ ...updated, nodes: updated.nodes.filter((n) => n.originalNodeId !== applied.nodeId) })
      } else {
        setRoadmap(updated)
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleIgnore(changeId: number) {
    setProcessing(true)
    try {
      await roadmapApi.ignoreChange(changeId)
      const ignored = changes.find((c) => c.changeId === changeId)
      setChanges((prev) => prev.filter((c) => c.changeId !== changeId))
      if (ignored) {
        setHistories((prev) => [
          {
            changeId: ignored.changeId,
            nodeId: ignored.nodeId,
            nodeTitle: ignored.nodeTitle,
            nodeChangeType: ignored.nodeChangeType,
            decisionStatus: 'IGNORED',
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ])
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleApplyAll() {
    if (!confirm(`${changes.length}개의 변경사항을 모두 적용하시겠습니까?`)) return
    setProcessing(true)
    try {
      for (const c of changes) {
        await roadmapApi.applyChange(c.changeId)
      }
      setHistories((prev) => [
        ...changes.map((c) => ({
          changeId: c.changeId,
          nodeId: c.nodeId,
          nodeTitle: c.nodeTitle,
          nodeChangeType: c.nodeChangeType,
          decisionStatus: 'APPLIED' as const,
          updatedAt: new Date().toISOString(),
        })),
        ...prev,
      ])
      const deleteNodeIds = new Set(changes.filter((c) => c.nodeChangeType === 'DELETE').map((c) => c.nodeId))
      setChanges([])
      const updated = await roadmapApi.getMyRoadmapDetail(customRoadmapId)
      if (deleteNodeIds.size > 0) {
        setRoadmap({
          ...updated,
          nodes: updated.nodes.filter((n) => n.originalNodeId == null || !deleteNodeIds.has(n.originalNodeId)),
        })
      } else {
        setRoadmap(updated)
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  // ── 파생 데이터 ──────────────────────────────────────────────────────────────

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // Server logout failure should not block local session cleanup.
    } finally {
      abortRef.current?.abort()
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
      resetRoadmapPageState({ keepRoadmap: true })
      setLoading(false)
    }
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function closeAuthModal() {
    setAuthView(null)
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    closeAuthModal()
  }

  const proofCardByNodeId = useMemo(
    () => Object.fromEntries(proofCards.map((p) => [p.nodeId, p])) as Record<number, ProofCardSummary | undefined>,
    [proofCards],
  )
  const changeByNodeId = useMemo(
    () => Object.fromEntries(
      changes
        .filter((c) => c.nodeChangeType !== 'ADD')
        .map((c) => [c.nodeId, c]),
    ) as Record<number, RecommendationChange | undefined>,
    [changes],
  )
  const addChanges = changes.filter((c) => c.nodeChangeType === 'ADD')
  const totalNodes = (roadmap?.nodes.length ?? 0) + addChanges.length
  const doneNodes  = roadmap?.nodes.filter((n) => n.status === 'COMPLETED').length ?? 0
  const progressPct = roadmap ? Math.round(roadmap.progressRate) : 0
  const roadmapLayout = useMemo(
    () => buildRoadmapLayout(roadmap?.nodes ?? [], changes),
    [roadmap?.nodes, changes],
  )

  // ── 렌더 ─────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-[#00c471] mb-3" />
          <p className="text-sm text-gray-500">로드맵을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!session) return <LoginRequiredView />

  if (error || !roadmap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-3xl text-red-400 mb-3" />
          <p className="text-sm text-gray-600">{error ?? '로드맵을 불러올 수 없습니다.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#00c471] text-white text-sm font-bold rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const showLegacyHeader = false

  return (
    <div className={`${roadmapPageClassName} text-gray-800`}>

      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal('login')}
        activeNavHref="/roadmap-hub"
        startOverlay={(
          <a href="/roadmap-hub" className="pointer-events-auto absolute top-[50%] left-[calc((var(--left-rail)*-1)+28px)] inline-flex items-center gap-[4px] [transform:translateY(-50%)] text-[#6b7280] [font-size:13px] [font-weight:800] leading-[1] whitespace-nowrap [transition:color_0.2s_ease,transform_0.2s_ease] hover:[transform:translateY(-50%)_translateX(-1px)] hover:text-[#111827]" aria-label="로드맵 목록으로 돌아가기">
            <i className="fas fa-arrow-left" />
            <span>로드맵 목록</span>
          </a>
        )}
        endOverlay={(
          <div className={roadmapHeaderMetricsShellClassName}>
            <div className={roadmapHeaderMetricsShellInnerClassName}>
              <RoadmapHeaderMetrics
                changesCount={changes.length}
                totalNodes={totalNodes}
                doneNodes={doneNodes}
                progressPct={progressPct}
                onToggleChangesPanel={() => setPanelOpen((value) => !value)}
              />
            </div>
          </div>
        )}
      />

      <RoadmapPageToolbar
        changesCount={changes.length}
        totalNodes={totalNodes}
        doneNodes={doneNodes}
        progressPct={progressPct}
        onToggleChangesPanel={() => setPanelOpen((value) => !value)}
        currentCustomRoadmapId={customRoadmapId}
        currentTitle={roadmap?.title ?? ''}
        roadmaps={myRoadmaps}
      />

      {showLegacyHeader ? <header className="app-header">
        <div className="max-w-[1600px] mx-auto w-full px-6 h-full grid items-center gap-4" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          {/* 왼쪽: 뒤로 + 로고 */}
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="/roadmap-hub"
              className="text-gray-500 hover:text-gray-800 font-bold text-sm flex items-center gap-1"
            >
              <i className="fas fa-arrow-left" /> 목록
            </a>
            <a href="/home" className="flex items-center gap-2 font-bold text-gray-900">
              <i className="fas fa-code-branch text-[#00c471]" />
              <span>DevPath</span>
            </a>
          </div>

          {/* 가운데: 네비게이션 */}
          <nav className="flex justify-center overflow-x-auto">
            <div className="header-nav-links text-sm font-bold text-gray-500">
              <a href="/roadmap-hub" className="text-[#00c471] border-b-2 border-[#00c471] pb-1 transition">로드맵</a>
              <a href="/lecture-list" className="hover:text-[#00c471] transition">강의</a>
              <a href="/project-list" className="hover:text-[#00c471] transition">프로젝트</a>
              <a href="/community-list" className="hover:text-[#00c471] transition">커뮤니티</a>
              <a href="/job-matching" className="hover:text-[#00c471] transition">채용분석</a>
            </div>
          </nav>

          {/* 오른쪽: 변경사항 버튼 + 노드 카운트 + 진행률 + 프로필 */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 변경사항 버튼 */}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="relative flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
            >
              <i className="fas fa-history" />
              <span>변경사항</span>
              {changes.length > 0 && (
                <span className="[animation:badge-pulse_2s_infinite] absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                  {changes.length}
                </span>
              )}
            </button>

            {/* 노드 카운트 */}
            <div className={roadmapNodeCountWrapClassName} title="전체 / 완료">
              <div className={`${roadmapNodeCountCardClassName} total ${roadmapTotalNodeCountCardClassName}`}>
                <span className={roadmapNodeCountNumberClassName}>{totalNodes}</span>
                <span className={roadmapNodeCountLabelClassName}>전체</span>
              </div>
              <div className={`${roadmapNodeCountCardClassName} done ${roadmapDoneNodeCountCardClassName}`}>
                <span className={roadmapNodeCountNumberClassName}>{doneNodes}</span>
                <span className={roadmapNodeCountLabelClassName}>완료</span>
              </div>
            </div>

            {/* 진행률 */}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <span className="text-xs text-gray-500">진행률</span>
              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#00c471]" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs font-bold text-[#00c471]">{progressPct}%</span>
            </div>

            {/* 프로필 */}
            <div
              className="flex items-center gap-2 cursor-pointer ml-1"
                onClick={() => { window.location.href = '/profile' }}
            >
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                className="w-9 h-9 rounded-full border border-gray-200 shadow-sm"
                alt="me"
              />
            </div>
          </div>
        </div>
      </header> : null}

      {/* ── 추천 생성 상태 칩 ──────────────────────────────────────────────── */}
      {recommendStatus && recommendStatus.status !== 'IDLE' && (
        <div className="fixed bottom-20 right-6 z-[60]">
          {recommendStatus.status === 'RUNNING' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-white text-gray-700 border border-gray-300">
              <i className="fas fa-spinner fa-spin text-[#00c471]" />
              AI 추천 분석 중…
            </div>
          )}
          {recommendStatus.status === 'DONE' && recommendStatus.count > 0 && (
            <button
              onClick={() => { setPanelOpen(true); setRecommendStatus(null) }}
              className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-[#00c471] text-white hover:bg-green-600 transition"
            >
              <i className="fas fa-wand-magic-sparkles" />
              추천 {recommendStatus.count}개 — 보기
            </button>
          )}
          {recommendStatus.status === 'DONE' && recommendStatus.count === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-white text-gray-500 border border-gray-300">
              <i className="fas fa-circle-check text-gray-400" />
              추가 추천 없음
            </div>
          )}
          {recommendStatus.status === 'FAILED' && (
            <button
              onClick={async () => {
                const recommendationRoadmapId = roadmap?.originalRoadmapId ?? customRoadmapId
                const recommendationCustomRoadmapId =
                  roadmap?.originalRoadmapId == null ? customRoadmapId : null
                const nodeId = recommendStatus.nodeId
                if (recommendationRoadmapId == null || nodeId == null) { setRecommendStatus(null); return }
                try {
                  await roadmapApi.testRunDiagnosis(
                    recommendationRoadmapId,
                    nodeId,
                    recommendationCustomRoadmapId,
                  )
                } catch { /* 무시 */ }
                setRecommendStatus({ status: 'RUNNING', nodeId, count: 0 })
                setRecommendPolling(true)
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-white text-red-600 border border-red-300 hover:bg-red-50 transition"
            >
              <i className="fas fa-triangle-exclamation" />
              추천 생성 실패 — 다시 시도
            </button>
          )}
        </div>
      )}

      {/* ── 편집모드 토글 ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setEditMode((v) => !v)}
        className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg transition ${
          editMode
            ? 'bg-[#00c471] text-white hover:bg-green-600'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
        title="노드 순서변경·스킵·삭제 편집"
      >
        <i className={`fas ${editMode ? 'fa-check' : 'fa-pen'}`} />
        {editMode ? '편집 완료' : '편집'}
      </button>

      {/* ── 노드 드로어 ──────────────────────────────────────────────────────── */}
      <NodeDrawer
        node={drawerNode}
        customRoadmapId={customRoadmapId}
        originalRoadmapId={roadmap.originalRoadmapId}
        editMode={editMode}
        onClose={() => setDrawerNode(null)}
        onCleared={async () => {
          const updated = await roadmapApi.getMyRoadmapDetail(customRoadmapId)
          setRoadmap(updated)                       // 클리어 상태 즉시 반영

          // 추천은 백그라운드 생성되므로 진행 상태를 폴링한다(드로어/패널을 닫고
          // 다른 작업을 해도 완료되면 자동 표시). 실제 폴링은 아래 useEffect가 담당.
          setRecommendStatus({ status: 'RUNNING', nodeId: null, count: 0 })
          setRecommendPolling(true)
        }}
      />

      {/* ── 변경사항 패널 ─────────────────────────────────────────────────────── */}
      <ChangesPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        pendingChanges={changes}
        histories={histories}
        onApply={handleApply}
        onIgnore={handleIgnore}
        onApplyAll={handleApplyAll}
        processing={processing}
      />

      {/* ── 메인 콘텐츠 ───────────────────────────────────────────────────────── */}
      <main className={`${roadmapMainClassName}${panelOpen ? ' panel-open' : ''} relative w-full`}>

        {/* 로드맵 카테고리 라벨 (전환 드롭다운) */}
        <div className="fixed top-[calc(var(--roadmap-fixed-top)+12px)] left-8 z-[60]">
          <RoadmapSwitcherDropdown
            currentCustomRoadmapId={customRoadmapId}
            currentTitle={roadmap.title}
            roadmaps={myRoadmaps}
            badgeStyle
          />
        </div>

        <div className={`${roadmapContentClassName} relative flex flex-col items-center w-full`}>

          {/* ── 정보 아코디언 ────────────────────────────────────────────────── */}
          <div className="w-full max-w-4xl px-4 mt-8 mb-16 relative z-20">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setInfoOpen((v) => !v)}
              >
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <i className="fas fa-info-circle text-gray-400" />
                  {roadmap.infoTitle?.trim() || roadmap.title}
                </div>
                <i className={`fas fa-chevron-down text-gray-400 [transition:transform_0.3s]! ${infoOpen ? '[transform:rotate(180deg)]' : ''}`} />
              </div>
              <div className={`${infoOpen ? 'max-h-[800px] [transition:max-height_0.5s_ease-in]' : 'max-h-0 [transition:max-height_0.3s_ease-out]'} overflow-hidden bg-gray-50 border-t border-gray-100`}>
                <RoadmapInfoContent content={roadmap.infoContent} />
              </div>
            </div>
          </div>

          {/* ── 로드맵 트리 ─────────────────────────────────────────────────── */}
          <RoadmapGraph
            layout={roadmapLayout}
            proofCardByNodeId={proofCardByNodeId}
            changeByNodeId={changeByNodeId}
            processing={processing}
            onNodeClick={setDrawerNode}
            onApply={handleApply}
            onIgnore={handleIgnore}
          />

          <div className="flex justify-center items-center py-8 relative z-20">
            {progressPct === 100 ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#00c471] to-[#00e887] shadow-lg mb-6 animate-pulse">
                  <i className="fas fa-trophy text-white text-3xl" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">🎉 로드맵 완료!</h3>
                <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
                  {roadmap.title}의 모든 과정을 마스터하셨습니다.<br />
                  이제 실전 프로젝트로 나아갈 준비가 되었습니다!
                </p>
                <div className="mt-8 flex gap-3 justify-center">
                  <button
                    onClick={() => { window.location.href = '/project-list' }}
                    className="px-6 py-3 bg-[#00c471] hover:bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2"
                  >
                    <i className="fas fa-rocket" /> 프로젝트 시작하기
                  </button>
                  <button
                    onClick={() => { window.location.href = '/roadmap-hub' }}
                    className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm border-2 border-gray-200 transition flex items-center gap-2"
                  >
                    <i className="fas fa-map" /> 다른 로드맵 보러가기
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-30">
                <i className="fas fa-trophy text-4xl text-gray-400 mb-2" />
                <p className="text-xs text-gray-400 font-bold">모든 노드를 완료하면 트로피를 받습니다</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={closeAuthModal}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}
