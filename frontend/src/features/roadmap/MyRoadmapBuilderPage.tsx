


import { navigateTo } from '../../lib/spa-navigation'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import AuthModal from '../../components/AuthModal'
import LoginRequiredView from '../../components/LoginRequiredView'
import SiteHeader from '../../components/SiteHeader'


import { getModuleUsageKey } from './roadmap-builder-model'
import { TrashZone, TerminalDropZone, DroppableGap, MiniDragPreview, ModulePreviewPanel, DraggableModuleCard, DraggableSpineCard, DraggableBranchCard } from './roadmap-builder-support'

import { useMyRoadmapBuilderController } from './useMyRoadmapBuilderController'

function MyRoadmapBuilderPage() {
  const { session, profileImage, authView, setAuthView, templates, selectedRoadmapId, templateSearch, templateSection, templatePickerOpen, setTemplatePickerOpen, search, setSearch, setPreviewModuleKey, loading, fetchError, nodes, branchTarget, setBranchTarget, saveModalOpen, setSaveModalOpen, roadmapTitle, setRoadmapTitle, saving, saveError, savedCustomRoadmapId, showSuccessModal, setShowSuccessModal, activeDrag, editMyRoadmapId, editLoading, editLoadError, mainRef, titleInputRef, sensors, handleLogout, handleAuthenticated, selectedTemplate, templateSections, templateOptions, handleTemplateChange, handleTemplateSearchChange, handleTemplateSectionChange, reloadSelectedTemplate, usedIds, maxSortOrder, rows, filteredItems, visibleItemCountLabel, previewModule, handleAdd, handleBranchActivate, handleRemove, handleSwapBranch, handleClear, openSaveModal, handleSave, handleDragStart, handleDragEnd } = useMyRoadmapBuilderController()


  // ────────────────────────────────────────────
  // 미로그인 가드
  // ────────────────────────────────────────────

  if (!session?.userId) {
    return <LoginRequiredView message="나만의 로드맵 빌더는 로그인 후 이용할 수 있습니다." />
  }

  // ── DnD 파생값 ──
  const isDraggingModule    = activeDrag?.kind === 'MODULE'
  const isDraggingNode      = activeDrag?.kind === 'NODE'
  const isDraggingSpineNode = activeDrag?.kind === 'NODE' && activeDrag.branchGroup === null
  const showGaps            = activeDrag !== null
  const draggedModule       = activeDrag?.kind === 'MODULE' ? activeDrag.module : null
  const terminalGapId       = rows.length === 0 ? 'gap-0' : `gap-${maxSortOrder}`

  // ────────────────────────────────────────────
  // 렌더
  // ────────────────────────────────────────────

  if (!session) return <LoginRequiredView />

  return (
    <>
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => setAuthView('login')}
        activeNavHref="/roadmap-hub"
        brandSuffix="마스터 빌더"
      />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] pt-16 text-[#0F172A]">

      {/* 저장 성공 모달 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <i className="fas fa-check text-2xl text-[#00C471]" />
            </div>
            <h2 className="mb-1 text-xl font-extrabold text-gray-900">
              {editMyRoadmapId ? '수정 완료!' : '저장 완료!'}
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              {editMyRoadmapId
                ? '로드맵이 성공적으로 업데이트되었습니다.'
                : '나만의 로드맵이 성공적으로 저장되었습니다.'}
            </p>
            <div className="flex flex-col gap-3">
              {savedCustomRoadmapId != null && (
                <button
                  type="button"
                    onClick={() => { navigateTo(`/roadmap?id=${savedCustomRoadmapId}`) }}
                  className="w-full rounded-lg bg-[#00C471] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-600"
                >
                  <i className="fas fa-map mr-2" />나의 학습 로드맵으로 이동
                </button>
              )}
              {editMyRoadmapId && (
                <button
                  type="button"
                  onClick={() => { navigateTo('/my-roadmap-list') }}
                  className="w-full rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  <i className="fas fa-list mr-2" />내 로드맵 관리
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
              >
                계속 편집하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 저장 모달 */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-1 text-xl font-extrabold text-gray-900">로드맵 저장</h2>
            <p className="mb-6 text-sm text-gray-500">나만의 로드맵 이름을 입력해주세요.</p>
            <input
              ref={titleInputRef}
              type="text"
              value={roadmapTitle}
              onChange={(e) => setRoadmapTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder="예: 내 백엔드 개발자 로드맵"
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium focus:border-[#00C471] focus:outline-none focus:ring-2 focus:ring-[#00C471]/20"
            />
            {saveError && (
              <p className="mt-2 text-xs font-bold text-red-500">
                <i className="fas fa-exclamation-circle mr-1" />{saveError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !roadmapTitle.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#00C471] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? <><i className="fas fa-spinner fa-spin" /> 저장 중...</> : <><i className="fas fa-save" /> 저장</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── 좌측 사이드바 ── */}
        <aside className="z-10 flex w-80 flex-col border-r border-gray-200 bg-white shadow-lg md:w-96">

          {/* 카테고리 선택 */}
          <div className="shrink-0 border-b border-gray-200 bg-gray-50 p-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    현재 템플릿
                  </p>
                  <p className="mt-1 truncate text-sm font-extrabold text-gray-900">
                    {selectedTemplate?.label ?? '로드맵 템플릿 선택'}
                  </p>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                      {selectedTemplate?.sectionTitle ?? '미선택'}
                    </span>
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-[#00C471]">
                      표시 중 {visibleItemCountLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplatePickerOpen((open) => !open)}
                  className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-black text-gray-500 transition hover:border-[#00C471] hover:text-[#00C471]"
                >
                  변경 <i className={`fas ${templatePickerOpen ? 'fa-chevron-up' : 'fa-chevron-down'} ml-1 text-[10px]`} />
                </button>
              </div>

              {templatePickerOpen && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => handleTemplateSearchChange(e.target.value)}
                      placeholder="템플릿 검색"
                      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs font-bold text-gray-700 shadow-sm transition focus:border-[#00C471] focus:outline-none focus:ring-2 focus:ring-[#00C471]/20"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={templateSection}
                      onChange={(e) => handleTemplateSectionChange(e.target.value)}
                      disabled={templates.length === 0}
                      className="w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-xs font-bold text-gray-700 shadow-sm focus:border-[#00C471] focus:outline-none focus:ring-2 focus:ring-[#00C471]/20"
                    >
                      <option value="ALL">전체 분야</option>
                      {templateSections.map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <i className="fas fa-chevron-down text-xs" />
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedRoadmapId ?? ''}
                      onChange={(e) => handleTemplateChange(Number(e.target.value))}
                      disabled={templates.length === 0}
                      className="w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-xs font-bold text-gray-700 shadow-sm focus:border-[#00C471] focus:outline-none focus:ring-2 focus:ring-[#00C471]/20"
                    >
                      {templates.length === 0 && <option value="">로드맵 템플릿 없음</option>}
                      {templates.length > 0 && templateOptions.length === 0 && <option value="">필터 결과 없음</option>}
                      {templateOptions.map((template) => (
                        <option key={template.roadmapId} value={template.roadmapId}>
                          {template.label} - {template.sectionTitle}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <i className="fas fa-chevron-down text-xs" />
                    </div>
                  </div>
                  {selectedTemplate && (
                    <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-gray-500">
                      {selectedTemplate.item.subtitle ?? selectedTemplate.label}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 분기 모드 배너 */}
          {branchTarget !== null && (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-amber-700">
                    <i className="fas fa-code-branch mr-1" />
                    {branchTarget}번 위치에 분기 추가 중
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-600">
                    모듈을 클릭하거나 드래그하면 분기 노드로 추가됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBranchTarget(null)}
                  className="shrink-0 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-bold text-amber-600 transition hover:bg-amber-100"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 검색 */}
          <div className="shrink-0 border-b border-gray-100 bg-white p-4">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="학습 주제 검색..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-medium transition focus:border-[#00C471] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* 모듈 목록 */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
                <i className="fas fa-spinner fa-spin text-2xl" />
                <p className="text-sm font-medium">모듈 불러오는 중...</p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-red-400">
                <i className="fas fa-exclamation-triangle text-2xl" />
                <p className="text-sm font-bold">모듈을 불러오지 못했습니다.</p>
                <p className="text-xs text-gray-400">{fetchError}</p>
                <button
                  type="button"
                  onClick={reloadSelectedTemplate}
                  className="mt-1 rounded-lg border border-red-200 px-4 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
                >
                  다시 시도
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
                <i className="fas fa-search text-2xl" />
                <p className="text-sm font-medium">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((module) => {
                  const moduleKey = getModuleUsageKey(module)
                  const isUsed = usedIds.has(moduleKey)
                  const isAvailableForBranch = branchTarget !== null && !isUsed
                  return (
                    <DraggableModuleCard
                      key={moduleKey}
                      module={module}
                      isUsed={isUsed}
                      isPreviewed={previewModule !== null && getModuleUsageKey(previewModule) === moduleKey}
                      isAvailableForBranch={isAvailableForBranch}
                      onPreview={(nextModule) => setPreviewModuleKey(getModuleUsageKey(nextModule))}
                      onAdd={handleAdd}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <ModulePreviewPanel
            module={previewModule}
            isUsed={previewModule !== null && usedIds.has(getModuleUsageKey(previewModule))}
            isAvailableForBranch={previewModule !== null && branchTarget !== null && !usedIds.has(getModuleUsageKey(previewModule))}
            onAdd={handleAdd}
          />
        </aside>

        {/* ── 메인 캔버스 ── */}
        <main
          ref={mainRef}
          className="relative flex-1 overflow-y-auto bg-[#f9fafb] [background-image:radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:24px_24px] p-8 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-track]:bg-transparent"
        >

          {/* 편집 모드 배너 */}
          {editMyRoadmapId && !editLoading && !editLoadError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700">
              <i className="fas fa-pen-ruler" />
              편집 모드 — 수정 후 저장하면 기존 로드맵이 업데이트됩니다.
              <a href="/my-roadmap-list" className="ml-auto text-xs font-bold text-blue-500 hover:underline">
                내 로드맵 관리
              </a>
            </div>
          )}
          {editLoading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
              <i className="fas fa-circle-notch animate-spin text-[#00C471]" />
              기존 로드맵을 불러오는 중입니다...
            </div>
          )}
          {editLoadError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
              <i className="fas fa-exclamation-circle mr-2" />
              {editLoadError}
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            <div className="rounded-lg border border-gray-200 bg-white/95 px-3 py-1.5 text-sm font-bold text-gray-500 shadow-sm">
              총 <span className="font-black text-[#00C471]">{rows.length}</span> 챕터
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={nodes.length === 0}
              className="rounded-lg border border-gray-200 bg-white/95 px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <i className="fas fa-rotate-right mr-1" /> 초기화
            </button>
            <button
              type="button"
              onClick={openSaveModal}
              disabled={nodes.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[#00C471] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <i className="fas fa-save" /> {editMyRoadmapId ? '로드맵 수정' : '로드맵 저장'}
            </button>
          </div>
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-extrabold text-gray-900">My Learning Roadmap</h2>
              <p className="mt-2 text-sm text-gray-500">
                왼쪽 템플릿에서 직군을 넘나들며 필요한 기술을 클릭해 나만의 로드맵을 완성하세요.
              </p>
            </div>

            <div className="builder-timeline relative pb-40 pl-8">

              {/* 시작 노드 */}
              <div className="relative z-10 mb-10 flex items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gray-900 text-white shadow-xl ring-1 ring-gray-100">
                  <i className="fas fa-flag-checkered text-xl" />
                </div>
                <div className="relative ml-8 w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-gray-200 bg-white" />
                  <h3 className="text-lg font-bold text-gray-900">로드맵 설계 시작</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    <span className="inline-block">
                      모듈을 <strong className="text-[#00C471]">클릭</strong>하거나 <strong className="text-blue-500">드래그</strong>해 단계로 추가하세요.
                    </span>{' '}
                    <span className="inline-block">
                      이미 추가한 단계 위에 놓으면 <strong className="text-amber-500">분기</strong>가 만들어집니다.
                    </span>
                  </p>
                </div>
              </div>

              {/* gap-0: rows 있을 때만 (없으면 TerminalDropZone이 gap-0 커버) */}
              {rows.length > 0 && (
                <DroppableGap id="gap-0" forModule={isDraggingModule} forSpineNode={isDraggingSpineNode} draggedModule={draggedModule} />
              )}

              {/* rows 렌더링 */}
              {rows.map((row, idx) => {
                const isDraggingThisRowBranch =
                  activeDrag?.kind === 'NODE' &&
                  activeDrag.branchGroup !== null &&
                  activeDrag.sortOrder === row.sortOrder
                const nodeA = row.nodes[0]
                const nodeB = row.nodes[1]

                return (
                  <div key={row.sortOrder}>
                    <div className="group relative z-10 mb-2 animate-[builderStepPop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                      {row.isBranching ? (
                        // ── 분기 row ──
                        <div className="flex items-start">
                          <div className="z-10 mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-white text-xl font-black text-amber-500 shadow-lg">
                            {row.sortOrder}
                          </div>
                          <div className="relative ml-8 grid flex-1 grid-cols-2 gap-4 pt-7">
                            {/* ⇄ 스왑 버튼 */}
                            {row.nodes.length === 2 && (
                              <button
                                type="button"
                                onClick={() => handleSwapBranch(row.sortOrder)}
                                className="absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-gray-400 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-amber-300 hover:text-amber-500"
                              >
                                ⇄ 순서 변경
                              </button>
                            )}
                            {row.nodes.length === 2 ? (
                              <>
                                <DraggableBranchCard
                                  node={nodeA}
                                  label="A"
                                  onRemove={handleRemove}
                                  isDraggingBranchSibling={isDraggingThisRowBranch && activeDrag?.instanceId !== nodeA.instanceId}
                                />
                                <DraggableBranchCard
                                  node={nodeB}
                                  label="B"
                                  onRemove={handleRemove}
                                  isDraggingBranchSibling={isDraggingThisRowBranch && activeDrag?.instanceId !== nodeB.instanceId}
                                />
                              </>
                            ) : (
                              row.nodes.map((node, i) => (
                                <DraggableBranchCard
                                  key={node.instanceId}
                                  node={node}
                                  label={i === 0 ? 'A' : 'B'}
                                  onRemove={handleRemove}
                                  isDraggingBranchSibling={false}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        // ── 척추 row ──
                        <div className="flex items-start">
                          <div className="z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#00C471] bg-white text-xl font-black text-[#00C471] shadow-lg transition-colors duration-300 group-hover:border-red-400 group-hover:bg-red-50 group-hover:text-red-500">
                            {row.sortOrder}
                          </div>
                          <DraggableSpineCard
                            node={row.nodes[0]}
                            onRemove={handleRemove}
                            onBranch={handleBranchActivate}
                            isBranchActive={branchTarget === row.sortOrder}
                            isDraggingModule={isDraggingModule}
                          />
                        </div>
                      )}
                    </div>
                    {/* 마지막 row gap은 TerminalDropZone이 커버하므로 스킵 */}
                    {idx < rows.length - 1 && (
                      <DroppableGap
                        id={`gap-${row.sortOrder}`}
                        forModule={isDraggingModule}
                        forSpineNode={isDraggingSpineNode}
                        draggedModule={draggedModule}
                      />
                    )}
                  </div>
                )
              })}

              {/* TerminalDropZone: 힌트 박스 대체, 항상 렌더 */}
              <TerminalDropZone
                id={terminalGapId}
                showGaps={showGaps}
                forModule={isDraggingModule}
                forSpineNode={isDraggingSpineNode}
                draggedModule={draggedModule}
              />

            </div>
          </div>
        </main>
      </div>

      {/* TrashZone: 노드 드래그 중에만 표시 (fixed 우하단) */}
      {isDraggingNode && <TrashZone />}

      {/* DragOverlay */}
      <DragOverlay dropAnimation={null}>
        {activeDrag?.kind === 'MODULE' && (
          <MiniDragPreview
            title={activeDrag.module.title}
            icon={activeDrag.module.icon}
            color={activeDrag.module.color}
            bgColor={activeDrag.module.bgColor}
          />
        )}
        {activeDrag?.kind === 'NODE' && (
          <div className="flex cursor-grabbing items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-2xl">
            <i className="fas fa-grip-vertical text-gray-400" />
            {nodes.find((n) => n.instanceId === activeDrag.instanceId)?.module.title ?? ''}
          </div>
        )}
      </DragOverlay>

        </div>
      </DndContext>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </>
  )
}

export default MyRoadmapBuilderPage
