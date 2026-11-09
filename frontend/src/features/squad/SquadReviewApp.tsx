


import { useCallback } from 'react'
import AuthModal from '../../components/AuthModal'
import SquadWorkspaceAside from '../../components/SquadWorkspaceAside'
import SquadReviewLoadingContent from './SquadReviewLoadingContent'
import SquadWorkspaceHeader from '../../components/SquadWorkspaceHeader'
import UserAvatar from '../../components/UserAvatar'


import type { CodeReviewSummary } from './review-types'


function formatRelativeTime(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  if (diffDays === 1) {
    return '어제'
  }

  return `${diffDays}일 전`
}

function statusBadgeClass(status: CodeReviewSummary['status']) {
  if (status === 'OPEN') {
    return 'bg-green-100 text-green-700 border-green-200'
  }

  if (status === 'MERGED') {
    return 'bg-purple-100 text-purple-700 border-purple-200'
  }

  return 'bg-red-100 text-red-600 border-red-200'
}

function statusLabel(status: CodeReviewSummary['status']) {
  if (status === 'OPEN') {
    return '검토 중'
  }

  if (status === 'MERGED') {
    return '병합 완료'
  }

  return '닫힘'
}


import { useSquadReviewController } from './useSquadReviewController'
import type { AiWorkspacePageProps } from './AiWorkspaceDesignPanels'

