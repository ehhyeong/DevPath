import Hls from 'hls.js'
import type { AdminCourseReviewDetail, AdminCourseReviewLesson } from '../../types/admin'
import { renderAdminMarkup } from './admin-react-renderer'
import { escapeHtml, formatDateTime } from './admin-dashboard-support'

type ReviewDecision = 'APPROVE' | 'REJECT'
type DecisionHandler = (courseId: number, decision: ReviewDecision, reason: string) => Promise<void>

let activeReview: AdminCourseReviewDetail | null = null
let reviewHls: Hls | null = null
let decisionProcessing = false
const REVIEW_SEEK_SECONDS = 10

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)
  if (!element) throw new Error(`${id} element was not found`)
  return element as T
}

function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, seconds ?? 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainingSeconds = total % 60
  if (hours > 0) return `${hours}시간 ${minutes}분`
  if (minutes > 0) return `${minutes}분 ${remainingSeconds}초`
  return `${remainingSeconds}초`
}

function formatPrice(value: number | null, currency: string | null) {
  if (value === null) return '미등록'
  return `${value.toLocaleString('ko-KR')} ${currency || 'KRW'}`
}

function formatPlaybackTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function renderTags(values: string[], emptyLabel: string) {
  if (!values.length) return `<span class="admin-course-review-empty-tag">${escapeHtml(emptyLabel)}</span>`
  return values.map((value) => `<span>${escapeHtml(value)}</span>`).join('')
}

function renderHistory(detail: AdminCourseReviewDetail) {
  if (!detail.reviewHistory.length) return '<p class="admin-course-review-history-empty">이전 검수 이력이 없습니다.</p>'
  return detail.reviewHistory.map((item) => `
    <article>
      <span class="${item.action === 'APPROVED' ? 'is-approved' : 'is-rejected'}">${item.action === 'APPROVED' ? '승인' : '반려'}</span>
      <div><strong>${escapeHtml(item.reason)}</strong><small>관리자 #${item.adminId} · ${escapeHtml(formatDateTime(item.processedAt))}</small></div>
    </article>
  `).join('')
}

function renderSections(detail: AdminCourseReviewDetail) {
  if (!detail.sections.length) return '<p class="admin-course-review-empty">등록된 커리큘럼이 없습니다.</p>'
  return detail.sections.map((section, sectionIndex) => `
    <details class="admin-course-review-section" ${sectionIndex === 0 ? 'open' : ''}>
      <summary>
        <span><strong>${sectionIndex + 1}. ${escapeHtml(section.title)}</strong><small>${section.lessons.length}개 차시 · ${section.published ? '공개 설정' : '비공개 설정'}</small></span>
        <i class="fas fa-chevron-down"></i>
      </summary>
      ${section.description ? `<p class="admin-course-review-section-description">${escapeHtml(section.description)}</p>` : ''}
      <div class="admin-course-review-lessons">
        ${section.lessons.length ? section.lessons.map((lesson, lessonIndex) => `
          <article>
            <div class="admin-course-review-lesson-order">${lessonIndex + 1}</div>
            <div class="admin-course-review-lesson-copy">
              <strong>${escapeHtml(lesson.title)}</strong>
              <small>${escapeHtml(lesson.lessonType || '유형 미등록')} · ${escapeHtml(formatDuration(lesson.durationSeconds))} · ${lesson.preview ? '미리보기' : '수강 전용'} · ${lesson.published ? '공개' : '비공개'}</small>
              ${lesson.description ? `<p>${escapeHtml(lesson.description)}</p>` : ''}
            </div>
            <button data-admin-click="previewCourseReviewLesson(${lesson.lessonId})" type="button" ${lesson.playbackUrl ? '' : 'disabled'}><i class="fas fa-play"></i>${lesson.playbackUrl ? '영상 확인' : '영상 없음'}</button>
          </article>
        `).join('') : '<p class="admin-course-review-empty">이 섹션에는 차시가 없습니다.</p>'}
      </div>
    </details>
  `).join('')
}

