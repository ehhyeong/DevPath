import { startTransition, useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { captureAndOcr, warmupOcrWorker, type ScreenRegion } from './lib/videoOcr'
import { courseApi, learnerAssignmentApi, learningPlayerApi, lessonNoteApi, lessonSessionApi, qnaApi } from './lib/api'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './lib/auth-session'
import {
  createDefaultProgress,
  formatDateLabel,
  formatTime,
  getFlattenedLessons,
  getNotesStorageKey,
  getProgressStorageKey,
  normalizeCourseDetail,
  PLAYER_SPEEDS,
  readJsonStorage,
  readNumberSearchParam,
  resolveMaterialDownloadHref,
  syncLearningUrl,
  type FlattenedLesson,
  writeJsonStorage,
} from './learning-player-support'
import type { AuthSession } from './types/auth'
import type {
  AssignmentPrecheckResponse,
  AssignmentSubmissionResponse,
  LearningCourseDetail,
  LearningLesson,
  LearningLessonAssignment,
  LearningLessonProgress,
  LearningPlayerConfig,
  LearningVideoQuality,
  LearningVideoSource,
  SubmissionHistoryItem,
  TimestampNote,
} from './types/learning'
import type {
  CreateQnaQuestionRequest,
  QnaDifficulty,
  QnaQuestionDetail,
  QnaQuestionSummary,
  QnaQuestionTemplate,
} from './types/qna'

type TabKey = 'curriculum' | 'qna' | 'notes'
type QnaStatusFilter = 'ALL' | 'MINE' | 'UNANSWERED'
type QuestionFormState = {
  templateType: string
  difficulty: QnaDifficulty
  title: string
  content: string
  attachTimestamp: boolean
}

type QuizModalQuestion = {
  label: string
  questionText: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

type AssignmentSubmissionFormState = {
  submissionText: string
  submissionUrl: string
  files: File[]
  hasReadme: boolean
  testPassed: boolean
  lintPassed: boolean
}

type AssignmentGradingResultState = {
  lessonId: number
  lessonTitle: string
  assignment: LearningLessonAssignment
  precheck: AssignmentPrecheckResponse
  submission: AssignmentSubmissionResponse
}

type ProofCardType = 'language' | 'cs' | 'framework' | 'backend'

type CompletionProofCardState = {
  type: ProofCardType
  title: string
  frontTitle: string
  sectionTitle: string
  description: string
  issuedAt: string
  score: number
  verifiedSkills: string[]
}

type PersistCompletionOptions = {
  showCourseCompletion?: boolean
}

type CelebrationParticle = {
  id: number
  left: number
  delay: number
  duration: number
  rotate: number
  size: number
  color: string
}

type PipDocument = Document & {
  pictureInPictureElement?: Element | null
  pictureInPictureEnabled?: boolean
  exitPictureInPicture?: () => Promise<void>
}

type PipVideoElement = HTMLVideoElement & {
  requestPictureInPicture?: () => Promise<unknown>
}

const COURSE_LOAD_TIMEOUT_MS = 20000
const LESSON_LOAD_TIMEOUT_MS = 6000
const QNA_LOAD_TIMEOUT_MS = 6000
const STUDENT_PREVIEW_QUERY_VALUE = 'student'
const ASSIGNMENT_LOADING_MESSAGES = [
  '코드 및 스크립트 검사 중...',
  '제출된 파일을 실행하고 있습니다...',
  '루브릭 기준에 맞춰 최종 점수 계산 중...',
]

function isAbortError(error: unknown) {
  return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError'
}

function isPlaybackBlockedError(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

function isNativeKeyboardControlTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.closest('input, textarea, select, button, a[href], [contenteditable="true"]') !== null
}

function resolveVideoUrl(src: string | null) {
  if (!src) return null
  try {
    return new URL(src, window.location.origin).toString()
  } catch {
    return src
  }
}

function getVideoErrorMessage(video: HTMLVideoElement | null, src: string | null) {
  const resolvedSrc = resolveVideoUrl(src)
  const suffix = resolvedSrc ? ` (${resolvedSrc})` : ''

  switch (video?.error?.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return `영상 로드를 중단했습니다. 다시 시도해 주세요.${suffix}`
    case MediaError.MEDIA_ERR_NETWORK:
      return `영상 파일을 불러오지 못했습니다.${suffix}`
    case MediaError.MEDIA_ERR_DECODE:
      return `영상 디코딩에 실패했습니다. 파일 형식이나 브라우저 지원 상태를 확인해 주세요.${suffix}`
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return `브라우저가 이 영상 형식을 재생하지 못합니다.${suffix}`
    default:
      return `영상 로드에 실패했습니다.${suffix}`
  }
}

function isSampleVideoUrl(src: string | null) {
  if (!src) return false
  return src.startsWith('/samples/')
}

const VIDEO_QUALITY_OPTIONS = ['1080', '720'] as const satisfies readonly LearningVideoQuality[]

type VideoQualitySources = Partial<Record<LearningVideoQuality, string>>

function normalizeVideoQuality(value: unknown): LearningVideoQuality | null {
  const match = String(value ?? '').match(/(1080|720)/)
  if (!match) return null
  return VIDEO_QUALITY_OPTIONS.includes(match[1] as LearningVideoQuality) ? (match[1] as LearningVideoQuality) : null
}

function readVideoSourceUrl(value: unknown) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return null

  const candidate = value as Partial<LearningVideoSource>
  return candidate.url ?? candidate.src ?? candidate.videoUrl ?? candidate.href ?? null
}

function addVideoQualitySource(sources: VideoQualitySources, quality: unknown, url: unknown) {
  const normalizedQuality = normalizeVideoQuality(quality)
  const sourceUrl = readVideoSourceUrl(url) ?? (typeof url === 'string' ? url : null)
  if (!normalizedQuality || !sourceUrl || sources[normalizedQuality]) return
  sources[normalizedQuality] = sourceUrl
}

function collectVideoQualitySources(target: unknown, sources: VideoQualitySources) {
  if (!target || typeof target !== 'object') return

  const source = target as Record<string, unknown>
  const directFields: Record<LearningVideoQuality, string[]> = {
    '1080': ['videoUrl1080p', 'videoUrl1080', 'video1080Url', 'fullHdVideoUrl'],
    '720': ['videoUrl720p', 'videoUrl720', 'video720Url', 'hdVideoUrl'],
  }

  VIDEO_QUALITY_OPTIONS.forEach((quality) => {
    directFields[quality].forEach((field) => addVideoQualitySource(sources, quality, source[field]))
  })

  ;['videoUrls', 'videoSources', 'qualitySources', 'sources'].forEach((field) => {
    const value = source[field]

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (!item || typeof item !== 'object') return
        const candidate = item as LearningVideoSource
        addVideoQualitySource(
          sources,
          candidate.quality ?? candidate.resolution ?? candidate.height ?? candidate.label ?? candidate.name,
          candidate,
        )
      })
      return
    }

    if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([quality, item]) => {
        addVideoQualitySource(sources, quality, item)
      })
    }
  })
}

function deriveVideoQualityUrl(url: string | null | undefined, targetQuality: LearningVideoQuality) {
  if (!url) return null

  const otherQuality = targetQuality === '1080' ? '720' : '1080'
  const patterns: Array<[RegExp, string]> = [
    [new RegExp(`${otherQuality}p`, 'i'), `${targetQuality}p`],
    [new RegExp(`${otherQuality}(?=[._/-])`, 'i'), targetQuality],
    [new RegExp(`([?&](?:quality|resolution|height)=)${otherQuality}`, 'i'), `$1${targetQuality}`],
  ]
  const match = patterns.find(([pattern]) => pattern.test(url))
  return match ? url.replace(match[0], match[1]) : null
}

function resolveVideoQualitySources(lesson: LearningLesson | null, course: LearningCourseDetail | null) {
  const sources: VideoQualitySources = {}
  collectVideoQualitySources(course, sources)
  collectVideoQualitySources(lesson, sources)

  const primaryUrl = lesson?.videoUrl ?? course?.introVideoUrl ?? null
  addVideoQualitySource(sources, '1080', primaryUrl)
  VIDEO_QUALITY_OPTIONS.forEach((quality) => {
    addVideoQualitySource(sources, quality, deriveVideoQualityUrl(primaryUrl, quality))
  })

  return sources
}

function getAvailableVideoQuality(preferredQuality: LearningVideoQuality, sources: VideoQualitySources) {
  if (sources[preferredQuality]) return preferredQuality
  return VIDEO_QUALITY_OPTIONS.find((quality) => Boolean(sources[quality])) ?? null
}

function formatOcrSourceLabel(source: string) {
  if (/python/i.test(source)) return 'Python OCR'
  if (/tesseract|local|로컬/i.test(source)) return '로컬 OCR'
  if (/claude/i.test(source)) return 'Claude Vision'
  return source || 'OCR'
}

function readVideoDuration(source: string, signal: AbortSignal, onDuration: (durationSeconds: number) => void) {
  const probe = document.createElement('video')
  let timeoutId = 0

  const cleanup = () => {
    window.clearTimeout(timeoutId)
    probe.removeAttribute('src')
    probe.load()
  }

  const handleLoadedMetadata = () => {
    const durationSeconds = Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0
    cleanup()
    if (durationSeconds > 0 && !signal.aborted) {
      onDuration(durationSeconds)
    }
  }

  const handleAbort = () => cleanup()

  probe.preload = 'metadata'
  probe.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
  probe.addEventListener('error', cleanup, { once: true })
  signal.addEventListener('abort', handleAbort, { once: true })
  timeoutId = window.setTimeout(cleanup, 8000)
  probe.src = source
}

async function requestWithTimeout<T>(timeoutMs: number, executor: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await executor(controller.signal)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function createDefaultPlayerConfig(lessonId: number): LearningPlayerConfig {
  return { lessonId, defaultPlaybackRate: 1, pipEnabled: false }
}

function readStudentPreviewFromLocation() {
  return new URLSearchParams(window.location.search).get('preview') === STUDENT_PREVIEW_QUERY_VALUE
}

function readNonNegativeNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function readEnabledSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  return value === '1' || value === 'true'
}

function readOptionalSafeReturnHref() {
  const value = new URLSearchParams(window.location.search).get('returnTo')
  if (!value) {
    return null
  }

  try {
    const nextUrl = new URL(value, window.location.origin)
    if (nextUrl.origin !== window.location.origin) {
      return null
    }

    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  } catch {
    return null
  }
}

function readSafeReturnHref(fallbackHref: string) {
  return readOptionalSafeReturnHref() ?? fallbackHref
}

function createQuestionFormState(): QuestionFormState {
  return { templateType: '', difficulty: 'MEDIUM', title: '', content: '', attachTimestamp: true }
}

function createAssignmentFormState(assignment?: LearningLessonAssignment | null): AssignmentSubmissionFormState {
  return {
    submissionText: '',
    submissionUrl: '',
    files: [],
    hasReadme: !assignment?.readmeRequired,
    testPassed: !assignment?.testRequired,
    lintPassed: !assignment?.lintRequired,
  }
}

function isQuestionAnswered(question: Pick<QnaQuestionSummary, 'qnaStatus' | 'adoptedAnswerId' | 'answerCount'>) {
  return question.qnaStatus === 'ANSWERED' || Boolean(question.adoptedAnswerId) || question.answerCount > 0
}

function isOwnQnaQuestion(
  question: Pick<QnaQuestionSummary, 'authorId'> | null | undefined,
  userId: number | null | undefined,
) {
  return Boolean(userId && question?.authorId === userId)
}

function hasLessonAssignment(item: LearningLesson | null | undefined): item is LearningLesson & { assignment: LearningLessonAssignment } {
  return Boolean(item?.assignment?.assignmentId)
}

function isAssignmentLesson(item: LearningLesson | null | undefined) {
  if (!item) return false
  return hasLessonAssignment(item) || item.lessonType?.toUpperCase() === 'CODING'
}

function resolveLessonAssignment(item: LearningLesson | null | undefined): LearningLessonAssignment | null {
  if (!item) return null
  if (hasLessonAssignment(item)) return item.assignment
  if (item.lessonType?.toUpperCase() !== 'CODING') return null

  return {
    assignmentId: 0,
    roadmapNodeId: null,
    title: item.title,
    description: item.description,
    submissionRuleDescription: null,
    totalScore: null,
    passScore: null,
    aiReviewEnabled: true,
    allowTextSubmission: true,
    allowFileSubmission: true,
    allowUrlSubmission: true,
    readmeRequired: false,
    testRequired: false,
    lintRequired: false,
    allowLateSubmission: true,
    dueAt: null,
    allowedFileFormats: [],
    rubrics: [],
  }
}

function isQuizLesson(item: LearningLesson | null | undefined): boolean {
  if (!item) return false
  return item.lessonType?.toUpperCase() !== 'VIDEO' && /퀴즈|quiz/i.test(item.title)
}

function isLessonProgressCompleted(item: LearningLessonProgress | null | undefined) {
  return Boolean(item?.isCompleted) || (item?.progressPercent ?? 0) >= 100
}

function buildSubmissionFiles(files: File[]) {
  return files.map((file) => {
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
    return {
      fileName: file.name,
      fileUrl: `local-upload://${encodeURIComponent(file.name)}`,
      fileSize: file.size,
      fileType: extension,
    }
  })
}

