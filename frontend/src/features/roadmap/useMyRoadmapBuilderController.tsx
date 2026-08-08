import { useAuthSession } from '../../lib/useAuthSession'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { type AuthView } from '../../components/AuthModal'


import { authApi, userApi } from '../../lib/api/auth'
import { roadmapApi } from '../../lib/api/roadmap'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from '../../lib/auth-session'
import { getRoadmapNodeVisual } from '../../lib/roadmap-icons'
import type { SkillModule, RoadmapTemplate, BuilderNode, TimelineRow, ActiveDrag } from './roadmap-builder-model'
import { makeInstanceId, getModuleUsageKey, mapDetailToModules, buildRoadmapTemplates, filterRoadmapTemplates } from './roadmap-builder-model'


// ────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────

function readEditIdFromLocation(): number | null {
  const raw = new URLSearchParams(window.location.search).get('edit')
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}export function useMyRoadmapBuilderController() {
  const [session,setSession] = useAuthSession()
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [templates, setTemplates] = useState<RoadmapTemplate[]>([])
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<number | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateSection, setTemplateSection] = useState('ALL')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<SkillModule[]>([])
  const [previewModuleKey, setPreviewModuleKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<BuilderNode[]>([])
  const [branchTarget, setBranchTarget] = useState<number | null>(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [roadmapTitle, setRoadmapTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCustomRoadmapId, setSavedCustomRoadmapId] = useState<number | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  // 편집 모드: URL ?edit={myRoadmapId}
  const [editMyRoadmapId] = useState<number | null>(() => readEditIdFromLocation())
  const [editLoading, setEditLoading] = useState(false)
  const [editLoadError, setEditLoadError] = useState<string | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [setSession])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      return
    }

    const controller = new AbortController()
    userApi
      .getMyProfile(controller.signal)
      .then((profile) => setProfileImage(profile.profileImage))
      .catch(() => setProfileImage(null))

    return () => controller.abort()
  }, [session])

  // 편집 모드: 기존 로드맵 로드
  useEffect(() => {
    if (!editMyRoadmapId || !session) return
    const controller = new AbortController()
    setEditLoading(true)
    setEditLoadError(null)

    fetch(`/api/builder/roadmaps/${editMyRoadmapId}`, {
      headers: { Authorization: `Bearer ${session.accessToken ?? ''}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`로드맵 로드 실패 (${res.status})`)
        return res.json() as Promise<{ data: {
          myRoadmapId: number
          title: string
          customRoadmapId: number | null
          modules: Array<{
            source: 'BUILDER_MODULE' | 'OFFICIAL_NODE'
            builderModuleId: number | null
            originalNodeId: number | null
            moduleId: string
            category: string
            title: string
            icon: string
            color: string
            bgColor: string
            topics: string[]
            sortOrder: number
            branchGroup: number | null
          }>
        }}>
      })
      .then(({ data }) => {
        setRoadmapTitle(data.title)
        setNodes(
          data.modules.map((m) => {
            const officialVisual = m.source === 'OFFICIAL_NODE'
              ? getRoadmapNodeVisual({
                  title: m.title,
                  subTopics: m.topics ?? [],
                  roadmapTitle: m.category,
                  category: m.category,
                })
              : null

            return {
              instanceId: makeInstanceId(),
              sortOrder: m.sortOrder,
              branchGroup: m.branchGroup,
              module:
                m.source === 'OFFICIAL_NODE'
                  ? {
                      dbId: -(m.originalNodeId!),
                      source: 'OFFICIAL_NODE' as const,
                      builderModuleId: null,
                      originalNodeId: m.originalNodeId,
                      id: m.moduleId,
                      title: m.title,
                      category: m.category,
                      icon: officialVisual?.icon ?? m.icon,
                      color: officialVisual?.color ?? m.color,
                      bgColor: officialVisual?.bgColor ?? m.bgColor,
                      topics: m.topics ?? [],
                    }
                  : {
                      dbId: m.builderModuleId!,
                      source: 'BUILDER_MODULE' as const,
                      builderModuleId: m.builderModuleId,
                      originalNodeId: null,
                      id: m.moduleId,
                      title: m.title,
                      category: m.category,
                      icon: m.icon,
                      color: m.color,
                      bgColor: m.bgColor,
                      topics: m.topics ?? [],
                    },
            }
          }),
        )
      })
      .catch((err) => {
        if ((err as DOMException).name === 'AbortError') return
        setEditLoadError(err instanceof Error ? err.message : '로드맵을 불러오지 못했습니다.')
      })
      .finally(() => setEditLoading(false))

    return () => controller.abort()
  }, [editMyRoadmapId, session])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃이 실패해도 로컬 세션은 정리한다.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
    }
  }

  function handleAuthenticated() {
    setSession(readStoredAuthSession())
    setAuthView(null)
  }

  // ── 로드맵 허브 템플릿 API 호출 ──
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.roadmapId === selectedRoadmapId) ?? null,
    [templates, selectedRoadmapId],
  )

  const templateSections = useMemo(
    () => Array.from(new Set(templates.map((template) => template.sectionTitle))),
    [templates],
  )

  const filteredTemplates = useMemo(
    () => filterRoadmapTemplates(templates, templateSection, templateSearch),
    [templateSearch, templateSection, templates],
  )

  const templateOptions = filteredTemplates

  const loadSelectedRoadmap = useCallback(
    async (roadmapId: number, signal?: AbortSignal) => {
      setLoading(true)
      setFetchError(null)

      try {
        const detail = await roadmapApi.getOfficialRoadmapDetail(roadmapId, signal)
        const template = templates.find((item) => item.roadmapId === roadmapId) ?? null
        setItems(mapDetailToModules(detail, template))
        setPreviewModuleKey(null)
        setBranchTarget(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFetchError(err instanceof Error ? err.message : 'Failed to load roadmap template.')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [templates],
  )

  const loadRoadmapCatalog = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setFetchError(null)

    try {
      const catalog = await roadmapApi.getHubCatalog(signal)
      const nextTemplates = buildRoadmapTemplates(catalog)
      setTemplates(nextTemplates)
      setSelectedRoadmapId((current) =>
        nextTemplates.some((template) => template.roadmapId === current)
          ? current
          : nextTemplates[0]?.roadmapId ?? null,
      )
      if (nextTemplates.length === 0) {
        setItems([])
        setNodes([])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setFetchError(err instanceof Error ? err.message : 'Failed to load roadmap catalog.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadRoadmapCatalog(controller.signal)
    return () => controller.abort()
  }, [loadRoadmapCatalog])

  useEffect(() => {
    if (selectedRoadmapId === null || templates.length === 0) return
    const controller = new AbortController()
    void loadSelectedRoadmap(selectedRoadmapId, controller.signal)
    return () => controller.abort()
  }, [loadSelectedRoadmap, selectedRoadmapId, templates.length])

  const handleTemplateChange = useCallback((roadmapId: number) => {
    if (!Number.isFinite(roadmapId) || roadmapId <= 0) return
    setSelectedRoadmapId(roadmapId)
    setSearch('')
    setPreviewModuleKey(null)
    setBranchTarget(null)
    setTemplatePickerOpen(false)
  }, [])

  const resetTemplateSelection = useCallback((nextSection: string, nextSearch: string) => {
    const nextTemplates = filterRoadmapTemplates(templates, nextSection, nextSearch)
    const nextRoadmapId = nextTemplates[0]?.roadmapId ?? null
    setSelectedRoadmapId(nextRoadmapId)
    setSearch('')
    setPreviewModuleKey(null)
    setBranchTarget(null)

    if (nextRoadmapId === null) {
      setItems([])
    }
  }, [templates])

  const handleTemplateSearchChange = useCallback((value: string) => {
    setTemplateSearch(value)
    resetTemplateSelection(templateSection, value)
  }, [resetTemplateSelection, templateSection])

  const handleTemplateSectionChange = useCallback((value: string) => {
    setTemplateSection(value)
    resetTemplateSelection(value, templateSearch)
  }, [resetTemplateSelection, templateSearch])

  const reloadSelectedTemplate = useCallback(() => {
    if (selectedRoadmapId !== null) {
      void loadSelectedRoadmap(selectedRoadmapId)
    } else {
      void loadRoadmapCatalog()
    }
  }, [loadRoadmapCatalog, loadSelectedRoadmap, selectedRoadmapId])

  // 모달 열릴 때 포커스
  useEffect(() => {
    if (saveModalOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 50)
    }
  }, [saveModalOpen])

  // dbId 기준 중복 방지 (크로스 카테고리 혼합 시에도 정확)
  const usedIds = useMemo(() => new Set(nodes.map((n) => getModuleUsageKey(n.module))), [nodes])

  const maxSortOrder = useMemo(
    () => (nodes.length === 0 ? 0 : Math.max(...nodes.map((n) => n.sortOrder))),
    [nodes],
  )

  // sortOrder 기준 rows 그룹화
  const rows = useMemo<TimelineRow[]>(() => {
    const map = new Map<number, BuilderNode[]>()
    for (const node of nodes) {
      const arr = map.get(node.sortOrder) ?? []
      arr.push(node)
      map.set(node.sortOrder, arr)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([sortOrder, rowNodes]) => ({
        sortOrder,
        nodes: [...rowNodes].sort((a, b) => (a.branchGroup ?? 0) - (b.branchGroup ?? 0)),
        isBranching: rowNodes.some((n) => n.branchGroup !== null),
      }))
  }, [nodes])

  // 좌측 패널 필터링
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.topics.some((t) => t.toLowerCase().includes(q)),
    )
  }, [items, search])

  const visibleItemCountLabel =
    items.length === 0
      ? '0개'
      : filteredItems.length === items.length
        ? `${items.length}개`
        : `${filteredItems.length}/${items.length}개`

  const previewModule = useMemo(() => {
    if (filteredItems.length === 0) return null

    if (previewModuleKey) {
      const selectedModule = filteredItems.find((item) => getModuleUsageKey(item) === previewModuleKey)
      if (selectedModule) return selectedModule
    }

    return filteredItems[0]
  }, [filteredItems, previewModuleKey])

  // 모듈 추가 (척추 or 분기)
  const handleAdd = useCallback(
    (module: SkillModule) => {
      if (usedIds.has(getModuleUsageKey(module))) return

      if (branchTarget === null) {
        setNodes((prev) => [
          ...prev,
          { instanceId: makeInstanceId(), module, sortOrder: maxSortOrder + 1, branchGroup: null },
        ])
        setTimeout(() => {
          mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' })
        }, 50)
      } else {
        setNodes((prev) => {
          const updated = prev.map((n) =>
            n.sortOrder === branchTarget && n.branchGroup === null
              ? { ...n, branchGroup: 1 }
              : n,
          )
          return [
            ...updated,
            { instanceId: makeInstanceId(), module, sortOrder: branchTarget, branchGroup: 2 },
          ]
        })
        setBranchTarget(null)
      }
    },
    [usedIds, branchTarget, maxSortOrder],
  )

  // 분기 모드 진입
  const handleBranchActivate = useCallback(
    (sortOrder: number) => {
      const rowNodes = nodes.filter((n) => n.sortOrder === sortOrder)
      if (rowNodes.some((n) => n.branchGroup !== null)) {
        alert('이미 분기가 존재하는 위치입니다. 분기는 위치당 최대 2개까지 가능합니다.')
        return
      }
      setBranchTarget(sortOrder)
    },
    [nodes],
  )

  // 노드 삭제 + 후처리
  const handleRemove = useCallback((instanceId: string) => {
    setNodes((prev) => {
      const target = prev.find((n) => n.instanceId === instanceId)
      if (!target) return prev

      const { sortOrder, branchGroup } = target
      const sameRow = prev.filter((n) => n.sortOrder === sortOrder && n.instanceId !== instanceId)

      let updated: BuilderNode[]

      if (branchGroup === null) {
        // 척추 노드 삭제 → 이후 sortOrder 전부 -1 재정렬
        updated = prev
          .filter((n) => n.instanceId !== instanceId)
          .map((n) => (n.sortOrder > sortOrder ? { ...n, sortOrder: n.sortOrder - 1 } : n))
      } else {
        if (sameRow.length === 1) {
          // 분기 하나 남음 → 척추로 복원
          updated = prev
            .filter((n) => n.instanceId !== instanceId)
            .map((n) => (n.sortOrder === sortOrder ? { ...n, branchGroup: null } : n))
        } else {
          // 마지막 분기 노드 삭제 → row 제거 + 이후 재정렬
          updated = prev
            .filter((n) => n.instanceId !== instanceId)
            .map((n) => (n.sortOrder > sortOrder ? { ...n, sortOrder: n.sortOrder - 1 } : n))
        }
      }

      return updated
    })
  }, [])

  const handleSwapBranch = useCallback((sortOrder: number) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.sortOrder === sortOrder && n.branchGroup !== null
          ? { ...n, branchGroup: n.branchGroup === 1 ? 2 : 1 }
          : n,
      ),
    )
  }, [])

  const handleClear = useCallback(() => {
    if (nodes.length === 0) return
    if (window.confirm('진행 중인 커리큘럼 설계를 모두 초기화하시겠습니까?')) {
      setNodes([])
      setBranchTarget(null)
    }
  }, [nodes.length])

  // 저장 모달 열기
  const openSaveModal = useCallback(() => {
    setSaveError(null)
    // 편집 모드가 아닐 때만 제목 초기화 (편집 시 기존 제목 유지)
    if (!editMyRoadmapId) setRoadmapTitle('')
    setSaveModalOpen(true)
  }, [editMyRoadmapId])

  // 로드맵 저장
  const handleSave = useCallback(async () => {
    if (!session?.userId) return
    if (!roadmapTitle.trim()) {
      setSaveError('로드맵 이름을 입력해주세요.')
      return
    }

    setSaving(true)
    setSaveError(null)

    const isEdit = editMyRoadmapId !== null
    const url = isEdit ? `/api/builder/roadmaps/${editMyRoadmapId}` : `/api/builder/roadmaps`
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken ?? ''}`,
        },
        body: JSON.stringify({
          title: roadmapTitle.trim(),
          modules: nodes.map((n) => ({
            builderModuleId: n.module.source === 'BUILDER_MODULE' ? n.module.builderModuleId : null,
            originalNodeId: n.module.source === 'OFFICIAL_NODE' ? n.module.originalNodeId : null,
            sortOrder: n.sortOrder,
            branchGroup: n.branchGroup,
          })),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { message?: string }).message ?? `저장 실패 (${res.status})`)
      }

      const data = await res.json()
      const customRoadmapId = (data.data as { customRoadmapId?: number }).customRoadmapId ?? null
      setSavedCustomRoadmapId(customRoadmapId)
      setSaveModalOpen(false)
      if (!isEdit) {
        setNodes([])
        setBranchTarget(null)
        setRoadmapTitle('')
      }
      setShowSuccessModal(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [session, roadmapTitle, nodes, editMyRoadmapId])

  // ── 드래그 핸들러 ──
  function handleDragStart(event: DragStartEvent) {
    setActiveDrag(event.active.data.current as ActiveDrag)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return

    const drag = active.data.current as ActiveDrag
    const overId = String(over.id)

    if (drag.kind === 'MODULE') {
      if (usedIds.has(getModuleUsageKey(drag.module))) return

      if (overId.startsWith('gap-')) {
        const insertAfter = parseInt(overId.slice(4))
        const newSortOrder = insertAfter + 1
        setNodes((prev) => {
          const shifted = prev.map((n) =>
            n.sortOrder >= newSortOrder ? { ...n, sortOrder: n.sortOrder + 1 } : n,
          )
          return [
            ...shifted,
            { instanceId: makeInstanceId(), module: drag.module, sortOrder: newSortOrder, branchGroup: null },
          ]
        })
      } else if (overId.startsWith('on-spine-')) {
        const targetSortOrder = parseInt(overId.slice(9))
        setNodes((prev) => {
          const hasExistingBranch = prev.some(
            (n) => n.sortOrder === targetSortOrder && n.branchGroup !== null,
          )
          if (hasExistingBranch) return prev
          const updated = prev.map((n) =>
            n.sortOrder === targetSortOrder && n.branchGroup === null
              ? { ...n, branchGroup: 1 }
              : n,
          )
          return [
            ...updated,
            { instanceId: makeInstanceId(), module: drag.module, sortOrder: targetSortOrder, branchGroup: 2 },
          ]
        })
      }
    } else if (drag.kind === 'NODE') {
      if (overId === 'trash') {
        handleRemove(drag.instanceId)
      } else if (overId.startsWith('gap-') && drag.branchGroup === null) {
        const insertAfter = parseInt(overId.slice(4))
        const movingSortOrder = drag.sortOrder
        if (insertAfter === movingSortOrder) return
        setNodes((prev) => {
          const sortOrders = [...new Set(prev.map((n) => n.sortOrder))].sort((a, b) => a - b)
          const idx = sortOrders.indexOf(movingSortOrder)
          if (idx === -1) return prev
          sortOrders.splice(idx, 1)
          let insertIdx: number
          if (insertAfter === 0) {
            insertIdx = 0
          } else {
            insertIdx = sortOrders.findIndex((s) => s > insertAfter)
            if (insertIdx === -1) insertIdx = sortOrders.length
          }
          sortOrders.splice(insertIdx, 0, movingSortOrder)
          const mapping = new Map(sortOrders.map((old, i) => [old, i + 1]))
          return prev.map((n) => ({ ...n, sortOrder: mapping.get(n.sortOrder) ?? n.sortOrder }))
        })
      } else if (overId.startsWith('branch-swap-')) {
        const targetInstanceId = overId.slice(12)
        if (drag.branchGroup !== null) {
          setNodes((prev) => {
            const dragNode = prev.find((n) => n.instanceId === drag.instanceId)
            const targetNode = prev.find((n) => n.instanceId === targetInstanceId)
            if (!dragNode || !targetNode || dragNode.sortOrder !== targetNode.sortOrder) return prev
            return prev.map((n) => {
              if (n.instanceId === drag.instanceId) return { ...n, branchGroup: targetNode.branchGroup }
              if (n.instanceId === targetInstanceId) return { ...n, branchGroup: dragNode.branchGroup }
              return n
            })
          })
        }
      }
      // NODE → on-spine, 분기 NODE → gap: 무시
    }
  }
  return { session, setSession, profileImage, setProfileImage, authView, setAuthView, templates, setTemplates, selectedRoadmapId, setSelectedRoadmapId, templateSearch, setTemplateSearch, templateSection, setTemplateSection, templatePickerOpen, setTemplatePickerOpen, search, setSearch, items, setItems, previewModuleKey, setPreviewModuleKey, loading, setLoading, fetchError, setFetchError, nodes, setNodes, branchTarget, setBranchTarget, saveModalOpen, setSaveModalOpen, roadmapTitle, setRoadmapTitle, saving, setSaving, saveError, setSaveError, savedCustomRoadmapId, setSavedCustomRoadmapId, showSuccessModal, setShowSuccessModal, activeDrag, setActiveDrag, editMyRoadmapId, editLoading, setEditLoading, editLoadError, setEditLoadError, mainRef, titleInputRef, sensors, handleLogout, handleAuthenticated, selectedTemplate, templateSections, filteredTemplates, templateOptions, loadSelectedRoadmap, loadRoadmapCatalog, handleTemplateChange, resetTemplateSelection, handleTemplateSearchChange, handleTemplateSectionChange, reloadSelectedTemplate, usedIds, maxSortOrder, rows, filteredItems, visibleItemCountLabel, previewModule, handleAdd, handleBranchActivate, handleRemove, handleSwapBranch, handleClear, openSaveModal, handleSave, handleDragStart, handleDragEnd }
}