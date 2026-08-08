import type { LearningPlayerReadyModel } from './useLearningPlayerController'
import { getVideoErrorMessage, VIDEO_QUALITY_OPTIONS } from './learning-player-model'
import { formatDateLabel, formatTime, PLAYER_SPEEDS } from './learning-player-support'

type Props = { model: LearningPlayerReadyModel }

export default function LearningVideoPanel({ model }: Props) {
  const {
    lesson,
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
  } = model

  return (
    <>
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
    </>
  )
}