function resolveAssignmentResultScore(submission: AssignmentSubmissionResponse) {
  return submission.totalScore ?? null
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function resolveAssignmentMaxScore(assignment: LearningLessonAssignment | null | undefined) {
  return assignment?.totalScore && assignment.totalScore > 0 ? assignment.totalScore : 100
}

function normalizeScorePercent(score: number | null | undefined, maxScore: number | null | undefined) {
  if (score === null || score === undefined) return null
  const numericScore = Number(score)
  if (!Number.isFinite(numericScore)) return null
  const numericMaxScore = maxScore && maxScore > 0 ? Number(maxScore) : 100
  if (!Number.isFinite(numericMaxScore) || numericMaxScore <= 0) return clampPercent(numericScore)
  if (numericMaxScore !== 100 && numericScore <= numericMaxScore) {
    return clampPercent((numericScore / numericMaxScore) * 100)
  }
  return clampPercent(numericScore)
}

function resolveAssignmentResultScorePercent(
  assignment: LearningLessonAssignment | null | undefined,
  submission: AssignmentSubmissionResponse,
) {
  if (submission.totalScore !== null && submission.totalScore !== undefined) {
    return normalizeScorePercent(submission.totalScore, resolveAssignmentMaxScore(assignment))
  }
  return null
}

function resolveAssignmentHistoryScorePercent(
  assignment: LearningLessonAssignment,
  history: SubmissionHistoryItem | null | undefined,
) {
  if (!history) return null
  if (history.totalScore !== null && history.totalScore !== undefined) {
    return normalizeScorePercent(history.totalScore, resolveAssignmentMaxScore(assignment))
  }
  return null
}

function resolveAssignmentResultPassed(
  assignment: LearningLessonAssignment,
  submission: AssignmentSubmissionResponse,
) {
  const score = resolveAssignmentResultScore(submission)
  if (score === null || assignment.passScore === null) return null
  return score >= assignment.passScore
}

function resolveAssignmentResultBadge(
  assignment: LearningLessonAssignment,
  submission: AssignmentSubmissionResponse,
) {
  const passed = resolveAssignmentResultPassed(assignment, submission)
  if (passed === true) {
    return {
      iconClassName: 'fas fa-check-circle',
      label: `PASS${assignment.passScore !== null ? ` · 기준 ${assignment.passScore}점` : ''}`,
      className: 'border-green-100 bg-green-50 text-[#00C471]',
    }
  }
  if (passed === false) {
    return {
      iconClassName: 'fas fa-rotate-right',
      label: `REVIEW${assignment.passScore !== null ? ` · 기준 ${assignment.passScore}점` : ''}`,
      className: 'border-amber-100 bg-amber-50 text-amber-600',
    }
  }
  return {
    iconClassName: 'fas fa-clipboard-check',
    label: submission.submissionStatus === 'GRADED' ? '채점 완료' : submission.submissionStatus.replace(/_/g, ' '),
    className: 'border-sky-100 bg-sky-50 text-sky-600',
  }
}

function buildAssignmentResultReportRows(
  assignment: LearningLessonAssignment,
  submission: AssignmentSubmissionResponse,
  precheck: AssignmentPrecheckResponse,
) {
  const rows: Array<{ label: string; value: string; tone: 'success' | 'warning' | 'neutral'; iconClassName: string }> = []
  const addCheckRow = (enabled: boolean | null | undefined, label: string, passed: boolean | null | undefined) => {
    if (!enabled) return
    rows.push({
      label,
      value: passed ? 'Pass' : 'Fail',
      tone: passed ? 'success' : 'warning',
      iconClassName: passed ? 'fas fa-check' : 'fas fa-triangle-exclamation',
    })
  }

  addCheckRow((assignment.allowFileSubmission ?? false) || (submission.fileCount ?? 0) > 0, 'File Extension Check', precheck.fileFormatPassed)
  addCheckRow(assignment.readmeRequired, 'README Check', precheck.readmePassed)
  addCheckRow(assignment.testRequired, 'Execution Test', precheck.testPassed)
  addCheckRow(assignment.lintRequired, 'Lint Check', precheck.lintPassed)

  if (submission.qualityScore !== null || precheck.qualityScore !== null) {
    rows.push({
      label: 'Precheck Result',
      value: precheck.passed ? 'Pass' : 'Review',
      tone: 'neutral',
      iconClassName: 'fas fa-wand-magic-sparkles',
    })
  }

  if (assignment.rubrics.length) {
    rows.push({
      label: 'Rubric Score',
      value: `${resolveAssignmentResultScore(submission) ?? '-'} / ${assignment.totalScore ?? 100}`,
      tone: submission.totalScore === null || submission.totalScore === undefined ? 'neutral' : 'success',
      iconClassName: 'fas fa-list-check',
    })
  }

  if (!rows.length) {
    rows.push({
      label: 'Submission Review',
      value: submission.submissionStatus.replace(/_/g, ' '),
      tone: 'neutral',
      iconClassName: 'fas fa-clipboard-check',
    })
  }

  return rows
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

const PROOF_CARD_TEXT_LIMITS = {
  description: 112,
  skill: 30,
  titleTopic: 28,
} as const

function normalizeProofCardText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function limitProofCardText(value: string | null | undefined, maxLength: number, fallback = '') {
  const normalized = normalizeProofCardText(value) || normalizeProofCardText(fallback)
  if (!normalized) return ''

  const characters = Array.from(normalized)
  if (characters.length <= maxLength) return normalized

  return `${characters.slice(0, Math.max(0, maxLength - 3)).join('').trimEnd()}...`
}

function takeProofCardTitleBeforeDelimiter(value: string, delimiter: string) {
  const delimiterIndex = value.indexOf(delimiter)
  if (delimiterIndex < 0) return value

  const prefix = normalizeProofCardText(value.slice(0, delimiterIndex))
  return Array.from(prefix).length >= 2 ? prefix : value
}

function takeProofCardTitleBeforeColon(value: string) {
  const colonIndex = value.includes(':') ? value.indexOf(':') : value.indexOf('：')
  if (colonIndex < 0) return value

  const prefix = normalizeProofCardText(value.slice(0, colonIndex))
  const prefixLength = Array.from(prefix).length
  return prefixLength >= 2 && prefixLength <= PROOF_CARD_TEXT_LIMITS.titleTopic ? prefix : value
}

function fitProofCardTitleWithoutEllipsis(value: string, maxLength: number) {
  const normalized = normalizeProofCardText(value)
  if (Array.from(normalized).length <= maxLength) return normalized

  const fitted = normalized.split(' ').reduce((current, word) => {
    const next = current ? `${current} ${word}` : word
    return Array.from(next).length <= maxLength ? next : current
  }, '')

  if (fitted) return fitted
  return Array.from(normalized).slice(0, maxLength).join('').trimEnd()
}

function buildConciseProofCardTitle(value: string | null | undefined, fallback = '학습 완료') {
  let title = normalizeProofCardText(value)
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^로드맵\s*실전\s*:\s*/, '')
    .replace(/^섹션\s*마무리\s*퀴즈\s*:\s*/, '')
    .replace(/^실습\s*과제\s*:\s*/, '')
    .replace(/\s*-\s*\d+\s*(QUIZ|ASSIGNMENT)\s*$/i, '')
    .replace(/\s*(QUIZ|ASSIGNMENT)\s*$/i, '')

  title = takeProofCardTitleBeforeDelimiter(title, '|')
  title = takeProofCardTitleBeforeDelimiter(title, '｜')
  title = takeProofCardTitleBeforeColon(title)
  title = takeProofCardTitleBeforeDelimiter(title, ' - ')
  title = normalizeProofCardText(title) || normalizeProofCardText(fallback)

  return fitProofCardTitleWithoutEllipsis(title, PROOF_CARD_TEXT_LIMITS.titleTopic)
}

function inferProofCardType(
  course: LearningCourseDetail,
  lesson: FlattenedLesson | null,
  assignment: LearningLessonAssignment | null | undefined,
) {
  const normalized = [
    course.title,
    course.subtitle ?? '',
    lesson?.sectionTitle ?? '',
    lesson?.title ?? '',
    assignment?.title ?? '',
    ...course.tags.map((tag) => tag.tagName),
  ]
    .join(' ')
    .toLowerCase()

  if (/(java|javascript|typescript|python|kotlin|go|rust|swift|언어|문법)/.test(normalized)) {
    return 'language' satisfies ProofCardType
  }

  if (/(spring|react|vue|angular|next|django|flask|framework|프레임워크)/.test(normalized)) {
    return 'framework' satisfies ProofCardType
  }

  if (/(운영체제|os|network|네트워크|database|db|자료구조|알고리즘|cs|computer science|process|thread|deadlock)/.test(normalized)) {
    return 'cs' satisfies ProofCardType
  }

  return 'backend' satisfies ProofCardType
}

function getProofCardTheme(type: ProofCardType) {
  switch (type) {
    case 'language':
      return {
        frontGradientClassName: 'from-orange-500 to-red-600',
        badgeLabel: '언어 (Language)',
        iconClassName: 'fas fa-code',
        markerClassName: 'text-orange-300',
        glowColor: 'rgba(249,115,22,0.22)',
        scoreLabel: '코드 구현 검증 통과',
      }
    case 'framework':
      return {
        frontGradientClassName: 'from-green-500 to-emerald-600',
        badgeLabel: '프레임워크',
        iconClassName: 'fas fa-layer-group',
        markerClassName: 'text-emerald-300',
        glowColor: 'rgba(0,196,113,0.22)',
        scoreLabel: '실습 과제 검증 통과',
      }
    case 'cs':
      return {
        frontGradientClassName: 'from-blue-600 to-indigo-800',
        badgeLabel: 'CS 전공지식',
        iconClassName: 'fas fa-server',
        markerClassName: 'text-blue-300',
        glowColor: 'rgba(59,130,246,0.22)',
        scoreLabel: '개념 이해도 검증 통과',
      }
    default:
      return {
        frontGradientClassName: 'from-slate-700 to-slate-900',
        badgeLabel: 'Backend Track',
        iconClassName: 'fas fa-database',
        markerClassName: 'text-slate-300',
        glowColor: 'rgba(148,163,184,0.18)',
        scoreLabel: '실전 역량 검증 통과',
      }
  }
}

function buildCompletionSkills(
  course: LearningCourseDetail,
  lesson: FlattenedLesson | null,
  assignment: LearningLessonAssignment | null | undefined,
) {
  const unique = new Set<string>()
  const candidates = [
    ...course.tags.map((tag) => tag.tagName),
    ...course.objectives.map((objective) => objective.objectiveText),
    lesson?.sectionTitle ?? null,
    lesson?.title ?? null,
    assignment?.title ?? null,
  ]

  candidates.forEach((item) => {
    const trimmed = normalizeProofCardText(item)
    if (!trimmed) return
    unique.add(limitProofCardText(trimmed, PROOF_CARD_TEXT_LIMITS.skill))
  })

  return Array.from(unique).slice(0, 4)
}

function buildCompletionProofCard(
  course: LearningCourseDetail,
  lesson: FlattenedLesson | null,
  assignment: LearningLessonAssignment | null | undefined,
  score: number | null,
): CompletionProofCardState {
  const verifiedSkills = buildCompletionSkills(course, lesson, assignment)
  const conciseCourseTitle = buildConciseProofCardTitle(course.title, 'DevPath Course')
  const descriptionSource = normalizeProofCardText(course.description) || normalizeProofCardText(assignment?.description)
  const description = limitProofCardText(
    descriptionSource,
    PROOF_CARD_TEXT_LIMITS.description,
    `${course.title} 전체 커리큘럼을 완료했습니다.`,
  )

  return {
    type: inferProofCardType(course, lesson, assignment),
    title: conciseCourseTitle,
    frontTitle: buildConciseProofCardTitle(course.subtitle, conciseCourseTitle),
    sectionTitle: buildConciseProofCardTitle(lesson?.sectionTitle, conciseCourseTitle),
    description,
    issuedAt: new Date().toISOString(),
    score: clampPercent(score ?? 0),
    verifiedSkills: verifiedSkills.length ? verifiedSkills : ['전체 커리큘럼 완료', '학습 진행률 100%', '핵심 역량 검증'],
  }
}

function buildCelebrationParticles(seed: number): CelebrationParticle[] {
  const colors = ['#00C471', '#3B82F6', '#FFFFFF', '#F59E0B']

  return Array.from({ length: 28 }, (_, index) => ({
    id: index,
    left: (seed * 13 + index * 17) % 100,
    delay: (index % 7) * 110,
    duration: 1800 + (index % 5) * 260,
    rotate: (seed * 19 + index * 37) % 360,
    size: 6 + (index % 4) * 2,
    color: colors[(seed + index) % colors.length],
  }))
}

function buildQuizModalQuestions(course: LearningCourseDetail, lesson: LearningLesson): QuizModalQuestion[] {
  const lessonTopic = lesson.title.replace(/^섹션\s*마무리\s*퀴즈:\s*/i, '').trim() || lesson.title
  const courseTitle = course.title

  return [
    {
      label: '개념 확인',
      questionText: `${lessonTopic}를 마무리할 때 가장 먼저 확인해야 하는 것은 무엇인가요?`,
      options: [
        '섹션 핵심 개념과 실습 요구사항이 서로 맞는지 확인한다.',
        '도구 이름만 외우고 동작 흐름은 확인하지 않는다.',
        '다음 섹션으로 넘어가기 전에 모든 코드를 새로 작성한다.',
        '영상 길이만 확인하고 학습 내용을 생략한다.',
      ],
      correctOptionIndex: 0,
      explanation: '섹션 퀴즈는 암기보다 핵심 개념과 실제 적용 흐름을 함께 확인하는 용도입니다.',
    },
    {
      label: '적용 판단',
      questionText: `${courseTitle} 학습 중 막혔을 때 가장 좋은 복습 방식은 무엇인가요?`,
      options: [
        '오류 메시지, 입력값, 기대 결과를 나눠서 원인을 좁힌다.',
        '작동하지 않는 코드를 그대로 두고 다음 주제로 넘어간다.',
        '정답 코드만 복사해서 결과만 맞춘다.',
        '관련 없는 라이브러리를 먼저 추가해 본다.',
      ],
      correctOptionIndex: 0,
      explanation: '문제를 작게 나누어 확인하면 원인을 빠르게 찾고 다음 실습으로 이어갈 수 있습니다.',
    },
    {
      label: '다음 단계',
      questionText: '다음 강의로 넘어가기 전에 정리하면 가장 도움이 되는 것은 무엇인가요?',
      options: [
        '이번 섹션에서 배운 핵심 개념, 실습 결과, 헷갈린 지점을 짧게 기록한다.',
        '모든 내용을 완벽히 외울 때까지 다음 강의를 열지 않는다.',
        '퀴즈 결과와 상관없이 학습 기록을 남기지 않는다.',
        '영상 재생 여부만 확인하고 실습 내용은 건너뛴다.',
      ],
      correctOptionIndex: 0,
      explanation: '짧은 복습 기록은 다음 섹션에서 필요한 전제 지식을 빠르게 되살리는 데 도움이 됩니다.',
    },
  ]
}

function formatRelativeTime(value: string | null) {
  if (!value) return '방금'
  const parsed = new Date(value)
  const diffMs = Date.now() - parsed.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatDateLabel(value)
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs
  if (diffMs < hourMs) return `${Math.max(1, Math.floor(diffMs / minuteMs))}분 전`
  if (diffMs < dayMs) return `${Math.max(1, Math.floor(diffMs / hourMs))}시간 전`
  return `${Math.max(1, Math.floor(diffMs / dayMs))}일 전`
}

function toQuestionSummary(question: QnaQuestionDetail): QnaQuestionSummary {
  return {
    id: question.id,
    authorId: question.authorId,
    authorName: question.authorName,
    courseId: question.courseId,
    lessonId: question.lessonId,
    templateType: question.templateType,
    difficulty: question.difficulty,
    title: question.title,
    adoptedAnswerId: question.adoptedAnswerId,
    lectureTimestamp: question.lectureTimestamp,
    qnaStatus: question.qnaStatus,
    answerCount: question.answerCount,
    viewCount: question.viewCount,
    createdAt: question.createdAt,
  }
}

function EmptyState(props: { iconClassName: string; title: string; description: string; className?: string }) {
  return (
    <div className={`learning-empty-state rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-10 text-center shadow-sm ${props.className ?? ''}`}>
      <div className="learning-empty-state-icon mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <i className={props.iconClassName} />
      </div>
      <h3 className="learning-empty-state-title mt-4 text-sm font-semibold text-gray-900">{props.title}</h3>
      <p className="learning-empty-state-description mt-2 text-sm leading-6 text-gray-500">{props.description}</p>
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00c471] border-t-transparent" />
    </div>
  )
}

