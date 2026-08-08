import type { LearningPlayerReadyModel } from './useLearningPlayerController'
import { navigateTo } from '../../lib/spa-navigation'
import type { QnaDifficulty } from '../../types/qna'
import { formatRelativeTime, formatShortDate, isQuestionAnswered } from './learning-player-model'
import { formatDateLabel, formatTime } from './learning-player-support'

type Props = { model: LearningPlayerReadyModel }

export default function LearningPlayerOverlays({ model }: Props) {
  const {
    lesson,
    currentTime,
    setOpenQuestionId,
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
    setOpenNoteId,
    setEditingNoteContent,
    noteMessage,
    questionComposerOpen,
    assignmentModal,
    closeAssignmentModal,
    assignmentModalMethods,
    assignmentForm,
    setAssignmentForm,
    setAssignmentMessage,
    handleAssignmentFileDragOver,
    handleAssignmentFileDragLeave,
    handleAssignmentFileDrop,
    assignmentFileDragActive,
    handleAssignmentFilesSelected,
    handleAssignmentFileRemove,
    assignmentMessage,
    handleAssignmentSubmit,
    assignmentSubmitDisabled,
    assignmentSubmitBusy,
    assignmentLoadingVisible,
    assignmentLoadingText,
    assignmentGradingResult,
    assignmentGradingBadge,
    closeAssignmentGradingResult,
    assignmentGradingPassed,
    assignmentGradingScore,
    assignmentGradingReportRows,
    assignmentGradingFeedback,
    handleAssignmentResultPrimaryAction,
    assignmentResultPrimaryActionIcon,
    assignmentResultPrimaryActionLabel,
    completionVisible,
    completionProofCard,
    completionTheme,
    completionParticles,
    completionBurstKey,
    completionCardFlipped,
    setCompletionCardFlipped,
    completionRoadmapReturnHref,
    closeCompletionOverlay,
    quizModalLesson,
    activeQuizQuestion,
    closeQuizModal,
    quizQuestionIndex,
    quizModalQuestions,
    quizSelectedOptionIndex,
    quizFeedback,
    handleQuizOptionSelect,
    setQuizQuestionIndex,
    setQuizSelectedOptionIndex,
    setQuizFeedback,
    handleQuizNextQuestion,
    handleQuizCheckAnswer,
    activeNote,
    editingNoteContent,
    handleUpdateNote,
  } = model

  return (
    <>
          {/* ── Q&A 모달 ── */}
          {questionComposerOpen ? (
            <div className="learning-question-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(17,24,39,0.6)] backdrop-blur-sm [animation:learningFadeIn_0.2s_ease-out_forwards]">
              <div className="learning-question-modal-panel w-[90%] max-w-[500px] transform overflow-hidden rounded-[16px] bg-white text-gray-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-all">
                <div className="learning-question-modal-header flex min-h-[61px] items-center justify-between border-b border-[#F3F4F6] bg-[#F9FAFB] px-[24px] py-[16px]">
                  <h3 className="learning-question-modal-title m-0 text-[18px] leading-[28px] font-bold text-[#1F2937]">새로운 질문 작성</h3>
                  <button
                    type="button"
                    onClick={() => setQuestionComposerOpen(false)}
                    className="learning-question-modal-close border-0 bg-transparent p-0 text-[#9CA3AF] transition hover:text-gray-600 [&_i]:text-[18px] [&_i]:leading-[28px]"
                    aria-label="질문 작성 닫기"
                  >
                    <i className="fas fa-times text-lg" />
                  </button>
                </div>
                <div className="learning-question-modal-body p-[24px]">
                  <div className="learning-question-modal-field mb-[16px]">
                    <label className="learning-question-modal-label mb-[4px] block text-[14px] leading-[20px] font-medium text-[#374151]">제목</label>
                    <input
                      type="text"
                      value={questionForm.title}
                      onChange={(event) => setQuestionForm((current) => ({ ...current, title: event.target.value }))}
                      className="learning-question-modal-input h-[42px] w-full rounded-[8px] border border-[#D1D5DB] bg-white p-[10px] text-[14px]! leading-[20px]! text-[#111827] outline-none transition placeholder:text-[14px]! placeholder:leading-[20px]! placeholder:font-normal placeholder:text-[#9CA3AF] placeholder:opacity-100 focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] [box-sizing:border-box]"
                      placeholder="질문 제목을 입력하세요"
                    />
                  </div>
                  {/* eslint-disable-next-line no-constant-condition, no-constant-binary-expression */}
                  {false && templateOptions.length > 1 ? (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <select
                        value={questionForm.templateType}
                        onChange={(event) => setQuestionForm((current) => ({ ...current, templateType: event.target.value }))}
                        className="rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
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
                        className="rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
                      >
                        <option value="EASY">쉬움</option>
                        <option value="MEDIUM">보통</option>
                        <option value="HARD">어려움</option>
                      </select>
                    </div>
                  ) : null}
                  <div className="learning-question-modal-field mb-[16px]">
                    <label className="learning-question-modal-label mb-[4px] block text-[14px] leading-[20px] font-medium text-[#374151]">내용</label>
                    <textarea
                      value={questionForm.content}
                      onChange={(event) => setQuestionForm((current) => ({ ...current, content: event.target.value }))}
                      className="learning-question-modal-textarea h-[128px] w-full resize-none rounded-[8px] border border-[#D1D5DB] bg-white p-[10px] text-[14px]! leading-[20px]! text-[#111827] outline-none transition placeholder:text-[14px]! placeholder:leading-[20px]! placeholder:font-normal placeholder:text-[#9CA3AF] placeholder:opacity-100 focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] [box-sizing:border-box]"
                      placeholder="어떤 부분이 이해가 안 되시나요? 구체적으로 적어주시면 더 좋은 답변을 받을 수 있습니다."
                    />
                  </div>
                  <label className="learning-question-modal-attach mb-[24px] flex cursor-pointer items-center gap-[8px] rounded-[4px] bg-[#F9FAFB] p-[8px] font-['Pretendard',sans-serif] text-[14px] leading-[20px] font-normal text-[#6B7280]">
                    <input
                      type="checkbox"
                      checked={questionForm.attachTimestamp}
                      onChange={(event) => setQuestionForm((current) => ({ ...current, attachTimestamp: event.target.checked }))}
                      className="learning-question-modal-checkbox relative m-0 h-[16px] w-[16px] shrink-0 basis-[16px] cursor-pointer appearance-none rounded-[4px] border border-[#D1D5DB] bg-white transition-[border-color,background-color,box-shadow] duration-150 checked:border-[#00C471] checked:bg-[#00C471] focus:outline-[2px] focus:outline-[rgba(0,196,113,0.35)] focus:outline-offset-[2px] checked:after:absolute checked:after:top-[1px] checked:after:left-[4px] checked:after:h-[9px] checked:after:w-[5px] checked:after:rotate-45 checked:after:border-r-2 checked:after:border-b-2 checked:after:border-white checked:after:content-['']"
                    />
                    현재 재생 시간({formatTime(currentTime)}) 첨부하기
                  </label>
                  {/* eslint-disable-next-line no-constant-condition, no-constant-binary-expression */}
                  {false && selectedTemplate?.description ? (
                    <p className="mb-3 text-xs leading-5 text-gray-500">{selectedTemplate?.description}</p>
                  ) : null}
                  {questionMessage ? (
                    <p className="learning-question-modal-message mb-[12px] text-[12px] leading-[16px] font-medium text-[#6B7280]">{questionMessage}</p>
                  ) : null}
                  <div className="learning-question-modal-actions flex justify-end gap-[12px]">
                    <button
                      type="button"
                      onClick={() => setQuestionComposerOpen(false)}
                      className="learning-question-modal-cancel h-[40px] rounded-[8px] border border-gray-300 bg-white px-[20px] py-0 text-[14px]! leading-[20px]! font-medium text-gray-600 transition hover:bg-gray-50 [box-sizing:border-box]"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmitQuestion()}
                      disabled={questionBusy || !templateOptions.length}
                      className="learning-question-modal-submit h-[40px] rounded-[8px] bg-[#00C471] px-[20px] py-0 text-[14px]! leading-[20px]! font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-emerald-300 [box-sizing:border-box]"
                    >
                      {questionBusy ? '등록 중...' : '등록하기'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeQuestionSummary && activeQuestionDetail ? (
            <div
              className="hidden fixed inset-0 z-[100] items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]"
              onClick={() => setOpenQuestionId(null)}
            >
              <div
                className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-800">
                    <i className="fas fa-question-circle mr-1 text-[#00C471]" /> 질문 상세 보기
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpenQuestionId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>

                <div className="overflow-y-auto bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                      isQuestionAnswered(activeQuestionSummary)
                        ? 'border-blue-200 bg-blue-100 text-blue-600'
                        : 'border-orange-200 bg-orange-100 text-orange-600'
                    }`}>
                      {isQuestionAnswered(activeQuestionSummary) ? '답변완료' : '미답변'}
                    </span>
                    <span className="text-xs font-bold text-gray-800">{activeQuestionSummary.authorName}</span>
                    <span className="ml-auto text-[10px] font-medium text-gray-400">
                      {formatDateLabel(activeQuestionSummary.createdAt)}
                    </span>
                  </div>

                  {activeQuestionSummary.lectureTimestamp ? (
                    <div className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5 shadow-sm transition hover:bg-gray-100">
                      <span className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-600 shadow-sm">
                        <i className="fas fa-play-circle text-[#00C471]" />
                        {activeQuestionSummary.lectureTimestamp}
                      </span>
                      <span className="text-xs font-bold text-gray-700">{lesson.title}</span>
                    </div>
                  ) : null}

                  <h4 className="mb-3 text-base font-bold text-gray-900">{activeQuestionSummary.title}</h4>

                  {loadingQuestionId === activeQuestionSummary.id && !activeQuestionDetail ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00C471] border-t-transparent" />
                    </div>
                  ) : activeQuestionDetail ? (
                    <>
                      <p className="mb-8 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {activeQuestionDetail.content}
                      </p>

                      {activeQuestionDetail.answers.length ? (
                        <div className="space-y-3">
                          {activeQuestionDetail.answers.map((answer) => (
                            <div
                              key={answer.id}
                              className={`relative rounded-2xl border p-5 shadow-sm ${
                                answer.adopted
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <i className="fas fa-quote-left absolute right-5 top-4 text-2xl opacity-20 text-green-300" />
                              <div className="mb-3 flex items-center gap-2">
                                {answer.adopted ? (
                                  <span className="rounded bg-[#00C471] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                    강사 답변
                                  </span>
                                ) : null}
                                <span className="text-xs font-bold text-gray-900">{answer.authorName}</span>
                                <span className="ml-auto text-[10px] font-medium text-gray-500">
                                  {formatRelativeTime(answer.createdAt)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{answer.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                          <i className="fas fa-hourglass-half mb-2 text-2xl text-gray-300" />
                          <p className="text-xs font-bold text-gray-500">강사님이 답변을 작성하고 있습니다.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      질문 상세 정보를 불러오지 못했습니다. 다시 시도해 주세요.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── 과제 제출 모달 ── */}
          {assignmentModal ? (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]"
              onClick={closeAssignmentModal}
            >
              <div
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-5">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                    <i className="fas fa-clipboard-check text-violet-500" />
                    과제 제출
                  </h3>
                  <button
                    type="button"
                    onClick={closeAssignmentModal}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>

                <div className="overflow-y-auto bg-white p-6">
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        필수 과제
                      </span>
                    </div>
                    <h4 className="mb-2 text-lg font-bold text-gray-900">{assignmentModal.title}</h4>
                    <div className="whitespace-pre-line rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-700">
                      {assignmentModal.description || '과제 내용이 등록되지 않았습니다.'}
                    </div>
                  </div>

                  <div className="space-y-5">
                    {assignmentModalMethods.allowText ? (
                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700">텍스트 코드 직접 입력</label>
                        <textarea
                          value={assignmentForm.submissionText}
                          onChange={(event) => {
                            setAssignmentForm((current) => ({ ...current, submissionText: event.target.value }))
                            setAssignmentMessage(null)
                          }}
                          className="min-h-40 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-800 outline-none transition focus:border-[#00C471] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                          placeholder="제출할 코드나 설명을 입력하세요."
                        />
                      </div>
                    ) : null}

                    {assignmentModalMethods.allowUrl ? (
                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700">외부 링크 제출</label>
                        <input
                          value={assignmentForm.submissionUrl}
                          onChange={(event) => {
                            setAssignmentForm((current) => ({ ...current, submissionUrl: event.target.value }))
                            setAssignmentMessage(null)
                          }}
                          type="url"
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-[#00C471] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                          placeholder="https://github.com/example/repository"
                        />
                      </div>
                    ) : null}

                    {assignmentModalMethods.allowFile ? (
                      <div>
                    <label className="mb-2 block text-xs font-bold text-gray-700">파일 첨부</label>
                    <label
                      onDragEnter={handleAssignmentFileDragOver}
                      onDragOver={handleAssignmentFileDragOver}
                      onDragLeave={handleAssignmentFileDragLeave}
                      onDrop={handleAssignmentFileDrop}
                      className={`group block cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                        assignmentFileDragActive
                          ? 'border-[#00C471] bg-green-50 ring-2 ring-emerald-100'
                          : 'border-gray-300 bg-gray-50 hover:border-[#00C471] hover:bg-green-50'
                      }`}
                    >
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => handleAssignmentFilesSelected(event.target.files)}
                      />
                      <i className={`fas fa-cloud-upload-alt mb-3 text-4xl transition group-hover:text-[#00C471] ${assignmentFileDragActive ? 'text-[#00C471]' : 'text-gray-300'}`} />
                      <p className={`text-sm font-bold transition group-hover:text-[#00C471] ${assignmentFileDragActive ? 'text-[#00C471]' : 'text-gray-600'}`}>
                        {assignmentFileDragActive ? '파일을 놓으면 업로드됩니다' : '여기를 누르거나 파일을 드래그해 업로드'}
                      </p>
                      <p className="mt-1.5 text-xs font-medium text-gray-400">
                        지원 포맷:{' '}
                        {assignmentModal.allowedFileFormats.length
                          ? assignmentModal.allowedFileFormats.map((format) => `.${format}`).join(', ')
                          : '제한 없음'}
                      </p>
                    </label>

                    {assignmentForm.files.length ? (
                      <div className="mt-3 space-y-2">
                        {assignmentForm.files.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-gray-800" title={file.name}>{file.name}</div>
                              <div className="text-[11px] text-gray-400">{Math.max(1, Math.round(file.size / 1024))} KB</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAssignmentFileRemove(file.name)}
                              className="ml-3 text-xs font-bold text-rose-500 transition hover:text-rose-600"
                            >
                              제거
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                      </div>
                    ) : null}

                    {assignmentMessage ? (
                      <p className="mt-3 text-xs font-medium text-rose-500">{assignmentMessage}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={closeAssignmentModal}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 shadow-sm transition hover:bg-gray-100"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAssignmentSubmit()}
                    disabled={assignmentSubmitDisabled}
                    className="flex items-center gap-2 rounded-xl bg-[#00C471] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    <i className="fas fa-paper-plane" />
                    {assignmentSubmitBusy ? '제출 중...' : '과제 제출하기'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── 퀴즈 모달 ── */}
          {assignmentLoadingVisible ? (
            <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm">
              <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-[#00C471] border-t-transparent shadow-[0_0_15px_rgba(0,196,113,0.5)]" />
              <h3 className="mb-2 text-2xl font-bold">AI가 과제를 분석 중입니다...</h3>
              <p className="text-sm font-medium text-gray-400">{assignmentLoadingText}</p>
            </div>
          ) : null}

          {assignmentGradingResult && assignmentGradingBadge ? (
            <div
              className="learning-assignment-result-overlay fixed inset-0 z-[115] flex items-center justify-center overflow-hidden bg-black/60 p-[16px] [box-sizing:border-box]"
              onClick={closeAssignmentGradingResult}
            >
              <div
                className="learning-assignment-result-panel modal-enter flex max-h-[calc(100vh-32px)] min-h-0 w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="learning-assignment-result-header relative flex shrink-0 flex-col items-center border-b border-gray-100 bg-gray-50 p-8 text-center [@media(max-height:760px)]:px-[28px] [@media(max-height:760px)]:py-[22px]">
                  <button
                    type="button"
                    onClick={closeAssignmentGradingResult}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"
                  >
                    <i className="fas fa-times" />
                  </button>
                  <span className="mb-3 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-[10px] font-semibold text-[#00C471]">
                    제출 결과
                  </span>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    {assignmentGradingPassed === false ? '채점 완료, 보완이 필요합니다.' : '채점 완료! 결과를 확인해 주세요.'}
                  </h3>
                  <p className="text-xs font-medium leading-relaxed text-gray-500">
                    {assignmentGradingResult.lessonTitle} 과제의 자동 채점이 완료되었습니다.
                  </p>
                </div>

                <div className="learning-assignment-result-body custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-6 [@media(max-height:760px)]:p-[18px]">
                  <div className="learning-assignment-score-card relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm [@media(max-height:760px)]:mb-[18px] [@media(max-height:760px)]:p-[20px]">
                    <div className="absolute left-0 top-0 h-1 w-full bg-[#00C471]" />
                    <p className="mb-2 text-xs font-bold text-gray-500">최종 점수</p>
                    <div className="mb-3 text-5xl font-extrabold text-gray-900">
                      {assignmentGradingScore ?? '-'}
                      <span className="text-xl font-medium text-gray-400">/{assignmentGradingResult.assignment.totalScore ?? 100}</span>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${assignmentGradingBadge.className}`}>
                      <i className={assignmentGradingBadge.iconClassName} />
                      {assignmentGradingBadge.label}
                    </div>
                  </div>

                  <div className="learning-assignment-report-section">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <i className="fas fa-clipboard-check text-gray-400" />
                      자동 검증 리포트
                    </h4>
                    <div className="learning-assignment-report-card space-y-3 rounded-xl bg-gray-900 p-4 text-xs text-gray-300 shadow-inner">
                      {assignmentGradingReportRows.map((row) => (
                        <div
                          key={`${row.label}-${row.value}`}
                          className={`flex items-center justify-between ${
                            row.tone === 'success'
                              ? 'text-green-400'
                              : row.tone === 'warning'
                                ? 'text-yellow-400'
                                : 'text-sky-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <i className={`${row.iconClassName} text-[10px]`} />
                            {row.label}
                          </span>
                          <span className="font-bold">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {assignmentGradingFeedback ? (
                    <div className="learning-assignment-feedback-section mt-[20px] [@media(max-height:760px)]:mt-[18px]">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <i className="fas fa-robot text-[#00C471]" />
                        AI 코드 리뷰어 피드백
                      </h4>
                      <div className="learning-assignment-feedback-card custom-scrollbar max-h-[clamp(180px,30vh,340px)] overflow-y-auto overscroll-contain whitespace-pre-line rounded-xl border border-emerald-100 bg-emerald-50 p-4 pr-[18px] text-xs leading-relaxed font-medium text-emerald-950 [@media(max-height:760px)]:max-h-[220px]">
                        {assignmentGradingFeedback}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="learning-assignment-result-footer shrink-0 border-t border-gray-100 bg-gray-50 p-6 [@media(max-height:760px)]:p-[18px]">
                  <button
                    type="button"
                    onClick={handleAssignmentResultPrimaryAction}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-black"
                  >
                    <i className={`fas ${assignmentResultPrimaryActionIcon} text-[#00C471]`} />
                    <span>{assignmentResultPrimaryActionLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {completionVisible && completionProofCard && completionTheme ? (
            <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#0F172A] px-6 py-10">
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background: `radial-gradient(circle at 50% 45%, ${completionTheme.glowColor} 0%, rgba(15,23,42,0) 60%)`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {completionParticles.map((particle) => (
                  <span
                    key={`${completionBurstKey}-${particle.id}`}
                    className="absolute top-[-10%] rounded-[999px] opacity-[0] [animation-name:completion-confetti-fall] [animation-timing-function:ease-out] [animation-fill-mode:forwards]"
                    style={{
                      left: `${particle.left}%`,
                      width: `${particle.size}px`,
                      height: `${particle.size * 1.7}px`,
                      backgroundColor: particle.color,
                      animationDelay: `${particle.delay}ms`,
                      animationDuration: `${particle.duration}ms`,
                      transform: `rotate(${particle.rotate}deg)`,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 w-full max-w-4xl text-center">
                <div className="[animation:completion-fade-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] mb-10">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C471]/30 bg-[#00C471]/20 px-3 py-1 text-sm font-semibold text-[#00C471]">
                    <i className="fas fa-crown" /> 학습 완료
                  </div>
                  <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">수고하셨습니다!</h1>
                  <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">
                    <span className="font-bold text-white [overflow-wrap:anywhere] [word-break:keep-all]">"{completionProofCard.title}"</span> 강의를 성공적으로 완료했습니다.
                  </p>
                </div>

                <div className="mx-auto h-[450px] w-full max-w-[320px] [perspective:1000px]">
                  <div
                    className={`${completionCardFlipped ? 'flipped ' : ''}completion-card group h-full w-full cursor-pointer`}
                    onClick={() => setCompletionCardFlipped((current) => !current)}
                  >
                    <div className="relative h-full w-full rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.45)] [transition:transform_0.6s] [transform-style:preserve-3d] [.flipped_&]:[transform:rotateY(180deg)]">
                      <div className="absolute top-[0] left-[0] flex h-full w-full flex-col overflow-hidden rounded-[1rem] bg-white [-webkit-backface-visibility:hidden] [backface-visibility:hidden]">
                        <div className={`relative flex h-44 flex-col justify-between bg-gradient-to-br ${completionTheme.frontGradientClassName} p-6`}>
                          <div className="flex items-start justify-between">
                            <span className="rounded border border-white/10 bg-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                              {completionTheme.badgeLabel}
                            </span>
                          </div>
                          <i className={`${completionTheme.iconClassName} absolute bottom-[-10px] right-[-10px] text-8xl text-white/10`} />
                          <div className="relative z-10 text-left text-white">
                            <h3 className="mb-1 overflow-hidden text-2xl leading-[1.15] font-semibold tracking-tight [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [word-break:keep-all]">{completionProofCard.frontTitle}</h3>
                            <p className="flex items-center gap-1 text-xs font-medium text-white/80">
                              <i className="fas fa-check-circle text-[#00C471]" /> DevPath Verified
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col justify-between bg-white p-6 text-left text-gray-800">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">학습 완료일</p>
                            <p className="text-sm font-bold text-gray-900">{formatShortDate(completionProofCard.issuedAt)}</p>
                          </div>
                          <div className="mt-2 border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs font-bold text-gray-500">{completionTheme.scoreLabel}</span>
                              <span className="text-3xl font-bold text-gray-900">
                                {completionProofCard.score}
                                <span className="text-xs font-normal text-gray-400"> / 100</span>
                              </span>
                            </div>
                          </div>
                          <div className="mt-5 text-center">
                            <span className="flex items-center justify-center gap-1 text-[10px] font-medium text-gray-400 animate-pulse">
                              <i className="fas fa-sync-alt" /> 카드를 눌러 뒷면을 확인하세요
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="absolute top-[0] left-[0] flex h-full w-full flex-col overflow-hidden rounded-[1rem] bg-gray-900 p-6 text-left text-white [-webkit-backface-visibility:hidden] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <div className="mb-4 border-b border-gray-700 pb-4">
                          <h3 className="overflow-hidden text-lg leading-[1.25] font-bold text-white [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [word-break:keep-all]">{completionProofCard.title}</h3>
                          <p className="mt-1 overflow-hidden text-xs leading-relaxed text-gray-400 [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] [word-break:keep-all]">{completionProofCard.description}</p>
                        </div>
                        <div className="flex-1">
                          <p className={`mb-3 text-[10px] font-bold uppercase tracking-wider ${completionTheme.markerClassName}`}>
                            검증된 세부 역량
                          </p>
                          <ul className="space-y-2.5 text-sm text-gray-300">
                            {completionProofCard.verifiedSkills.map((item) => (
                              <li key={`${completionProofCard.title}-${item}`} className="flex items-start gap-2">
                                <i className="fas fa-check mt-0.5 text-[10px] text-[#00C471]" />
                                <span className="overflow-hidden [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [word-break:keep-all]">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-5 border-t border-gray-700 pt-4">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">완료 섹션</div>
                          <div className="mt-2 overflow-hidden text-sm font-bold text-white [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [word-break:keep-all]">{completionProofCard.sectionTitle}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="[animation:completion-fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_0.18s_both] mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => { navigateTo(completionRoadmapReturnHref) }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-8 py-3.5 font-bold text-white transition hover:bg-gray-700 sm:w-auto"
                  >
                    <i className="fas fa-map-marked-alt" /> 로드맵으로 돌아가기
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigateTo('/learning-log-gallery') }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C471] px-8 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(0,196,113,0.3)] transition hover:-translate-y-1 hover:bg-green-600 sm:w-auto"
                  >
                    <i className="fas fa-file-signature" /> 내 증명 카드 보기
                  </button>
                </div>
                <p className="[animation:completion-fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_0.18s_both] mt-6 text-xs text-gray-500">
                  이 완료 카드는 현재 강의 진행률과 제출된 과제 결과를 기준으로 생성됩니다.
                </p>
                <button
                  type="button"
                  onClick={closeCompletionOverlay}
                  className="[animation:completion-fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_0.18s_both] mt-6 text-xs font-bold text-gray-400 transition hover:text-white"
                >
                  이 화면 닫기
                </button>
              </div>
            </div>
          ) : null}

          {quizModalLesson && activeQuizQuestion ? (
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="learning-quiz-title"
              onClick={closeQuizModal}
            >
              <div
                className="max-h-full w-full max-w-2xl overflow-hidden rounded-lg bg-white text-gray-900 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 p-5 sm:p-6">
                  <div className="min-w-0">
                    <span className="mb-2 inline-flex rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                      섹션 퀴즈
                    </span>
                    <h2 id="learning-quiz-title" className="truncate text-xl font-semibold text-gray-900" title={quizModalLesson.title}>
                      {quizModalLesson.title}
                    </h2>
                    {quizModalLesson.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500" title={quizModalLesson.description}>{quizModalLesson.description}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <button
                      type="button"
                      onClick={closeQuizModal}
                      className="ml-auto mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:text-gray-900"
                      aria-label="퀴즈 닫기"
                    >
                      <i className="fas fa-times" />
                    </button>
                    <span className="text-sm font-bold text-gray-500">
                      문제 {quizQuestionIndex + 1} / {quizModalQuestions.length}
                    </span>
                    <div className="mt-2 flex justify-end gap-1">
                      {quizModalQuestions.map((item, index) => (
                        <span
                          key={`${item.label}-${index}`}
                          className={`h-1 w-8 rounded-full ${index <= quizQuestionIndex ? 'bg-[#00C471]' : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="max-h-[62vh] overflow-y-auto p-5 sm:p-8">
                  <p className="mb-6 text-lg font-semibold leading-8 text-gray-900">
                    Q. {activeQuizQuestion.questionText}
                  </p>

                  <div className="space-y-3">
                    {activeQuizQuestion.options.map((option, optionIndex) => {
                      const selected = quizSelectedOptionIndex === optionIndex
                      const showCorrect = quizFeedback !== null && optionIndex === activeQuizQuestion.correctOptionIndex
                      const showWrong = quizFeedback === 'wrong' && selected

                      return (
                        <button
                          key={`${activeQuizQuestion.label}-${option}`}
                          type="button"
                          onClick={() => handleQuizOptionSelect(optionIndex)}
                          className={`flex w-full items-center justify-between gap-4 rounded-lg border-2 p-4 text-left text-sm transition ${
                            showCorrect
                              ? 'border-[#00C471] bg-green-50 text-[#00A862]'
                              : showWrong
                                ? 'border-rose-300 bg-rose-50 text-rose-700'
                                : selected
                                  ? 'border-[#00C471] bg-green-50 text-[#00A862]'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span>{optionIndex + 1}. {option}</span>
                          <i className={`fas ${
                            showCorrect
                              ? 'fa-check-circle text-[#00C471] opacity-100'
                              : showWrong
                                ? 'fa-circle-exclamation text-rose-500 opacity-100'
                                : selected
                                  ? 'fa-check-circle text-[#00C471] opacity-100'
                                  : 'fa-check-circle text-[#00C471] opacity-0'
                          } transition`} />
                        </button>
                      )
                    })}
                  </div>

                  {quizFeedback ? (
                    <div className={`mt-6 rounded-lg p-4 text-sm font-medium leading-6 ${
                      quizFeedback === 'correct' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      <div className="flex items-center gap-2 font-bold">
                        <i className={`fas ${quizFeedback === 'correct' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} />
                        <span>{quizFeedback === 'correct' ? '정답입니다.' : '정답이 아닙니다.'}</span>
                      </div>
                      {quizFeedback === 'wrong' ? (
                        <p className="mt-2">
                          정답: {activeQuizQuestion.correctOptionIndex + 1}.{' '}
                          {activeQuizQuestion.options[activeQuizQuestion.correctOptionIndex]}
                        </p>
                      ) : null}
                      <div className="mt-3 rounded-md bg-white/70 px-3 py-2">
                        <p className="text-xs font-bold text-gray-500">해설</p>
                        <p className="mt-1">{activeQuizQuestion.explanation}</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-5 sm:p-6">
                  <button
                    type="button"
                    onClick={() => {
                      setQuizQuestionIndex((current) => Math.max(0, current - 1))
                      setQuizSelectedOptionIndex(null)
                      setQuizFeedback(null)
                    }}
                    disabled={quizQuestionIndex === 0}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    이전 문제
                  </button>
                  <button
                    type="button"
                    onClick={quizFeedback === 'correct' ? handleQuizNextQuestion : handleQuizCheckAnswer}
                    className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 active:scale-[0.99]"
                  >
                    {quizFeedback === 'correct'
                      ? quizQuestionIndex < quizModalQuestions.length - 1 ? '다음 문제로' : '퀴즈 완료하기'
                      : '정답 확인하기'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── 노트 모달 ── */}
          {activeNote ? (
            <div
              className="learning-note-edit-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(17,24,39,0.6)] backdrop-blur-[4px] [animation:learningFadeIn_0.2s_ease-out_forwards]"
              onClick={() => { setOpenNoteId(null); setEditingNoteContent('') }}
            >
              <div
                className="learning-note-edit-modal-panel w-[90%] max-w-[450px] transform overflow-hidden rounded-[16px] bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] transition-all"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="learning-note-edit-modal-header flex min-h-[61px] items-center justify-between border-b border-[#F3F4F6] bg-[#F9FAFB] px-[24px] py-[16px]">
                  <h3 className="learning-note-edit-modal-title m-0 font-['Pretendard',sans-serif] text-[16px] leading-[24px] font-bold text-[#1F2937]">강의 노트 수정</h3>
                  <button
                    type="button"
                    onClick={() => { setOpenNoteId(null); setEditingNoteContent('') }}
                    className="learning-note-edit-modal-close text-[#9CA3AF] transition hover:text-gray-600 [&_i]:text-[18px] [&_i]:leading-[28px]"
                  >
                    <i className="fas fa-times text-lg" />
                  </button>
                </div>

                <div className="learning-note-edit-modal-body p-[24px]">
                  <div className="learning-note-edit-modal-meta mb-[12px] flex items-center gap-[8px]">
                    <span className="learning-note-edit-modal-time inline-flex min-h-[24px] items-center rounded-[4px] bg-[#DCFCE7] px-[8px] py-[4px] font-['Pretendard',sans-serif] text-[12px] leading-[16px] font-bold text-[#00C471]">
                      {activeNote.timestampLabel || formatTime(activeNote.timestampSecond)}
                    </span>
                    <span className="learning-note-edit-modal-help font-['Pretendard',sans-serif] text-[12px] leading-[16px] font-normal text-[#6B7280]">해당 시간에 작성한 메모 내용을 수정합니다.</span>
                  </div>

                  <div className="learning-note-edit-modal-field mb-[16px]">
                    <textarea
                      value={editingNoteContent}
                      onChange={(event) => setEditingNoteContent(event.target.value)}
                      className="learning-note-edit-modal-textarea h-[128px] w-full resize-none rounded-[8px] border border-[#D1D5DB] bg-white p-[12px] font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] focus:outline-none [box-sizing:border-box]"
                      placeholder="수정할 내용을 입력하세요."
                    />
                  </div>

                  {noteMessage ? (
                    <p className="learning-note-edit-modal-message mt-[-4px] mb-[12px] font-['Pretendard',sans-serif] text-[11px] leading-[16px] font-medium text-[#6B7280]">{noteMessage}</p>
                  ) : null}

                  <div className="learning-note-edit-modal-actions flex justify-end gap-[8px]">
                    <button
                      type="button"
                      onClick={() => { setOpenNoteId(null); setEditingNoteContent('') }}
                      className="learning-note-edit-modal-cancel h-[42px] rounded-[8px] border border-[#D1D5DB] bg-white px-[16px] py-[10px] font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-medium text-[#4B5563] transition hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpdateNote()}
                      disabled={!editingNoteContent.trim()}
                      className="learning-note-edit-modal-submit h-[42px] rounded-[8px] border-0 bg-[#00C471] px-[16px] py-[10px] font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-bold text-white shadow-[0_4px_6px_-1px_rgba(15,23,42,0.1)] transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      수정완료
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
    </>
  )
}
