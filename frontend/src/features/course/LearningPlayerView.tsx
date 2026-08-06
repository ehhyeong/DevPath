import type { LearningPlayerReadyModel } from './useLearningPlayerController'
import { navigateTo } from '../../lib/spa-navigation'
import type { QnaDifficulty } from '../../types/qna'
import { EmptyState } from './learning-player-states'
import { formatRelativeTime,formatShortDate,getVideoErrorMessage,isLessonProgressCompleted,isOwnQnaQuestion,isQuestionAnswered,isQuizLesson,resolveLessonAssignment,VIDEO_QUALITY_OPTIONS } from './learning-player-model'
import { formatDateLabel,formatTime,PLAYER_SPEEDS,resolveMaterialDownloadHref } from './learning-player-support'

type LearningPlayerViewProps = {
  model: LearningPlayerReadyModel
}

export default function LearningPlayerView({ model }: LearningPlayerViewProps) {
  const {
    isStudentPreview,
    studentPreviewReturnHref,
    learningBackHref,
    lesson,
    courseProgressPercent,
    frameRef,
    setIsSelectMode,
    setSelectDrag,
    ocrBusy,
    isSelectMode,
    hasVideoSource,
    activeVideoQuality,
    videoRef,
    resolvedVideoUrl,
    course,
    setVideoFailed,
    handleTogglePlaySafe,
    showVideoErrorOverlay,
    handleRetryVideoLoad,
    selectDrag,
    handleOcr,
    isPlaying,
    selectedLessonLocked,
    selectedLessonLock,
    selectedLessonIsQuiz,
    selectedLessonHasAssignment,
    selectedLessonAssignment,
    selectedAssignmentHistory,
    openQuizModal,
    openAssignmentModal,
    notice,
    playbackMax,
    playbackProgressPercent,
    currentTime,
    handleSeek,
    duration,
    handleToggleMute,
    isMuted,
    volume,
    handleVolumeChange,
    setSettingsOpen,
    handleCyclePlaybackRate,
    settingsOpen,
    playerConfig,
    handleSetPlaybackRate,
    videoQualitySources,
    handleSetVideoQuality,
    handleTogglePip,
    isPipActive,
    handleToggleFullscreen,
    isFrameFullscreen,
    handlePreviousLesson,
    previousLesson,
    handleNextLesson,
    nextLesson,
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
    (
    <div className="learning-player-surface flex h-screen flex-col overflow-hidden bg-[#F8F9FA] font-['Pretendard',sans-serif] text-[16px] leading-[1.5] tracking-[0] [&_*]:tracking-[0] [&_button]:font-['Pretendard',sans-serif] [&_input]:font-['Pretendard',sans-serif] [&_select]:font-['Pretendard',sans-serif] [&_textarea]:font-['Pretendard',sans-serif] [&_.custom-scrollbar::-webkit-scrollbar]:h-[6px] [&_.custom-scrollbar::-webkit-scrollbar]:w-[6px] [&_.custom-scrollbar::-webkit-scrollbar-thumb]:rounded-[3px] [&_.custom-scrollbar::-webkit-scrollbar-thumb]:bg-[#CBD5E1]">

      {/* 상단 헤더 */}
      <header className="learning-player-top-header z-50 flex h-[56px] min-h-[56px] shrink-0 items-center justify-between border-b border-[#1F2937] bg-[#111827] px-[24px] text-white [box-sizing:border-box]">
        <div className="learning-player-top-header-left flex min-w-0 items-center gap-[16px]">
          <button
            type="button"
            onClick={() => navigateTo(isStudentPreview ? studentPreviewReturnHref : learningBackHref)}
            className="learning-player-back-link m-0 inline-flex shrink-0 appearance-none items-center whitespace-nowrap border-0 bg-transparent p-0 font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-normal text-[#9CA3AF] transition hover:text-white"
          >
            <i className="learning-player-back-icon fas fa-chevron-left mr-[8px] text-[14px] leading-[14px]" />
            {isStudentPreview ? '질문 게시판으로 돌아가기' : '로드맵으로 돌아가기'}
          </button>
          <div className="learning-player-header-divider h-[16px] w-[1px] shrink-0 bg-[#374151]" />
          <span className="learning-player-header-title min-w-0 truncate font-['Pretendard',sans-serif] text-[14px] leading-[20px] font-bold text-[#F3F4F6]" title={lesson.title}>{lesson.title}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-[#00C471] transition-[width]" style={{ width: `${courseProgressPercent}%` }} />
            </div>
            <span className="text-xs">{courseProgressPercent}% 완료</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

      {/* ── 영상 패널 (좌 3/4) ── */}
      <main className="flex-1 bg-black flex flex-col min-w-0">

        {/* 영상 프레임 */}
        <div ref={frameRef} className="flex-1 relative flex flex-col justify-center items-center w-full overflow-hidden group">

          {/* 우측 상단 오버레이 버튼 */}
          <div className="absolute right-6 top-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={() => { setIsSelectMode(prev => !prev); setSelectDrag(null) }}
              disabled={ocrBusy}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-md transition hover:text-black disabled:cursor-wait disabled:opacity-60 ${
                isSelectMode
                  ? 'border-[#00C471] bg-[#00C471] text-black'
                  : 'border-white/20 bg-black/60 text-white hover:bg-[#00C471]'
              }`}
            >
              <i className={`fas ${ocrBusy ? 'fa-spinner fa-spin' : 'fa-crop-simple'} text-xs`} />
              <span>{ocrBusy ? '글자 읽는 중...' : isSelectMode ? '영역 선택 중' : '화면 글자 복사'}</span>
            </button>
          </div>

          {/* 영상 또는 빈 화면 */}
          <div className="learning-player-video-stage relative flex h-full w-full items-center justify-center overflow-hidden bg-[#111827]">
            {hasVideoSource ? (
              <>
                <video
                  key={`${lesson.lessonId}-${activeVideoQuality ?? 'source'}`}
                  ref={videoRef}
                  src={resolvedVideoUrl ?? undefined}
                  poster={lesson.thumbnailUrl ?? course.thumbnailUrl ?? undefined}
                  className="learning-player-video-element h-full w-full max-w-none object-contain object-center"
                  playsInline
                  preload="auto"
                  onLoadedData={() => setVideoFailed(false)}
                  onCanPlay={() => setVideoFailed(false)}
                  onClick={() => { if (!isSelectMode) void handleTogglePlaySafe() }}
                />
                {showVideoErrorOverlay ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 px-6">
                    <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-black/70 px-6 py-7 text-center shadow-2xl backdrop-blur">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                        <i className="fas fa-circle-exclamation text-2xl" />
                      </div>
                      <h2 className="mt-5 text-xl font-semibold">영상 로드 실패</h2>
                      <p className="mt-3 text-sm leading-6 text-white/70">
                        {notice ?? getVideoErrorMessage(null, resolvedVideoUrl)}
                      </p>
                      <p className="mt-3 break-all text-xs text-white/35">{resolvedVideoUrl}</p>
                      <div className="mt-6 flex justify-center">
                        <button
                          type="button"
                          onClick={handleRetryVideoLoad}
                          className="rounded-full bg-[#00C471] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
                        >
                          다시 불러오기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* ── 구간 선택 오버레이 ── */}
                {isSelectMode && (
                  <div
                    className="absolute inset-0 z-30 cursor-crosshair select-none"
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const y = e.clientY - rect.top
                      setSelectDrag({ startX: x, startY: y, endX: x, endY: y })
                    }}
                    onMouseMove={(e) => {
                      if (!selectDrag) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      setSelectDrag(prev => prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null)
                    }}
                    onMouseUp={(e) => {
                      if (!selectDrag) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const endX = e.clientX - rect.left
                      const endY = e.clientY - rect.top
                      const x = Math.min(selectDrag.startX, endX)
                      const y = Math.min(selectDrag.startY, endY)
                      const w = Math.abs(endX - selectDrag.startX)
                      const h = Math.abs(endY - selectDrag.startY)
                      setSelectDrag(null)
                      if (w > 20 && h > 20) {
                        void handleOcr({ x, y, width: w, height: h })
                      }
                    }}
                    onMouseLeave={() => { if (selectDrag) setSelectDrag(null) }}
                  >
                    {/* 반투명 힌트 텍스트 */}
                    {!selectDrag && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="rounded-lg bg-black/60 px-4 py-2 text-sm font-bold text-[#00C471] backdrop-blur-sm animate-pulse">
                          <i className="fas fa-crop-simple mr-2" />
                          드래그해서 복사할 글자를 선택하세요
                        </span>
                      </div>
                    )}

                    {/* 선택 중인 박스 */}
                    {selectDrag && (
                      <div
                        className="pointer-events-none absolute border-2 border-[#00C471] bg-[#00C471]/10"
                        style={{
                          left:   Math.min(selectDrag.startX, selectDrag.endX),
                          top:    Math.min(selectDrag.startY, selectDrag.endY),
                          width:  Math.abs(selectDrag.endX - selectDrag.startX),
                          height: Math.abs(selectDrag.endY - selectDrag.startY),
                        }}
                      />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleTogglePlaySafe()}
                  className={`absolute text-white/80 hover:text-[#00C471] transition transform hover:scale-110 ${
                    isSelectMode ? 'pointer-events-none opacity-0' :
                    isPlaying ? 'opacity-0 lg:group-hover:opacity-100' : 'opacity-100'
                  }`}
                >
                  <i className={`far ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'} text-7xl drop-shadow-lg`} />
                </button>
                <div className="learning-player-video-title absolute top-[24px] left-[24px] font-['Pretendard',sans-serif] text-[20px] leading-[28px] font-bold text-white/80 drop-shadow-md">
                  {lesson.title}
                </div>
              </>
            ) : selectedLessonLocked ? (
              <div className="mx-6 w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/8 text-white/55">
                  <i className="fas fa-lock text-2xl" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold">아직 잠겨 있습니다</h2>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  {selectedLessonLock?.prerequisiteLessonTitle
                    ? `"${selectedLessonLock.prerequisiteLessonTitle}" 강의를 끝까지 보면 열립니다.`
                    : '이전 강의를 끝까지 보면 열립니다.'}
                </p>
              </div>
            ) : (
              <div className="mx-6 w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                  selectedLessonIsQuiz
                    ? 'bg-amber-400/15 text-amber-200'
                    : selectedLessonHasAssignment
                      ? 'bg-violet-400/15 text-violet-200'
                      : 'bg-white/8 text-white/45'
                }`}>
                  <i className={`fas ${
                    selectedLessonIsQuiz
                      ? 'fa-circle-question'
                      : selectedLessonHasAssignment
                        ? 'fa-clipboard-check'
                        : 'fa-video-slash'
                  } text-2xl`} />
                </div>
                <h2 className="mt-6 text-2xl font-semibold text-white">
                  {selectedLessonIsQuiz ? '섹션 퀴즈' : selectedLessonHasAssignment ? '과제 제출' : '영상이 연결되지 않았습니다'}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  {selectedLessonIsQuiz ? (
                    <>
                      이번 섹션의 핵심 내용을 확인합니다.
                      <br />
                      퀴즈를 완료하면 다음 강의로 이동할 수 있습니다.
                    </>
                  ) : selectedLessonHasAssignment && selectedLessonAssignment ? (
                    <>
                      이번 강의의 실습 과제를 제출합니다.
                      <br />
                      제출 후 자동 채점 점수와 루브릭 기준을 바로 확인할 수 있습니다.
                    </>
                  ) : (
                    <>
                      이 강의에는 아직 재생 가능한 영상 URL이 없습니다.
                      <br />
                      다른 강의를 선택하거나 첨부 자료를 확인해 주세요.
                    </>
                  )}
                </p>
                {selectedLessonHasAssignment && selectedLessonAssignment ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-violet-500 px-2 py-1 text-[10px] font-semibold text-white">자동 채점</span>
                      <span className="text-[11px] font-medium text-white/55">
                        총점 {selectedLessonAssignment.totalScore ?? 100}점
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-white">{selectedLessonAssignment.title}</div>
                    {selectedLessonAssignment.dueAt ? (
                      <div className="mt-2 text-xs text-white/50">마감일 {formatDateLabel(selectedLessonAssignment.dueAt)}</div>
                    ) : null}
                    {selectedAssignmentHistory ? (
                      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100">
                        최근 제출 점수 {selectedAssignmentHistory.totalScore ?? '-'} / {selectedLessonAssignment.totalScore ?? 100}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-100">
                        아직 제출하지 않았습니다.
                      </div>
                    )}
                  </div>
                ) : null}
                {selectedLessonIsQuiz ? (
                  <button
                    type="button"
                    onClick={() => openQuizModal(lesson)}
                    className="mt-6 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:bg-amber-600"
                  >
                    퀴즈 시작하기
                  </button>
                ) : selectedLessonHasAssignment ? (
                  <button
                    type="button"
                    onClick={() => openAssignmentModal(lesson)}
                    className="mt-6 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700"
                  >
                    과제 제출하기
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* 알림 토스트 */}
          {notice ? (
            <div className="absolute bottom-20 left-6 z-30 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-100">
              {notice}
            </div>
          ) : null}

          {/* 재생 컨트롤 바 */}
          {hasVideoSource ? (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end px-6 pb-4 gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
              <button type="button" onClick={() => void handleTogglePlaySafe()} className="text-white hover:text-[#00C471] transition">
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} />
              </button>
              <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden cursor-pointer relative mb-[9px]">
                <div className="h-full bg-[#00C471]" style={{ width: `${playbackProgressPercent}%` }} />
                <input
                  type="range"
                  min={0}
                  max={playbackMax}
                  step="any"
                  value={Math.min(currentTime, playbackMax)}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="재생 위치"
                />
              </div>
              <span className="text-xs text-white font-mono mb-1">
                {formatTime(currentTime)} / {formatTime(duration || (lesson.durationSeconds ?? 0))}
              </span>
              <button type="button" onClick={handleToggleMute} className="text-white hover:text-[#00C471] transition">
                <i className={`fas ${isMuted || volume === 0 ? 'fa-volume-xmark' : 'fa-volume-up'}`} />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
                className="sr-only"
                aria-label="볼륨"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((current) => !current)}
                  onDoubleClick={() => void handleCyclePlaybackRate()}
                  className="text-white hover:text-[#00C471] transition"
                  aria-label="재생 설정"
                >
                  <i className="fas fa-cog" />
                </button>
                {settingsOpen ? (
                  <div className="absolute right-0 bottom-full z-50 mb-4 flex w-40 flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl [animation:learningFadeIn_0.2s_ease-out_forwards]">
                    <div className="px-3 py-2 border-b border-gray-700">
                      <span className="text-xs text-gray-400 font-bold">재생 속도</span>
                    </div>
                    {PLAYER_SPEEDS.map((speed) => {
                      const active = (playerConfig?.defaultPlaybackRate ?? 1) === speed
                      return (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => void handleSetPlaybackRate(speed)}
                          className={`text-left px-4 py-2 text-sm transition ${
                            active
                              ? 'text-[#00C471] bg-gray-800 font-bold flex justify-between items-center'
                              : 'text-gray-200 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          {speed.toFixed(1)}x {active ? <i className="fas fa-check text-xs" /> : null}
                        </button>
                      )
                    })}
                    <div className="px-3 py-2 border-b border-t border-gray-700 mt-1">
                      <span className="text-xs text-gray-400 font-bold">화질</span>
                    </div>
                    {VIDEO_QUALITY_OPTIONS.map((quality) => {
                      const available = Boolean(videoQualitySources[quality])
                      const active = available && activeVideoQuality === quality
                      return (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => handleSetVideoQuality(quality)}
                          aria-disabled={!available}
                          title={available ? '' : `${quality}p source is not registered`}
                          className={`text-left px-4 py-2 text-sm transition ${
                            active
                              ? 'text-[#00C471] bg-gray-800 font-bold flex justify-between items-center'
                              : available
                                ? 'text-gray-200 hover:bg-gray-800 hover:text-white'
                                : 'cursor-not-allowed text-gray-500'
                          }`}
                        >
                          {quality}p {active ? <i className="fas fa-check text-xs" /> : !available ? <span className="text-[10px] text-gray-600">N/A</span> : null}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false)
                        void handleTogglePip()
                      }}
                      aria-pressed={isPipActive}
                      className={`mt-1 border-t border-gray-700 text-left px-4 py-2 text-sm transition ${
                        isPipActive
                          ? 'text-[#00C471] bg-gray-800 font-bold flex justify-between items-center'
                          : 'text-gray-200 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {isPipActive ? (
                        <>
                          PIP 종료 <i className="fas fa-check text-xs" />
                        </>
                      ) : 'PIP 모드'}
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.blur()
                  void handleToggleFullscreen()
                }}
                className="text-white hover:text-[#00C471] transition"
                aria-label={isFrameFullscreen ? '전체화면 종료' : '전체화면'}
                aria-pressed={isFrameFullscreen}
              >
                <i className={`fas ${isFrameFullscreen ? 'fa-compress' : 'fa-expand'}`} />
              </button>
          </div>
          ) : null}
        </div>

        <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-6 shrink-0 z-30 relative">
          <button
            type="button"
            onClick={handlePreviousLesson}
            disabled={!previousLesson}
            className="flex items-center gap-3 px-8 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition hover:text-white border border-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <i className="fas fa-chevron-left" />
            이전 강의
          </button>
          <button
            type="button"
            onClick={handleNextLesson}
            disabled={!nextLesson || selectedLessonLocked}
            className="flex items-center gap-3 px-8 py-3 rounded-xl bg-[#00C471] hover:bg-green-600 text-white font-bold transition shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:shadow-none disabled:hover:translate-y-0"
          >
            다음 강의
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </main>

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

      </div>

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

    </div>
  )
  )
}
