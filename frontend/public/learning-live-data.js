(function () {
  const params = new URLSearchParams(window.location.search);
  const courseId = toPositiveInteger(params.get('courseId'));

  if (typeof window.switchTab === 'function') {
    window.switchTab('curriculum');
  }

  liftVideoTimeline();
  lowerVideoPlayButton();

  const AUTH_STORAGE_KEY = 'devpath.auth.session';
  const API_BASE_URL = String(window.DEVPATH_API_BASE_URL || '').replace(/\/$/, '');
  const REQUEST_TIMEOUT_MS = 15000;
  const DEFAULT_THUMBNAIL =
    'https://images.unsplash.com/photo-1550439062-609e1531270e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80';
  const VIDEO_QUALITIES = [1080, 720];

  const state = {
    courseId,
    course: null,
    sections: [],
    lessons: [],
    lesson: null,
    lessonIndex: -1,
    progressByLessonId: new Map(),
    progress: null,
    playerConfig: null,
    actualDurationByLessonId: new Map(),
    qnaQuestions: [],
    qnaDetails: new Map(),
    qnaFilter: 'all',
    notes: [],
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    videoQuality: 1080,
    ocrBusy: false,
    ocrSelecting: false,
    playerNoticeTimer: null,
    lastProgressSaveAt: 0,
    progressSaveTimer: null,
  };

  bindStaticControls();

  if (!courseId) {
    bindVideoElement(getMediaElement());
    updateVideoUi();
    updatePlaybackRateButtons();
    updateQualityButtons();
    return;
  }

  initLearningData();

  async function initLearningData() {
    try {
      state.course = await apiRequest(`/api/courses/${state.courseId}`);
      state.sections = normalizeSections(state.course.sections || []);
      state.lessons = flattenLessons(state.sections);
      state.lesson = pickInitialLesson();
      state.lessonIndex = state.lessons.findIndex((lesson) => lesson.lessonId === state.lesson?.lessonId);

      if (!state.lesson) {
        return;
      }

      renderCourseShell();
      renderCurriculum();
      loadActualDurationsForLessons();
      await loadLessonScopedData(state.lesson.lessonId);
      await loadCourseScopedData();
      renderAllDynamicViews();
    } catch (error) {
      console.warn('[learning] Failed to hydrate learning page. Keeping mock UI.', error);
    }
  }

  async function loadCourseScopedData() {
    const qnaQuestions = await optionalRequest(
      () => apiRequest(`/api/qna/questions?courseId=${encodeURIComponent(state.courseId)}`),
      [],
    );

    state.qnaQuestions = Array.isArray(qnaQuestions) ? qnaQuestions : [];
  }

  async function loadLessonScopedData(lessonId) {
    const startedProgress = await optionalRequest(
      () => apiRequest(`/api/learning/sessions/${lessonId}/start`, { method: 'POST' }),
      null,
    );

    if (startedProgress) {
      state.progress = startedProgress;
      state.progressByLessonId.set(Number(lessonId), startedProgress);
      state.currentTime = toFiniteNumber(startedProgress.progressSeconds, 0);
      state.playbackRate = toFiniteNumber(startedProgress.defaultPlaybackRate, state.playbackRate);
    }

    const [playerConfig, notes] = await Promise.all([
      optionalRequest(() => apiRequest(`/api/learning/player/${lessonId}/config`), null),
      optionalRequest(() => apiRequest(`/api/learning/lessons/${lessonId}/notes`), []),
      loadProgressForOtherLessons(lessonId),
    ]);

    state.playerConfig = playerConfig;

    if (playerConfig) {
      state.playbackRate = toFiniteNumber(playerConfig.defaultPlaybackRate, state.playbackRate);
    }

    state.notes = Array.isArray(notes) ? notes : [];
  }

  async function loadProgressForOtherLessons(activeLessonId) {
    const targets = state.lessons.filter((lesson) => Number(lesson.lessonId) !== Number(activeLessonId));
    const results = await Promise.allSettled(
      targets.map((lesson) => apiRequest(`/api/learning/sessions/${lesson.lessonId}/progress`)),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        state.progressByLessonId.set(Number(targets[index].lessonId), result.value);
      }
    });
  }

  function renderAllDynamicViews() {
    renderCourseShell();
    renderMedia();
    renderCurriculum();
    renderQnaList();
    renderNotes();
    updateVideoUi();
    updateComposerTimestamps();
    updatePlaybackRateButtons();
    updateQualityButtons();
  }

  function renderCourseShell() {
    const lesson = state.lesson;
    const course = state.course || {};
    const activeSectionTitle = lesson?.sectionTitle || course.title || '';
    const activeLessonTitle = lesson?.title || course.title || '';

    if (course.title) {
      document.title = `DevPath - ${course.title}`;
    }

    const backLink = document.querySelector('header a[href^="/course-detail"], header a[href^="course-detail"]');
    if (backLink) {
      backLink.href = `/course-detail?courseId=${encodeURIComponent(state.courseId)}`;
    }

    const headerTitle = document.querySelector('header span.text-sm.font-bold.text-gray-100');
    if (headerTitle && activeSectionTitle) {
      headerTitle.textContent = activeSectionTitle;
    }

    const watermark = document.querySelector('main .w-full.h-full.relative .absolute.top-6.left-6');
    if (watermark && activeLessonTitle) {
      watermark.textContent = getLessonDisplayTitle(lesson, state.lessonIndex);
    }

    const navButtons = document.querySelectorAll('main > .h-20 button');
    if (navButtons[0]) {
      navButtons[0].onclick = () => selectRelativeLesson(-1);
      navButtons[0].disabled = state.lessonIndex <= 0;
    }
    if (navButtons[1]) {
      navButtons[1].onclick = () => selectRelativeLesson(1);
      navButtons[1].disabled = state.lessonIndex >= state.lessons.length - 1;
    }

    renderHeaderProgress();
  }

  function renderHeaderProgress() {
    const progressValues = state.lessons.map((lesson) => {
      const progress = state.progressByLessonId.get(Number(lesson.lessonId));
      return toFiniteNumber(progress?.progressPercent, 0);
    });
    const percent = progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : toFiniteNumber(state.progress?.progressPercent, 0);
    const headerProgressTrack = document.querySelector('header .w-32.h-2');
    const headerProgressFill = headerProgressTrack?.firstElementChild;
    const headerProgressText = headerProgressTrack?.nextElementSibling;

    if (headerProgressFill) {
      headerProgressFill.style.width = `${clamp(percent, 0, 100)}%`;
    }

    if (headerProgressText) {
      headerProgressText.textContent = `${clamp(percent, 0, 100)}% 완료`;
    }
  }

  function getLessonKind(lesson) {
    if (!lesson) return 'video';
    const type = String(lesson.lessonType || '').toUpperCase();
    const title = String(lesson.title || '').toLowerCase();
    if (type === 'READING' && (title.includes('퀴즈') || title.includes('quiz'))) return 'quiz';
    if (type === 'CODING' || lesson.assignment) return 'assignment';
    return 'video';
  }

  function renderNonVideoCard(playerShell, kind) {
    // 기존 비디오 중지
    const existingVideo = playerShell.querySelector('video');
    if (existingVideo) { existingVideo.pause(); existingVideo.src = ''; }

    // 컨트롤 바 및 OCR 버튼 숨김
    const controls = getControls();
    if (controls) controls.style.display = 'none';
    const ocrBtn = document.getElementById('ocr-region-btn');
    if (ocrBtn) ocrBtn.closest('div')?.style && (ocrBtn.closest('div').style.display = 'none');

    const isQuiz = kind === 'quiz';
    const isAssignment = kind === 'assignment';
    const icon = isQuiz ? 'fa-circle-question' : isAssignment ? 'fa-clipboard-check' : 'fa-video-slash';
    const iconColor = isQuiz ? '#f59e0b' : isAssignment ? '#8b5cf6' : '#6b7280';
    const iconBg = isQuiz ? 'rgba(245,158,11,0.15)' : isAssignment ? 'rgba(139,92,246,0.15)' : 'rgba(107,114,128,0.15)';
    const title = isQuiz ? '섹션 퀴즈' : isAssignment ? '과제 제출' : '영상이 연결되지 않았습니다';
    const desc = isQuiz
      ? '이번 섹션의 핵심 내용을 확인합니다.<br>퀴즈를 완료하면 다음 강의로 이동할 수 있습니다.'
      : isAssignment
        ? '이번 강의의 실습 과제를 제출합니다.<br>제출 후 자동 채점 결과를 확인할 수 있습니다.'
        : '이 강의에는 아직 재생 가능한 영상이 없습니다.';
    const btnColor = isQuiz ? '#d97706' : '#7c3aed';
    const btnLabel = isQuiz ? '퀴즈 시작하기' : isAssignment ? '과제 제출하기' : null;
    const btnId = isQuiz ? 'quiz-start-btn' : isAssignment ? 'assignment-submit-btn' : null;

    playerShell.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;padding:2rem;text-align:center;">
        <div style="width:56px;height:56px;border-radius:50%;background:${iconBg};display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;">
          <i class="fas ${icon}" style="font-size:1.5rem;color:${iconColor};"></i>
        </div>
        <h2 style="font-size:1.5rem;font-weight:600;color:#fff;margin-bottom:0.75rem;">${title}</h2>
        <p style="font-size:0.875rem;color:rgba(255,255,255,0.6);line-height:1.75;">${desc}</p>
        ${btnLabel ? `<button id="${btnId}" style="margin-top:1.5rem;padding:0.75rem 1.5rem;background:${btnColor};color:#fff;border:none;border-radius:0.5rem;font-size:0.875rem;font-weight:600;cursor:pointer;">${btnLabel}</button>` : ''}
      </div>`;

    if (btnId) {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.onclick = isQuiz
          ? () => window._handleQuizStart && window._handleQuizStart(state.lesson)
          : () => window._handleAssignmentSubmit && window._handleAssignmentSubmit(state.lesson);
      }
    }
  }

  function restorePlayerControls() {
    const controls = getControls();
    if (controls) controls.style.display = '';
    const ocrBtn = document.getElementById('ocr-region-btn');
    if (ocrBtn) ocrBtn.closest('div')?.style && (ocrBtn.closest('div').style.display = '');
  }

  window._handleQuizStart = function(lesson) {
    alert('퀴즈 기능은 준비 중입니다.');
  };

  window._handleAssignmentSubmit = function(lesson) {
    alert('과제 제출 기능은 준비 중입니다.');
  };

  function renderMedia() {
    const playerShell = getPlayerShell();
    if (!playerShell || !state.lesson) {
      return;
    }

    const kind = getLessonKind(state.lesson);
    if (kind !== 'video') {
      renderNonVideoCard(playerShell, kind);
      return;
    }

    restorePlayerControls();
    const currentMedia = playerShell.querySelector('video, img');
    if (currentMedia?.tagName === 'VIDEO') {
      VIDEO_QUALITIES.forEach((quality) => currentMedia.removeAttribute(`data-quality-${quality}`));
    }
    const videoSources = resolveVideoQualitySources();
    const activeQuality = getAvailableVideoQuality(state.videoQuality, videoSources);
    const videoUrl = activeQuality
      ? videoSources[activeQuality]
      : state.lesson.videoUrl || state.course?.introVideoUrl || '';
    const thumbnailUrl = state.lesson.thumbnailUrl || state.course?.thumbnailUrl || DEFAULT_THUMBNAIL;

    if (videoUrl) {
      const video = currentMedia?.tagName === 'VIDEO'
        ? currentMedia
        : document.createElement('video');

      if (video !== currentMedia && currentMedia) {
        video.className = currentMedia.className || 'w-full h-full object-contain';
        currentMedia.replaceWith(video);
      }

      video.src = videoUrl;
      video.poster = thumbnailUrl;
      video.preload = 'metadata';
      video.playsInline = true;
      video.controls = false;
      video.playbackRate = state.playbackRate;
      VIDEO_QUALITIES.forEach((quality) => {
        if (videoSources[quality]) {
          video.setAttribute(`data-quality-${quality}`, videoSources[quality]);
        } else {
          video.removeAttribute(`data-quality-${quality}`);
        }
      });
      if (activeQuality) {
        state.videoQuality = activeQuality;
      }
      state.duration = toFiniteNumber(state.lesson.durationSeconds, 0);
      bindVideoElement(video);
    } else {
      const image = currentMedia?.tagName === 'IMG'
        ? currentMedia
        : document.createElement('img');

      if (image !== currentMedia && currentMedia) {
        image.className = currentMedia.className || 'w-full h-full object-cover opacity-60';
        currentMedia.replaceWith(image);
      }

      image.src = thumbnailUrl;
      state.duration = toFiniteNumber(state.lesson.durationSeconds, state.duration);
    }
  }

  function renderCurriculum() {
    const curriculumCard = document.querySelector('#content-curriculum > div');

    if (!curriculumCard || !state.sections.length) {
      return;
    }

    curriculumCard.innerHTML = state.sections.map((section, sectionIndex) => {
      const sectionNumber = sectionIndex + 1;
      const sectionId = `live-sec-${section.sectionId || sectionNumber}`;
      const lessons = Array.isArray(section.lessons) ? section.lessons : [];
      const isActiveSection = lessons.some((lesson) => Number(lesson.lessonId) === Number(state.lesson?.lessonId));
      const sectionWrapperClass = sectionIndex < state.sections.length - 1 ? 'border-b border-gray-200' : '';
      const sectionButtonClass = isActiveSection
        ? 'w-full px-5 py-4 flex justify-between items-center bg-green-50/50 hover:bg-green-50 transition border-l-4 border-[#00C471]'
        : 'w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-gray-50 transition';
      const labelClass = isActiveSection
        ? 'text-xs font-bold text-[#00C471] mb-1'
        : 'text-xs font-bold text-gray-400 mb-1';
      const titleClass = isActiveSection ? 'font-bold text-gray-900' : 'font-bold text-gray-800';
      const wrapperClass = isActiveSection ? 'flex flex-col items-start -ml-1' : 'flex flex-col items-start';
      const iconClass = isActiveSection
        ? 'fas fa-chevron-up text-[#00C471] transition-transform'
        : 'fas fa-chevron-up text-gray-400 transition-transform';
      const contentClass = 'accordion-content open bg-gray-50 border-t border-gray-100';

      return `
                        <div class="${sectionWrapperClass}">
                            <button onclick="toggleAccordion('${sectionId}')" class="${sectionButtonClass}">
                                <div class="${wrapperClass}">
                                    <span class="${labelClass}">SECTION ${sectionNumber}${isActiveSection ? ' (현재 수강중)' : ''}</span>
                                    <span class="${titleClass}">${escapeHtml(section.title || `SECTION ${sectionNumber}`)}</span>
                                </div>
                                <i id="icon-${sectionId}" class="${iconClass}"></i>
                            </button>
                            <div id="content-${sectionId}" class="${contentClass}">
                                <div class="p-3 space-y-2">
                                    ${lessons.map((lesson, lessonIndex) => renderLessonRow(lesson, lessonIndex)).join('')}
                                </div>
                            </div>
                        </div>`;
    }).join('');
  }

  function renderLessonRow(lesson, lessonIndex) {
    const rowState = getLessonRowState(lesson);
    const displayTitle = `${lessonIndex + 1}. ${lesson.title || 'Untitled lesson'}`;
    const sideLabel = getLessonSideLabel(lesson, rowState);
    const typeIcon = getLessonTypeIcon(lesson);
    const safeLessonId = Number(lesson.lessonId);

    if (rowState === 'current') {
      return `
                                    <div onclick="selectLesson(${safeLessonId})" class="p-3 rounded-lg flex justify-between items-center bg-green-50 border border-[#00C471] shadow-sm relative overflow-hidden cursor-pointer gap-2">
                                        <div class="absolute left-0 top-0 bottom-0 w-1 bg-[#00C471]"></div>
                                        <span class="text-sm font-bold text-gray-900 ml-2 min-w-0 truncate"><i class="fas ${typeIcon} text-[#00C471] mr-2"></i>${escapeHtml(displayTitle)}</span>
                                        <span class="text-xs bg-[#00C471] text-white px-2 py-1 rounded-full font-bold animate-pulse shrink-0 whitespace-nowrap">수강중</span>
                                    </div>`;
    }

    if (rowState === 'completed') {
      return `
                                    <div onclick="selectLesson(${safeLessonId})" class="p-3 rounded-lg flex justify-between items-center bg-white border border-gray-200 opacity-60 hover:opacity-100 transition cursor-pointer gap-2">
                                        <span class="text-sm font-medium text-gray-700 line-through decoration-gray-300 min-w-0 truncate"><i class="fas fa-check-circle text-[#00C471] mr-2"></i>${escapeHtml(displayTitle)}</span>
                                        <span class="text-xs text-[#00C471] font-bold shrink-0 whitespace-nowrap">${escapeHtml(sideLabel)}</span>
                                    </div>`;
    }

    if (rowState === 'active') {
      return `
                                    <div onclick="selectLesson(${safeLessonId})" class="p-3 rounded-lg flex justify-between items-center bg-white border border-gray-200 hover:border-[#00C471] hover:bg-green-50/30 transition cursor-pointer group gap-2">
                                        <span class="text-sm font-medium text-gray-800 group-hover:text-[#00C471] transition min-w-0 truncate"><i class="fas ${typeIcon} text-gray-400 group-hover:text-[#00C471] transition mr-2"></i>${escapeHtml(displayTitle)}</span>
                                        <span class="text-xs text-gray-500 font-medium shrink-0 whitespace-nowrap">${escapeHtml(sideLabel)}</span>
                                    </div>`;
    }

    return `
                                    <div class="p-3 rounded-lg flex justify-between items-center bg-white border border-gray-200 opacity-60 hover:opacity-100 transition cursor-pointer gap-2">
                                        <span class="text-sm font-medium text-gray-700 min-w-0 truncate"><i class="fas fa-lock text-gray-400 mr-2"></i>${escapeHtml(displayTitle)}</span>
                                        <span class="text-xs text-gray-400 shrink-0 whitespace-nowrap">${escapeHtml(sideLabel)}</span>
                                    </div>`;
  }

  function getLessonRowState(lesson) {
    if (Number(lesson.lessonId) === Number(state.lesson?.lessonId)) {
      return 'current';
    }

    if (isLessonCompleted(lesson)) {
      return 'completed';
    }

    return isLessonUnlocked(lesson) ? 'active' : 'locked';
  }

  function isLessonCompleted(lesson) {
    if (!lesson) {
      return false;
    }

    const progress = state.progressByLessonId.get(Number(lesson.lessonId));
    return Boolean(progress?.isCompleted) || toFiniteNumber(progress?.progressPercent, 0) >= 100;
  }

  function isLessonUnlocked(lesson) {
    const index = getFlatLessonIndex(lesson);

    if (index <= 0) {
      return true;
    }

    const previousLesson = state.lessons[index - 1];
    return isLessonCompleted(previousLesson);
  }

  function getFlatLessonIndex(lesson) {
    if (!lesson) {
      return -1;
    }

    return state.lessons.findIndex((item) => Number(item.lessonId) === Number(lesson.lessonId));
  }

  function getLessonTypeIcon(lesson) {
    const type = String(lesson.lessonType || '').toUpperCase();
    const title = String(lesson.title || '');

    if (lesson.assignment || type.includes('ASSIGNMENT') || type.includes('CODING') || title.includes('과제')) {
      return 'fa-laptop-code';
    }

    if (type.includes('QUIZ') || title.includes('퀴즈') || title.toUpperCase().includes('QUIZ')) {
      return 'fa-pen';
    }

    return 'fa-play-circle';
  }

  function getLessonSideLabel(lesson, rowState) {
    const typeIcon = getLessonTypeIcon(lesson);

    if (rowState === 'completed') {
      return typeIcon === 'fa-play-circle' ? '수강완료' : '제출완료';
    }

    if (typeIcon === 'fa-laptop-code') {
      return '미제출';
    }

    if (typeIcon === 'fa-pen') {
      return '미응시';
    }

    return formatDuration(getLessonDurationSeconds(lesson));
  }

  function getLessonDurationSeconds(lesson) {
    if (!lesson) {
      return 0;
    }

    const lessonId = Number(lesson.lessonId);
    return state.actualDurationByLessonId.get(lessonId) ?? lesson.durationSeconds;
  }

  function setLessonActualDuration(lessonId, durationSeconds) {
    const roundedDuration = Math.round(toFiniteNumber(durationSeconds, 0));
    if (!lessonId || roundedDuration <= 0) {
      return false;
    }

    const numericLessonId = Number(lessonId);
    const currentDuration = state.actualDurationByLessonId.get(numericLessonId);
    if (currentDuration === roundedDuration) {
      return false;
    }

    state.actualDurationByLessonId.set(numericLessonId, roundedDuration);
    updateLessonDurationInCollections(numericLessonId, roundedDuration);
    return true;
  }

  function updateLessonDurationInCollections(lessonId, durationSeconds) {
    const applyDuration = (lesson) => {
      if (Number(lesson?.lessonId) === Number(lessonId)) {
        lesson.durationSeconds = durationSeconds;
      }
    };

    applyDuration(state.lesson);
    state.lessons.forEach(applyDuration);
    state.sections.forEach((section) => {
      (section.lessons || []).forEach(applyDuration);
    });
  }

  function loadActualDurationsForLessons() {
    state.lessons.forEach((lesson) => {
      const lessonId = Number(lesson?.lessonId);
      if (!lessonId || state.actualDurationByLessonId.has(lessonId)) {
        return;
      }

      const sources = resolveVideoQualitySources(lesson, state.course, false);
      const source = sources[state.videoQuality] || sources[1080] || sources[720] || lesson.videoUrl;
      if (!source) {
        return;
      }

      readVideoDuration(source, (durationSeconds) => {
        if (setLessonActualDuration(lessonId, durationSeconds)) {
          renderCurriculum();
        }
      });
    });
  }

  function readVideoDuration(source, onDuration) {
    const probe = document.createElement('video');
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      probe.removeAttribute('src');
      probe.load();
    };
    const timeoutId = window.setTimeout(cleanup, 8000);

    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => {
      const durationSeconds = toFiniteNumber(probe.duration, 0);
      cleanup();
      if (durationSeconds > 0) {
        onDuration(durationSeconds);
      }
    }, { once: true });
    probe.addEventListener('error', cleanup, { once: true });
    probe.src = source;
  }

  function renderQnaList() {
    const qnaList = document.getElementById('qna-list');
    const qnaListView = document.getElementById('qna-list-view');

    if (!qnaList || !qnaListView) {
      return;
    }

    const count = state.qnaQuestions.length;
    const countLabel = qnaListView.querySelector('.flex.justify-between.items-center.mb-4 span');
    if (countLabel) {
      countLabel.textContent = `총 ${count}개`;
    }

    qnaList.innerHTML = state.qnaQuestions.map((question) => {
      const resolved = isQuestionResolved(question);
      const mine = isMine(question.authorId);
      const statusClass = resolved
        ? 'bg-[#00C471] text-white text-[10px] font-bold px-1.5 py-0.5 rounded'
        : 'bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded';
      const statusLabel = resolved ? '해결됨' : '답변대기';
      const authorClass = mine ? 'font-bold text-[#00C471]' : '';
      const authorText = `${question.authorName || '작성자'}${mine ? ' (나)' : ''} • ${formatRelativeTime(question.createdAt)}`;
      const preview = question.lectureTimestamp
        ? `${question.lectureTimestamp} 구간 질문`
        : `${question.templateType || 'QUESTION'} · ${question.difficulty || 'MEDIUM'}`;

      return `
                            <div onclick="openQnaDetail(${Number(question.id)})" class="qna-item p-4 bg-white border border-gray-200 rounded-xl hover:border-[#00C471] transition cursor-pointer shadow-sm group" data-author="${mine ? 'me' : 'other'}" data-status="${resolved ? 'resolved' : 'unresolved'}">
                                <div class="flex gap-2 items-start mb-2">
                                    <span class="${statusClass}">${statusLabel}</span>
                                    <h4 class="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#00C471] transition">${escapeHtml(question.title || '질문')}</h4>
                                </div>
                                <p class="text-xs text-gray-500 line-clamp-2 mb-3">${escapeHtml(preview)}</p>
                                <div class="flex justify-between items-center text-xs text-gray-400">
                                    <span class="${authorClass}">${escapeHtml(authorText)}</span>
                                    <span><i class="far fa-comment-dots mr-1"></i>${toFiniteNumber(question.answerCount, 0)}</span>
                                </div>
                            </div>`;
    }).join('');

    applyQnaFilter();
  }

  function renderQnaDetail(detail) {
    const detailView = document.getElementById('qna-detail-view');

    if (!detailView) {
      return;
    }

    const resolved = isQuestionResolved(detail);
    const statusClass = resolved
      ? 'bg-[#00C471] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5'
      : 'bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5';
    const statusLabel = resolved ? '해결됨' : '답변대기';
    const timestamp = detail.lectureTimestamp || formatTime(state.currentTime);

    detailView.innerHTML = `
                        <div class="px-4 py-4 border-b border-gray-100 flex items-center gap-3 bg-white shrink-0">
                            <button onclick="closeQnaDetail()" class="text-gray-400 hover:text-gray-800 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <h3 class="font-bold text-gray-900 text-sm">질문 상세</h3>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50">
                            <div class="mb-8">
                                <div class="flex gap-2 items-start mb-3">
                                    <span class="${statusClass}">${statusLabel}</span>
                                    <h4 class="text-lg font-bold text-gray-800 leading-tight">${escapeHtml(detail.title || '질문')}</h4>
                                </div>
                                
                                <div class="flex items-center text-xs text-gray-400 mb-4 gap-2 flex-wrap">
                                    <span class="font-bold text-[#00C471]">${escapeHtml(detail.authorName || '작성자')}${isMine(detail.authorId) ? ' (나)' : ''}</span>
                                    <span>•</span>
                                    <span>${escapeHtml(formatRelativeTime(detail.createdAt))}</span>
                                    <span>•</span>
                                    <span onclick="seekToTimestamp('${escapeAttribute(timestamp)}')" class="bg-green-50 text-[#00C471] border border-green-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-green-100 transition"><i class="fas fa-play mr-1 text-[10px]"></i>${escapeHtml(timestamp)} 구간 재생</span>
                                </div>
                                
                                <div class="text-sm text-gray-700 leading-relaxed bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    ${escapeHtml(detail.content || '').replace(/\n/g, '<br>')}
                                </div>
                            </div>
                            
                            <div>
                                <h5 class="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                                    <i class="far fa-comments text-gray-400"></i> 답변 <span class="text-[#00C471]">${toFiniteNumber(detail.answers?.length, 0)}</span>
                                </h5>
                                
                                <div class="space-y-4">
                                    ${(detail.answers || []).map(renderAnswerCard).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="p-4 border-t border-gray-200 bg-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                            <div class="relative">
                                <textarea class="w-full border border-gray-200 bg-gray-50 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] resize-none h-[52px] custom-scrollbar" placeholder="추가 답변이나 댓글을 남겨주세요."></textarea>
                                <button onclick="submitQnaAnswer(${Number(detail.id)})" class="absolute right-2 top-2 w-9 h-9 bg-[#00C471] text-white rounded-lg focus:outline-none hover:bg-green-600 transition flex items-center justify-center shadow-sm">
                                    <i class="fas fa-paper-plane text-xs"></i>
                                </button>
                            </div>
                        </div>`;
  }

  function renderAnswerCard(answer) {
    const badge = answer.adopted ? '채택됨' : '답변';

    return `
                                    <div class="flex gap-3">
                                        <div class="w-8 h-8 rounded-full bg-green-100 text-[#00C471] flex items-center justify-center shrink-0 text-sm border border-green-200">
                                            <i class="fas fa-chalkboard-teacher"></i>
                                        </div>
                                        <div class="flex-1 bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative">
                                            <div class="absolute -top-2.5 right-4 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">${badge}</div>
                                            
                                            <div class="flex justify-between items-center mb-2">
                                                <span class="font-bold text-sm text-gray-800">${escapeHtml(answer.authorName || '답변자')}</span>
                                                <span class="text-[10px] text-gray-400">${escapeHtml(formatRelativeTime(answer.createdAt))}</span>
                                            </div>
                                            <p class="text-sm text-gray-700 leading-relaxed">${escapeHtml(answer.content || '').replace(/\n/g, '<br>')}</p>
                                        </div>
                                    </div>`;
  }

  function renderNotes() {
    const noteList = document.getElementById('note-list');

    if (!noteList) {
      return;
    }

    noteList.innerHTML = state.notes.map((note) => {
      const timestamp = note.timestampLabel || formatTime(note.timestampSecond || note.seekSecond || 0);

      return `
                        <div class="p-4 border border-gray-200 bg-white shadow-sm rounded-xl hover:border-gray-300 transition">
                            <div class="flex justify-between items-center mb-2">
                                <div onclick="seekTo(${toFiniteNumber(note.seekSecond ?? note.timestampSecond, 0)})" class="text-xs text-[#00C471] font-bold bg-green-50 px-2 py-1 rounded cursor-pointer hover:bg-green-100">
                                    <i class="fas fa-play mr-1"></i>${escapeHtml(timestamp)}
                                </div>
                                <div class="flex gap-2 text-gray-400">
                                    <button onclick="editNote(${Number(note.noteId)})" class="hover:text-gray-600"><i class="fas fa-pen text-xs"></i></button>
                                    <button onclick="deleteNote(${Number(note.noteId)})" class="hover:text-red-400"><i class="fas fa-trash text-xs"></i></button>
                                </div>
                            </div>
                            <p class="text-sm text-gray-800 leading-relaxed">${escapeHtml(note.content || '').replace(/\n/g, '<br>')}</p>
                        </div>`;
    }).join('');
  }

  function bindStaticControls() {
    const playerShell = getPlayerShell();
    const centerPlayButton = playerShell?.querySelector('button.absolute');
    const controls = getControls();
    const directButtons = controls ? Array.from(controls.children).filter((element) => element.tagName === 'BUTTON') : [];
    const progressTrack = controls ? Array.from(controls.children).find((element) => element.classList?.contains('flex-1')) : null;

    if (centerPlayButton) {
      centerPlayButton.onclick = togglePlayback;
    }

    if (directButtons[0]) {
      directButtons[0].onclick = togglePlayback;
    }

    if (directButtons[1]) {
      directButtons[1].onclick = toggleMute;
    }

    if (directButtons[2]) {
      directButtons[2].onclick = requestFullscreen;
    }

    if (progressTrack) {
      progressTrack.onclick = (event) => {
        const media = getMediaElement();
        if (!media || media.tagName !== 'VIDEO') {
          return;
        }

        const rect = progressTrack.getBoundingClientRect();
        const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const duration = getDuration();
        media.currentTime = duration * ratio;
        state.currentTime = media.currentTime;
        updateVideoUi();
        saveProgressSoon(true);
      };
    }

    bindPlaybackRateControls();
    bindQualityControls();
    bindPipControls();
    bindOcrControls();
    window.addEventListener('beforeunload', () => saveCurrentProgress({ keepalive: true }));
  }

  function bindVideoElement(video) {
    if (!video || video.tagName !== 'VIDEO') {
      return;
    }

    if (video.dataset.liveLearningBound === 'true') {
      return;
    }

    video.dataset.liveLearningBound = 'true';
    video.addEventListener('loadedmetadata', () => {
      state.duration = toFiniteNumber(video.duration, state.lesson?.durationSeconds || state.duration);
      if (setLessonActualDuration(state.lesson?.lessonId, state.duration)) {
        renderCurriculum();
      }
      const startSecond = clamp(state.currentTime, 0, Math.max(state.duration - 1, 0));
      if (startSecond > 0) {
        video.currentTime = startSecond;
      }
      updateVideoUi();
    });
    video.addEventListener('timeupdate', () => {
      state.currentTime = video.currentTime;
      state.duration = getDuration();
      updateVideoUi();
      updateComposerTimestamps();
      saveProgressSoon(false);
    });
    video.addEventListener('play', updatePlayButtons);
    video.addEventListener('pause', updatePlayButtons);
    video.addEventListener('enterpictureinpicture', updatePipButtons);
    video.addEventListener('leavepictureinpicture', updatePipButtons);
    video.addEventListener('ended', () => saveCurrentProgress());
  }

  function bindPlaybackRateControls() {
    const menu = document.getElementById('settings-menu');
    if (!menu) {
      return;
    }

    const buttons = Array.from(menu.children).filter((element) => element.tagName === 'BUTTON');
    buttons.forEach((button) => {
      const rateAttribute = button.getAttribute('data-playback-rate');
      const value = rateAttribute === null ? parseFloat(button.textContent || '') : toFiniteNumber(rateAttribute, NaN);
      if (!isPlaybackRateButton(button, value)) {
        return;
      }

      button.onclick = async () => {
        state.playbackRate = value;
        const media = getMediaElement();
        if (media?.tagName === 'VIDEO') {
          media.playbackRate = value;
        }
        updatePlaybackRateButtons();
        if (state.lesson?.lessonId) {
          await optionalRequest(
            () => apiRequest(`/api/learning/player/${state.lesson.lessonId}/config`, {
              method: 'PUT',
              body: JSON.stringify({ defaultPlaybackRate: value }),
            }),
            null,
          );
        }
      };
    });
  }

  function updatePlaybackRateButtons() {
    const menu = document.getElementById('settings-menu');
    if (!menu) {
      return;
    }

    Array.from(menu.children).forEach((element) => {
      if (element.tagName !== 'BUTTON') {
        return;
      }

      const rateAttribute = element.getAttribute('data-playback-rate');
      const value = rateAttribute === null ? parseFloat(element.textContent || '') : toFiniteNumber(rateAttribute, NaN);
      if (!isPlaybackRateButton(element, value)) {
        return;
      }

      const active = Math.abs(value - state.playbackRate) < 0.001;
      element.className = active
        ? 'text-left px-4 py-2 text-sm text-[#00C471] bg-gray-800 font-bold flex justify-between items-center transition'
        : 'text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 hover:text-white transition';
      element.innerHTML = active
        ? `${value.toFixed(1)}x <i class="fas fa-check text-xs"></i>`
        : `${value.toFixed(1)}x`;
    });
  }

  function isPlaybackRateButton(button, value) {
    return Number.isFinite(value)
      && value >= 0.5
      && value <= 2
      && String(button.textContent || '').includes('x');
  }

  function bindQualityControls() {
    const menu = document.getElementById('settings-menu');
    if (!menu) {
      return;
    }

    const buttons = Array.from(menu.children).filter((element) => element.tagName === 'BUTTON');
    buttons.forEach((button) => {
      const quality = getQualityButtonValue(button);
      if (!quality) {
        return;
      }

      button.onclick = () => switchVideoQuality(quality);
    });
  }

  function switchVideoQuality(quality) {
    const sources = resolveVideoQualitySources();
    const source = sources[quality];

    if (!source) {
      showPlayerNotice(`${quality}p source is not registered for this lesson.`);
      updateQualityButtons();
      return;
    }

    const media = getMediaElement();
    state.videoQuality = quality;
    updateQualityButtons();

    if (!media || media.tagName !== 'VIDEO') {
      renderMedia();
      showPlayerNotice(`Switched to ${quality}p.`);
      return;
    }

    const currentSource = media.currentSrc || media.getAttribute('src') || '';
    if (urlsEqual(currentSource, source)) {
      showPlayerNotice(`Already playing ${quality}p.`);
      return;
    }

    const restoreSecond = clamp(media.currentTime || state.currentTime, 0, getDuration() || state.duration || 0);
    const wasPaused = media.paused;
    const restoreRate = state.playbackRate;
    const restoreMuted = media.muted;
    const restoreVolume = media.volume;

    const restorePosition = () => {
      if (Number.isFinite(restoreSecond) && restoreSecond > 0) {
        media.currentTime = Math.min(restoreSecond, Math.max(media.duration - 0.25, 0) || restoreSecond);
      }
      media.playbackRate = restoreRate;
      media.muted = restoreMuted;
      media.volume = restoreVolume;
      state.currentTime = restoreSecond;
      updateVideoUi();
    };

    const resumePlayback = () => {
      media.removeEventListener('canplay', resumePlayback);
      if (!wasPaused) {
        media.play().catch((error) => console.warn('[learning] video resume after quality switch failed', error));
      }
    };

    media.addEventListener('loadedmetadata', restorePosition, { once: true });
    media.addEventListener('canplay', resumePlayback);
    media.src = source;
    media.playbackRate = restoreRate;
    media.muted = restoreMuted;
    media.volume = restoreVolume;
    media.load();
    showPlayerNotice(`Switching to ${quality}p...`);
  }

  function updateQualityButtons() {
    const menu = document.getElementById('settings-menu');
    if (!menu) {
      return;
    }

    const sources = resolveVideoQualitySources();
    const activeQuality = getAvailableVideoQuality(state.videoQuality, sources);
    if (activeQuality) {
      state.videoQuality = activeQuality;
    }

    Array.from(menu.children).forEach((element) => {
      if (element.tagName !== 'BUTTON') {
        return;
      }

      const quality = getQualityButtonValue(element);
      if (!quality) {
        return;
      }

      const available = Boolean(sources[quality]);
      const active = available && quality === state.videoQuality;
      element.setAttribute('aria-disabled', available ? 'false' : 'true');
      element.title = available ? '' : `${quality}p source is not registered.`;
      element.className = active
        ? 'text-left px-4 py-2 text-sm text-[#00C471] bg-gray-800 font-bold flex justify-between items-center transition'
        : available
          ? 'text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 hover:text-white transition'
          : 'text-left px-4 py-2 text-sm text-gray-500 cursor-not-allowed transition';
      element.innerHTML = active
        ? `${quality}p <i class="fas fa-check text-xs"></i>`
        : available
          ? `${quality}p`
          : `${quality}p <span class="text-[10px] text-gray-600">N/A</span>`;
    });
  }

  function resolveVideoQualitySources(lessonTarget = state.lesson, courseTarget = state.course, includeMedia = true) {
    const sources = {};
    collectQualitySources(courseTarget, sources);
    collectQualitySources(lessonTarget, sources);

    const media = includeMedia ? getMediaElement() : null;
    if (media?.tagName === 'VIDEO') {
      VIDEO_QUALITIES.forEach((quality) => {
        addQualitySource(sources, quality, media.getAttribute(`data-quality-${quality}`));
      });
    }

    const primaryUrl = lessonTarget?.videoUrl
      || courseTarget?.introVideoUrl
      || (media?.tagName === 'VIDEO' ? media.getAttribute('src') || media.currentSrc : '');
    addQualitySource(sources, 1080, primaryUrl);
    VIDEO_QUALITIES.forEach((quality) => addQualitySource(sources, quality, deriveQualityUrl(primaryUrl, quality)));

    return sources;
  }

  function collectQualitySources(target, sources) {
    if (!target || typeof target !== 'object') {
      return;
    }

    const directFields = {
      1080: ['videoUrl1080p', 'videoUrl1080', 'video1080Url', 'fullHdVideoUrl'],
      720: ['videoUrl720p', 'videoUrl720', 'video720Url', 'hdVideoUrl'],
    };

    VIDEO_QUALITIES.forEach((quality) => {
      directFields[quality].forEach((field) => addQualitySource(sources, quality, target[field]));
    });

    ['videoUrls', 'videoSources', 'qualitySources', 'sources'].forEach((field) => {
      const value = target[field];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const quality = normalizeVideoQuality(item?.quality ?? item?.resolution ?? item?.height ?? item?.label ?? item?.name);
          const url = item?.url ?? item?.src ?? item?.videoUrl ?? item?.href;
          addQualitySource(sources, quality, url);
        });
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => {
          const quality = normalizeVideoQuality(key);
          const url = typeof item === 'string'
            ? item
            : item?.url ?? item?.src ?? item?.videoUrl ?? item?.href;
          addQualitySource(sources, quality, url);
        });
      }
    });
  }

  function addQualitySource(sources, quality, url) {
    const normalizedQuality = normalizeVideoQuality(quality);
    if (!normalizedQuality || !url || sources[normalizedQuality]) {
      return;
    }
    sources[normalizedQuality] = String(url);
  }

  function normalizeVideoQuality(value) {
    const match = String(value ?? '').match(/(1080|720)/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return VIDEO_QUALITIES.includes(parsed) ? parsed : null;
  }

  function getQualityButtonValue(button) {
    return normalizeVideoQuality(button.getAttribute('data-video-quality') || button.textContent || '');
  }

  function getAvailableVideoQuality(preferredQuality, sources) {
    if (sources[preferredQuality]) {
      return preferredQuality;
    }
    return VIDEO_QUALITIES.find((quality) => Boolean(sources[quality])) || null;
  }

  function deriveQualityUrl(url, targetQuality) {
    if (!url) {
      return null;
    }

    const source = String(url);
    const otherQuality = targetQuality === 1080 ? 720 : 1080;
    const patterns = [
      [new RegExp(`${otherQuality}p`, 'i'), `${targetQuality}p`],
      [new RegExp(`${otherQuality}(?=[._/-])`, 'i'), String(targetQuality)],
      [new RegExp(`([?&](?:quality|resolution|height)=)${otherQuality}`, 'i'), `$1${targetQuality}`],
    ];
    const matched = patterns.find(([pattern]) => pattern.test(source));
    return matched ? source.replace(matched[0], matched[1]) : null;
  }

  function urlsEqual(left, right) {
    return normalizeUrl(left) === normalizeUrl(right);
  }

  function normalizeUrl(value) {
    try {
      return new URL(String(value), window.location.href).href;
    } catch {
      return String(value || '');
    }
  }

  function showPlayerNotice(message) {
    const stage = getPlayerStage();
    if (!stage) {
      return;
    }

    let notice = document.getElementById('video-player-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'video-player-notice';
      notice.className = 'absolute bottom-20 left-6 z-30 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-100';
      stage.appendChild(notice);
    }

    notice.textContent = message;
    notice.classList.remove('hidden');
    window.clearTimeout(state.playerNoticeTimer);
    state.playerNoticeTimer = window.setTimeout(() => notice.classList.add('hidden'), 2600);
  }

  function bindPipControls() {
    document.querySelectorAll('[data-pip-toggle]').forEach((button) => {
      button.onclick = () => togglePipMode();
    });
    updatePipButtons();
  }

  async function togglePipMode() {
    const media = getMediaElement();
    if (!media || media.tagName !== 'VIDEO') {
      showPlayerNotice('PIP mode requires a video.');
      return;
    }

    if (!document.pictureInPictureEnabled || !media.requestPictureInPicture) {
      showPlayerNotice('This browser does not support PIP mode.');
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture?.();
      } else {
        if (media.readyState < HTMLMediaElement.HAVE_METADATA) {
          showPlayerNotice('Video metadata is still loading. Try again shortly.');
          return;
        }
        await media.requestPictureInPicture();
      }
      updatePipButtons();
    } catch (error) {
      console.warn('[learning] PIP toggle failed', error);
      showPlayerNotice('PIP mode could not be changed.');
    }
  }

  function updatePipButtons() {
    const active = Boolean(document.pictureInPictureElement);
    document.querySelectorAll('[data-pip-toggle]').forEach((button) => {
      button.className = active
        ? 'mt-1 border-t border-gray-700 text-left px-4 py-2 text-sm text-[#00C471] bg-gray-800 font-bold flex justify-between items-center transition'
        : 'mt-1 border-t border-gray-700 text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 hover:text-white transition';
      button.innerHTML = active
        ? 'PIP 종료 <i class="fas fa-check text-xs"></i>'
        : 'PIP 모드';
    });
  }

  function bindOcrControls() {
    const button = document.getElementById('ocr-region-btn');
    if (!button) {
      return;
    }

    button.onclick = () => toggleOcrSelection();
    updateOcrButton();
  }

  function toggleOcrSelection() {
    if (state.ocrBusy) {
      return;
    }

    if (state.ocrSelecting) {
      endOcrSelection();
      return;
    }

    const media = getMediaElement();
    if (!media || media.tagName !== 'VIDEO') {
      showPlayerNotice('OCR requires a video.');
      return;
    }

    if (media.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      showPlayerNotice('Video is still loading. Try again shortly.');
      return;
    }

    startOcrSelection();
  }

  function startOcrSelection() {
    const playerShell = getPlayerShell();
    if (!playerShell) {
      return;
    }

    endOcrSelection();
    state.ocrSelecting = true;
    updateOcrButton();

    const overlay = document.createElement('div');
    overlay.id = 'ocr-selection-overlay';
    overlay.className = 'absolute inset-0 z-40 cursor-crosshair select-none';
      overlay.innerHTML = `
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span class="rounded-lg bg-black/70 px-4 py-2 text-sm font-bold text-[#00C471] backdrop-blur-sm">
          <i class="fas fa-crop-simple mr-2"></i>드래그해서 복사할 글자를 선택하세요
        </span>
      </div>
      <div id="ocr-selection-box" class="pointer-events-none absolute hidden border-2 border-[#00C471] bg-[#00C471]/10"></div>`;
    playerShell.appendChild(overlay);

    const box = overlay.querySelector('#ocr-selection-box');
    let dragStart = null;

    overlay.addEventListener('mousedown', (event) => {
      const rect = overlay.getBoundingClientRect();
      dragStart = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      updateSelectionBox(box, dragStart.x, dragStart.y, dragStart.x, dragStart.y);
    });

    overlay.addEventListener('mousemove', (event) => {
      if (!dragStart) {
        return;
      }

      const rect = overlay.getBoundingClientRect();
      updateSelectionBox(
        box,
        dragStart.x,
        dragStart.y,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    });

    overlay.addEventListener('mouseup', (event) => {
      if (!dragStart) {
        return;
      }

      const rect = overlay.getBoundingClientRect();
      const region = normalizeSelection(
        dragStart.x,
        dragStart.y,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
      dragStart = null;
      endOcrSelection();

      if (region.width < 20 || region.height < 20) {
        showPlayerNotice('OCR 영역이 너무 작습니다.');
        return;
      }

      runRegionOcr(region);
    });
  }

  function endOcrSelection() {
    state.ocrSelecting = false;
    document.getElementById('ocr-selection-overlay')?.remove();
    updateOcrButton();
  }

  function updateSelectionBox(box, startX, startY, endX, endY) {
    if (!box) {
      return;
    }

    const region = normalizeSelection(startX, startY, endX, endY);
    box.classList.remove('hidden');
    box.style.left = `${region.x}px`;
    box.style.top = `${region.y}px`;
    box.style.width = `${region.width}px`;
    box.style.height = `${region.height}px`;
  }

  function normalizeSelection(startX, startY, endX, endY) {
    return {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };
  }

  async function runRegionOcr(region) {
    const media = getMediaElement();
    if (!media || media.tagName !== 'VIDEO' || state.ocrBusy) {
      return;
    }

    state.ocrBusy = true;
    updateOcrButton();
    showPlayerNotice('선택한 영역의 글자를 읽는 중...');

    try {
      const canvas = captureVideoFrame(media, region);
      const imageBase64 = canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, '');
      const result = await apiRequest('/api/learning/ocr/extract', {
        method: 'POST',
        body: JSON.stringify({ imageBase64 }),
      });
      const text = String(result?.text || '').trim();

      if (!text) {
        showPlayerNotice(`${formatOcrEngineLabel(result?.engine)} · 인식한 글자가 없습니다.`);
        return;
      }

      await navigator.clipboard.writeText(text);
      showPlayerNotice(`인식한 글자를 복사했습니다. ${formatOcrEngineLabel(result?.engine)} · 인식률 ${formatConfidencePercent(result?.confidence)}`);
    } catch (error) {
      console.warn('[learning] region OCR failed', error);
      showPlayerNotice('글자를 읽지 못했습니다.');
    } finally {
      state.ocrBusy = false;
      updateOcrButton();
    }
  }

  function captureVideoFrame(video, region) {
    const nativeWidth = video.videoWidth || video.clientWidth;
    const nativeHeight = video.videoHeight || video.clientHeight;
    if (!nativeWidth || !nativeHeight) {
      throw new Error('Video frame is not ready.');
    }

    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;
    const nativeAspect = nativeWidth / nativeHeight;
    const displayAspect = displayWidth / displayHeight;
    const objectFit = window.getComputedStyle(video).objectFit || 'cover';
    let renderWidth = displayWidth;
    let renderHeight = displayHeight;

    if (objectFit === 'contain') {
      if (nativeAspect > displayAspect) {
        renderHeight = displayWidth / nativeAspect;
      } else {
        renderWidth = displayHeight * nativeAspect;
      }
    } else if (nativeAspect > displayAspect) {
      renderWidth = displayHeight * nativeAspect;
    } else {
      renderHeight = displayWidth / nativeAspect;
    }

    const offsetX = (displayWidth - renderWidth) / 2;
    const offsetY = (displayHeight - renderHeight) / 2;
    const sourceX = clamp((region.x - offsetX) * (nativeWidth / renderWidth), 0, nativeWidth);
    const sourceY = clamp((region.y - offsetY) * (nativeHeight / renderHeight), 0, nativeHeight);
    const sourceWidth = clamp(region.width * (nativeWidth / renderWidth), 1, nativeWidth - sourceX);
    const sourceHeight = clamp(region.height * (nativeHeight / renderHeight), 1, nativeHeight - sourceY);
    const scale = sourceWidth < 600 ? 3 : sourceWidth < 1000 ? 2 : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function updateOcrButton() {
    const button = document.getElementById('ocr-region-btn');
    if (!button) {
      return;
    }

    button.disabled = state.ocrBusy;
    button.className = `flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-md transition hover:text-black disabled:cursor-wait disabled:opacity-60 ${
      state.ocrSelecting
        ? 'border-[#00C471] bg-[#00C471] text-black'
        : 'border-white/20 bg-black/60 text-white hover:bg-[#00C471]'
    }`;
    button.innerHTML = state.ocrBusy
      ? '<i class="fas fa-spinner fa-spin text-xs"></i><span>글자 읽는 중...</span>'
      : state.ocrSelecting
        ? '<i class="fas fa-times text-xs"></i><span>영역 선택 중</span>'
        : '<i class="fas fa-crop-simple text-xs"></i><span>화면 글자 복사</span>';
  }

  function formatOcrEngineLabel(engine) {
    switch (String(engine || '').toLowerCase()) {
      case 'claude':
        return 'Claude Vision';
      case 'python':
        return 'Python OCR';
      case 'tesseract':
      case 'local':
        return '로컬 OCR';
      case 'none':
        return 'OCR 서버 없음';
      default:
        return 'OCR';
    }
  }

  function formatConfidencePercent(value) {
    const confidence = Number(value);
    if (!Number.isFinite(confidence)) {
      return '-';
    }

    return `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`;
  }

  function togglePlayback() {
    const media = getMediaElement();
    if (!media || media.tagName !== 'VIDEO') {
      return;
    }

    if (media.paused) {
      media.play().catch((error) => console.warn('[learning] video play failed', error));
    } else {
      media.pause();
    }
  }

  function toggleMute() {
    const media = getMediaElement();
    if (!media || media.tagName !== 'VIDEO') {
      return;
    }

    media.muted = !media.muted;
    const volumeButton = getVolumeButton();
    const icon = volumeButton?.querySelector('i');
    if (icon) {
      icon.className = media.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
  }

  function requestFullscreen() {
    const target = getPlayerStage() || getPlayerShell() || document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    target.requestFullscreen?.();
  }

  function updatePlayButtons() {
    const media = getMediaElement();
    const paused = !media || media.tagName !== 'VIDEO' || media.paused;
    const playerShell = getPlayerShell();
    const centerBtn = playerShell?.querySelector('button.absolute');
    const centerIcon = centerBtn?.querySelector('i');
    const controlIcon = getPlayPauseButton()?.querySelector('i');

    if (centerIcon) {
      centerIcon.className = paused
        ? 'far fa-play-circle text-7xl drop-shadow-lg'
        : 'far fa-pause-circle text-7xl drop-shadow-lg';
    }

    if (centerBtn) {
      if (paused) {
        centerBtn.classList.remove('opacity-0');
        centerBtn.classList.add('opacity-100');
      } else {
        centerBtn.classList.remove('opacity-100');
        centerBtn.classList.add('opacity-0');
      }
    }

    if (controlIcon) {
      controlIcon.className = paused ? 'fas fa-play' : 'fas fa-pause';
    }
  }

  function updateVideoUi() {
    const controls = getControls();
    const progressTrack = controls ? Array.from(controls.children).find((element) => element.classList?.contains('flex-1')) : null;
    const progressFill = progressTrack?.firstElementChild;
    const timeLabel = controls ? Array.from(controls.children).find((element) => element.tagName === 'SPAN') : null;
    const duration = getDuration();
    const percent = duration > 0 ? (state.currentTime / duration) * 100 : toFiniteNumber(state.progress?.progressPercent, 0);

    if (progressFill) {
      progressFill.style.width = `${clamp(percent, 0, 100)}%`;
    }

    if (timeLabel) {
      timeLabel.textContent = `${formatTime(state.currentTime)} / ${formatTime(duration)}`;
    }

    updatePlayButtons();
  }

  function liftVideoTimeline() {
    const controls = getControls();
    const progressTrack = controls ? Array.from(controls.children).find((element) => element.classList?.contains('flex-1')) : null;
    const timeLabel = controls ? Array.from(controls.children).find((element) => element.tagName === 'SPAN') : null;

    if (progressTrack) {
      progressTrack.style.transform = 'translateY(-4px)';
    }

    if (timeLabel) {
      timeLabel.style.transform = 'translateY(0)';
    }
  }

  function lowerVideoPlayButton() {
    const playButton = getPlayPauseButton();

    if (playButton) {
      playButton.style.transform = 'translateY(2px)';
    }
  }

  function updateComposerTimestamps() {
    const label = formatTime(state.currentTime);
    const noteTimestamp = document.querySelector('#new-note-container span.bg-green-100');
    const attachTimeLabel = document.querySelector('label[for="attach-time"]');

    if (noteTimestamp) {
      noteTimestamp.textContent = label;
    }

    if (attachTimeLabel) {
      attachTimeLabel.textContent = `현재 재생 시간(${label}) 첨부하기`;
    }
  }

  function saveProgressSoon(force) {
    const now = Date.now();

    if (!force && now - state.lastProgressSaveAt < 10000) {
      return;
    }

    window.clearTimeout(state.progressSaveTimer);
    state.progressSaveTimer = window.setTimeout(() => saveCurrentProgress(), force ? 0 : 600);
  }

  async function saveCurrentProgress(options) {
    if (!state.lesson?.lessonId) {
      return;
    }

    const duration = getDuration();
    const percent = duration > 0 ? Math.round((state.currentTime / duration) * 100) : toFiniteNumber(state.progress?.progressPercent, 0);
    const payload = {
      progressPercent: Math.round(clamp(percent, 0, 100)),
      progressSeconds: Math.max(0, Math.floor(state.currentTime)),
    };

    state.lastProgressSaveAt = Date.now();
    const saved = await optionalRequest(
      () => apiRequest(`/api/learning/sessions/${state.lesson.lessonId}/progress`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        keepalive: Boolean(options?.keepalive),
      }),
      null,
    );

    if (saved) {
      state.progress = saved;
      state.progressByLessonId.set(Number(state.lesson.lessonId), saved);
      renderHeaderProgress();
      renderCurriculum();
    }
  }

  async function completeCurrentLessonBeforeAdvance() {
    if (!state.lesson?.lessonId) {
      return;
    }

    const lessonId = Number(state.lesson.lessonId);
    const duration = getDuration();
    const progressSeconds = Math.max(
      Math.floor(state.currentTime),
      Math.floor(toFiniteNumber(duration, state.lesson.durationSeconds || 0)),
    );
    const completedProgress = {
      ...(state.progress || {}),
      lessonId,
      progressPercent: 100,
      progressSeconds,
      defaultPlaybackRate: state.playbackRate,
      pipEnabled: Boolean(state.playerConfig?.pipEnabled),
      isCompleted: true,
      lastWatchedAt: new Date().toISOString(),
    };

    state.progress = completedProgress;
    state.progressByLessonId.set(lessonId, completedProgress);
    renderHeaderProgress();
    renderCurriculum();

    const saved = await optionalRequest(
      () => apiRequest(`/api/learning/sessions/${lessonId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          progressPercent: 100,
          progressSeconds,
        }),
      }),
      null,
    );

    if (saved) {
      state.progress = saved;
      state.progressByLessonId.set(lessonId, saved);
    }
  }

  async function selectLesson(lessonId, options) {
    const nextLesson = state.lessons.find((lesson) => Number(lesson.lessonId) === Number(lessonId));
    if (!nextLesson) {
      return;
    }

    const nextIndex = getFlatLessonIndex(nextLesson);
    const currentIndex = getFlatLessonIndex(state.lesson);
    const movingForward = nextIndex > currentIndex;
    const completesCurrent = Boolean(options?.completeCurrent) || (movingForward && nextIndex === currentIndex + 1);

    if (getLessonRowState(nextLesson) === 'locked' && !completesCurrent) {
      return;
    }

    if (completesCurrent) {
      await completeCurrentLessonBeforeAdvance();
    } else {
      await saveCurrentProgress();
    }

    state.lesson = nextLesson;
    state.lessonIndex = state.lessons.findIndex((lesson) => Number(lesson.lessonId) === Number(nextLesson.lessonId));
    state.currentTime = 0;
    state.duration = toFiniteNumber(nextLesson.durationSeconds, 0);

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('courseId', String(state.courseId));
    nextParams.set('lessonId', String(nextLesson.lessonId));
    window.history.replaceState(null, '', `${window.location.pathname}?${nextParams.toString()}`);

    renderCourseShell();
    renderCurriculum();
    await loadLessonScopedData(nextLesson.lessonId);
    renderAllDynamicViews();
  }

  function selectRelativeLesson(offset) {
    const next = state.lessons[state.lessonIndex + offset];
    if (next) {
      selectLesson(next.lessonId, { completeCurrent: offset > 0 });
    }
  }

  window.selectLesson = selectLesson;

  window.seekTo = function seekTo(second) {
    const media = getMediaElement();
    const nextSecond = Math.max(0, toFiniteNumber(second, 0));
    state.currentTime = nextSecond;

    if (media?.tagName === 'VIDEO') {
      media.currentTime = nextSecond;
      media.play().catch(() => {});
    }

    updateVideoUi();
  };

  window.seekToTimestamp = function seekToTimestamp(timestamp) {
    window.seekTo(parseTimestamp(timestamp));
  };

  window.toggleNewNote = function toggleNewNote() {
    const container = document.getElementById('new-note-container');
    const textarea = document.getElementById('note-textarea');
    updateComposerTimestamps();
    container.classList.toggle('hidden');
    if (!container.classList.contains('hidden')) {
      textarea.focus();
    }
  };

  window.saveNote = async function saveNote() {
    const textarea = document.getElementById('note-textarea');
    const content = textarea?.value.trim();

    if (!content) {
      alert('노트 내용을 입력해주세요.');
      return;
    }

    const note = await optionalRequest(
      () => apiRequest(`/api/learning/lessons/${state.lesson.lessonId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          timestampSecond: Math.max(0, Math.floor(state.currentTime)),
          content,
        }),
      }),
      null,
    );

    if (!note) {
      alert('노트 저장에 실패했습니다.');
      return;
    }

    state.notes = [note, ...state.notes.filter((item) => Number(item.noteId) !== Number(note.noteId))];
    textarea.value = '';
    renderNotes();
    window.toggleNewNote();
  };

  window.editNote = async function editNote(noteId) {
    const note = state.notes.find((item) => Number(item.noteId) === Number(noteId));
    if (!note) {
      return;
    }

    const nextContent = window.prompt('노트 내용을 수정하세요.', note.content || '');
    if (nextContent === null || !nextContent.trim()) {
      return;
    }

    const updated = await optionalRequest(
      () => apiRequest(`/api/learning/lessons/${state.lesson.lessonId}/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify({
          timestampSecond: toFiniteNumber(note.timestampSecond ?? note.seekSecond, 0),
          content: nextContent.trim(),
        }),
      }),
      null,
    );

    if (updated) {
      state.notes = state.notes.map((item) => Number(item.noteId) === Number(noteId) ? updated : item);
      renderNotes();
    }
  };

  window.deleteNote = async function deleteNote(noteId) {
    await optionalRequest(
      () => apiRequest(`/api/learning/lessons/${state.lesson.lessonId}/notes/${noteId}`, { method: 'DELETE' }),
      null,
    );
    state.notes = state.notes.filter((item) => Number(item.noteId) !== Number(noteId));
    renderNotes();
  };

  window.submitQuestion = async function submitQuestion() {
    const modal = document.getElementById('question-modal');
    const titleInput = modal?.querySelector('input[type="text"]');
    const contentTextarea = modal?.querySelector('textarea');
    const attachTime = modal?.querySelector('#attach-time');
    const title = titleInput?.value.trim();
    const content = contentTextarea?.value.trim();

    if (!title || !content) {
      alert('질문 제목과 내용을 입력해주세요.');
      return;
    }

    const session = readStoredAuthSession();
    const suffix = session?.userId ? `?userId=${encodeURIComponent(session.userId)}` : '';
    const question = await optionalRequest(
      () => apiRequest(`/api/qna/questions${suffix}`, {
        method: 'POST',
        body: JSON.stringify({
          templateType: 'STUDY',
          difficulty: 'MEDIUM',
          title,
          content,
          courseId: state.courseId,
          lessonId: state.lesson?.lessonId || null,
          lectureTimestamp: attachTime?.checked ? formatTime(state.currentTime) : null,
        }),
      }),
      null,
    );

    if (!question) {
      alert('질문 등록에 실패했습니다.');
      return;
    }

    state.qnaDetails.set(Number(question.id), question);
    state.qnaQuestions = [question, ...state.qnaQuestions.filter((item) => Number(item.id) !== Number(question.id))];
    titleInput.value = '';
    contentTextarea.value = '';
    renderQnaList();
    closeQuestionModal();
    alert('질문이 성공적으로 등록되었습니다!');
  };

  window.submitQnaAnswer = async function submitQnaAnswer(questionId) {
    const detailView = document.getElementById('qna-detail-view');
    const textarea = detailView?.querySelector('textarea');
    const content = textarea?.value.trim();

    if (!content) {
      return;
    }

    const session = readStoredAuthSession();
    const suffix = session?.userId ? `?userId=${encodeURIComponent(session.userId)}` : '';
    const answer = await optionalRequest(
      () => apiRequest(`/api/qna/questions/${questionId}/answers${suffix}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
      null,
    );

    if (!answer) {
      alert('답변 등록에 실패했습니다.');
      return;
    }

    const detail = await optionalRequest(() => apiRequest(`/api/qna/questions/${questionId}`), null);
    if (detail) {
      state.qnaDetails.set(Number(questionId), detail);
      state.qnaQuestions = state.qnaQuestions.map((item) => Number(item.id) === Number(questionId)
        ? { ...item, answerCount: detail.answers?.length || item.answerCount, qnaStatus: detail.qnaStatus, adoptedAnswerId: detail.adoptedAnswerId }
        : item);
      renderQnaDetail(detail);
      renderQnaList();
    }
  };

  window.filterQna = function filterQna(filterType, btnElement) {
    state.qnaFilter = filterType;
    document.querySelectorAll('.qna-filter-btn').forEach((button) => {
      button.className = 'qna-filter-btn px-3.5 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition shrink-0';
    });

    if (btnElement) {
      btnElement.className = 'qna-filter-btn px-3.5 py-1.5 text-xs font-bold rounded-full bg-gray-900 text-white transition shrink-0';
    }

    applyQnaFilter();
  };

  window.openQnaDetail = async function openQnaDetail(questionId) {
    if (!questionId) {
      showQnaDetailView();
      return;
    }

    const key = Number(questionId);
    const detail = state.qnaDetails.get(key)
      || await optionalRequest(() => apiRequest(`/api/qna/questions/${key}`), null);

    if (!detail) {
      return;
    }

    state.qnaDetails.set(key, detail);
    renderQnaDetail(detail);
    showQnaDetailView();
  };

  window.closeQnaDetail = function closeQnaDetail() {
    const detailView = document.getElementById('qna-detail-view');
    const bottomBtn = document.getElementById('bottom-question-btn');

    detailView.classList.add('translate-x-full');
    bottomBtn.style.display = 'block';
    setTimeout(() => { bottomBtn.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => {
      detailView.classList.add('hidden');
    }, 300);
  };

  function showQnaDetailView() {
    const detailView = document.getElementById('qna-detail-view');
    const bottomBtn = document.getElementById('bottom-question-btn');

    detailView.classList.remove('hidden');
    setTimeout(() => {
      detailView.classList.remove('translate-x-full');
    }, 10);
    bottomBtn.style.transform = 'translateY(100%)';
    setTimeout(() => { bottomBtn.style.display = 'none'; }, 300);
  }

  function applyQnaFilter() {
    document.querySelectorAll('.qna-item').forEach((item) => {
      const isMe = item.getAttribute('data-author') === 'me';
      const isUnresolved = item.getAttribute('data-status') === 'unresolved';
      item.style.display = state.qnaFilter === 'all'
        || (state.qnaFilter === 'me' && isMe)
        || (state.qnaFilter === 'unresolved' && isUnresolved)
        ? 'block'
        : 'none';
    });
  }

  async function apiRequest(path, init) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const headers = new Headers(init?.headers || {});
    headers.set('Accept', 'application/json');

    if (init?.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const session = readStoredAuthSession();
    if (session?.accessToken) {
      headers.set('Authorization', `${session.tokenType || 'Bearer'} ${session.accessToken}`);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      let payload = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `Request failed with status ${response.status}`);
      }

      return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function optionalRequest(request, fallback) {
    try {
      return await request();
    } catch (error) {
      console.warn('[learning] Optional request failed.', error);
      return fallback;
    }
  }

  function readStoredAuthSession() {
    const storages = [window.localStorage, window.sessionStorage];

    for (const storage of storages) {
      const raw = storage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        continue;
      }

      try {
        const session = JSON.parse(raw);
        if (session?.exp && session.exp * 1000 <= Date.now() + 1000) {
          storage.removeItem(AUTH_STORAGE_KEY);
          continue;
        }
        return session;
      } catch {
        storage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    return null;
  }

  function normalizeSections(sections) {
    return sections
      .map((section, index) => ({
        ...section,
        _index: index,
        lessons: normalizeLessons(section.lessons || []),
      }))
      .sort((a, b) => compareSortOrder(a, b));
  }

  function normalizeLessons(lessons) {
    return lessons
      .map((lesson, index) => ({ ...lesson, _index: index }))
      .sort((a, b) => compareSortOrder(a, b));
  }

  function flattenLessons(sections) {
    return sections.flatMap((section, sectionIndex) => {
      const lessons = Array.isArray(section.lessons) ? section.lessons : [];
      return lessons.map((lesson, lessonIndex) => ({
        ...lesson,
        sectionId: section.sectionId,
        sectionTitle: section.title,
        sectionIndex,
        lessonIndex,
      }));
    });
  }

  function pickInitialLesson() {
    const requestedLessonId = toPositiveInteger(params.get('lessonId'));
    return state.lessons.find((lesson) => Number(lesson.lessonId) === requestedLessonId)
      || state.lessons[0]
      || null;
  }

  function compareSortOrder(a, b) {
    const left = a.sortOrder ?? a.displayOrder ?? a._index ?? 0;
    const right = b.sortOrder ?? b.displayOrder ?? b._index ?? 0;
    return left - right;
  }

  function getPlayerShell() {
    return document.querySelector('main .w-full.h-full.relative.flex.items-center.justify-center.bg-gray-900');
  }

  function getPlayerStage() {
    return getPlayerShell()?.parentElement || null;
  }

  function getMediaElement() {
    return getPlayerShell()?.querySelector('video, img');
  }

  function getControls() {
    return document.querySelector('main .absolute.bottom-0.left-0.right-0.h-16');
  }

  function getPlayPauseButton() {
    const controls = getControls();
    return controls ? Array.from(controls.children).filter((element) => element.tagName === 'BUTTON')[0] : null;
  }

  function getVolumeButton() {
    const controls = getControls();
    return controls ? Array.from(controls.children).filter((element) => element.tagName === 'BUTTON')[1] : null;
  }

  function getDuration() {
    const media = getMediaElement();
    if (media?.tagName === 'VIDEO' && Number.isFinite(media.duration) && media.duration > 0) {
      return media.duration;
    }

    return toFiniteNumber(state.lesson?.durationSeconds, state.duration);
  }

  function getLessonDisplayTitle(lesson, fallbackIndex) {
    if (!lesson) {
      return '';
    }

    const index = Number.isFinite(lesson.lessonIndex) ? lesson.lessonIndex : fallbackIndex;
    return `${index + 1}. ${lesson.title || 'Untitled lesson'}`;
  }

  function isQuestionResolved(question) {
    const status = String(question?.qnaStatus || '').toUpperCase();
    return Boolean(question?.adoptedAnswerId)
      || status === 'ANSWERED'
      || status === 'RESOLVED'
      || status === 'CLOSED';
  }

  function isMine(authorId) {
    const session = readStoredAuthSession();
    return session?.userId && Number(session.userId) === Number(authorId);
  }

  function toPositiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function toFiniteNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatDuration(seconds) {
    const value = toFiniteNumber(seconds, 0);
    return value > 0 ? formatTime(value) : '-';
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(toFiniteNumber(seconds, 0)));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function parseTimestamp(timestamp) {
    if (!timestamp) {
      return 0;
    }

    const parts = String(timestamp).split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) {
      return 0;
    }

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    return parts[0] || 0;
  }

  function formatRelativeTime(value) {
    if (!value) {
      return '';
    }

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return String(value);
    }

    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) {
      return '방금 전';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}분 전`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}시간 전`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}일 전`;
    }

    return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' }).format(timestamp);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }
})();