export default function SquadReviewApp({ aiWorkspace = false, design, projectName: workspaceProjectName }: AiWorkspacePageProps = {}) {
  const { workspaceId, session, authView, setAuthView, board, detail, activeTab, setActiveTab, loading, detailLoading, saving, statusLoading, modalOpen, form, setForm, commentDraft, setCommentDraft, commentSaving, toast, error, commentInputRef, handleLogout, handleAuthenticated, openCreateModal, closeCreateModal, submitCreate, updateReviewStatus, insertCommentFormat, submitComment, members, projectName, openReviews, closedReviews, visibleReviews, hasAnyReviews, currentUserName, currentProfileImage, currentReviewFiles, selectedReviewFile, renderReviewCard, renderFileSelector, renderAiReviewCard, renderDiff, renderEmptyDetail, renderDetailLoading } = useSquadReviewController()
  const pendingFindingCount = (detail?.aiReview?.comments ?? []).filter(comment => !comment.status || comment.status === 'PENDING').length
  const displayedProjectName = board?.projectName ?? workspaceProjectName ?? design?.title ?? ''

  const reviewActionsRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return

    // 하단 안내·버튼이 줄바꿈되거나 화면 크기가 바뀌어도 플로팅 도구와 16px 간격을 유지한다.
    const updateClearance = () => {
      const height = element.getBoundingClientRect().height
      document.body.style.setProperty('--squad-review-tools-bottom', `${height > 0 ? Math.ceil(height) + 16 : 0}px`)
    }
    const observer = new ResizeObserver(updateClearance)
    observer.observe(element, { box: 'border-box' })
    updateClearance()

    return () => {
      observer.disconnect()
      document.body.style.removeProperty('--squad-review-tools-bottom')
    }
  }, [])

  if (loading) {
    return (
      <div className="squad-dashboard-page squad-review-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <SquadWorkspaceAside activePage="review" workspaceId={workspaceId} projectName={displayedProjectName} aiWorkspace={aiWorkspace} />
        <div className="flex min-w-0 flex-1 flex-col">
          <SquadWorkspaceHeader aiWorkspace={aiWorkspace} workspaceId={workspaceId} projectName={displayedProjectName} projectNameLoading={!displayedProjectName} members={[]} statusLabel="코드 피드백" statusActive currentUserName={session?.name} onLogout={handleLogout} avatarFallback="initials" />
          <SquadReviewLoadingContent />
        </div>
      </div>
    )
  }

  if (error && !board) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
        {authView ? (
          <AuthModal view={authView} onClose={() => setAuthView(null)} onViewChange={setAuthView} onAuthenticated={handleAuthenticated} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-review-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
      <SquadWorkspaceAside
        aiWorkspace={aiWorkspace}
        activePage="review"
        workspaceId={workspaceId}
        projectName={projectName}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          aiWorkspace={aiWorkspace}
          workspaceId={workspaceId}
          projectName={displayedProjectName}
          projectNameLoading={!displayedProjectName}
          members={members}
          statusLabel="코드 피드백"
          statusActive
          avatarFallback="initials"
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex max-h-[32vh] w-full shrink-0 flex-col border-b border-gray-200 bg-white lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r xl:w-[340px]">
            <div className="border-b border-gray-100 p-3 lg:p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-lg tracking-tight">
                    {hasAnyReviews ? '코드 리뷰 & 피드백' : 'Pull Requests'}
                  </h2>
                  <p className="mt-1 hidden text-sm leading-5 text-gray-600 lg:block">PR을 선택해 변경 사항을 검토하세요.</p>
                </div>
                <button onClick={openCreateModal} className="squad-review-add-button flex h-[32px]! min-h-[32px]! max-h-[32px]! w-[32px]! min-w-[32px]! max-w-[32px]! flex-[0_0_32px]! items-center justify-center rounded-[8px]! bg-gray-900 p-0! text-[14px]! leading-none! text-white shadow-md transition hover:bg-black box-border!" title="새 리뷰 요청">
                  <i className="fas fa-plus text-[14px]! leading-none!"></i>
                </button>
              </div>

              <div className="squad-review-tab-group flex gap-[8px]! rounded-[12px]! border-[1px]! border-[#F3F4F6]! bg-[#F9FAFB]! p-[4px]! box-border!">
                <button
                  onClick={() => setActiveTab('open')}
                  className={activeTab === 'open' ? 'squad-review-tab-button h-[28px]! min-h-[28px]! flex-1 whitespace-nowrap rounded-[8px]! border border-gray-200 bg-white px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold! text-gray-900 shadow-sm transition box-border!' : 'squad-review-tab-button h-[28px]! min-h-[28px]! flex-1 whitespace-nowrap rounded-[8px]! px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold! text-gray-500 transition hover:text-gray-900 box-border!'}
                >
                  {hasAnyReviews ? `열림 (${openReviews.length})` : `Open (${openReviews.length})`}
                </button>
                <button
                  onClick={() => setActiveTab('closed')}
                  className={activeTab === 'closed' ? 'squad-review-tab-button h-[28px]! min-h-[28px]! flex-1 whitespace-nowrap rounded-[8px]! border border-gray-200 bg-white px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold! text-gray-900 shadow-sm transition box-border!' : 'squad-review-tab-button h-[28px]! min-h-[28px]! flex-1 whitespace-nowrap rounded-[8px]! px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold! text-gray-500 transition hover:text-gray-900 box-border!'}
                >
                  {hasAnyReviews ? `닫힘 (${closedReviews.length})` : `Closed (${closedReviews.length})`}
                </button>
              </div>

              <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-6 text-gray-600">
                <summary className="cursor-pointer font-semibold text-gray-700">
                  GitHub 동기화 안내
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>GitHub 토큰을 연결하면 더 많은 PR과 파일 변경 내역을 안정적으로 가져옵니다.</li>
                  <li>토큰이 없을 때는 기본 조회 범위 안에서 최근 PR만 먼저 보여줍니다.</li>
                  <li>전체 리뷰 흐름이 필요하면 스쿼드 설정에서 GitHub 토큰을 저장하세요.</li>
                </ul>
              </details>
            </div>

            <div className="relative min-h-0 flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar">
              {visibleReviews.length > 0 ? (
                visibleReviews.map(renderReviewCard)
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <p className="text-sm font-bold text-gray-500 mb-1">
                    {activeTab === 'open' ? '진행 중인 리뷰 요청이 없습니다' : '닫힌 리뷰 요청이 없습니다'}
                  </p>
                  {activeTab === 'open' ? (
                    <p className="text-xs text-gray-400 font-medium">새로운 코드를 올리고 피드백을 받아보세요.</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#F9FAFB]" id="prDetailView">
            {detailLoading && !detail ? (
              renderDetailLoading()
            ) : detail ? (
              <>
                <div className="shrink-0 border-b border-gray-200 bg-white p-4 lg:px-6 lg:py-5">
                  <div className="mb-3 flex flex-wrap items-start gap-3">
                    <span className={`${statusBadgeClass(detail.summary.status)} flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold`}>
                      <i className="fas fa-code-branch"></i> {statusLabel(detail.summary.status)}
                    </span>
                    <h1 className="min-w-0 flex-1 break-words text-lg font-bold leading-7 tracking-tight text-gray-900 sm:text-xl sm:leading-8" title={detail.summary.title}>
                      {detail.summary.title}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-gray-600">
                    <span className="mr-1 inline-flex items-center gap-2 font-semibold text-gray-800"><UserAvatar name={detail.summary.authorName ?? '팀원'} imageUrl={detail.summary.authorProfileImage} fallback="initials" className="h-7 w-7" />{detail.summary.authorName ?? '팀원'}</span>
                    <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-semibold tabular-nums"><span className="font-normal text-gray-600">변경</span><span className="text-green-700">+{detail.summary.additions}</span><span className="text-red-600">−{detail.summary.deletions}</span></span>
                    <span className="max-w-full break-all rounded border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-xs text-blue-800">{detail.summary.sourceBranch}</span>
                    <span aria-label="병합 대상" className="text-gray-400">→</span>
                    <span className="max-w-full break-all rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700">{detail.summary.targetBranch}</span>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 custom-scrollbar lg:p-6" style={{ paddingBottom: 'calc(var(--squad-review-tools-bottom, 96px) + 150px)' }} id="mainScrollArea">
                  {renderAiReviewCard()}
                  {renderDiff()}

                  <div className="space-y-4 pt-4" id="commentThread">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                        <i className="fas fa-comments text-gray-400"></i> 팀원 피드백
                      </h3>
                      {selectedReviewFile ? (
                        <span className="max-w-full break-all rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600" title={selectedReviewFile.filePath}>
                          선택 파일 · {selectedReviewFile.filePath}
                        </span>
                      ) : null}
                    </div>

                    {(detail.comments ?? []).length ? (
                      (detail.comments ?? []).map((comment) => (
                        <div key={comment.commentId} className="flex gap-4 items-start">
                          <UserAvatar
                            name={comment.authorName ?? '팀원'}
                            fallback="initials"
                            imageUrl={comment.authorProfileImage}
                            className="w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm mt-1"
                            iconClassName="text-xs"
                          />
                          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl rounded-tl-none border border-gray-200 bg-white shadow-sm">
                            <div className="bg-gray-50 border-b border-gray-100 p-3 flex justify-between items-center">
                              <div className="min-w-0">
                                <span className="text-sm font-semibold text-gray-900">
                                  {comment.authorName ?? '팀원'}
                                  <span className="font-normal text-gray-500 ml-1">{formatRelativeTime(comment.createdAt)}</span>
                                </span>
                                {comment.filePath ? (
                                  <p className="mt-1 max-w-full break-all text-xs text-gray-600" title={comment.filePath}>
                                    <i className="fas fa-file-code mr-1"></i>{comment.filePath}
                                  </p>
                                ) : null}
                              </div>
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200">
                                {!comment.statusLabel || comment.statusLabel === 'Commented' ? '피드백' : comment.statusLabel}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap break-words p-4 text-sm leading-7 text-gray-700">
                              {comment.body}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-500 font-medium shadow-sm">
                        아직 팀원이 남긴 피드백이 없습니다. AI 리뷰 결과를 기준으로 팀원들과 수정 방향을 논의해보세요.
                      </div>
                    )}

                    <form onSubmit={submitComment} className="flex gap-4 items-start">
                      <UserAvatar
                        name={currentUserName}
                        fallback="initials"
                        imageUrl={currentProfileImage}
                        className="w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm mt-1"
                        iconClassName="text-xs"
                      />
                      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors focus-within:border-brand">
                        <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-1 text-gray-600">
                          {selectedReviewFile ? (
                            <div className="mr-auto min-w-0 flex-1">
                              {renderFileSelector(currentReviewFiles, selectedReviewFile, true)}
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => insertCommentFormat('**', '**')}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded transition"
                            title="굵게"
                          >
                            <i className="fas fa-bold text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertCommentFormat('`', '`')}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded transition"
                            title="코드"
                          >
                            <i className="fas fa-code text-xs"></i>
                          </button>
                        </div>
                        <textarea
                          ref={commentInputRef}
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          className="w-full p-4 h-24 outline-none resize-y text-sm custom-scrollbar"
                          placeholder="피드백에 대한 답변이나 새로운 코멘트를 남겨보세요."
                        />
                        <div className="flex min-h-16 justify-start gap-2 border-t border-gray-100 bg-gray-50 p-3">
                          <button
                            type="submit"
                            disabled={commentSaving}
                            className="px-5 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition shadow-md disabled:opacity-50"
                          >
                            {commentSaving ? '등록 중' : '피드백 등록'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

                <div ref={reviewActionsRef} className="squad-review-actions relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] lg:px-6">
                  <div className={`text-sm font-semibold ${pendingFindingCount > 0 ? 'text-amber-800' : 'text-gray-600'}`} id="statusMessage">
                    <i className={`${pendingFindingCount > 0 ? 'fas fa-exclamation-triangle text-amber-600' : 'fas fa-robot text-indigo-500'} mr-1`}></i>
                    {pendingFindingCount > 0 ? `AI 지적 ${pendingFindingCount}개 · 검토 필요` : detail.aiReview ? 'AI 분석 완료 · 반영 여부를 확인하세요' : '병합 전에 AI 리뷰가 필요합니다'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void updateReviewStatus('close')}
                      disabled={statusLoading || detail.summary.status !== 'OPEN'}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs! font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 sm:text-sm! lg:px-5"
                    >
                      <i className="fas fa-times text-red-500 mr-1"></i> PR 닫기
                    </button>
                    <button
                      onClick={() => void updateReviewStatus('merge')}
                      disabled={statusLoading || detail.summary.status !== 'OPEN'}
                      className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs! font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 sm:text-sm! lg:px-6"
                    >
                      <i className="fas fa-code-merge"></i> PR 병합
                    </button>
                  </div>
                </div>
              </>
            ) : (
              renderEmptyDetail()
            )}
          </div>
        </main>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1050]">
          <form onSubmit={submitCreate} className="squad-review-create-modal relative w-full max-w-[512px]! rounded-3xl bg-white p-6 shadow-2xl [&_input]:text-[14px]! [&_input]:leading-[20px]! [&_textarea]:text-[14px]! [&_textarea]:leading-[20px]! [&_button]:text-[14px]! [&_button]:leading-[20px]!">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className={`fas fa-plus-circle ${hasAnyReviews ? 'text-blue-500' : 'text-gray-400'}`}></i>
                {hasAnyReviews ? '새 코드 리뷰 요청' : '수동 코드 리뷰 요청'}
              </h3>
              <button type="button" onClick={closeCreateModal} className="text-gray-400 hover:text-gray-900 transition">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              {hasAnyReviews ? (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
                  <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    팀 설정에서 GitHub 레포지토리가 연동되어 있다면 PR 생성 시 자동으로 이 목록에 추가됩니다. 연동 전이거나 코드를 직접 올려 리뷰받고 싶을 때만 이 폼을 사용하세요.
                  </p>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">리뷰 요청 제목 <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" placeholder="예: 로그인 로직 수정 리뷰 부탁드립니다." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">파일 경로</label>
                  <input value={form.filePath} onChange={(event) => setForm((current) => ({ ...current, filePath: event.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xs font-mono focus:border-brand outline-none" placeholder="src/main/java/..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">브랜치</label>
                  <input value={form.sourceBranch} onChange={(event) => setForm((current) => ({ ...current, sourceBranch: event.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xs font-mono focus:border-brand outline-none" placeholder="feature/..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">수정된 소스 코드 (Diff) <span className="text-red-500">*</span></label>
                <textarea value={form.diffText} onChange={(event) => setForm((current) => ({ ...current, diffText: event.target.value }))} className="w-full border border-gray-300 rounded-xl p-4 text-xs font-mono bg-gray-50 h-32 resize-none outline-none focus:border-brand custom-scrollbar" placeholder="여기에 소스 코드를 복사하여 붙여넣으세요." />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeCreateModal} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition">취소</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition shadow-md disabled:opacity-50">
                {saving ? '등록 중' : '요청 등록'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? (
        <div id="toastContainer" className="fixed top-5 right-5 z-[2000]">
          <div className="toast bg-gray-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold border border-gray-700">
            <i className="fas fa-info-circle text-brand"></i>
            <span>{toast}</span>
          </div>
        </div>
      ) : null}


      {authView ? (
        <AuthModal view={authView} onClose={() => setAuthView(null)} onViewChange={setAuthView} onAuthenticated={handleAuthenticated} />
      ) : null}
    </div>
  )
}