function renderReview(detail: AdminCourseReviewDetail) {
  return `
    <section class="admin-course-review-hero">
      <div class="admin-course-review-thumbnail">${detail.thumbnailUrl ? `<img src="${escapeHtml(detail.thumbnailUrl)}" alt="${escapeHtml(detail.title)} 썸네일" />` : '<i class="fas fa-photo-video"></i>'}</div>
      <div class="admin-course-review-title-copy">
        <span>심사 요청 · ${escapeHtml(formatDateTime(detail.submittedAt))}</span>
        <h4>${escapeHtml(detail.title)}</h4>
        <p>${escapeHtml(detail.subtitle || '부제 미등록')}</p>
        <small>${escapeHtml(detail.instructorName || `강사 #${detail.instructorId}`)} · ${escapeHtml(detail.instructorEmail || '이메일 미등록')}</small>
      </div>
      <div class="admin-course-review-course-status">${escapeHtml(detail.status)}</div>
    </section>

    <section class="admin-course-review-summary-grid">
      <div><span>판매가</span><strong>${escapeHtml(formatPrice(detail.price, detail.currency))}</strong><small>정가 ${escapeHtml(formatPrice(detail.originalPrice, detail.currency))}</small></div>
      <div><span>난이도·언어</span><strong>${escapeHtml(detail.difficultyLevel || '미등록')}</strong><small>${escapeHtml(detail.language || '언어 미등록')}</small></div>
      <div><span>커리큘럼</span><strong>${detail.sectionCount}개 섹션 · ${detail.lessonCount}개 차시</strong><small>공개 ${detail.publishedLessonCount}개 · 미리보기 ${detail.previewLessonCount}개</small></div>
      <div><span>총 영상 길이</span><strong>${escapeHtml(formatDuration(detail.totalDurationSeconds))}</strong><small>수료증 ${detail.hasCertificate ? '제공' : '미제공'}</small></div>
    </section>

    <section class="admin-course-review-description">
      <header><h4>강의 소개</h4>${detail.introVideoUrl ? `<a href="${escapeHtml(detail.introVideoUrl)}" target="_blank" rel="noreferrer"><i class="fas fa-external-link-alt"></i> 소개 영상 열기</a>` : ''}</header>
      <p>${escapeHtml(detail.description || '강의 소개가 등록되지 않았습니다.')}</p>
      <div><span>선수 지식</span><div>${renderTags(detail.prerequisites, '선수 지식 없음')}</div></div>
      <div><span>직무 연관성</span><div>${renderTags(detail.jobRelevance, '직무 연관성 미등록')}</div></div>
    </section>

    <section class="admin-course-review-player" aria-hidden="true">
      <header><div><h4 id="courseReviewPlayerTitle">차시 영상 확인</h4><p id="courseReviewPlayerDescription">확인할 차시의 영상 버튼을 선택하세요.</p></div><button id="courseReviewPlayerClose" type="button" aria-label="영상 닫기"><i class="fas fa-times"></i></button></header>
      <div id="courseReviewPlayerFrame" class="admin-course-review-player-frame">
        <video id="courseReviewVideo" playsinline></video>
        <div class="admin-course-review-player-controls">
          <div class="admin-course-review-player-transport">
            <button id="courseReviewRewind" type="button" aria-label="10초 뒤로"><i class="fas fa-backward"></i><span>10</span></button>
            <button id="courseReviewPlayPause" type="button" aria-label="재생"><i class="fas fa-play"></i></button>
            <button id="courseReviewStop" type="button" aria-label="정지"><i class="fas fa-stop"></i></button>
            <button id="courseReviewForward" type="button" aria-label="10초 앞으로"><i class="fas fa-forward"></i><span>10</span></button>
          </div>
          <div class="admin-course-review-player-progress">
            <input id="courseReviewSeek" type="range" min="0" max="0" value="0" step="0.1" aria-label="재생 위치" disabled />
            <output id="courseReviewTime">00:00 / 00:00</output>
          </div>
          <div class="admin-course-review-player-utilities">
            <button id="courseReviewMute" type="button" aria-label="음소거"><i class="fas fa-volume-up"></i></button>
            <button id="courseReviewFullscreen" type="button" aria-label="전체 화면"><i class="fas fa-expand"></i></button>
          </div>
        </div>
      </div>
    </section>

    <section class="admin-course-review-curriculum">
      <header><h4>커리큘럼 검수</h4><span>${detail.lessonCount}개 차시</span></header>
      <div>${renderSections(detail)}</div>
    </section>

    <section class="admin-course-review-history">
      <header><h4>이전 검수 이력</h4><span>${detail.reviewHistory.length}건</span></header>
      <div>${renderHistory(detail)}</div>
    </section>

    <section class="admin-course-review-decision">
      <header><h4>검수 확인</h4><p>승인하려면 아래 항목을 모두 확인하고 검수 메모를 작성하세요.</p></header>
      <div class="admin-course-review-checklist">
        <label><input class="course-review-check" type="checkbox" /><span><strong>기본 정보 확인</strong><small>제목, 소개, 가격과 강사 정보를 확인했습니다.</small></span></label>
        <label><input class="course-review-check" type="checkbox" /><span><strong>커리큘럼 확인</strong><small>섹션과 차시 구성, 공개 범위를 확인했습니다.</small></span></label>
        <label><input class="course-review-check" type="checkbox" /><span><strong>학습 콘텐츠 확인</strong><small>등록된 차시 영상과 설명을 확인했습니다.</small></span></label>
      </div>
      <label class="admin-course-review-reason"><span>검수 메모 또는 반려 사유</span><textarea id="courseReviewReason" maxlength="1000" placeholder="최소 5자 이상 입력하세요."></textarea><small>승인 메모는 강사 알림과 처리 이력에 함께 기록됩니다.</small></label>
    </section>
  `
}

function getPlaybackDuration(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration
  const fallbackDuration = Number(video.dataset.fallbackDuration)
  return Number.isFinite(fallbackDuration) && fallbackDuration > 0 ? fallbackDuration : 0
}

function syncPlayerControls() {
  const video = document.getElementById('courseReviewVideo') as HTMLVideoElement | null
  const seek = document.getElementById('courseReviewSeek') as HTMLInputElement | null
  const time = document.getElementById('courseReviewTime')
  const playPause = document.getElementById('courseReviewPlayPause') as HTMLButtonElement | null
  const mute = document.getElementById('courseReviewMute') as HTMLButtonElement | null
  const fullscreen = document.getElementById('courseReviewFullscreen') as HTMLButtonElement | null
  const frame = document.getElementById('courseReviewPlayerFrame')
  if (!video || !seek || !time || !playPause || !mute || !fullscreen || !frame) return

  const duration = getPlaybackDuration(video)
  const currentTime = Math.min(Math.max(0, video.currentTime || 0), duration || Number.MAX_SAFE_INTEGER)
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
  seek.max = String(duration)
  seek.value = String(duration > 0 ? Math.min(currentTime, duration) : 0)
  seek.disabled = duration <= 0
  seek.style.setProperty('--review-progress', `${progressPercent}%`)
  time.textContent = `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`
  playPause.setAttribute('aria-label', video.paused ? '재생' : '일시정지')
  playPause.querySelector('i')?.classList.toggle('fa-play', video.paused)
  playPause.querySelector('i')?.classList.toggle('fa-pause', !video.paused)
  mute.setAttribute('aria-label', video.muted ? '음소거 해제' : '음소거')
  mute.querySelector('i')?.classList.toggle('fa-volume-up', !video.muted)
  mute.querySelector('i')?.classList.toggle('fa-volume-mute', video.muted)
  const isFullscreen = document.fullscreenElement === frame
  fullscreen.setAttribute('aria-label', isFullscreen ? '전체 화면 종료' : '전체 화면')
  fullscreen.setAttribute('aria-pressed', String(isFullscreen))
  fullscreen.querySelector('i')?.classList.toggle('fa-expand', !isFullscreen)
  fullscreen.querySelector('i')?.classList.toggle('fa-compress', isFullscreen)
}

function bindPlayerMediaEvents() {
  const video = getElement<HTMLVideoElement>('courseReviewVideo')
  const mediaEventNames = ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'volumechange']
  mediaEventNames.forEach((eventName) => {
    video.addEventListener(eventName, syncPlayerControls)
  })
  syncPlayerControls()
}

function seekPlayerBy(seconds: number) {
  const video = getElement<HTMLVideoElement>('courseReviewVideo')
  const duration = getPlaybackDuration(video)
  const upperBound = duration > 0 ? duration : video.currentTime + Math.max(0, seconds)
  video.currentTime = Math.max(0, Math.min(upperBound, video.currentTime + seconds))
  syncPlayerControls()
}

function seekPlayerTo(seconds: number) {
  const video = getElement<HTMLVideoElement>('courseReviewVideo')
  const duration = getPlaybackDuration(video)
  video.currentTime = Math.max(0, Math.min(duration || seconds, seconds))
  syncPlayerControls()
}

function togglePlayerPlayback() {
  const video = getElement<HTMLVideoElement>('courseReviewVideo')
  if (video.paused) void video.play().catch(() => undefined)
  else video.pause()
}

function stopPlayerPlayback() {
  const video = getElement<HTMLVideoElement>('courseReviewVideo')
  video.pause()
  video.currentTime = 0
  syncPlayerControls()
}

function togglePlayerMute() {
  const video = getElement<HTMLVideoElement>('courseReviewVideo')
  video.muted = !video.muted
  syncPlayerControls()
}

async function togglePlayerFullscreen() {
  const frame = document.getElementById('courseReviewPlayerFrame')
  if (!frame) return
  if (document.fullscreenElement === frame) await document.exitFullscreen()
  else await frame.requestFullscreen?.()
}

function stopPreview() {
  const video = document.getElementById('courseReviewVideo') as HTMLVideoElement | null
  const hadPlaybackSource = reviewHls !== null || video?.hasAttribute('src') === true
  reviewHls?.destroy()
  reviewHls = null
  if (video && hadPlaybackSource) {
    video.pause()
    video.removeAttribute('src')
    delete video.dataset.fallbackDuration
    video.load()
    syncPlayerControls()
  }
  const player = document.querySelector<HTMLElement>('.admin-course-review-player')
  player?.setAttribute('aria-hidden', 'true')
  player?.classList.remove('is-active')
}

function findLesson(lessonId: number): AdminCourseReviewLesson | undefined {
  return activeReview?.sections.flatMap((section) => section.lessons).find((lesson) => lesson.lessonId === lessonId)
}

export function previewCourseReviewLesson(lessonId: number) {
  const lesson = findLesson(lessonId)
  if (!lesson?.playbackUrl) return
  stopPreview()
  const video = getElement<HTMLVideoElement>('courseReviewVideo')
  const player = document.querySelector<HTMLElement>('.admin-course-review-player')
  getElement('courseReviewPlayerTitle').textContent = lesson.title
  getElement('courseReviewPlayerDescription').textContent = `${lesson.lessonType || '차시'} · ${formatDuration(lesson.durationSeconds)}`
  video.dataset.fallbackDuration = String(lesson.durationSeconds ?? 0)
  player?.setAttribute('aria-hidden', 'false')
  player?.classList.add('is-active')

  if (lesson.playbackUrl.includes('.m3u8') || lesson.playbackUrl.includes('/api/media/hls/')) {
    if (Hls.isSupported()) {
      reviewHls = new Hls()
      reviewHls.loadSource(lesson.playbackUrl)
      reviewHls.attachMedia(video)
    } else {
      video.src = lesson.playbackUrl
    }
  } else {
    video.src = lesson.playbackUrl
  }
  syncPlayerControls()
  void video.play().catch(() => undefined)
  player?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function syncDecisionButtons() {
  const reason = (document.getElementById('courseReviewReason') as HTMLTextAreaElement | null)?.value.trim() ?? ''
  const checks = [...document.querySelectorAll<HTMLInputElement>('.course-review-check')]
  getElement<HTMLButtonElement>('courseReviewReject').disabled = decisionProcessing || reason.length < 5
  getElement<HTMLButtonElement>('courseReviewApprove').disabled = decisionProcessing || reason.length < 5 || checks.some((check) => !check.checked)
}

export function openCourseReviewModal(detail: AdminCourseReviewDetail) {
  activeReview = detail
  decisionProcessing = false
  getElement('courseReviewModalTitle').textContent = `${detail.title} 검수`
  getElement('courseReviewModalDescription').textContent = `강의 #${detail.courseId} · ${detail.instructorName || `강사 #${detail.instructorId}`}`
  getElement('courseReviewModalStatus').textContent = ''
  renderAdminMarkup(getElement('courseReviewModalBody'), renderReview(detail))
  bindPlayerMediaEvents()
  const modal = getElement('courseReviewModal')
  modal.classList.add('active')
  modal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('devpath-modal-open')
  syncDecisionButtons()
}

