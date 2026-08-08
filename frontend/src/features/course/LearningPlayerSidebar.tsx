import type { LearningPlayerReadyModel } from './useLearningPlayerController'
import type { QnaDifficulty } from '../../types/qna'
import { EmptyState } from './learning-player-states'
import { formatRelativeTime, isLessonProgressCompleted, isOwnQnaQuestion, isQuestionAnswered, isQuizLesson, resolveLessonAssignment } from './learning-player-model'
import { formatDateLabel, formatTime, resolveMaterialDownloadHref } from './learning-player-support'

type Props = { model: LearningPlayerReadyModel }

export default function LearningPlayerSidebar({ model }: Props) {
  const {
    lesson,
    course,
    currentTime,
    handleSeek,
    setActiveTab,
    setOpenQuestionId,
    activeTab,
    loadingLesson,
    openSectionIds,
    setOpenSectionIds,
    progress,
    lessonProgressById,
    lessonLockMap,
    actualDurationByLessonId,
    assignmentHistoryByAssignmentId,
    handleSelectLesson,
    visibleQuestions,
    qnaSearch,
    setQnaSearch,
    setQnaStatusFilter,
    qnaStatusFilter,
    qnaError,
    loadingQna,
    qnaDetails,
    handleToggleQuestion,
    sessionUserId,
    questionForm,
    setQuestionForm,
    templateOptions,
    selectedTemplate,
    questionMessage,
    questionBusy,
    handleSubmitQuestion,
    setQuestionComposerOpen,
    activeQuestionSummary,
    loadingQuestionId,
    activeQuestionDetail,
    notePanelIsEmpty,
    setNoteComposerOpen,
    noteComposerOpen,
    noteContent,
    setNoteContent,
    handleSaveNote,
    sortedNotes,
    setOpenNoteId,
    setEditingNoteContent,
    handleDeleteNote,
    noteMessage,
  } = model

  return (
    <>
          {/* ── 사이드바 (우 1/4) ── */}
          <aside className="learning-player-sidebar relative z-40 flex w-[400px] shrink-0 basis-[400px] flex-col border-l border-[#E5E7EB] bg-white">

            {/* 탭 버튼 */}
            <div className="learning-player-tab-buttons flex h-[54px] shrink-0 basis-[54px] border-b border-[#E5E7EB] bg-white" id="tab-buttons">
              {(['curriculum', 'qna', 'notes'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTab(key)
                    if (key !== 'qna') setOpenQuestionId(null)
                  }}
                  className={activeTab === key
                    ? "learning-player-tab-button is-active m-0 flex h-[54px] min-w-0 flex-1 appearance-none items-center justify-center border-x-0 border-t-0 border-b-2 border-[#00C471] bg-[rgba(240,253,244,0.5)] p-0! font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-bold text-[#00C471] transition-[color,border-color,background-color] duration-150"
                    : "learning-player-tab-button m-0 flex h-[54px] min-w-0 flex-1 appearance-none items-center justify-center border-x-0 border-t-0 border-b-2 border-transparent bg-transparent p-0! font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-medium text-[#6B7280] transition-[color,border-color,background-color] duration-150 hover:text-[#1F2937]"}
                >
                  {key === 'curriculum' ? '커리큘럼' : key === 'qna' ? 'Q&A' : '노트'}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="learning-player-tab-panel-shell relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[rgba(249,250,251,0.3)]">
              {loadingLesson ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00C471] border-t-transparent" />
                </div>
              ) : null}

              {/* 커리큘럼 탭 */}
              {activeTab === 'curriculum' ? (
                <div className="learning-player-tab-content learning-curriculum-panel tab-content custom-scrollbar h-full overflow-y-auto p-[16px] font-['Pretendard',sans-serif] text-[14px] leading-[20px] [animation:learningFadeIn_0.2s_ease-out_forwards]">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {course.sections.map((section, sectionIndex) => {
                      const sectionIsActive = section.lessons.some((item) => item.lessonId === lesson.lessonId)
                      const sectionOpen = openSectionIds.has(section.sectionId)
                      const isLast = sectionIndex === course.sections.length - 1

                      return (
                        <div key={section.sectionId} className={isLast ? '' : 'border-b border-gray-200'}>
                          {/* 섹션 아코디언 헤더 */}
                          <button
                            type="button"
                            onClick={() => setOpenSectionIds((current) => {
                              const next = new Set(current)
                              if (next.has(section.sectionId)) next.delete(section.sectionId)
                              else next.add(section.sectionId)
                              return next
                            })}
                            className={`w-full px-5 py-4 flex justify-between items-center transition ${
                              sectionIsActive
                                ? 'bg-green-50/50 hover:bg-green-50 border-l-4 border-[#00C471]'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className={`flex flex-col items-start ${sectionIsActive ? '-ml-1' : ''}`}>
                              <span className={`text-xs font-bold mb-1 ${sectionIsActive ? 'text-[#00C471]' : 'text-gray-400'}`}>
                                SECTION {sectionIndex + 1}{sectionIsActive ? ' (현재 수강중)' : ''}
                              </span>
                              <span className={`font-bold ${sectionIsActive ? 'text-gray-900' : 'text-gray-800'}`}>
                                {section.title}
                              </span>
                            </div>
                            <i className={`fas ${sectionOpen ? 'fa-chevron-up' : 'fa-chevron-down'} ${sectionIsActive ? 'text-[#00C471]' : 'text-gray-400'} transition-transform`} />
                          </button>

                          {/* 아코디언 콘텐츠 */}
                          <div className={`accordion-content overflow-hidden border-t border-gray-100 bg-gray-50 transition-[max-height,padding] duration-300 ease-in-out ${sectionOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                            <div className="p-3 space-y-2">
                              {section.lessons.map((item) => {
                                const active = item.lessonId === lesson.lessonId
                                const itemProgress = active ? progress ?? lessonProgressById[item.lessonId] : lessonProgressById[item.lessonId]
                                const completed = isLessonProgressCompleted(itemProgress)
                                const lockState = lessonLockMap.get(item.lessonId)
                                const locked = Boolean(lockState?.locked)
                                const lessonDurationLabel = formatTime(actualDurationByLessonId[item.lessonId] ?? item.durationSeconds ?? 0)
                                const quizItem = isQuizLesson(item)
                                const assignmentItem = resolveLessonAssignment(item)
                                const assignmentHistory = assignmentItem ? assignmentHistoryByAssignmentId[assignmentItem.assignmentId] ?? null : null

                                if (active) {
                                  const activeIcon = quizItem
                                    ? 'fa-circle-question text-amber-500'
                                    : assignmentItem
                                      ? 'fa-clipboard-check text-violet-500'
                                      : 'fa-play-circle text-[#00C471]'
                                  return (
                                    <div
                                      key={item.lessonId}
                                      onClick={() => handleSelectLesson(item.lessonId)}
                                      className="p-3 rounded-lg flex justify-between items-center bg-green-50 border border-[#00C471] shadow-sm relative overflow-hidden cursor-pointer"
                                    >
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00C471]" />
                                      <span className="text-sm font-bold text-gray-900 ml-2 truncate" title={item.title}>
                                        <i className={`fas ${activeIcon} mr-2`} />
                                        {item.title}
                                      </span>
                                      {!quizItem && !assignmentItem && (
                                        <span className="text-xs bg-[#00C471] text-white px-2 py-1 rounded-full font-bold animate-pulse shrink-0 ml-2">수강중</span>
                                      )}
                                    </div>
                                  )
                                }

                                return (
                                  <div
                                    key={item.lessonId}
                                    onClick={() => !locked && handleSelectLesson(item.lessonId)}
                                    title={locked && lockState?.prerequisiteLessonTitle ? `${lockState.prerequisiteLessonTitle} 완료 후 열립니다.` : undefined}
                                    className={`p-3 rounded-lg flex justify-between items-center bg-white border border-gray-200 opacity-60 ${locked ? 'cursor-not-allowed' : 'hover:opacity-100 transition cursor-pointer'}`}
                                  >
                                    <span className="text-sm font-medium text-gray-700 truncate min-w-0" title={item.title}>
                                      <i className={`fas ${
                                        locked ? 'fa-lock text-gray-400'
                                        : quizItem ? 'fa-circle-question text-amber-500'
                                        : assignmentItem ? (assignmentHistory ? 'fa-clipboard-check text-[#00C471]' : 'fa-clipboard-check text-violet-500')
                                        : completed ? 'fa-check-circle text-[#00C471]'
                                        : 'fa-circle-play text-gray-300'
                                      } mr-2`} />
                                      {item.title}
                                    </span>
                                    <span className={`text-xs shrink-0 ml-2 ${
                                      (quizItem || assignmentItem) && assignmentHistory ? 'text-[#00C471] font-bold'
                                      : quizItem ? 'text-amber-600'
                                      : 'text-gray-400'
                                    }`}>
                                      {quizItem
                                        ? (assignmentHistory ? '제출완료' : '퀴즈')
                                        : assignmentItem
                                          ? (assignmentHistory ? `${assignmentHistory.totalScore ?? '-'}점` : '미제출')
                                          : lessonDurationLabel}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {lesson.materials.length ? (
                    <div className="mt-4">
                      <h3 className="mb-2 px-1 text-xs font-bold text-gray-500">학습 자료</h3>
                      <div className="space-y-1.5">
                        {lesson.materials.map((material) => (
                          <a
                            key={material.materialId}
                            href={resolveMaterialDownloadHref(lesson.lessonId, material.materialId)}
                            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-gray-300"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-gray-700" title={material.originalFileName}>{material.originalFileName}</div>
                              <div className="mt-1 text-[11px] text-gray-400">{material.materialType}</div>
                            </div>
                            <i className="fas fa-download text-sm text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Q&A 탭 */}
              {activeTab === 'qna' ? (
                <div className="learning-player-tab-content learning-qna-panel tab-content relative block h-full overflow-hidden font-['Pretendard',sans-serif] text-[14px] leading-[20px]">
                  <div className="learning-qna-list-view custom-scrollbar absolute inset-0 flex flex-col overflow-y-auto bg-[rgba(249,250,251,0.3)] p-[24px] transition-transform duration-300">
                    <div className="learning-qna-list-header mb-[16px] flex items-center justify-between">
                      <h3 className="learning-qna-list-title m-0 text-[18px] leading-[28px] font-bold text-[#111827]">질문 및 답변</h3>
                      <span className="learning-qna-total-count text-[14px] leading-[20px] font-normal text-[#6B7280]">총 {visibleQuestions.length}개</span>
                    </div>
                    <div className="learning-qna-search-wrap relative mb-[16px] shrink-0">
                      <input
                        type="text"
                        value={qnaSearch}
                        onChange={(event) => setQnaSearch(event.target.value)}
                        className="learning-qna-search-input h-[42px] w-full rounded-[8px] border border-[#E5E7EB] bg-white py-[10px] pr-[16px] pl-[40px] text-[14px]! leading-[20px]! text-[#111827] placeholder:text-[14px]! placeholder:leading-[20px]! placeholder:text-[#9CA3AF] placeholder:opacity-100 focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] focus:outline-none [box-sizing:border-box]"
                        placeholder="궁금한 내용을 검색해보세요."
                      />
                      <i className="learning-qna-search-icon fas fa-search absolute top-[14px] left-[14px] text-[14px] leading-[14px] text-[#9CA3AF]" />
                    </div>
                    <div className="learning-qna-filter-row custom-scrollbar mb-[24px] flex shrink-0 gap-[8px] overflow-x-auto pb-[4px]">
                      {([
                        ['ALL', '전체 질문'],
                        ['MINE', '내 질문'],
                        ['UNANSWERED', '답변 대기중'],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setQnaStatusFilter(value)}
                          className={qnaStatusFilter === value
                            ? 'learning-qna-filter-button is-active h-[28px] shrink-0 whitespace-nowrap rounded-[9999px] border-0 bg-[#111827] px-[14px] py-[6px] text-[12px]! leading-[16px]! font-bold text-white [box-sizing:border-box]'
                            : 'learning-qna-filter-button h-[28px] shrink-0 whitespace-nowrap rounded-[9999px] border-0 bg-[#F3F4F6] px-[14px] py-[6px] text-[12px]! leading-[16px]! font-medium text-[#4B5563] hover:bg-gray-200 [box-sizing:border-box]'}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="learning-qna-items space-y-3 pb-20">
                      {qnaError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                          {qnaError}
                        </div>
                      ) : null}

                      {loadingQna ? (
                        <div className="flex h-full items-center justify-center py-10">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00C471] border-t-transparent" />
                        </div>
                      ) : visibleQuestions.length ? (
                        visibleQuestions.map((question) => {
                          const answered = isQuestionAnswered(question)
                          const detail = qnaDetails[question.id]

                          return (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => void handleToggleQuestion(question.id)}
                              className="qna-item p-4 bg-white border border-gray-200 rounded-xl hover:border-[#00C471] transition cursor-pointer shadow-sm group w-full text-left"
                            >
                              <div className="flex gap-2 items-start mb-2">
                                <span className={`${answered ? 'bg-[#00C471] text-white' : 'bg-gray-200 text-gray-600'} shrink-0 whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded`}>
                                  {answered ? '해결됨' : '답변대기'}
                                </span>
                                <h4 className="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#00C471] transition" title={question.title}>
                                  {question.title}
                                </h4>
                              </div>

                              <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                {detail?.content ?? (question.lectureTimestamp ? `${question.lectureTimestamp} 구간 질문입니다.` : '질문 상세 내용을 보려면 눌러주세요.')}
                              </p>
                              <div className="flex justify-between items-center text-xs text-gray-400">
                                <span className={isOwnQnaQuestion(question, sessionUserId) ? 'font-bold text-[#00C471]' : ''}>
                                  {question.authorName}{isOwnQnaQuestion(question, sessionUserId) ? ' (나)' : ''} · {formatRelativeTime(question.createdAt)}
                                </span>
                                <span><i className="far fa-comment-dots mr-1" />{question.answerCount}</span>
                              </div>
                            </button>
                          )
                        })
                      ) : (
                        <EmptyState
                          iconClassName="fas fa-comments"
                          title="등록된 질문이 없습니다"
                          description="이 강의에서 궁금한 점을 커뮤니티에 남겨 보세요."
                          className="learning-qna-empty-state mt-0 rounded-[12px] px-[16px] py-[32px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] [&_.learning-empty-state-icon]:h-[40px] [&_.learning-empty-state-icon]:w-[40px] [&_.learning-empty-state-icon]:text-[16px] [&_.learning-empty-state-title]:mt-[16px] [&_.learning-empty-state-title]:text-[14px] [&_.learning-empty-state-title]:leading-[20px] [&_.learning-empty-state-title]:font-bold [&_.learning-empty-state-description]:mt-[8px] [&_.learning-empty-state-description]:text-[13px] [&_.learning-empty-state-description]:leading-[20px] [&_.learning-empty-state-description]:font-normal"
                        />
                      )}
                    </div>
                  </div>

                  {/* 질문 등록 폼 */}
                  <div className="hidden shrink-0 border-t border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex shrink-0 items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-600 shadow-sm">
                          <i className="fas fa-play-circle text-[#00C471]" />
                          {formatTime(currentTime)}
                        </span>
                        <span className="truncate text-[11px] font-bold text-gray-600" title={lesson.title}>{lesson.title}</span>
                      </div>
                      <label className="ml-2 flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <input
                          type="checkbox"
                          checked={questionForm.attachTimestamp}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, attachTimestamp: event.target.checked }))}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-[#00C471]"
                        />
                        위치 첨부
                      </label>
                    </div>

                    {templateOptions.length > 1 ? (
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        <select
                          value={questionForm.templateType}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, templateType: event.target.value }))}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none transition focus:border-[#00C471]"
                        >
                          {templateOptions.map((template) => (
                            <option key={template.templateType} value={template.templateType}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={questionForm.difficulty}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, difficulty: event.target.value as QnaDifficulty }))}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none transition focus:border-[#00C471]"
                        >
                          <option value="EASY">쉬움</option>
                          <option value="MEDIUM">보통</option>
                          <option value="HARD">어려움</option>
                        </select>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2">
                      <textarea
                        rows={3}
                        value={questionForm.content}
                        onChange={(event) => setQuestionForm((current) => ({ ...current, content: event.target.value }))}
                        placeholder="궁금한 점을 적어주세요. 강사와 멘토가 확인합니다."
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 outline-none shadow-sm transition focus:border-[#00C471]"
                      />
                      {selectedTemplate?.description ? (
                        <p className="text-[11px] leading-5 text-gray-500">{selectedTemplate.description}</p>
                      ) : null}
                      {questionMessage ? (
                        <p className="text-[11px] font-medium text-gray-500">{questionMessage}</p>
                      ) : null}
                      {!templateOptions.length ? (
                        <p className="text-[11px] font-medium text-rose-500">질문 템플릿을 불러오지 못해 등록할 수 없습니다.</p>
                      ) : null}
                      <button
                        type="button"
                        disabled={questionBusy || !templateOptions.length}
                        onClick={() => void handleSubmitQuestion()}
                        className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {questionBusy ? '질문 등록 중...' : '질문 등록하기'}
                      </button>
                    </div>
                  </div>
                  <div className="hidden absolute bottom-0 left-0 z-20 w-full border-t border-gray-200 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                      type="button"
                      onClick={() => setQuestionComposerOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-gray-800 active:scale-95"
                    >
                      <i className="far fa-comment-dots" />
                      커뮤니티에 질문하기
                    </button>
                  </div>
                  <div className={`absolute inset-0 z-30 flex flex-col bg-white transition-transform duration-300 ${
                    activeQuestionSummary ? 'translate-x-0' : 'translate-x-full'
                  }`}>
                    <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setOpenQuestionId(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-800"
                        aria-label="질문 목록으로 돌아가기"
                      >
                        <i className="fas fa-arrow-left" />
                      </button>
                      <h3 className="text-sm font-bold text-gray-900">질문 상세</h3>
                    </div>
                    {activeQuestionSummary ? (
                      <>
                      <div className="custom-scrollbar flex-1 overflow-y-auto bg-gray-50/50 p-6">
                        <div className="mb-8">
                          <div className="mb-3 flex items-start gap-2">
                            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isQuestionAnswered(activeQuestionSummary)
                                ? 'bg-[#00C471] text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {isQuestionAnswered(activeQuestionSummary) ? '해결됨' : '답변 대기'}
                            </span>
                            <h4 className="text-lg font-bold leading-tight text-gray-800">{activeQuestionSummary.title}</h4>
                          </div>
                          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            <span className="font-bold text-[#00C471]">{activeQuestionSummary.authorName}</span>
                            <span>{formatDateLabel(activeQuestionSummary.createdAt)}</span>
                            {activeQuestionSummary.lectureTimestamp ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const seconds = activeQuestionSummary.lectureTimestamp!
                                    .split(':')
                                    .map(Number)
                                    .reduce((total, value) => (Number.isFinite(value) ? total * 60 + value : total), 0)
                                  handleSeek(seconds)
                                }}
                                className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[#00C471] transition hover:bg-green-100"
                              >
                                <i className="fas fa-play mr-1 text-[10px]" />
                                {activeQuestionSummary.lectureTimestamp} 구간 재생
                              </button>
                            ) : null}
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm leading-relaxed text-gray-700 shadow-sm">
                            {loadingQuestionId === activeQuestionSummary.id && !activeQuestionDetail ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00C471] border-t-transparent" />
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{activeQuestionDetail?.content ?? '질문 상세 내용을 불러오지 못했습니다.'}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h5 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800">
                            <i className="far fa-comments text-gray-400" />
                            답변 <span className="text-[#00C471]">{activeQuestionDetail?.answers.length ?? activeQuestionSummary.answerCount}</span>
                          </h5>
                          <div className="space-y-4">
                            {activeQuestionDetail?.answers.length ? (
                              activeQuestionDetail.answers.map((answer) => (
                                <div key={answer.id} className="flex gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-100 text-sm text-[#00C471]">
                                    <i className="fas fa-chalkboard-teacher" />
                                  </div>
                                  <div className="relative flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    {answer.adopted ? (
                                      <div className="absolute -top-2.5 right-4 rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                        지식공유자
                                      </div>
                                    ) : null}
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-bold text-gray-800">{answer.authorName}</span>
                                      <span className="text-[10px] text-gray-400">{formatRelativeTime(answer.createdAt)}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{answer.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs font-bold text-gray-500">
                                아직 등록된 답변이 없습니다.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200 bg-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                        <div className="relative">
                          <textarea
                            className="w-full h-[52px] rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-12 text-sm resize-none focus:outline-none focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
                            placeholder="답변을 입력하세요..."
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 w-9 h-9 bg-[#00C471] text-white rounded-lg flex items-center justify-center transition hover:bg-green-600"
                          >
                            <i className="fas fa-paper-plane text-xs" />
                          </button>
                        </div>
                      </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* 노트 탭 */}
              {activeTab === 'notes' ? (
                <div className={`learning-player-tab-content learning-note-panel tab-content custom-scrollbar h-full overflow-y-auto font-['Pretendard',sans-serif] text-[14px] leading-[20px] [animation:learningFadeIn_0.2s_ease-out_forwards] ${notePanelIsEmpty ? 'flex flex-col bg-white p-0' : 'p-[24px]'}`}>
                  <div className={`learning-note-header mb-[24px] items-center justify-between ${notePanelIsEmpty ? 'hidden' : 'flex'}`}>
                    <h3 className="learning-note-title m-0 font-['Pretendard',sans-serif] text-[18px] leading-[28px] font-bold text-[#111827]">내 노트</h3>
                    <button
                      type="button"
                      onClick={() => setNoteComposerOpen((current) => !current)}
                      className="learning-note-add-button flex items-center font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-bold text-[#00C471] transition hover:text-green-600 [&_i]:mr-[4px] [&_i]:text-[14px] [&_i]:leading-[14px]"
                    >
                      <i className="fas fa-plus mr-1" />
                      새 노트
                    </button>
                  </div>
                  {noteComposerOpen ? (
                    <div className="learning-note-composer mb-[24px] rounded-[12px] border border-[#00C471] bg-white p-[16px] shadow-[0_1px_2px_rgba(15,23,42,0.05)] [animation:learningFadeInUp_0.4s_ease-out_forwards] [box-sizing:border-box]">
                      <div className="learning-note-composer-meta mb-[12px] flex items-center gap-[8px]">
                        <span className="learning-note-composer-time inline-flex min-h-[24px] items-center rounded-[4px] bg-[#DCFCE7] px-[8px] py-[4px] font-['Pretendard',sans-serif] text-[12px] leading-[16px] font-bold text-[#00C471]">{formatTime(currentTime)}</span>
                        <span className="learning-note-composer-help font-['Pretendard',sans-serif] text-[12px] leading-[16px] font-normal text-[#6B7280]">현재 재생 시간에 추가됩니다.</span>
                      </div>
                      <textarea
                        value={noteContent}
                        onChange={(event) => setNoteContent(event.target.value)}
                        className="learning-note-composer-textarea mb-[12px] h-[96px] w-full resize-none rounded-[8px] border border-[#E5E7EB] bg-white p-[12px] font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] focus:outline-none [box-sizing:border-box]"
                        placeholder="강의를 들으며 중요한 점을 메모해보세요."
                      />
                      <div className="learning-note-composer-actions flex justify-end gap-[8px]">
                        <button
                          type="button"
                          onClick={() => setNoteComposerOpen(false)}
                          className="learning-note-composer-cancel h-[36px] rounded-[8px] bg-[#F3F4F6] px-[16px] py-[8px] font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-medium text-[#4B5563] transition hover:bg-gray-200"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveNote()}
                          disabled={!noteContent.trim()}
                          className="learning-note-composer-save h-[36px] rounded-[8px] bg-[#00C471] px-[16px] py-[8px] font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-bold text-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                          저장하기
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="hidden shrink-0 rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
                      <i className="fas fa-info-circle" />
                      작성한 노트는 저장 버튼을 눌러야 이 강의에 반영됩니다.
                    </p>
                  </div>

                  <div className={`learning-note-list space-y-4 ${notePanelIsEmpty ? 'flex min-h-0 flex-1 pb-0' : 'pb-[80px]'}`}>
                    {sortedNotes.length ? (
                      sortedNotes.map((note) => (
                        <div key={note.noteId} className="learning-note-card rounded-[12px] border border-[#E5E7EB] bg-white p-[16px] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-gray-300">
                          <div className="flex justify-between items-center mb-2">
                            <button
                              type="button"
                              onClick={() => handleSeek(note.seekSecond ?? note.timestampSecond)}
                              className="learning-note-card-time min-h-[24px] cursor-pointer rounded-[4px] bg-[#F0FDF4] px-[8px] py-[4px] font-['Pretendard',sans-serif] text-[12px]! leading-[16px]! font-bold text-[#00C471] hover:bg-green-100 [&_i]:mr-[4px] [&_i]:text-[12px] [&_i]:leading-[12px]"
                            >
                              <i className="fas fa-play mr-1" />
                              {note.timestampLabel || formatTime(note.timestampSecond)}
                            </button>
                            <div className="learning-note-card-actions flex gap-[12px] text-[#9CA3AF]">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenNoteId(note.noteId)
                                  setEditingNoteContent(note.content)
                                }}
                                className="learning-note-card-action inline-flex min-h-[20px] min-w-[12px] items-center justify-center transition-colors hover:text-gray-600 [&_i]:text-[12px] [&_i]:leading-[12px]"
                                aria-label="노트 수정"
                              >
                                <i className="fas fa-pen text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteNote(note)}
                                className="learning-note-card-action inline-flex min-h-[20px] min-w-[12px] items-center justify-center transition-colors hover:text-red-400 [&_i]:text-[12px] [&_i]:leading-[12px]"
                                aria-label="노트 삭제"
                              >
                                <i className="fas fa-trash text-xs" />
                              </button>
                            </div>
                          </div>
                          <p className="learning-note-card-content m-0 whitespace-pre-wrap font-['Pretendard',sans-serif] text-[14px] leading-[22px] text-[#1F2937]">{note.content}</p>
                        </div>
                      ))
                    ) : !noteComposerOpen ? (
                      <div className="learning-note-empty-state flex min-h-full flex-1 flex-col items-center justify-center p-[32px] text-center [animation:learningFadeIn_0.2s_ease-out_forwards]">
                        <div className="learning-note-empty-icon mb-[20px] flex h-[64px] w-[64px] items-center justify-center rounded-[16px] border border-[#DCFCE7] bg-[#F0FDF4] text-[#00C471] shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                          <i className="far fa-file-alt text-[24px] leading-[32px] text-[#00C471]" />
                        </div>
                        <h3 className="learning-note-empty-title m-0 mb-[6px] font-['Pretendard',sans-serif] text-[16px] leading-[24px] font-bold text-[#111827]">작성된 강의 노트가 없습니다</h3>
                        <p className="learning-note-empty-description m-0 mb-[24px] max-w-[240px] font-['Pretendard',sans-serif] text-[12px] leading-[20px] font-normal text-[#9CA3AF]">
                          강의를 시청하면서 중요하거나 나중에 다시 보고 싶은 핵심 내용들을 실시간으로 기록해보세요.
                        </p>
                        <button
                          type="button"
                          onClick={() => setNoteComposerOpen(true)}
                          className="learning-note-empty-button flex h-[40px] items-center gap-[6px] rounded-[12px] border-0 bg-[#00C471] px-[16px] py-0 font-['Pretendard',sans-serif] text-[12px]! leading-[16px]! font-bold text-white shadow-[0_4px_6px_-1px_rgba(0,196,113,0.25)] transition-colors duration-150 hover:bg-[#00AB62] [&_i]:text-[10px] [&_i]:leading-[10px]"
                        >
                          <i className="fas fa-plus" />
                          현재 시간에 노트 추가
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* 노트 작성 영역 */}
                  <div className="hidden shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-[#00C471] focus-within:ring-1 focus-within:ring-[#00C471]">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-2">
                      <span className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 shadow-sm">
                        <i className="fas fa-clock text-[#00C471]" />
                        {formatTime(currentTime)} 위치 첨부
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleSaveNote()}
                        disabled={!noteContent.trim()}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        노트 저장
                      </button>
                    </div>
                    <textarea
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                      placeholder="현재 영상에서 중요한 내용을 메모해 보세요..."
                      className="h-24 w-full resize-none p-3 text-xs text-gray-700 outline-none"
                    />
                    {noteMessage ? (
                      <div className="border-t border-gray-100 px-3 py-2 text-[11px] font-medium text-gray-500">
                        {noteMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <div className={`learning-qna-bottom-question-bar absolute bottom-0 left-0 z-20 w-full border-t border-[#E5E7EB] bg-white p-[16px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-transform duration-300 [box-sizing:border-box] ${
              activeQuestionSummary ? 'translate-y-full pointer-events-none' : 'translate-y-0'
            }`}>
              <button
                type="button"
                onClick={() => setQuestionComposerOpen(true)}
                className="learning-qna-bottom-question-button flex h-[48px] w-full transform items-center justify-center gap-[8px] rounded-[12px] border-0 bg-[#111827] p-0 text-[14px]! leading-[20px]! font-bold text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] transition hover:bg-[#1F2937] hover:shadow-lg active:scale-95"
              >
                <i className="learning-qna-bottom-question-icon far fa-comment-dots text-[14px] leading-[14px]" /> 커뮤니티에 질문하기
              </button>
            </div>
          </aside>
    </>
  )
}