function LoginRequiredView() {
  return (
    <div className="min-h-screen bg-[#0a100f] px-4 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <i className="fas fa-user-lock text-2xl" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">로그인이 필요합니다</h1>
        <p className="mt-3 text-sm leading-7 text-white/70">학습 플레이어는 로그인한 사용자만 이용할 수 있습니다.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a href="/home?auth=login" className="rounded-full bg-[#00c471] px-6 py-3 text-sm font-bold text-white">
            로그인 하기
          </a>
          <a href="/lecture-list" className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white/80">
            강의 목록으로
          </a>
        </div>
      </div>
    </div>
  )
}

function ErrorView(props: { title: string; message: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="min-h-screen bg-[#0a100f] px-4 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
          <i className="fas fa-circle-exclamation text-2xl" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">{props.title}</h1>
        <p className="mt-3 text-sm leading-7 text-white/70">{props.message}</p>
        <div className="mt-8">
          <a href={props.actionHref} className="inline-flex rounded-full bg-[#00c471] px-6 py-3 text-sm font-bold text-white">
            {props.actionLabel}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function LearningPlayerApp() {
  const initialCourseId = useMemo(() => readNumberSearchParam('courseId'), [])
  const initialLessonId = useMemo(() => readNumberSearchParam('lessonId'), [])
  const isStudentPreview = useMemo(() => readStudentPreviewFromLocation(), [])
  const initialTimestampSeconds = useMemo(() => readNonNegativeNumberSearchParam('t'), [])
  const shouldAutoplayPreview = useMemo(() => isStudentPreview && readEnabledSearchParam('autoplay'), [isStudentPreview])

  const [session, setSession] = useState<AuthSession | null>(() => readStoredAuthSession())
  const [course, setCourse] = useState<LearningCourseDetail | null>(null)
  const [courseError, setCourseError] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(initialLessonId)
  const [activeTab, setActiveTab] = useState<TabKey>('qna')
  const [openSectionIds, setOpenSectionIds] = useState<Set<number>>(() => new Set())
  const [notice, setNotice] = useState<string | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [loadingLessonProgressMap, setLoadingLessonProgressMap] = useState(false)
  const [progress, setProgress] = useState<LearningLessonProgress | null>(null)
  const [lessonProgressById, setLessonProgressById] = useState<Record<number, LearningLessonProgress>>({})
  const [playerConfig, setPlayerConfig] = useState<LearningPlayerConfig | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedVideoQuality, setSelectedVideoQuality] = useState<LearningVideoQuality>('1080')
  const [notes, setNotes] = useState<TimestampNote[]>([])
  const [noteContent, setNoteContent] = useState('')
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [noteMessage, setNoteMessage] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [actualDurationByLessonId, setActualDurationByLessonId] = useState<Record<number, number>>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isPipActive, setIsPipActive] = useState(false)
  const [isFrameFullscreen, setIsFrameFullscreen] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectDrag, setSelectDrag] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [qnaTemplates, setQnaTemplates] = useState<QnaQuestionTemplate[]>([])
  const [qnaQuestions, setQnaQuestions] = useState<QnaQuestionSummary[]>([])
  const [qnaDetails, setQnaDetails] = useState<Record<number, QnaQuestionDetail>>({})
  const [loadingQna, setLoadingQna] = useState(false)
  const [qnaError, setQnaError] = useState<string | null>(null)
  const [qnaStatusFilter, setQnaStatusFilter] = useState<QnaStatusFilter>('ALL')
  const [qnaSearch, setQnaSearch] = useState('')
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null)
  const [loadingQuestionId, setLoadingQuestionId] = useState<number | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(createQuestionFormState)
  const [questionMessage, setQuestionMessage] = useState<string | null>(null)
  const [questionBusy, setQuestionBusy] = useState(false)
  const [questionComposerOpen, setQuestionComposerOpen] = useState(false)
  const [openNoteId, setOpenNoteId] = useState<number | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [quizModalLessonId, setQuizModalLessonId] = useState<number | null>(null)
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [quizSelectedOptionIndex, setQuizSelectedOptionIndex] = useState<number | null>(null)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [assignmentModalLessonId, setAssignmentModalLessonId] = useState<number | null>(null)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentSubmissionFormState>(() => createAssignmentFormState())
  const [assignmentSubmitBusy, setAssignmentSubmitBusy] = useState(false)
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null)
  const [assignmentLoadingVisible, setAssignmentLoadingVisible] = useState(false)
  const [assignmentLoadingText, setAssignmentLoadingText] = useState(ASSIGNMENT_LOADING_MESSAGES[0])
  const [assignmentGradingResult, setAssignmentGradingResult] = useState<AssignmentGradingResultState | null>(null)
  const [assignmentHistoryByAssignmentId, setAssignmentHistoryByAssignmentId] = useState<Record<number, SubmissionHistoryItem>>({})
  const [completionProofCard, setCompletionProofCard] = useState<CompletionProofCardState | null>(null)
  const [completionVisible, setCompletionVisible] = useState(false)
  const [completionCardFlipped, setCompletionCardFlipped] = useState(false)
  const [completionBurstKey, setCompletionBurstKey] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const resumeTimeRef = useRef(0)
  const lastRenderedSecondRef = useRef(-1)
  const pendingVideoLoadRef = useRef(false)
  const resumePlaybackAfterQualitySwitchRef = useRef(false)
  const previewAutoplayLessonIdRef = useRef<number | null>(null)
  const completedPersistedLessonIdRef = useRef<number | null>(null)
  const courseCompletionShownRef = useRef<number | null>(null)
  const lessonProgressByIdRef = useRef<Record<number, LearningLessonProgress>>({})
  const quizScoreByLessonIdRef = useRef<Record<number, number>>({})

  const lessons = useMemo(() => (course ? getFlattenedLessons(course) : []), [course])
  const courseProgressPercent = useMemo(() => {
    if (!lessons.length) return 0
    const total = lessons.reduce((sum, item) => {
      const itemProgress = lessonProgressById[item.lessonId]
      return sum + clampPercent(itemProgress?.progressPercent ?? 0)
    }, 0)
    return Math.round(total / lessons.length)
  }, [lessons, lessonProgressById])
  const resolveInitialPlaybackSeconds = useCallback((lessonId: number, fallbackSeconds: number) => {
    if (initialTimestampSeconds === null) {
      return fallbackSeconds
    }

    if (initialLessonId && initialLessonId !== lessonId) {
      return fallbackSeconds
    }

    return initialTimestampSeconds
  }, [initialLessonId, initialTimestampSeconds])

  const lessonLockMap = useMemo(() => {
    const locks = new Map<number, { locked: boolean; prerequisiteLessonId: number | null; prerequisiteLessonTitle: string | null }>()
    if (!course) return locks
    if (isStudentPreview) {
      lessons.forEach((item) => {
        locks.set(item.lessonId, { locked: false, prerequisiteLessonId: null, prerequisiteLessonTitle: null })
      })
      return locks
    }

    let previousLesson: LearningLesson | null = null
    course.sections.forEach((section) => {
      section.lessons.forEach((item) => {
        if (!previousLesson) {
          locks.set(item.lessonId, { locked: false, prerequisiteLessonId: null, prerequisiteLessonTitle: null })
          previousLesson = item
          return
        }

        const previousProgress = lessonProgressById[previousLesson.lessonId]
        locks.set(item.lessonId, {
          locked: !isLessonProgressCompleted(previousProgress),
          prerequisiteLessonId: previousLesson.lessonId,
          prerequisiteLessonTitle: previousLesson.title,
        })
        previousLesson = item
      })
    })

    return locks
  }, [course, isStudentPreview, lessonProgressById, lessons])
  const firstUnlockedLessonId = useMemo(
    () => lessons.find((item) => !lessonLockMap.get(item.lessonId)?.locked)?.lessonId ?? null,
    [lessonLockMap, lessons],
  )
  const lesson = useMemo(
    () => lessons.find((item) => item.lessonId === selectedLessonId) ?? lessons[0] ?? null,
    [lessons, selectedLessonId],
  )
  const selectedLessonIndex = useMemo(
    () => (lesson ? lessons.findIndex((item) => item.lessonId === lesson.lessonId) : -1),
    [lesson, lessons],
  )
  const previousLesson = selectedLessonIndex > 0 ? lessons[selectedLessonIndex - 1] : null
  const nextLesson = selectedLessonIndex >= 0 && selectedLessonIndex < lessons.length - 1 ? lessons[selectedLessonIndex + 1] : null
  const selectedLessonLock = selectedLessonId ? lessonLockMap.get(selectedLessonId) : null
  const selectedLessonLocked = Boolean(selectedLessonLock?.locked)
  const videoQualitySources = useMemo(
    () => (selectedLessonLocked ? {} : resolveVideoQualitySources(lesson, course)),
    [course, lesson, selectedLessonLocked],
  )
  const activeVideoQuality = getAvailableVideoQuality(selectedVideoQuality, videoQualitySources)
  const resolvedVideoUrl = activeVideoQuality ? resolveVideoUrl(videoQualitySources[activeVideoQuality] ?? null) : null
  const shouldResumePlayback = lesson ? !isSampleVideoUrl(videoQualitySources[activeVideoQuality ?? '1080'] ?? lesson.videoUrl) : true
  const selectedLessonAssignment = resolveLessonAssignment(lesson)
  const selectedLessonHasAssignment = Boolean(selectedLessonAssignment)
  const selectedLessonIsQuiz = isQuizLesson(lesson)
  const quizModalLesson = quizModalLessonId ? lessons.find((item) => item.lessonId === quizModalLessonId) ?? null : null
  const quizModalQuestions = useMemo(
    () => (course && quizModalLesson ? buildQuizModalQuestions(course, quizModalLesson) : []),
    [course, quizModalLesson],
  )
  const activeQuizQuestion = quizModalQuestions[quizQuestionIndex] ?? quizModalQuestions[0] ?? null
  const assignmentModalLesson = assignmentModalLessonId ? lessons.find((item) => item.lessonId === assignmentModalLessonId) ?? null : null
  const assignmentModal = resolveLessonAssignment(assignmentModalLesson)
  const assignmentGradingScore = assignmentGradingResult
    ? resolveAssignmentResultScore(assignmentGradingResult.submission)
    : null
  const assignmentGradingPassed = assignmentGradingResult
    ? resolveAssignmentResultPassed(
      assignmentGradingResult.assignment,
      assignmentGradingResult.submission,
    )
    : null
  const assignmentGradingBadge = assignmentGradingResult
    ? resolveAssignmentResultBadge(
      assignmentGradingResult.assignment,
      assignmentGradingResult.submission,
    )
    : null
  const assignmentGradingReportRows = assignmentGradingResult
    ? buildAssignmentResultReportRows(
      assignmentGradingResult.assignment,
      assignmentGradingResult.submission,
      assignmentGradingResult.precheck,
    )
    : []
  const assignmentResultLessonIndex = assignmentGradingResult
    ? lessons.findIndex((item) => item.lessonId === assignmentGradingResult.lessonId)
    : -1
  const assignmentResultNextLesson = assignmentResultLessonIndex >= 0 && assignmentResultLessonIndex < lessons.length - 1
    ? lessons[assignmentResultLessonIndex + 1]
    : null
  const assignmentResultProgressById = useMemo(() => {
    if (!assignmentGradingResult) return lessonProgressById
    const currentProgress = lessonProgressById[assignmentGradingResult.lessonId]
      ?? createDefaultProgress(assignmentGradingResult.lessonId)
    return {
      ...lessonProgressById,
      [assignmentGradingResult.lessonId]: {
        ...currentProgress,
        progressPercent: 100,
        isCompleted: true,
      },
    }
  }, [assignmentGradingResult, lessonProgressById])

  useEffect(() => {
    if (!course || !lesson) return

    const activeSection = course.sections.find((section) => (
      section.lessons.some((item) => item.lessonId === lesson.lessonId)
    ))
    if (!activeSection) return

    setOpenSectionIds((current) => {
      if (current.has(activeSection.sectionId)) return current
      const next = new Set(current)
      next.add(activeSection.sectionId)
      return next
    })
  }, [course, lesson])
  const assignmentResultCompletesCourse = assignmentGradingResult
    ? lessons.length > 0 && lessons.every((item) => isLessonProgressCompleted(assignmentResultProgressById[item.lessonId]))
    : false
  const assignmentResultPrimaryActionLabel = assignmentResultCompletesCourse
    ? '학습 완료 및 증명 카드 발급'
    : assignmentResultNextLesson
      ? '다음 강의로 이동'
      : '계속 학습하기'
  const assignmentResultPrimaryActionIcon = assignmentResultCompletesCourse
    ? 'fa-certificate'
    : assignmentResultNextLesson
      ? 'fa-arrow-right'
      : 'fa-book-open'
  useEffect(() => {
    if (!activeVideoQuality || selectedVideoQuality === activeVideoQuality) return
    setSelectedVideoQuality(activeVideoQuality)
  }, [activeVideoQuality, selectedVideoQuality])
  useEffect(() => {
    if (!course || !lessons.length) return

    const controller = new AbortController()
    lessons.forEach((item) => {
      const sources = resolveVideoQualitySources(item, course)
      const source = sources[selectedVideoQuality] ?? sources['1080'] ?? sources['720'] ?? item.videoUrl
      if (!source) return

      readVideoDuration(resolveVideoUrl(source) ?? source, controller.signal, (durationSeconds) => {
        setActualDurationByLessonId((current) => (
          current[item.lessonId] === durationSeconds
            ? current
            : { ...current, [item.lessonId]: durationSeconds }
        ))
      })
    })

    return () => controller.abort()
  }, [course, lessons, selectedVideoQuality])
  const completionTheme = completionProofCard ? getProofCardTheme(completionProofCard.type) : null
  const completionParticles = useMemo(() => buildCelebrationParticles(completionBurstKey), [completionBurstKey])
  const sessionUserId = session?.userId ?? null
  const selectedAssignmentHistory = selectedLessonAssignment && selectedLessonAssignment.assignmentId > 0
    ? assignmentHistoryByAssignmentId[selectedLessonAssignment.assignmentId] ?? null
    : null
  const courseDetailHref = initialCourseId
    ? `/course-detail?courseId=${course?.courseId ?? initialCourseId}`
    : '/lecture-list'
  const sourceReturnHref = useMemo(() => readOptionalSafeReturnHref(), [])
  const learningBackHref = sourceReturnHref ?? courseDetailHref
  const completionRoadmapReturnHref = sourceReturnHref ?? '/roadmap-hub'
  const studentPreviewReturnHref = useMemo(
    () => readSafeReturnHref(courseDetailHref),
    [courseDetailHref],
  )
  const deferredQnaSearch = useDeferredValue(qnaSearch.trim().toLowerCase())
  const templateOptions = useMemo(
    () => [...qnaTemplates].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [qnaTemplates],
  )
  const selectedTemplate = useMemo(
    () => templateOptions.find((item) => item.templateType === questionForm.templateType) ?? null,
    [questionForm.templateType, templateOptions],
  )
  const visibleQuestions = useMemo(() => (
    qnaQuestions.filter((item) => {
      const answered = isQuestionAnswered(item)
      const statusMatched = qnaStatusFilter === 'ALL'
        || (qnaStatusFilter === 'MINE' && isOwnQnaQuestion(item, sessionUserId))
        || (qnaStatusFilter === 'UNANSWERED' && !answered)
      const searchTarget = [item.authorName, item.title, item.lectureTimestamp ?? '', qnaDetails[item.id]?.content ?? '']
        .join(' ')
        .toLowerCase()
      return statusMatched && (!deferredQnaSearch || searchTarget.includes(deferredQnaSearch))
    })
  ), [deferredQnaSearch, qnaDetails, qnaQuestions, qnaStatusFilter, sessionUserId])

  const getPlaybackLimit = useCallback((video: HTMLVideoElement | null) => {
    // Math.floor 제거 — float 그대로 사용해야 영상 끝에서 강제 정지되지 않음
    const metadataDuration = video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0
    // declaredDuration으로 cap하지 않음 — 실제 영상 길이를 우선
    return metadataDuration || (lesson?.durationSeconds ?? 0)
  }, [lesson?.durationSeconds])

  const mergeLessonProgress = useCallback((
    lessonId: number,
    nextProgress: LearningLessonProgress,
    currentProgress?: LearningLessonProgress | null,
  ) => {
    const wasCompleted = isLessonProgressCompleted(currentProgress)
    const isCompleted = wasCompleted || isLessonProgressCompleted(nextProgress)

    return {
      ...nextProgress,
      lessonId,
      isCompleted,
    }
  }, [])

  const isCourseCompletedByProgress = useCallback((progressByLessonId: Record<number, LearningLessonProgress>) => (
    lessons.length > 0 && lessons.every((item) => isLessonProgressCompleted(progressByLessonId[item.lessonId]))
  ), [lessons])

  const calculateCourseCompletionScore = useCallback((
    progressByLessonId: Record<number, LearningLessonProgress>,
    latestAssignmentResult?: AssignmentGradingResultState | null,
  ) => {
    const quizScores = lessons
      .filter(isQuizLesson)
      .map((item) => {
        const recordedScore = quizScoreByLessonIdRef.current[item.lessonId]
        if (recordedScore !== undefined) return clampPercent(recordedScore)
        return isLessonProgressCompleted(progressByLessonId[item.lessonId]) ? 100 : null
      })
      .filter((score): score is number => score !== null)
    const assignmentScores = new Map<number, number>()

    lessons.forEach((item) => {
      const assignment = resolveLessonAssignment(item)
      if (!assignment || assignment.assignmentId <= 0) return

      const historyScore = resolveAssignmentHistoryScorePercent(
        assignment,
        assignmentHistoryByAssignmentId[assignment.assignmentId],
      )
      if (historyScore !== null) {
        assignmentScores.set(assignment.assignmentId, historyScore)
      }
    })

    if (latestAssignmentResult) {
      const latestScore = resolveAssignmentResultScorePercent(
        latestAssignmentResult.assignment,
        latestAssignmentResult.submission,
      )
      if (latestScore !== null) {
        assignmentScores.set(latestAssignmentResult.assignment.assignmentId, latestScore)
      }
    }

    const assignmentScoreValues = [...assignmentScores.values()]
    const evaluationAverages = [
      quizScores.length ? quizScores.reduce((sum, item) => sum + item, 0) / quizScores.length : null,
      assignmentScoreValues.length
        ? assignmentScoreValues.reduce((sum, item) => sum + item, 0) / assignmentScoreValues.length
        : null,
    ].filter((score): score is number => score !== null)

    if (!evaluationAverages.length) return 0
    return clampPercent(evaluationAverages.reduce((sum, item) => sum + item, 0) / evaluationAverages.length)
  }, [assignmentHistoryByAssignmentId, lessons])

  const openCourseCompletionOverlay = useCallback((
    progressByLessonId: Record<number, LearningLessonProgress>,
    latestAssignmentResult?: AssignmentGradingResultState | null,
  ) => {
    if (!course || !isCourseCompletedByProgress(progressByLessonId)) return
    if (courseCompletionShownRef.current === course.courseId) return

    courseCompletionShownRef.current = course.courseId
    const finalLesson = lessons[lessons.length - 1] ?? null
    const finalAssignment = latestAssignmentResult?.assignment ?? resolveLessonAssignment(finalLesson)
    const score = calculateCourseCompletionScore(progressByLessonId, latestAssignmentResult)
    const proofCard = buildCompletionProofCard(course, finalLesson, finalAssignment, score)

    setCompletionProofCard(proofCard)
    setCompletionCardFlipped(false)
    setCompletionVisible(true)
    setCompletionBurstKey((current) => current + 1)
  }, [calculateCourseCompletionScore, course, isCourseCompletedByProgress, lessons])

  const persistCompletedLesson = useCallback((
    lessonId: number,
    totalSeconds: number,
    options: PersistCompletionOptions = {},
  ) => {
    if (isStudentPreview) return
    if (completedPersistedLessonIdRef.current === lessonId) return
    completedPersistedLessonIdRef.current = lessonId

    const progressSeconds = Math.max(0, Math.floor(totalSeconds))
    const nextProgress: LearningLessonProgress = {
      lessonId,
      progressPercent: 100,
      progressSeconds,
      defaultPlaybackRate: playerConfig?.defaultPlaybackRate ?? 1,
      pipEnabled: playerConfig?.pipEnabled ?? false,
      isCompleted: true,
      lastWatchedAt: new Date().toISOString(),
    }

    setProgress((current) => (current?.lessonId === lessonId ? mergeLessonProgress(lessonId, nextProgress, current) : current))
    const mergedProgress = mergeLessonProgress(lessonId, nextProgress, lessonProgressByIdRef.current[lessonId])
    const nextProgressById = {
      ...lessonProgressByIdRef.current,
      [lessonId]: mergedProgress,
    }
    lessonProgressByIdRef.current = nextProgressById
    setLessonProgressById(nextProgressById)
    if (options.showCourseCompletion !== false) {
      openCourseCompletionOverlay(nextProgressById)
    }
    writeJsonStorage(getProgressStorageKey(lessonId), nextProgress)

    void lessonSessionApi
      .saveProgress(lessonId, { progressPercent: 100, progressSeconds })
      .then((savedProgress) => {
        const mergedSavedProgress = mergeLessonProgress(lessonId, savedProgress, nextProgress)
        setProgress((current) => (current?.lessonId === lessonId ? mergedSavedProgress : current))
        const savedProgressById = {
          ...lessonProgressByIdRef.current,
          [lessonId]: mergeLessonProgress(
            lessonId,
            mergedSavedProgress,
            lessonProgressByIdRef.current[lessonId],
          ),
        }
        lessonProgressByIdRef.current = savedProgressById
        setLessonProgressById(savedProgressById)
        writeJsonStorage(getProgressStorageKey(lessonId), mergedSavedProgress)
      })
      .catch(() => {
        completedPersistedLessonIdRef.current = null
      })
  }, [
    isStudentPreview,
    mergeLessonProgress,
    openCourseCompletionOverlay,
    playerConfig?.defaultPlaybackRate,
    playerConfig?.pipEnabled,
  ])

  useEffect(() => {
    lessonProgressByIdRef.current = lessonProgressById
  }, [lessonProgressById])

  useEffect(() => {
    courseCompletionShownRef.current = null
  }, [course?.courseId])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    if (course && lesson) {
      document.title = `DevPath - ${course.title} | ${lesson.title}`
      syncLearningUrl(course.courseId, lesson.lessonId)
      setAssignmentMessage('파일을 첨부해 주세요.')
      return
    }
    document.title = 'DevPath - 학습 플레이어'
  }, [course, lesson])

  useEffect(() => {
    if (!session) {
      setLoadingCourse(false)
      return
    }
    let cancelled = false

    async function loadCourse() {
      setLoadingCourse(true)
      setCourseError(null)
      if (!initialCourseId) {
        setCourse(null)
        setCourseError('courseId가 없습니다.')
        setLoadingCourse(false)
        return
      }
      try {
        const response = await requestWithTimeout(COURSE_LOAD_TIMEOUT_MS, (signal) => courseApi.getCourseDetail(initialCourseId, signal))
        if (cancelled) return
        const normalizedCourse = normalizeCourseDetail(response)
        const nextLessons = getFlattenedLessons(normalizedCourse)
        if (!nextLessons.length) {
          setCourse(null)
          setCourseError('이 강의에는 공개된 강의 영상이 없습니다.')
          return
        }
        setCourse(normalizedCourse)
        setSelectedLessonId(
          (initialLessonId && nextLessons.some((item) => item.lessonId === initialLessonId))
            ? initialLessonId
            : nextLessons[0].lessonId,
        )
      } catch (error) {
        if (cancelled) return
        setCourse(null)
        setCourseError(isAbortError(error) ? '강의 데이터를 불러오는 데 시간이 초과됐습니다.' : '강의 데이터를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoadingCourse(false)
      }
    }

    void loadCourse()
    return () => { cancelled = true }
  }, [initialCourseId, initialLessonId, session])

  useEffect(() => {
    if (!session || !lessons.length) {
      setLessonProgressById({})
      setLoadingLessonProgressMap(false)
      return
    }

    if (isStudentPreview) {
      setLessonProgressById(Object.fromEntries(
        lessons.map((item) => [item.lessonId, createDefaultProgress(item.lessonId)]),
      ))
      setLoadingLessonProgressMap(false)
      return
    }

    let cancelled = false

    async function loadLessonProgressMap() {
      setLoadingLessonProgressMap(true)
      const progressEntries = await Promise.all(
        lessons.map(async (item) => {
          try {
            const nextProgress = await requestWithTimeout(
              LESSON_LOAD_TIMEOUT_MS,
              (signal) => lessonSessionApi.getProgress(item.lessonId, signal),
            )
            return [item.lessonId, nextProgress] as const
          } catch {
            return [item.lessonId, createDefaultProgress(item.lessonId)] as const
          }
        }),
      )

      if (cancelled) return

      setLessonProgressById(Object.fromEntries(progressEntries))
      setLoadingLessonProgressMap(false)
    }

    void loadLessonProgressMap()
    return () => { cancelled = true }
  }, [isStudentPreview, lessons, session])

  useEffect(() => {
    if (!course || loadingLessonProgressMap || !selectedLessonId) return

    const lockState = lessonLockMap.get(selectedLessonId)
    if (!lockState?.locked) return

    const prerequisiteLessonId = lockState.prerequisiteLessonId
    const nextLessonId = prerequisiteLessonId && !lessonLockMap.get(prerequisiteLessonId)?.locked
      ? prerequisiteLessonId
      : firstUnlockedLessonId ?? lessons[0]?.lessonId ?? null
    if (nextLessonId && nextLessonId !== selectedLessonId) {
      setSelectedLessonId(nextLessonId)
    }
    setNotice(
      lockState.prerequisiteLessonTitle
        ? `"${lockState.prerequisiteLessonTitle}" 강의를 끝까지 보면 열립니다.`
        : '이전 강의를 끝까지 보면 열립니다.',
      )
  }, [course, firstUnlockedLessonId, lessonLockMap, lessons, loadingLessonProgressMap, selectedLessonId])

  useEffect(() => {
    if (isStudentPreview || !sessionUserId) {
      setAssignmentHistoryByAssignmentId({})
      return
    }

    let cancelled = false
    const userId = sessionUserId

    async function loadAssignmentHistory() {
      try {
        const history = await requestWithTimeout(
          LESSON_LOAD_TIMEOUT_MS,
          (signal) => learnerAssignmentApi.getSubmissionHistory(userId, signal),
        )
        if (cancelled) return

        const nextHistoryByAssignmentId = history.submissions.reduce<Record<number, SubmissionHistoryItem>>((acc, item) => {
          const current = acc[item.assignmentId]
          const currentSubmittedAt = current?.submittedAt ?? ''
          const nextSubmittedAt = item.submittedAt ?? ''
          if (!current || nextSubmittedAt > currentSubmittedAt || item.submissionId > current.submissionId) {
            acc[item.assignmentId] = item
          }
          return acc
        }, {})

        setAssignmentHistoryByAssignmentId(nextHistoryByAssignmentId)
      } catch {
        if (!cancelled) setAssignmentHistoryByAssignmentId({})
      }
    }

    void loadAssignmentHistory()
    return () => { cancelled = true }
  }, [isStudentPreview, sessionUserId])

  useEffect(() => {
    if (isStudentPreview) {
      setQnaQuestions([])
      setQnaDetails({})
      setQnaError(null)
      setLoadingQna(false)
      return
    }

    if (!session || !course?.courseId) return
    let cancelled = false
    const courseId = course.courseId

    async function loadQna() {
      setLoadingQna(true)
      setQnaError(null)
      setQnaQuestions([])
      setQnaDetails({})
      setOpenQuestionId(null)
      setQuestionForm(createQuestionFormState())

      const [questionsResult, templatesResult] = await Promise.allSettled([
        requestWithTimeout(QNA_LOAD_TIMEOUT_MS, (signal) => qnaApi.getQuestions(courseId, signal)),
        requestWithTimeout(QNA_LOAD_TIMEOUT_MS, (signal) => qnaApi.getTemplates(signal)),
      ])

      if (cancelled) return

      if (questionsResult.status === 'fulfilled') {
        setQnaQuestions(questionsResult.value)
      } else {
        setQnaQuestions([])
        setQnaError('Q&A 데이터를 불러오지 못했습니다.')
      }

      if (templatesResult.status === 'fulfilled') {
        setQnaTemplates(templatesResult.value)
        setQuestionForm((current) => ({
          ...current,
          templateType: current.templateType || templatesResult.value[0]?.templateType || '',
        }))
      } else {
        setQnaTemplates([])
      }

      setLoadingQna(false)
    }

    void loadQna()
    return () => { cancelled = true }
  }, [course?.courseId, isStudentPreview, session, sessionUserId])

  useEffect(() => {
    if (!lesson || selectedLessonLocked || !isAssignmentLesson(lesson)) {
      setAssignmentModalLessonId(null)
      setAssignmentLoadingVisible(false)
      setAssignmentGradingResult(null)
      return
    }

    const assignment = resolveLessonAssignment(lesson)
    setAssignmentModalLessonId(lesson.lessonId)
    setAssignmentForm(createAssignmentFormState(assignment))
    setAssignmentMessage(null)
    setAssignmentLoadingVisible(false)
    setAssignmentGradingResult(null)
  }, [lesson, selectedLessonLocked])

  useEffect(() => {
    if (!assignmentLoadingVisible) {
      setAssignmentLoadingText(ASSIGNMENT_LOADING_MESSAGES[0])
      return
    }

    setAssignmentLoadingText(ASSIGNMENT_LOADING_MESSAGES[0])
    const timeoutIds = ASSIGNMENT_LOADING_MESSAGES.slice(1).map((message, index) => window.setTimeout(
      () => setAssignmentLoadingText(message),
      800 + (index * 1000),
    ))
    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
  }, [assignmentLoadingVisible])

  useEffect(() => {
    if (!lesson) {
      setProgress(null)
      setPlayerConfig(null)
      setNotes([])
      setDuration(0)
      setCurrentTime(0)
      setIsPipActive(false)
      return
    }
    if (selectedLessonLocked) {
      setProgress(createDefaultProgress(lesson.lessonId))
      setPlayerConfig(createDefaultPlayerConfig(lesson.lessonId))
      setNotes([])
      setDuration(lesson.durationSeconds ?? 0)
      setCurrentTime(0)
      setIsPlaying(false)
      setIsPipActive(false)
      setLoadingLesson(false)
      return
    }
    let cancelled = false

    async function loadLessonState() {
      setLoadingLesson(true)
      setNotice(null)
      setVideoFailed(false)
      setNoteContent('')
      setNoteMessage(null)
      completedPersistedLessonIdRef.current = null

      const storedProgress = readJsonStorage(getProgressStorageKey(lesson.lessonId), createDefaultProgress(lesson.lessonId))
      const storedNotes = readJsonStorage(getNotesStorageKey(lesson.lessonId), [] as TimestampNote[])

      const lessonDuration = lesson.durationSeconds ?? 0
      const storedFullyWatched = lessonDuration > 0 && storedProgress.progressSeconds >= lessonDuration
      const initialProgressSeconds = resolveInitialPlaybackSeconds(
        lesson.lessonId,
        shouldResumePlayback && !storedFullyWatched ? storedProgress.progressSeconds : 0,
      )
      resumeTimeRef.current = initialProgressSeconds
      lastRenderedSecondRef.current = initialProgressSeconds
      setProgress(storedProgress)
      setPlayerConfig(createDefaultPlayerConfig(lesson.lessonId))
      setNotes(storedNotes)
      setCurrentTime(initialProgressSeconds)
      setDuration(lesson.durationSeconds ?? 0)

      if (isStudentPreview) {
        const previewProgress: LearningLessonProgress = {
          ...createDefaultProgress(lesson.lessonId),
          progressPercent: lesson.durationSeconds && lesson.durationSeconds > 0
            ? Math.max(0, Math.min(100, Math.round((initialProgressSeconds / lesson.durationSeconds) * 100)))
            : 0,
          progressSeconds: initialProgressSeconds,
        }
        setProgress(previewProgress)
        setLessonProgressById((current) => ({
          ...current,
          [lesson.lessonId]: previewProgress,
        }))
        setLoadingLesson(false)
        return
      }

      try {
        const [sessionProgress, config, fetchedNotes] = await Promise.all([
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => lessonSessionApi.startSession(lesson.lessonId, signal)),
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => learningPlayerApi.getPlayerConfig(lesson.lessonId, signal)).catch(() => null),
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => lessonNoteApi.getNotes(lesson.lessonId, signal)).catch(() => null),
        ])

        if (cancelled) return

        const nextProgress = {
          ...sessionProgress,
          defaultPlaybackRate: config?.defaultPlaybackRate ?? sessionProgress.defaultPlaybackRate ?? 1,
          pipEnabled: config?.pipEnabled ?? sessionProgress.pipEnabled ?? false,
        }

        const sessionFullyWatched = lessonDuration > 0 && nextProgress.progressSeconds >= lessonDuration
        const nextResumeSeconds = resolveInitialPlaybackSeconds(
          lesson.lessonId,
          shouldResumePlayback && !sessionFullyWatched ? nextProgress.progressSeconds : 0,
        )
        resumeTimeRef.current = nextResumeSeconds
        lastRenderedSecondRef.current = nextResumeSeconds
        setProgress(nextProgress)
        setLessonProgressById((current) => ({
          ...current,
          [lesson.lessonId]: mergeLessonProgress(lesson.lessonId, nextProgress, current[lesson.lessonId]),
        }))
        setPlayerConfig({
          lessonId: lesson.lessonId,
          defaultPlaybackRate: nextProgress.defaultPlaybackRate,
          pipEnabled: nextProgress.pipEnabled,
        })
        setCurrentTime(nextResumeSeconds)
        writeJsonStorage(getProgressStorageKey(lesson.lessonId), nextProgress)

        if (fetchedNotes) {
          setNotes(fetchedNotes)
          writeJsonStorage(getNotesStorageKey(lesson.lessonId), fetchedNotes)
        }
      } catch (error) {
        if (!cancelled && isAbortError(error)) setNotice('강의 상태 불러오기가 오래 걸립니다. 캐시된 값을 표시합니다.')
      } finally {
        if (!cancelled) setLoadingLesson(false)
      }
    }

    void loadLessonState()
    return () => { cancelled = true }
  }, [isStudentPreview, lesson, mergeLessonProgress, resolveInitialPlaybackSeconds, selectedLessonLocked, shouldResumePlayback])

  useEffect(() => {
    const video = videoRef.current
    if (!lesson) return
    if (!video || !resolvedVideoUrl) {
      setDuration(lesson.durationSeconds ?? 0)
      setIsPlaying(false)
      return
    }
    video.playbackRate = playerConfig?.defaultPlaybackRate ?? 1

    const handleLoadedMetadata = () => {
      const total = getPlaybackLimit(video)
      setDuration(total)
      if (total > 0) {
        setActualDurationByLessonId((current) => (
          current[lesson.lessonId] === Math.round(total)
            ? current
            : { ...current, [lesson.lessonId]: Math.round(total) }
        ))
      }
      if ((pendingVideoLoadRef.current || shouldResumePlayback || isStudentPreview) && resumeTimeRef.current > 0 && video.currentTime < 0.5) {
        video.currentTime = Math.min(resumeTimeRef.current, total || resumeTimeRef.current)
      }
    }
    const handleLoadedData = () => {
      setVideoFailed(false)
      if (pendingVideoLoadRef.current) setNotice(null)
      pendingVideoLoadRef.current = false
    }
    const handleCanPlay = () => {
      setVideoFailed(false)
      if (pendingVideoLoadRef.current) setNotice(null)
      pendingVideoLoadRef.current = false

      if (resumePlaybackAfterQualitySwitchRef.current) {
        resumePlaybackAfterQualitySwitchRef.current = false
        void video.play().catch((error) => {
          if (!isPlaybackBlockedError(error) && !isAbortError(error)) {
            setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
          }
        })
        return
      }

      if (!shouldAutoplayPreview || previewAutoplayLessonIdRef.current === lesson.lessonId) {
        return
      }

      previewAutoplayLessonIdRef.current = lesson.lessonId
      void video.play().catch(async (error) => {
        if (!isPlaybackBlockedError(error)) {
          return
        }

        try {
          video.muted = true
          setIsMuted(true)
          await video.play()
          setNotice('브라우저 정책 때문에 음소거 상태로 먼저 재생했습니다. 필요하면 음소거를 해제해 주세요.')
        } catch {
          setNotice('브라우저 자동재생 정책 때문에 재생 버튼을 눌러야 합니다.')
        }
      })
    }
    const handleTimeUpdate = () => {
      const total = getPlaybackLimit(video)
      if (total > 0 && video.currentTime >= total) {
        if (!video.paused) video.pause()
        // 끝에 도달하면 dot이 정확히 끝까지 가도록 total 그대로 사용
        if (total !== lastRenderedSecondRef.current) {
          lastRenderedSecondRef.current = total
          setCurrentTime(total)
        }
        persistCompletedLesson(lesson.lessonId, total)
        return
      }
      const nextSecond = total > 0 ? Math.min(Math.floor(video.currentTime), total) : Math.floor(video.currentTime)
      if (nextSecond === lastRenderedSecondRef.current) return
      lastRenderedSecondRef.current = nextSecond
      setCurrentTime(nextSecond)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      const total = getPlaybackLimit(video)
      if (total > 0) {
        lastRenderedSecondRef.current = total
        setCurrentTime(total)
        persistCompletedLesson(lesson.lessonId, total)
      }
    }
    const handleEnterPip = () => setIsPipActive(true)
    const handleLeavePip = () => setIsPipActive(false)
    const handleError = () => {
      setVideoFailed(true)
      setIsPlaying(false)
      setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('enterpictureinpicture', handleEnterPip)
    video.addEventListener('leavepictureinpicture', handleLeavePip)
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('enterpictureinpicture', handleEnterPip)
      video.removeEventListener('leavepictureinpicture', handleLeavePip)
    }
  }, [getPlaybackLimit, isStudentPreview, lesson, persistCompletedLesson, playerConfig?.defaultPlaybackRate, resolvedVideoUrl, shouldAutoplayPreview, shouldResumePlayback])

  const persistProgress = useEffectEvent(async (lessonId: number) => {
    if (isStudentPreview) return
    if (!lesson || lesson.lessonId !== lessonId) return
    const video = videoRef.current
    const total = getPlaybackLimit(video)
    const currentSeconds = video ? Math.floor(video.currentTime) : Math.floor(currentTime)
    const progressSeconds = total > 0 ? Math.min(currentSeconds, total) : currentSeconds
    const progressPercent = total > 0 ? Math.max(0, Math.min(100, Math.round((progressSeconds / total) * 100))) : 0

    const nextProgress: LearningLessonProgress = {
      lessonId,
      progressPercent,
      progressSeconds,
      defaultPlaybackRate: playerConfig?.defaultPlaybackRate ?? 1,
      pipEnabled: playerConfig?.pipEnabled ?? false,
      isCompleted: progressPercent >= 100,
      lastWatchedAt: new Date().toISOString(),
    }
    const mergedProgress = mergeLessonProgress(lessonId, nextProgress, lessonProgressById[lessonId] ?? progress)
    setProgress(mergedProgress)
    setLessonProgressById((current) => ({
      ...current,
      [lessonId]: mergeLessonProgress(lessonId, mergedProgress, current[lessonId]),
    }))
    writeJsonStorage(getProgressStorageKey(lessonId), mergedProgress)
    try {
      const savedProgress = await lessonSessionApi.saveProgress(lessonId, { progressPercent, progressSeconds })
      const mergedSavedProgress = mergeLessonProgress(lessonId, savedProgress, mergedProgress)
      setProgress((current) => (current?.lessonId === lessonId ? mergedSavedProgress : current))
      setLessonProgressById((current) => ({
        ...current,
        [lessonId]: mergeLessonProgress(lessonId, mergedSavedProgress, current[lessonId]),
      }))
      writeJsonStorage(getProgressStorageKey(lessonId), mergedSavedProgress)
    } catch {
      // 요청 실패 시 캐시된 값 유지
    }
  })

  useEffect(() => {
    if (isStudentPreview) return
    if (!lesson) return
    const lessonId = lesson.lessonId
    const intervalId = window.setInterval(() => void persistProgress(lessonId), 15000)
    const handlePageHide = () => void persistProgress(lessonId)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('pagehide', handlePageHide)
      void persistProgress(lessonId)
    }
  }, [isStudentPreview, lesson])

  useEffect(() => {
    if (!noteMessage && !notice && !questionMessage) return
    const timeoutId = window.setTimeout(() => {
      setNoteMessage(null)
      setNotice(null)
      setQuestionMessage(null)
    }, 2600)
    return () => window.clearTimeout(timeoutId)
  }, [noteMessage, notice, questionMessage])

  // OCR 워커 미리 초기화 (첫 클릭 지연 최소화)
  useEffect(() => { warmupOcrWorker() }, [])

  const handleKeyboardTogglePlay = useEffectEvent(() => {
    void handleTogglePlaySafe()
  })

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFrameFullscreen(document.fullscreenElement === frameRef.current)
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  // ESC 키로 구간 선택 모드 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSelectMode(false)
        setSelectDrag(null)
        return
      }

      if (e.code !== 'Space' && e.key !== ' ') return
      if (!resolvedVideoUrl || selectedLessonIsQuiz || quizModalLessonId || assignmentModalLessonId || completionVisible) return
      if (isNativeKeyboardControlTarget(e.target)) return

      e.preventDefault()
      handleKeyboardTogglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    assignmentModalLessonId,
    completionVisible,
    quizModalLessonId,
    resolvedVideoUrl,
    selectedLessonIsQuiz,
  ])

  async function handleTogglePlaySafe() {
    const video = videoRef.current
    if (!video || !resolvedVideoUrl) return

    if (videoFailed) {
      pendingVideoLoadRef.current = true
      setVideoFailed(false)
      setNotice('영상 재생 준비 중입니다.')
      video.load()
      return
    }

    if (videoFailed) {
      setVideoFailed(false)
      setNotice('영상을 다시 불러오는 중입니다.')
      video.load()
    }

    if (video.paused) {
      const playbackLimit = getPlaybackLimit(video)
      if (playbackLimit > 0 && video.currentTime >= playbackLimit) {
        video.currentTime = 0
        lastRenderedSecondRef.current = 0
        setCurrentTime(0)
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        pendingVideoLoadRef.current = true
        setNotice('영상 재생 준비 중입니다.')
        if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load()
        return
      }

      try {
        await video.play()
        setNotice(null)
      } catch (error) {
        if (isPlaybackBlockedError(error)) {
          try {
            video.muted = true
            setIsMuted(true)
            await video.play()
            setNotice('브라우저 정책 때문에 음소거 상태로 먼저 재생했습니다. 필요하면 음소거를 해제해 주세요.')
            return
          } catch (mutedError) {
            if (!isPlaybackBlockedError(mutedError) && !isAbortError(mutedError)) {
              setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
              return
            }
          }

          setNotice('브라우저 자동 재생 정책 때문에 재생이 막혔습니다. 재생 버튼을 다시 눌러 주세요.')
          return
        }

        if (isAbortError(error)) {
          setNotice('영상을 아직 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')
          return
        }

        setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
      }
      return
    }

    video.pause()
  }

  function handleRetryVideoLoad() {
    const video = videoRef.current
    if (!video || !resolvedVideoUrl) return
    pendingVideoLoadRef.current = true
    setVideoFailed(false)
    setIsPlaying(false)
    setNotice('영상을 다시 불러오는 중입니다.')
    video.load()
  }

  async function handleOcr(region?: ScreenRegion) {
    const video = videoRef.current
    if (!video || ocrBusy) return
    setOcrBusy(true)
    setIsSelectMode(false)
    setSelectDrag(null)
    setNotice(region ? '선택한 영역의 글자를 읽는 중...' : '화면의 글자를 읽는 중...')
    try {
      const { text, confidence, source } = await captureAndOcr(video, region, (msg) => setNotice(msg))
      if (!text.trim()) {
        setNotice(`${formatOcrSourceLabel(source)} · 인식한 글자가 없습니다.`)
        return
      }
      await navigator.clipboard.writeText(text)
      setNotice(`인식한 글자를 복사했습니다. ${formatOcrSourceLabel(source)} · 인식률 ${confidence.toFixed(0)}%`)
    } catch (err) {
      setNotice(`글자를 읽지 못했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setOcrBusy(false)
    }
  }

  function handleToggleMute() {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setIsMuted(next)
  }

  function handleVolumeChange(next: number) {
    const video = videoRef.current
    if (!video) return
    video.volume = next
    video.muted = next === 0
    setVolume(next)
    setIsMuted(next === 0)
  }

  function handleSeek(nextSeconds: number) {
    const video = videoRef.current
    if (!video) return
    const upperBound = getPlaybackLimit(video) || (lesson?.durationSeconds ?? 0) || nextSeconds
    const bounded = Math.max(0, Math.min(upperBound, nextSeconds))
    video.currentTime = bounded
    lastRenderedSecondRef.current = Math.floor(bounded)
    setCurrentTime(Math.floor(bounded))
  }

  function markLessonCompletedForNavigation(item: LearningLesson, options?: PersistCompletionOptions) {
    const totalSeconds = Math.max(1, duration || item.durationSeconds || 1)
    persistCompletedLesson(item.lessonId, totalSeconds, options)
  }

  function openAssignmentModal(item: LearningLesson) {
    if (!isAssignmentLesson(item)) return
    setAssignmentModalLessonId(item.lessonId)
    setAssignmentForm(createAssignmentFormState(resolveLessonAssignment(item)))
    setAssignmentMessage(null)
    setAssignmentLoadingVisible(false)
    setAssignmentGradingResult(null)
  }

  function closeAssignmentModal() {
    setAssignmentModalLessonId(null)
    setAssignmentForm(createAssignmentFormState())
    setAssignmentMessage(null)
    setAssignmentLoadingVisible(false)
  }

  function closeAssignmentGradingResult() {
    setAssignmentGradingResult(null)
  }

  function openCompletionOverlay() {
    if (!course || !assignmentGradingResult) {
      closeAssignmentGradingResult()
      return
    }

    openCourseCompletionOverlay(assignmentResultProgressById, assignmentGradingResult)
    closeAssignmentGradingResult()
  }

  function closeCompletionOverlay() {
    setCompletionVisible(false)
    setCompletionCardFlipped(false)
  }

  function handleAssignmentResultPrimaryAction() {
    if (assignmentResultCompletesCourse) {
      openCompletionOverlay()
      return
    }

    if (!assignmentResultNextLesson || selectedLessonLocked) {
      closeAssignmentGradingResult()
      return
    }

    closeAssignmentGradingResult()
    setSelectedLessonId(assignmentResultNextLesson.lessonId)
    setNotice(`"${assignmentResultNextLesson.title}" 강의로 이동했습니다.`)
  }

  function openQuizModal(item: LearningLesson) {
    setQuizModalLessonId(item.lessonId)
    setQuizQuestionIndex(0)
    setQuizSelectedOptionIndex(null)
    setQuizFeedback(null)
  }

  function closeQuizModal() {
    setQuizModalLessonId(null)
    setQuizQuestionIndex(0)
    setQuizSelectedOptionIndex(null)
    setQuizFeedback(null)
  }

  function handleSelectLesson(lessonId: number) {
    const lockState = lessonLockMap.get(lessonId)
    if (lockState?.locked) {
      setNotice(
        lockState.prerequisiteLessonTitle
          ? `"${lockState.prerequisiteLessonTitle}" 강의를 끝까지 보면 열립니다.`
          : '이전 강의를 끝까지 보면 열립니다.',
      )
      return
    }

    const targetLesson = lessons.find((item) => item.lessonId === lessonId) ?? null
    setSelectedLessonId(lessonId)
    if (!targetLesson || targetLesson.lessonId !== quizModalLessonId) {
      closeQuizModal()
    }
    if (!targetLesson || targetLesson.lessonId !== assignmentModalLessonId) {
      closeAssignmentModal()
    }
    setAssignmentLoadingVisible(false)
    setAssignmentGradingResult(null)
  }

  function handlePreviousLesson() {
    if (!previousLesson) return
    setSelectedLessonId(previousLesson.lessonId)
    closeQuizModal()
    closeAssignmentModal()
    closeAssignmentGradingResult()
    setAssignmentLoadingVisible(false)
  }

  function handleNextLesson() {
    if (!lesson || !nextLesson || selectedLessonLocked) return
    markLessonCompletedForNavigation(lesson)
    setSelectedLessonId(nextLesson.lessonId)
    setNotice(`"${nextLesson.title}" 강의를 열었습니다.`)
    closeQuizModal()
    closeAssignmentModal()
    closeAssignmentGradingResult()
    setAssignmentLoadingVisible(false)
  }

  function handleQuizOptionSelect(optionIndex: number) {
    setQuizSelectedOptionIndex(optionIndex)
    setQuizFeedback(null)
  }

  function handleQuizCheckAnswer() {
    if (!activeQuizQuestion) return
    if (quizSelectedOptionIndex === null) {
      setNotice('답안을 선택해 주세요.')
      return
    }
    setQuizFeedback(quizSelectedOptionIndex === activeQuizQuestion.correctOptionIndex ? 'correct' : 'wrong')
  }

  function handleQuizNextQuestion() {
    if (!quizModalLesson || !activeQuizQuestion || quizFeedback !== 'correct') {
      handleQuizCheckAnswer()
      return
    }

    if (quizQuestionIndex < quizModalQuestions.length - 1) {
      setQuizQuestionIndex((current) => current + 1)
      setQuizSelectedOptionIndex(null)
      setQuizFeedback(null)
      return
    }

    const currentQuizLessonIndex = lessons.findIndex((item) => item.lessonId === quizModalLesson.lessonId)
    const nextSectionFirstLesson = currentQuizLessonIndex >= 0
      ? lessons.slice(currentQuizLessonIndex + 1).find((item) => item.sectionId !== quizModalLesson.sectionId) ?? null
      : null

    quizScoreByLessonIdRef.current = {
      ...quizScoreByLessonIdRef.current,
      [quizModalLesson.lessonId]: 100,
    }
    markLessonCompletedForNavigation(quizModalLesson)
    if (nextSectionFirstLesson) {
      setSelectedLessonId(nextSectionFirstLesson.lessonId)
      closeQuizModal()
      setNotice(`"${nextSectionFirstLesson.sectionTitle}" 섹션의 첫 강의로 이동했습니다.`)
      return
    }

    closeQuizModal()
    setNotice('퀴즈를 완료했습니다. 마지막 섹션입니다.')
  }

  function handleAssignmentFilesSelected(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? [])
    setAssignmentForm((current) => {
      const mergedFiles = [...current.files]
      nextFiles.forEach((file) => {
        const existingIndex = mergedFiles.findIndex((item) => item.name === file.name && item.size === file.size)
        if (existingIndex >= 0) mergedFiles[existingIndex] = file
        else mergedFiles.push(file)
      })
      return { ...current, files: mergedFiles }
    })
    setAssignmentMessage(null)
  }

  function handleAssignmentFileRemove(fileName: string) {
    setAssignmentForm((current) => ({
      ...current,
      files: current.files.filter((file) => file.name !== fileName),
    }))
    setAssignmentMessage(null)
  }

  async function handleAssignmentSubmit() {
    if (isStudentPreview) {
      setAssignmentMessage('미리보기에서는 과제를 제출할 수 없습니다.')
      return
    }

    if (!sessionUserId) {
      setAssignmentMessage('로그인이 필요합니다.')
      return
    }
    if (!assignmentModal || !assignmentModalLesson) return
    if (assignmentModal.assignmentId <= 0) {
      setAssignmentMessage('이 강의에는 아직 연결된 과제 제출 스키마가 없습니다.')
      return
    }

    if (assignmentForm.files.length === 0) {
      setAssignmentMessage('파일을 첨부해 주세요.')
      return
    }

    const payload = {
      submissionText: '',
      submissionUrl: '',
      hasReadme: true,
      testPassed: true,
      lintPassed: true,
      files: buildSubmissionFiles(assignmentForm.files),
    }

    setAssignmentSubmitBusy(true)
    setAssignmentMessage('파일을 제출하는 중입니다.')

    try {
      const precheck = await learnerAssignmentApi.precheck(assignmentModal.assignmentId, sessionUserId, payload)
      if (!precheck.passed) {
        const failedLabels = [
          precheck.readmePassed ? null : 'README',
          precheck.testPassed ? null : '테스트',
          precheck.lintPassed ? null : '린트',
          precheck.fileFormatPassed ? null : '파일 형식',
        ].filter((item): item is string => Boolean(item))
        setAssignmentMessage(
          failedLabels.length
            ? `제출 조건을 충족하지 않았습니다. ${failedLabels.join(', ')}`
            : (precheck.message ?? '제출 파일을 다시 확인해 주세요.'),
        )
        return
      }

      setAssignmentLoadingVisible(true)
      const submission = await learnerAssignmentApi.submit(assignmentModal.assignmentId, sessionUserId, payload)
      setAssignmentHistoryByAssignmentId((current) => ({
        ...current,
        [submission.assignmentId]: {
          submissionId: submission.submissionId,
          assignmentId: submission.assignmentId,
          assignmentTitle: assignmentModal.title,
          submissionStatus: submission.submissionStatus,
          qualityScore: submission.qualityScore,
          totalScore: submission.totalScore,
          isLate: submission.isLate,
          submittedAt: submission.submittedAt,
        },
      }))
      setAssignmentMessage('과제가 제출되었습니다.')
      setAssignmentGradingResult({
        lessonId: assignmentModalLesson.lessonId,
        lessonTitle: assignmentModalLesson.title,
        assignment: assignmentModal,
        precheck,
        submission,
      })
      markLessonCompletedForNavigation(assignmentModalLesson, { showCourseCompletion: false })
      closeAssignmentModal()
    } catch (error) {
      setAssignmentMessage(error instanceof Error ? error.message : '과제 제출에 실패했습니다.')
    } finally {
      setAssignmentSubmitBusy(false)
      setAssignmentLoadingVisible(false)
    }
  }

  async function handleTogglePip() {
    const pipDocument = document as PipDocument
    const video = videoRef.current as PipVideoElement | null
    if (!video) return

    // 브라우저 PIP 미지원
    if (!pipDocument.pictureInPictureEnabled || !video.requestPictureInPicture) {
      setNotice('이 브라우저는 PIP 모드를 지원하지 않습니다.')
      return
    }

    try {
      if (pipDocument.pictureInPictureElement) {
        // 현재 PIP 활성 → 종료
        if (pipDocument.exitPictureInPicture) await pipDocument.exitPictureInPicture()
      } else {
        // 영상 메타데이터 로드 확인 (readyState 0=HAVE_NOTHING)
        if (video.readyState < 1) {
          setNotice('영상이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.')
          return
        }
        await video.requestPictureInPicture()
      }
      // 상태는 enterpictureinpicture / leavepictureinpicture 이벤트로 자동 반영
      // 백엔드에 선호 설정 저장
      if (lesson) {
        learningPlayerApi.updatePipMode(lesson.lessonId, !isPipActive).catch(() => {})
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setNotice('영상을 먼저 재생한 뒤 PIP 모드를 사용해 주세요.')
      } else {
        setNotice('PIP 모드 전환에 실패했습니다.')
      }
    }
  }

  async function handleToggleFullscreen() {
    const frame = frameRef.current
    if (!frame) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await frame.requestFullscreen()
    } catch {
      setNotice('전체 화면 전환에 실패했습니다.')
    }
  }

  async function handleCyclePlaybackRate() {
    if (!lesson || !playerConfig) return
    const currentIndex = PLAYER_SPEEDS.indexOf(playerConfig.defaultPlaybackRate as (typeof PLAYER_SPEEDS)[number])
    const nextRate = PLAYER_SPEEDS[(currentIndex + 1 + PLAYER_SPEEDS.length) % PLAYER_SPEEDS.length]
    setPlayerConfig({ ...playerConfig, defaultPlaybackRate: nextRate })
    if (videoRef.current) videoRef.current.playbackRate = nextRate
    try {
      await learningPlayerApi.updatePlaybackRate(lesson.lessonId, nextRate)
    } catch {
      // 로컬 설정 유지
    }
  }

  async function handleSetPlaybackRate(nextRate: number) {
    if (!lesson || !playerConfig) return
    setPlayerConfig({ ...playerConfig, defaultPlaybackRate: nextRate })
    setSettingsOpen(false)
    if (videoRef.current) videoRef.current.playbackRate = nextRate
    try {
      await learningPlayerApi.updatePlaybackRate(lesson.lessonId, nextRate)
    } catch {
      // Keep the local setting if persistence fails.
    }
  }

  function handleSetVideoQuality(nextQuality: LearningVideoQuality) {
    const nextSource = videoQualitySources[nextQuality]
    if (!nextSource) {
      setNotice(`${nextQuality}p 영상 소스가 이 강의에 등록되어 있지 않습니다.`)
      return
    }

    if (activeVideoQuality === nextQuality) {
      setSettingsOpen(false)
      return
    }

    const video = videoRef.current
    if (video) {
      const restoreSecond = Math.max(0, Math.floor(video.currentTime || currentTime))
      resumeTimeRef.current = restoreSecond
      lastRenderedSecondRef.current = restoreSecond
      resumePlaybackAfterQualitySwitchRef.current = !video.paused
      pendingVideoLoadRef.current = true
      setVideoFailed(false)
      setNotice(`${nextQuality}p로 전환 중입니다.`)
    }

    setSelectedVideoQuality(nextQuality)
    setSettingsOpen(false)
  }

  async function handleToggleQuestion(questionId: number) {
    setOpenQuestionId((current) => (current === questionId ? null : questionId))
    if (qnaDetails[questionId] || loadingQuestionId === questionId) return
    setLoadingQuestionId(questionId)
    try {
      const detail = await qnaApi.getQuestionDetail(questionId)
      setQnaDetails((current) => ({ ...current, [questionId]: detail }))
      setQnaQuestions((current) => current.map((item) => (item.id === questionId ? toQuestionSummary(detail) : item)))
    } catch {
      setQnaError('질문 상세 정보를 불러오지 못했습니다.')
    } finally {
      setLoadingQuestionId((current) => (current === questionId ? null : current))
    }
  }

  async function handleSaveNote() {
    if (!lesson || !noteContent.trim()) return
    try {
      const created = await lessonNoteApi.createNote(lesson.lessonId, {
        timestampSecond: Math.floor(currentTime),
        content: noteContent.trim(),
      })
      const nextNotes = [...notes, created].sort((a, b) => a.timestampSecond - b.timestampSecond)
      setNotes(nextNotes)
      writeJsonStorage(getNotesStorageKey(lesson.lessonId), nextNotes)
      setNoteContent('')
      setNoteComposerOpen(false)
      setNoteMessage('노트가 저장되었습니다.')
    } catch {
      setNoteMessage('노트 저장에 실패했습니다.')
    }
  }

  async function handleDeleteNote(note: TimestampNote) {
    if (!lesson) return
    try {
      await lessonNoteApi.deleteNote(lesson.lessonId, note.noteId)
      const nextNotes = notes.filter((item) => item.noteId !== note.noteId)
      setNotes(nextNotes)
      writeJsonStorage(getNotesStorageKey(lesson.lessonId), nextNotes)
      setNoteMessage('노트가 삭제되었습니다.')
    } catch {
      setNoteMessage('노트 삭제에 실패했습니다.')
    }
  }

  async function handleUpdateNote() {
    if (!lesson || !openNoteId || !editingNoteContent.trim()) return
    const targetNote = notes.find((item) => item.noteId === openNoteId)
    if (!targetNote) return
    try {
      const updated = await lessonNoteApi.updateNote(lesson.lessonId, openNoteId, {
        timestampSecond: targetNote.timestampSecond,
        content: editingNoteContent.trim(),
      })
      const nextNotes = notes.map((item) => (item.noteId === updated.noteId ? updated : item))
      setNotes(nextNotes)
      writeJsonStorage(getNotesStorageKey(lesson.lessonId), nextNotes)
      setOpenNoteId(null)
      setEditingNoteContent('')
      setNoteMessage('노트가 수정되었습니다.')
    } catch {
      setNoteMessage('노트 수정에 실패했습니다.')
    }
  }

  async function handleSubmitQuestion() {
    if (isStudentPreview) {
      setQuestionMessage('미리보기에서는 질문을 등록할 수 없습니다.')
      return
    }

    if (!course) {
      setQuestionMessage('강의 정보를 불러온 뒤 다시 시도해 주세요.')
      return
    }
    if (!sessionUserId) {
      setQuestionMessage('로그인이 필요합니다.')
      return
    }
    if (!questionForm.templateType) {
      setQuestionMessage('질문 템플릿을 불러온 뒤 다시 시도해 주세요.')
      return
    }
    const content = questionForm.content.trim()
    if (!content) {
      setQuestionMessage('질문 내용을 입력해 주세요.')
      return
    }
    const title = questionForm.title.trim()
      || content.split('\n')[0].trim().slice(0, 48)
      || `질문 ${formatTime(currentTime)}`

    const payload: CreateQnaQuestionRequest = {
      templateType: questionForm.templateType,
      difficulty: questionForm.difficulty,
      title,
      content,
      courseId: course.courseId,
      lessonId: lesson?.lessonId ?? null,
      lectureTimestamp: questionForm.attachTimestamp ? formatTime(currentTime) : null,
    }

    setQuestionBusy(true)
    try {
      const created = await qnaApi.createQuestion(payload, sessionUserId)
      setQnaDetails((current) => ({ ...current, [created.id]: created }))
      setQnaQuestions((current) => [toQuestionSummary(created), ...current.filter((item) => item.id !== created.id)])
      setQuestionForm((current) => ({ ...current, title: '', content: '' }))
      setQuestionMessage('질문이 등록되었습니다.')
      startTransition(() => {
        setActiveTab('qna')
        setOpenQuestionId(created.id)
      })
      setQuestionComposerOpen(false)
    } catch (error) {
      setQuestionMessage(error instanceof Error ? error.message : '질문 등록에 실패했습니다.')
    } finally {
      setQuestionBusy(false)
    }
  }

  // ─── Early returns ────────────────────────────────────────────────
  if (!session) return <LoginRequiredView />

  if (!loadingCourse && courseError) {
    return (
      <ErrorView
        title="학습 페이지를 열 수 없습니다"
        message={courseError}
        actionHref={courseDetailHref}
        actionLabel={initialCourseId ? '강의 상세로 돌아가기' : '강의 목록으로'}
      />
    )
  }

  if (!course || !lesson) return <LoadingOverlay />

  // ─── Derived render values ────────────────────────────────────────
  const hasVideoSource = Boolean(resolvedVideoUrl) && !selectedLessonIsQuiz
  const showVideoErrorOverlay = hasVideoSource && videoFailed
  const activeQuestionSummary = openQuestionId
    ? qnaQuestions.find((item) => item.id === openQuestionId) ?? null
    : null
  const activeQuestionDetail = openQuestionId ? qnaDetails[openQuestionId] ?? null : null
  const sortedNotes = [...notes].sort((left, right) => right.timestampSecond - left.timestampSecond)
  const activeNote = openNoteId ? notes.find((item) => item.noteId === openNoteId) ?? null : null
  const playbackMax = Math.max(duration, 1)
  const playbackProgressPercent = Math.min(100, Math.max(0, (currentTime / playbackMax) * 100))

  return (
    <div className="learning-player-surface h-screen flex flex-col overflow-hidden">

      {/* 상단 헤더 */}
      <header className="learning-player-top-header bg-gray-900 text-white h-14 flex items-center justify-between px-6 shrink-0 z-50 border-b border-gray-800">
        <div className="learning-player-top-header-left flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => window.location.assign(isStudentPreview ? studentPreviewReturnHref : learningBackHref)}
            className="learning-player-back-link text-gray-400 hover:text-white transition text-sm shrink-0"
          >
            <i className="learning-player-back-icon fas fa-chevron-left mr-2" />
            {isStudentPreview ? '질문 게시판으로 돌아가기' : '로드맵으로 돌아가기'}
          </button>
          <div className="learning-player-header-divider h-4 w-[1px] bg-gray-700 shrink-0" />
          <span className="learning-player-header-title text-sm font-bold text-gray-100 truncate" title={lesson.title}>{lesson.title}</span>
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
          <div className="learning-player-video-stage w-full h-full relative flex items-center justify-center bg-gray-900">
            {hasVideoSource ? (
              <>
                <video
                  key={`${lesson.lessonId}-${activeVideoQuality ?? 'source'}`}
                  ref={videoRef}
                  src={resolvedVideoUrl ?? undefined}
                  poster={lesson.thumbnailUrl ?? course.thumbnailUrl ?? undefined}
                  className="learning-player-video-element w-full h-full object-cover"
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
                        {getVideoErrorMessage(videoRef.current, resolvedVideoUrl)}
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
                <div className="learning-player-video-title absolute top-6 left-6 text-white/80 font-bold text-xl drop-shadow-md">
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
                <h2 className="mt-6 text-2xl font-semibold">
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
                  <div className="absolute bottom-full right-0 mb-4 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex flex-col overflow-hidden animate-fade-in z-50">
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
      <aside className="learning-player-sidebar w-[400px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-40 relative">

        {/* 탭 버튼 */}
        <div className="learning-player-tab-buttons flex border-b border-gray-200 shrink-0" id="tab-buttons">
          {(['curriculum', 'qna', 'notes'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveTab(key)
                if (key !== 'qna') setOpenQuestionId(null)
              }}
              className={activeTab === key
                ? 'learning-player-tab-button is-active tab-btn flex-1 py-4 text-sm font-bold text-[#00C471] border-b-2 border-[#00C471] bg-green-50/50 transition'
                : 'learning-player-tab-button tab-btn flex-1 py-4 text-sm font-medium text-gray-500 hover:text-gray-800 border-b-2 border-transparent transition'}
            >
              {key === 'curriculum' ? '커리큘럼' : key === 'qna' ? 'Q&A' : '노트'}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="learning-player-tab-panel-shell flex-1 overflow-hidden relative bg-gray-50/30 flex flex-col">
          {loadingLesson ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00C471] border-t-transparent" />
            </div>
          ) : null}

          {/* 커리큘럼 탭 */}
          {activeTab === 'curriculum' ? (
            <div className="learning-player-tab-content learning-curriculum-panel tab-content h-full overflow-y-auto custom-scrollbar p-4 animate-fade-in">
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
                      <div className={`accordion-content bg-gray-50 border-t border-gray-100 ${sectionOpen ? 'open' : ''}`}>
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
            <div className="learning-player-tab-content learning-qna-panel tab-content block h-full relative overflow-hidden">
              <div className="learning-qna-list-view absolute inset-0 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-gray-50/30 transition-transform duration-300">
                <div className="learning-qna-list-header mb-4 flex items-center justify-between">
                  <h3 className="learning-qna-list-title font-bold text-gray-900 text-lg">질문 및 답변</h3>
                  <span className="learning-qna-total-count text-sm text-gray-500">총 {visibleQuestions.length}개</span>
                </div>
                <div className="learning-qna-search-wrap relative mb-4 shrink-0">
                  <input
                    type="text"
                    value={qnaSearch}
                    onChange={(event) => setQnaSearch(event.target.value)}
                    className="learning-qna-search-input w-full border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
                    placeholder="궁금한 내용을 검색해보세요."
                  />
                  <i className="learning-qna-search-icon fas fa-search absolute left-3.5 top-3.5 text-gray-400" />
                </div>
                <div className="learning-qna-filter-row flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-1 shrink-0">
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
                        ? 'learning-qna-filter-button is-active qna-filter-btn px-3.5 py-1.5 text-xs font-bold rounded-full bg-gray-900 text-white transition shrink-0'
                        : 'learning-qna-filter-button qna-filter-btn px-3.5 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition shrink-0'}
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
                      className="learning-qna-empty-state"
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
            <div className="learning-player-tab-content learning-note-panel tab-content h-full overflow-y-auto custom-scrollbar p-6 animate-fade-in">
              <div className="learning-note-header flex justify-between items-center mb-6">
                <h3 className="learning-note-title font-bold text-gray-900 text-lg">내 노트</h3>
                <button
                  type="button"
                  onClick={() => setNoteComposerOpen((current) => !current)}
                  className="learning-note-add-button text-[#00C471] hover:text-green-600 text-sm font-bold transition flex items-center"
                >
                  <i className="fas fa-plus mr-1" />
                  새 노트
                </button>
              </div>
              {noteComposerOpen ? (
                <div className="learning-note-composer bg-white border border-[#00C471] rounded-xl p-4 shadow-sm mb-6 animate-fade-in-up">
                  <div className="learning-note-composer-meta flex items-center gap-2 mb-3">
                    <span className="learning-note-composer-time bg-green-100 text-[#00C471] text-xs font-bold px-2 py-1 rounded">{formatTime(currentTime)}</span>
                    <span className="learning-note-composer-help text-xs text-gray-500">현재 재생 시간에 추가됩니다.</span>
                  </div>
                  <textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    className="learning-note-composer-textarea w-full h-24 p-3 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] resize-none"
                    placeholder="강의를 들으며 중요한 점을 메모해보세요."
                  />
                  <div className="learning-note-composer-actions flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNoteComposerOpen(false)}
                      className="learning-note-composer-cancel px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveNote()}
                      disabled={!noteContent.trim()}
                      className="learning-note-composer-save px-4 py-2 text-sm font-bold text-white bg-[#00C471] rounded-lg hover:bg-green-600 shadow-sm transition disabled:cursor-not-allowed disabled:bg-emerald-300"
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

              <div className="learning-note-list space-y-4 pb-20">
                {sortedNotes.length ? (
                  sortedNotes.map((note) => (
                    <div key={note.noteId} className="learning-note-card p-4 border border-gray-200 bg-white shadow-sm rounded-xl hover:border-gray-300 transition">
                      <div className="flex justify-between items-center mb-2">
                        <button
                          type="button"
                          onClick={() => handleSeek(note.seekSecond ?? note.timestampSecond)}
                          className="learning-note-card-time text-xs text-[#00C471] font-bold bg-green-50 px-2 py-1 rounded cursor-pointer hover:bg-green-100"
                        >
                          <i className="fas fa-play mr-1" />
                          {note.timestampLabel || formatTime(note.timestampSecond)}
                        </button>
                        <div className="learning-note-card-actions flex gap-3 text-gray-400">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenNoteId(note.noteId)
                              setEditingNoteContent(note.content)
                            }}
                            className="learning-note-card-action hover:text-gray-600"
                            aria-label="노트 수정"
                          >
                            <i className="fas fa-pen text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteNote(note)}
                            className="learning-note-card-action hover:text-red-400"
                            aria-label="노트 삭제"
                          >
                            <i className="fas fa-trash text-xs" />
                          </button>
                        </div>
                      </div>
                      <p className="learning-note-card-content text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                ) : !noteComposerOpen ? (
                  <div className="learning-note-empty-state animate-fade-in">
                    <div className="learning-note-empty-icon">
                      <i className="far fa-file-alt" />
                    </div>
                    <h3 className="learning-note-empty-title">작성된 강의 노트가 없습니다</h3>
                    <p className="learning-note-empty-description">
                      강의를 시청하면서 중요하거나 나중에 다시 보고 싶은 핵심 내용들을 실시간으로 기록해보세요.
                    </p>
                    <button
                      type="button"
                      onClick={() => setNoteComposerOpen(true)}
                      className="learning-note-empty-button"
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
        <div className={`learning-qna-bottom-question-bar absolute bottom-0 left-0 w-full p-4 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 transition-transform duration-300 ${
          activeQuestionSummary ? 'translate-y-full pointer-events-none' : 'translate-y-0'
        }`}>
          <button
            type="button"
            onClick={() => setQuestionComposerOpen(true)}
            className="learning-qna-bottom-question-button w-full bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-md hover:shadow-lg transform active:scale-95 flex justify-center items-center gap-2"
          >
            <i className="learning-qna-bottom-question-icon far fa-comment-dots" /> 커뮤니티에 질문하기
          </button>
        </div>
      </aside>

      </div>

      {/* ── Q&A 모달 ── */}
      {questionComposerOpen ? (
        <div className="learning-question-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="learning-question-modal-panel w-[90%] max-w-[500px] overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl transform transition-all">
            <div className="learning-question-modal-header flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h3 className="learning-question-modal-title text-lg font-bold text-gray-800">새로운 질문 작성</h3>
              <button
                type="button"
                onClick={() => setQuestionComposerOpen(false)}
                className="learning-question-modal-close text-gray-400 transition hover:text-gray-600"
                aria-label="질문 작성 닫기"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>
            <div className="learning-question-modal-body p-6">
              <div className="learning-question-modal-field mb-4">
                <label className="learning-question-modal-label mb-1 block text-sm font-medium text-gray-700">제목</label>
                <input
                  type="text"
                  value={questionForm.title}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, title: event.target.value }))}
                  className="learning-question-modal-input w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
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
              <div className="learning-question-modal-field mb-2">
                <label className="learning-question-modal-label mb-1 block text-sm font-medium text-gray-700">내용</label>
                <textarea
                  value={questionForm.content}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, content: event.target.value }))}
                  className="learning-question-modal-textarea h-32 w-full resize-none rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
                  placeholder="어떤 부분이 이해가 안 되시나요? 구체적으로 적어주시면 더 좋은 답변을 받을 수 있습니다."
                />
              </div>
              <label className="learning-question-modal-attach mb-6 flex cursor-pointer items-center gap-2 rounded bg-gray-50 p-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={questionForm.attachTimestamp}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, attachTimestamp: event.target.checked }))}
                  className="learning-question-modal-checkbox rounded border-gray-300 accent-[#00C471]"
                />
                현재 재생 시간({formatTime(currentTime)}) 첨부하기
              </label>
              {/* eslint-disable-next-line no-constant-condition, no-constant-binary-expression */}
              {false && selectedTemplate?.description ? (
                <p className="mb-3 text-xs leading-5 text-gray-500">{selectedTemplate?.description}</p>
              ) : null}
              {questionMessage ? (
                <p className="learning-question-modal-message mb-3 text-xs font-medium text-gray-500">{questionMessage}</p>
              ) : null}
              <div className="learning-question-modal-actions flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuestionComposerOpen(false)}
                  className="learning-question-modal-cancel rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitQuestion()}
                  disabled={questionBusy || !templateOptions.length}
                  className="learning-question-modal-submit rounded-lg bg-[#00C471] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
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

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700">파일 첨부</label>
                <label className="group block cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center transition hover:border-[#00C471] hover:bg-green-50">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => handleAssignmentFilesSelected(event.target.files)}
                  />
                  <i className="fas fa-cloud-upload-alt mb-3 text-4xl text-gray-300 transition group-hover:text-[#00C471]" />
                  <p className="text-sm font-bold text-gray-600 transition group-hover:text-[#00C471]">
                    여기를 눌러 파일을 업로드
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
                disabled={assignmentSubmitBusy || assignmentForm.files.length === 0}
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
          className="fixed inset-0 z-[115] flex items-center justify-center bg-black/60 px-4"
          onClick={closeAssignmentGradingResult}
        >
          <div
            className="modal-enter flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex flex-col items-center border-b border-gray-100 bg-gray-50 p-8 text-center">
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

            <div className="bg-white p-6">
              <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
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

              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <i className="fas fa-clipboard-check text-gray-400" />
                  자동 검증 리포트
                </h4>
                <div className="space-y-3 rounded-xl bg-gray-900 p-4 text-xs text-gray-300 shadow-inner">
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
            </div>

            <div className="border-t border-gray-100 bg-gray-50 p-6">
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
                className="completion-confetti-piece"
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
            <div className="completion-fade-enter mb-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C471]/30 bg-[#00C471]/20 px-3 py-1 text-sm font-semibold text-[#00C471]">
                <i className="fas fa-crown" /> 학습 완료
              </div>
              <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">수고하셨습니다!</h1>
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">
                <span className="completion-proof-text font-bold text-white">"{completionProofCard.title}"</span> 강의를 성공적으로 완료했습니다.
              </p>
            </div>

            <div className="mx-auto h-[450px] w-full max-w-[320px] perspective">
              <div
                className={`${completionCardFlipped ? 'flipped ' : ''}completion-card group h-full w-full cursor-pointer`}
                onClick={() => setCompletionCardFlipped((current) => !current)}
              >
                <div className="card-inner relative rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.45)]">
                  <div className="card-front flex flex-col bg-white">
                    <div className={`relative flex h-44 flex-col justify-between bg-gradient-to-br ${completionTheme.frontGradientClassName} p-6`}>
                      <div className="flex items-start justify-between">
                        <span className="rounded border border-white/10 bg-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                          {completionTheme.badgeLabel}
                        </span>
                      </div>
                      <i className={`${completionTheme.iconClassName} absolute bottom-[-10px] right-[-10px] text-8xl text-white/10`} />
                      <div className="relative z-10 text-left text-white">
                        <h3 className="completion-proof-front-title mb-1 text-2xl font-semibold tracking-tight">{completionProofCard.frontTitle}</h3>
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

                  <div className="card-back flex flex-col bg-gray-900 p-6 text-left text-white">
                    <div className="mb-4 border-b border-gray-700 pb-4">
                      <h3 className="completion-proof-back-title text-lg font-bold text-white">{completionProofCard.title}</h3>
                      <p className="completion-proof-description mt-1 text-xs leading-relaxed text-gray-400">{completionProofCard.description}</p>
                    </div>
                    <div className="flex-1">
                      <p className={`mb-3 text-[10px] font-bold uppercase tracking-wider ${completionTheme.markerClassName}`}>
                        검증된 세부 역량
                      </p>
                      <ul className="space-y-2.5 text-sm text-gray-300">
                        {completionProofCard.verifiedSkills.map((item) => (
                          <li key={`${completionProofCard.title}-${item}`} className="flex items-start gap-2">
                            <i className="fas fa-check mt-0.5 text-[10px] text-[#00C471]" />
                            <span className="completion-proof-list-text">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-5 border-t border-gray-700 pt-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">완료 섹션</div>
                      <div className="completion-proof-section-title mt-2 text-sm font-bold text-white">{completionProofCard.sectionTitle}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="completion-fade-enter-delay mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => { window.location.href = completionRoadmapReturnHref }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-8 py-3.5 font-bold text-white transition hover:bg-gray-700 sm:w-auto"
              >
                <i className="fas fa-map-marked-alt" /> 로드맵으로 돌아가기
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/learning-log-gallery' }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C471] px-8 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(0,196,113,0.3)] transition hover:-translate-y-1 hover:bg-green-600 sm:w-auto"
              >
                <i className="fas fa-file-signature" /> 내 증명 카드 보기
              </button>
            </div>
            <p className="completion-fade-enter-delay mt-6 text-xs text-gray-500">
              이 완료 카드는 현재 강의 진행률과 제출된 과제 결과를 기준으로 생성됩니다.
            </p>
            <button
              type="button"
              onClick={closeCompletionOverlay}
              className="completion-fade-enter-delay mt-6 text-xs font-bold text-gray-400 transition hover:text-white"
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
                  const showCorrect = quizFeedback === 'correct' && optionIndex === activeQuizQuestion.correctOptionIndex
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
                  <i className={`fas ${quizFeedback === 'correct' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`} />
                  {quizFeedback === 'correct'
                    ? `정답입니다. ${activeQuizQuestion.explanation}`
                    : '정답이 아닙니다. 다시 한번 선택해 주세요.'}
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
          className="learning-note-edit-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => { setOpenNoteId(null); setEditingNoteContent('') }}
        >
          <div
            className="learning-note-edit-modal-panel bg-white rounded-2xl w-[90%] max-w-[450px] shadow-2xl overflow-hidden transform transition-all"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="learning-note-edit-modal-header px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="learning-note-edit-modal-title text-base font-bold text-gray-800">강의 노트 수정</h3>
              <button
                type="button"
                onClick={() => { setOpenNoteId(null); setEditingNoteContent('') }}
                className="learning-note-edit-modal-close text-gray-400 hover:text-gray-600 transition"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            <div className="learning-note-edit-modal-body p-6">
              <div className="learning-note-edit-modal-meta flex items-center gap-2 mb-3">
                <span className="learning-note-edit-modal-time bg-green-100 text-[#00C471] text-xs font-bold px-2 py-1 rounded">
                  {activeNote.timestampLabel || formatTime(activeNote.timestampSecond)}
                </span>
                <span className="learning-note-edit-modal-help text-xs text-gray-500">해당 시간에 작성한 메모 내용을 수정합니다.</span>
              </div>

              <div className="learning-note-edit-modal-field mb-4">
                <textarea
                  value={editingNoteContent}
                  onChange={(event) => setEditingNoteContent(event.target.value)}
                  className="learning-note-edit-modal-textarea w-full h-32 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471] resize-none"
                  placeholder="수정할 내용을 입력하세요."
                />
              </div>

              {noteMessage ? (
                <p className="learning-note-edit-modal-message text-[11px] font-medium text-gray-500">{noteMessage}</p>
              ) : null}

              <div className="learning-note-edit-modal-actions flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setOpenNoteId(null); setEditingNoteContent('') }}
                  className="learning-note-edit-modal-cancel px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpdateNote()}
                  disabled={!editingNoteContent.trim()}
                  className="learning-note-edit-modal-submit px-4 py-2.5 text-sm font-bold text-white bg-[#00C471] rounded-lg hover:bg-green-600 transition shadow-md disabled:cursor-not-allowed disabled:bg-emerald-300"
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
}