export function closeCourseReviewModal() {
  if (decisionProcessing) return
  stopPreview()
  activeReview = null
  const modal = getElement('courseReviewModal')
  modal.classList.remove('active')
  modal.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('devpath-modal-open')
}

export function installCourseReviewModalBindings(onDecision: DecisionHandler) {
  const modal = getElement('courseReviewModal')
  const close = () => closeCourseReviewModal()
  getElement<HTMLButtonElement>('courseReviewModalClose').addEventListener('click', close)
  getElement<HTMLButtonElement>('courseReviewModalCloseIcon').addEventListener('click', close)
  getElement<HTMLButtonElement>('courseReviewApprove').addEventListener('click', () => void processDecision('APPROVE'))
  getElement<HTMLButtonElement>('courseReviewReject').addEventListener('click', () => void processDecision('REJECT'))
  modal.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.id === 'courseReviewSeek') {
      seekPlayerTo(Number(event.target.value))
      return
    }
    syncDecisionButtons()
  })
  modal.addEventListener('change', syncDecisionButtons)
  document.addEventListener('fullscreenchange', syncPlayerControls)
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close()
    if (!(event.target instanceof Element)) return
    if (event.target.closest('#courseReviewPlayerClose')) stopPreview()
    else if (event.target.closest('#courseReviewRewind')) seekPlayerBy(-REVIEW_SEEK_SECONDS)
    else if (event.target.closest('#courseReviewPlayPause')) togglePlayerPlayback()
    else if (event.target.closest('#courseReviewStop')) stopPlayerPlayback()
    else if (event.target.closest('#courseReviewForward')) seekPlayerBy(REVIEW_SEEK_SECONDS)
    else if (event.target.closest('#courseReviewMute')) togglePlayerMute()
    else if (event.target.closest('#courseReviewFullscreen')) void togglePlayerFullscreen()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('active')) close()
  })

  async function processDecision(decision: ReviewDecision) {
    if (!activeReview || decisionProcessing) return
    const reason = getElement<HTMLTextAreaElement>('courseReviewReason').value.trim()
    syncDecisionButtons()
    const button = getElement<HTMLButtonElement>(decision === 'APPROVE' ? 'courseReviewApprove' : 'courseReviewReject')
    if (button.disabled) return
    const actionLabel = decision === 'APPROVE' ? '승인' : '반려'
    if (!window.confirm(`검수 내용을 확인했습니다. 이 강의를 ${actionLabel}하시겠습니까?`)) return

    decisionProcessing = true
    getElement('courseReviewModalStatus').textContent = `${actionLabel} 처리 중입니다...`
    syncDecisionButtons()
    try {
      const courseId = activeReview.courseId
      await onDecision(courseId, decision, reason)
      decisionProcessing = false
      closeCourseReviewModal()
    } catch (error) {
      decisionProcessing = false
      getElement('courseReviewModalStatus').textContent = error instanceof Error ? error.message : '검수 처리에 실패했습니다.'
      syncDecisionButtons()
    }
  }
}
