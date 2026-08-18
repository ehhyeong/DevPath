

import { ErrorCard, LoadingCard } from '../../account/ui'
import { navigateTo } from '../../lib/spa-navigation'


import { type PersistedCourseStatus, COURSE_EDITOR_PAGE_UI_LOCK_CLASSES, createCustomInfoSection, createEmptyJobCard, createSection, EDITOR_ACTION_BUTTONS_STICKY_TOP_PX, EDITOR_SIDE_CARD_STICKY_TOP_PX, formatPriceInput, getAssetLabel, getInfoSectionPlaceholder, getStatusChip, lessonKindMeta, normalizeTagName } from '../course-editor/course-editor-model'


import { useCourseEditorController } from './useCourseEditorController'

export default function CourseEditorPage() {
  const { loading, saving, saveToast, showFloatingActionButtons, error, actionError, loadedCourse, title, setTitle, subtitle, setSubtitle, tagInput, setTagInput, tags, setTags, description, setDescription, descriptionTextareaRef, descriptionImageInputRef, thumbnailImageInputRef, trailerVideoInputRef, infoSections, setInfoSections, jobCards, setJobCards, sections, setSections, thumbnailUrl, thumbnailPreviewUrl, trailerUrl, priceInput, setPriceInput, status, setStatus, addTagFromInput, updateJobCard, removeJobCard, updateSectionField, removeSection, addLesson, updateLessonField, removeLesson, handleSave, handleRequestReview, handlePreview, insertDescriptionMarkdown, insertDescriptionImage, handleDescriptionImageFileChange, openLessonEditor, handleThumbnailFileChange, handleTrailerFileChange, handleLessonVideoFileChange } = useCourseEditorController()


  if (loading) {
    return (
      <div className={`course-editor-page p-8 ${COURSE_EDITOR_PAGE_UI_LOCK_CLASSES}`}>
        <LoadingCard label="강의 편집 데이터를 불러오는 중입니다." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`course-editor-page p-8 ${COURSE_EDITOR_PAGE_UI_LOCK_CLASSES}`}>
        <ErrorCard message={error} />
      </div>
    )
  }

  const statusChip = getStatusChip(status)
  const thumbnailDisplayUrl = thumbnailPreviewUrl || thumbnailUrl
  const actionButtonsFloatingStyle = { top: `${EDITOR_ACTION_BUTTONS_STICKY_TOP_PX}px` }
  const sideCardStickyStyle = { top: `${EDITOR_SIDE_CARD_STICKY_TOP_PX}px` }

  function renderActionButtons(containerClassName: string) {
    return (
      <div className={`course-editor-action-buttons ${containerClassName}`}>
        <button
          type="button"
          onClick={handlePreview}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
        >
          <i className="fas fa-eye" /> 미리보기
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
        <button
          type="button"
          onClick={handleRequestReview}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_10px_15px_-3px_rgba(37,99,235,0.2)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="fas fa-paper-plane" /> 심사 요청하기
        </button>
      </div>
    )
  }

  return (
    <div className={`course-editor-page p-8 ${COURSE_EDITOR_PAGE_UI_LOCK_CLASSES}`}>
      <div className="course-editor-topbar mb-6 flex flex-col gap-4 bg-[#F3F4F6] py-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigateTo('/course-management')}
            className="course-editor-back-button text-gray-400 transition hover:text-gray-800"
          >
            <i className="fas fa-arrow-left text-xl" />
          </button>
          <h1 className="text-2xl font-black text-gray-900">강의 편집</h1>
          <span className={`rounded px-2 py-1 text-xs font-bold ${statusChip.tone}`}>{statusChip.label}</span>
        </div>

        {renderActionButtons('flex flex-wrap gap-2 xl:justify-end')}
      </div>

      <div id="course-editor-action-buttons-sentinel" className="h-px w-full" />

      {showFloatingActionButtons ? (
        <div className="pointer-events-none fixed left-8 right-8 z-30" style={actionButtonsFloatingStyle}>
          {renderActionButtons('pointer-events-auto ml-auto flex w-fit max-w-full flex-wrap justify-end gap-2')}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </div>
      ) : null}

      <div className="course-editor-layout grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1180px)_360px]! lg:justify-start!">
        <div className="course-editor-main-column space-y-8 lg:max-w-[1180px]! lg:[grid-column:auto/span_1]!">
          <section className="course-editor-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-info-circle text-gray-400" /> 기본 정보
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">강의 제목</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  type="text"
                  placeholder="강의 제목을 입력해 주세요."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">한 줄 요약 (부제)</label>
                <input
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  type="text"
                  placeholder="강의를 한 줄로 설명해 주세요."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">검색용 태그 (공식 태그 기준)</label>
                <div className="course-editor-tag-container flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-white p-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setTags((current) => current.filter((item) => normalizeTagName(item) !== normalizeTagName(tag)))
                        }
                      >
                        <i className="fas fa-times" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addTagFromInput()
                      }
                    }}
                    type="text"
                    placeholder="태그 입력 후 Enter"
                    className="course-editor-tag-input min-w-[60px] flex-1 border-none text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="course-editor-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-align-left text-gray-400" /> 강의 소개
            </h3>

            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">강의 상세 설명</label>
                <div className="course-editor-description-editor overflow-hidden rounded-lg border border-gray-300">
                  <div className="course-editor-description-toolbar flex gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-gray-500">
                    <button type="button" onClick={() => insertDescriptionMarkdown('**', '**', '굵게 표시할 문구')}>
                      <i className="fas fa-bold" />
                    </button>
                    <button type="button" onClick={() => insertDescriptionMarkdown('*', '*', '기울임 문구')}>
                      <i className="fas fa-italic" />
                    </button>
                    <button type="button" onClick={() => insertDescriptionMarkdown('- ', '', '목록 항목')}>
                      <i className="fas fa-list-ul" />
                    </button>
                    <button type="button" onClick={insertDescriptionImage}>
                      <i className="fas fa-image" />
                    </button>
                    <input
                      ref={descriptionImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleDescriptionImageFileChange(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                  </div>
                  <textarea
                    ref={descriptionTextareaRef}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="강의의 목표, 특징, 수강 효과 등을 자세히 적어주세요."
                    className="h-32 w-full resize-none p-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold text-gray-500">강의 안내 분류</label>
                  <button
                    type="button"
                    onClick={() => setInfoSections((current) => [...current, createCustomInfoSection()])}
                    className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:border-emerald-400 hover:text-emerald-600"
                  >
                    <i className="fas fa-plus mr-1" /> 분류 추가
                  </button>
                </div>

                <div className="course-editor-info-section-grid grid grid-cols-1 gap-4 md:grid-cols-3">
                  {infoSections.map((section) => (
                    <div key={section.localId} className="course-editor-info-section-card rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="course-editor-info-section-header mb-2 flex items-center gap-2">
                        {section.removable ? (
                          <input
                            value={section.title}
                            onChange={(event) =>
                              setInfoSections((current) =>
                                current.map((item) =>
                                  item.localId === section.localId ? { ...item, title: event.target.value } : item,
                                ),
                              )
                            }
                            className="course-editor-info-section-title-input min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 outline-none transition focus:border-emerald-500"
                          />
                        ) : (
                          <div className="course-editor-info-section-title-label min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-bold text-gray-700">
                            {section.title}
                          </div>
                        )}
                        {section.removable ? (
                          <button
                            type="button"
                            onClick={() => setInfoSections((current) => current.filter((item) => item.localId !== section.localId))}
                            className="course-editor-info-section-remove shrink-0 rounded-md px-2 py-1 text-xs text-gray-400 transition hover:bg-white hover:text-rose-500"
                          >
                            <i className="fas fa-times" />
                          </button>
                        ) : null}
                      </div>
                      <textarea
                        value={section.content}
                        onChange={(event) =>
                          setInfoSections((current) =>
                            current.map((item) =>
                              item.localId === section.localId ? { ...item, content: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder={getInfoSectionPlaceholder(section.sectionKey)}
                        className="course-editor-info-section-textarea h-24 w-full resize-none rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none transition focus:border-emerald-500"
                      />
                      <p className="course-editor-info-section-help mt-1 text-[11px] font-medium text-gray-400">
                        <i className="fas fa-check mr-1" /> 예시처럼 - 로 시작한 줄만 저장됩니다.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="course-editor-card course-editor-job-section rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-briefcase text-blue-500" /> 직무 연관성 설정
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-normal text-blue-600">
                학생들에게 이 강의가 어떤 직무에 도움이 되는지 알려줍니다.
              </span>
            </h3>

            <div className="space-y-4">
              {jobCards.map((card) => (
                <div key={card.localId} className="course-editor-job-card relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <button
                    type="button"
                    onClick={() => removeJobCard(card.localId)}
                    className="absolute top-2 right-2 text-gray-400 transition hover:text-rose-500"
                  >
                    <i className="fas fa-times" />
                  </button>

                  <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-gray-500">직무명 (한글)</label>
                      <input
                        value={card.name}
                        onChange={(event) => updateJobCard(card.localId, 'name', event.target.value)}
                        type="text"
                        className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-gray-500">직무명 (영문)</label>
                      <input
                        value={card.nameEn}
                        onChange={(event) => updateJobCard(card.localId, 'nameEn', event.target.value)}
                        type="text"
                        className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="mb-1 block text-[10px] font-bold text-gray-500">설명</label>
                    <input
                      value={card.description}
                      onChange={(event) => updateJobCard(card.localId, 'description', event.target.value)}
                      type="text"
                      className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-500">키워드</label>
                    <input
                      value={card.keywords}
                      onChange={(event) => updateJobCard(card.localId, 'keywords', event.target.value)}
                      type="text"
                      className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setJobCards((current) => [...current, createEmptyJobCard()])}
              className="mt-4 w-full rounded-lg border border-dashed border-blue-300 bg-blue-50 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
            >
              + 직무 추가하기
            </button>
          </section>

          <section className="course-editor-card course-editor-curriculum-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="flex items-center gap-2 font-bold text-gray-900">
                <i className="fas fa-list-ol text-gray-400" /> 커리큘럼 구성
              </h3>
              <button
                type="button"
                onClick={() => setSections((current) => [...current, createSection(current.length + 1)])}
                className="rounded bg-gray-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black"
              >
                + 섹션 추가
              </button>
            </div>

            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <div key={section.localId} className="course-editor-section-card rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-2">
                      <i className="fas fa-bars cursor-move text-gray-300" />
                      <input
                        value={section.title}
                        onChange={(event) => updateSectionField(section.localId, 'title', event.target.value)}
                        type="text"
                        placeholder={`섹션 ${sectionIndex + 1} 제목`}
                        className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSection(section.localId)}
                      className="text-xs text-gray-300 transition hover:text-rose-500"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>

                  <div className="mb-3 space-y-2">
                    {section.lessons.map((lesson) => {
                      const meta = lessonKindMeta[lesson.kind]

                      return (
                        <div key={lesson.localId} className={`course-editor-lesson-card group rounded-lg border p-3 transition ${meta.containerTone}`}>
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                            <div className="flex w-6 justify-center">
                              <i className={`${meta.icon} text-lg ${meta.iconTone}`} />
                            </div>
                            <input
                              value={lesson.title}
                              onChange={(event) => updateLessonField(section.localId, lesson.localId, 'title', event.target.value)}
                              type="text"
                              placeholder={meta.placeholder}
                              className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none"
                            />
                            {lesson.kind === 'lecture' ? (
                              <label
                                className={`course-editor-lesson-upload-label rounded px-3 py-1.5 text-xs font-bold transition ${meta.buttonTone}`}
                                title={getAssetLabel(lesson.videoUrl, '영상 업로드')}
                              >
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  onChange={(event) => {
                                    void handleLessonVideoFileChange(section.localId, lesson.localId, event.target.files?.[0] ?? null)
                                    event.target.value = ''
                                  }}
                                />
                                <span>영상 업로드</span>
                              </label>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  await openLessonEditor(lesson)
                                }}
                                disabled={saving}
                                className={`rounded px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${meta.buttonTone}`}
                              >
                                {meta.buttonLabel}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeLesson(section.localId, lesson.localId)}
                              className="text-gray-300 transition hover:text-rose-500"
                            >
                              <i className="fas fa-times" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => addLesson(section.localId, 'lecture')}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800"
                    >
                      <i className="fas fa-video" /> 강의 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => addLesson(section.localId, 'quiz')}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600"
                    >
                      <i className="fas fa-question-circle" /> 퀴즈 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => addLesson(section.localId, 'assignment')}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <i className="fas fa-file-code" /> 과제 추가
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="course-editor-side-column space-y-6 lg:w-[360px]! lg:max-w-[360px]! lg:[grid-column:auto/span_1]!">
          <section className="course-editor-media-card sticky rounded-xl border border-gray-200 bg-white p-6 shadow-sm" style={sideCardStickyStyle}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
              <i className="fas fa-photo-video text-gray-400" /> 미디어 설정
            </h3>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold text-gray-500">썸네일 이미지</label>
              <button
                type="button"
                onClick={() => thumbnailImageInputRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 transition hover:bg-gray-50"
              >
                {thumbnailDisplayUrl ? (
                  <img src={thumbnailDisplayUrl} alt="썸네일 미리보기" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt mb-1 text-xl text-gray-400" />
                    <span className="text-xs text-gray-400">이미지 업로드</span>
                  </>
                )}
              </button>
              <input
                ref={thumbnailImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleThumbnailFileChange(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-xs font-bold text-gray-500">미리보기 영상 (Trailer)</label>
              <button
                type="button"
                onClick={() => trailerVideoInputRef.current?.click()}
                className="flex h-10 w-full items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-left transition hover:bg-gray-100"
              >
                <i className="fas fa-video mr-2 text-gray-400" />
                <span className="truncate text-xs text-gray-500">{getAssetLabel(trailerUrl, '파일 선택...')}</span>
                <span className="ml-auto text-xs font-bold text-emerald-500">업로드</span>
              </button>
              <input
                ref={trailerVideoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  void handleTrailerFileChange(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="mb-1 block text-xs font-bold text-gray-500">가격 (원)</label>
              <input
                value={priceInput}
                onChange={(event) => setPriceInput(formatPriceInput(event.target.value))}
                type="text"
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 p-2 text-right text-sm font-bold outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold text-gray-500">공개 상태</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PersistedCourseStatus)}
                className="w-full cursor-pointer rounded-lg border border-gray-300 p-2 text-sm outline-none"
              >
                <option value="DRAFT">비공개 (작성 중)</option>
                <option value="PUBLISHED">공개 (수강 신청 가능)</option>
                {status === 'IN_REVIEW' ? <option value="IN_REVIEW">심사 중</option> : null}
              </select>
            </div>

            {loadedCourse?.status === 'IN_REVIEW' ? (
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-xs font-medium text-blue-700">
                현재 이 강의는 심사 중입니다. 저장하면 선택한 공개 상태 값으로 다시 반영됩니다.
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {saveToast ? (
        <div className="pointer-events-none fixed top-20 left-1/2 z-[1000] -translate-x-1/2">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl border px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-sm ${
              saveToast.variant === 'error' ? 'border-rose-500 bg-rose-600/95' : 'border-gray-700 bg-gray-900/90'
            }`}
          >
            <i
              className={`fas mr-2 ${
                saveToast.variant === 'error' ? 'fa-exclamation-circle text-white' : 'fa-info-circle text-[#00C471]'
              }`}
            />
            {saveToast.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}
