import type { AssignmentPrecheckResponse,AssignmentSubmissionResponse,CreateSubmissionRequest,LearningCourseDetail,LearningLesson,LearningLessonAssignment,LearningLessonProgress,LearningPlayerConfig,LearningVideoQuality,LearningVideoSource,SubmissionHistoryItem } from '../../types/learning'
import type { QnaDifficulty,QnaQuestionDetail,QnaQuestionSummary } from '../../types/qna'
import { formatDateLabel,type FlattenedLesson } from './learning-player-support'


export type TabKey = 'curriculum' | 'qna' | 'notes'
export type QnaStatusFilter = 'ALL' | 'MINE' | 'UNANSWERED'
export type QnaRealtimeEvent = {
  type?: string
  courseId?: number
  questionId?: number
  answerId?: number
  occurredAt?: string
}
export type QuestionFormState = {
  templateType: string
  difficulty: QnaDifficulty
  title: string
  content: string
  attachTimestamp: boolean
}

export type QuizModalQuestion = {
  label: string
  questionText: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

export type AssignmentSubmissionFormState = {
  submissionText: string
  submissionUrl: string
  files: File[]
  hasReadme: boolean
  testPassed: boolean
  lintPassed: boolean
}

export type AssignmentGradingResultState = {
  lessonId: number
  lessonTitle: string
  assignment: LearningLessonAssignment
  precheck: AssignmentPrecheckResponse
  submission: AssignmentSubmissionResponse
}

export type ProofCardType = 'language' | 'cs' | 'framework' | 'backend'

export type CompletionProofCardState = {
  type: ProofCardType
  title: string
  frontTitle: string
  sectionTitle: string
  description: string
  issuedAt: string
  score: number
  verifiedSkills: string[]
}

export type PersistCompletionOptions = {
  showCourseCompletion?: boolean
}

export type CelebrationParticle = {
  id: number
  left: number
  delay: number
  duration: number
  rotate: number
  size: number
  color: string
}

export type PipDocument = Document & {
  pictureInPictureElement?: Element | null
  pictureInPictureEnabled?: boolean
  exitPictureInPicture?: () => Promise<void>
}

export type PipVideoElement = HTMLVideoElement & {
  requestPictureInPicture?: () => Promise<unknown>
}

export const COURSE_LOAD_TIMEOUT_MS = 20000
export const LESSON_LOAD_TIMEOUT_MS = 6000
export const QNA_LOAD_TIMEOUT_MS = 6000
export const STUDENT_PREVIEW_QUERY_VALUE = 'student'
export const ASSIGNMENT_LOADING_MESSAGES = [
  '코드 및 스크립트 검사 중...',
  '제출된 파일을 실행하고 있습니다...',
  '루브릭 기준에 맞춰 최종 점수 계산 중...',
]
export const SUBMISSION_FILE_TEXT_LIMIT = 200_000
export const TEXT_REVIEW_FILE_EXTENSIONS = new Set([
  'js',
  'jsx',
  'ts',
  'tsx',
  'java',
  'py',
  'kt',
  'html',
  'css',
  'scss',
  'json',
  'md',
  'txt',
  'xml',
  'yml',
  'yaml',
  'sql',
  'sh',
  'bat',
  'ps1',
])

export function isAbortError(error: unknown) {
  return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError'
}

export function isPlaybackBlockedError(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

export function isNativeKeyboardControlTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.closest('input, textarea, select, button, a[href], [contenteditable="true"]') !== null
}

export function resolveVideoUrl(src: string | null) {
  if (!src) return null
  try {
    return new URL(src, window.location.origin).toString()
  } catch {
    return src
  }
}

export function getVideoErrorMessage(video: HTMLVideoElement | null, src: string | null) {
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

export function isSampleVideoUrl(src: string | null) {
  if (!src) return false
  return src.startsWith('/samples/')
}

export const VIDEO_QUALITY_OPTIONS = ['1080', '720'] as const satisfies readonly LearningVideoQuality[]

export type VideoQualitySources = Partial<Record<LearningVideoQuality, string>>

export function normalizeVideoQuality(value: unknown): LearningVideoQuality | null {
  const match = String(value ?? '').match(/(1080|720)/)
  if (!match) return null
  return VIDEO_QUALITY_OPTIONS.includes(match[1] as LearningVideoQuality) ? (match[1] as LearningVideoQuality) : null
}

export function readVideoSourceUrl(value: unknown) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return null

  const candidate = value as Partial<LearningVideoSource>
  return candidate.url ?? candidate.src ?? candidate.videoUrl ?? candidate.href ?? null
}

export function addVideoQualitySource(sources: VideoQualitySources, quality: unknown, url: unknown) {
  const normalizedQuality = normalizeVideoQuality(quality)
  const sourceUrl = readVideoSourceUrl(url) ?? (typeof url === 'string' ? url : null)
  if (!normalizedQuality || !sourceUrl || sources[normalizedQuality]) return
  sources[normalizedQuality] = sourceUrl
}

export function collectVideoQualitySources(target: unknown, sources: VideoQualitySources) {
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

export function deriveVideoQualityUrl(url: string | null | undefined, targetQuality: LearningVideoQuality) {
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

export function resolveVideoQualitySources(lesson: LearningLesson | null, course: LearningCourseDetail | null) {
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

export function getAvailableVideoQuality(preferredQuality: LearningVideoQuality, sources: VideoQualitySources) {
  if (sources[preferredQuality]) return preferredQuality
  return VIDEO_QUALITY_OPTIONS.find((quality) => Boolean(sources[quality])) ?? null
}

export function formatOcrSourceLabel(source: string) {
  if (/python/i.test(source)) return 'Python OCR'
  if (/tesseract|local|로컬/i.test(source)) return '로컬 OCR'
  if (/claude/i.test(source)) return 'Claude Vision'
  return source || 'OCR'
}

export function readVideoDuration(source: string, signal: AbortSignal, onDuration: (durationSeconds: number) => void) {
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

export async function requestWithTimeout<T>(timeoutMs: number, executor: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await executor(controller.signal)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function buildQnaRealtimeWebSocketUrl(courseId: number, accessToken: string) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || window.location.origin
  const url = new URL('/ws/qna', apiBaseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('courseId', String(courseId))
  url.searchParams.set('token', accessToken)
  return url.toString()
}

export function createDefaultPlayerConfig(lessonId: number): LearningPlayerConfig {
  return { lessonId, defaultPlaybackRate: 1, pipEnabled: false }
}

export function readStudentPreviewFromLocation() {
  return new URLSearchParams(window.location.search).get('preview') === STUDENT_PREVIEW_QUERY_VALUE
}

export function readNonNegativeNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function readEnabledSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  return value === '1' || value === 'true'
}

export function readOptionalSafeReturnHref() {
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

export function readSafeReturnHref(fallbackHref: string) {
  return readOptionalSafeReturnHref() ?? fallbackHref
}

export function createQuestionFormState(): QuestionFormState {
  return { templateType: '', difficulty: 'MEDIUM', title: '', content: '', attachTimestamp: true }
}

export function createAssignmentFormState(assignment?: LearningLessonAssignment | null): AssignmentSubmissionFormState {
  return {
    submissionText: '',
    submissionUrl: '',
    files: [],
    hasReadme: !assignment?.readmeRequired,
    testPassed: !assignment?.testRequired,
    lintPassed: !assignment?.lintRequired,
  }
}

export function resolveAssignmentSubmissionMethods(assignment: LearningLessonAssignment | null | undefined) {
  return {
    allowText: Boolean(assignment?.allowTextSubmission),
    allowFile: Boolean(assignment?.allowFileSubmission),
    allowUrl: Boolean(assignment?.allowUrlSubmission),
  }
}

export function isAssignmentSubmissionFormReady(
  assignment: LearningLessonAssignment | null | undefined,
  form: AssignmentSubmissionFormState,
) {
  const methods = resolveAssignmentSubmissionMethods(assignment)
  return (
    (methods.allowText && form.submissionText.trim().length > 0) ||
    (methods.allowUrl && form.submissionUrl.trim().length > 0) ||
    (methods.allowFile && form.files.length > 0)
  )
}

export async function buildAssignmentSubmissionPayload(
  assignment: LearningLessonAssignment,
  form: AssignmentSubmissionFormState,
): Promise<CreateSubmissionRequest> {
  const methods = resolveAssignmentSubmissionMethods(assignment)
  return {
    submissionText: methods.allowText ? form.submissionText.trim() : '',
    submissionUrl: methods.allowUrl ? form.submissionUrl.trim() : '',
    hasReadme: true,
    testPassed: true,
    lintPassed: true,
    files: methods.allowFile ? await buildSubmissionFiles(form.files) : [],
  }
}

export function resolveAssignmentSubmissionEmptyMessage(assignment: LearningLessonAssignment | null | undefined) {
  const methods = resolveAssignmentSubmissionMethods(assignment)
  const labels = [
    methods.allowText ? '텍스트 코드 직접 입력' : null,
    methods.allowFile ? '파일 업로드' : null,
    methods.allowUrl ? '외부 링크 제출' : null,
  ].filter((item): item is string => Boolean(item))

  if (!labels.length) return '강사가 허용한 제출 방식이 없습니다.'
  return `${labels.join(', ')} 중 하나로 제출 내용을 입력해 주세요.`
}

export function resolveAssignmentReviewFeedback(submission: AssignmentSubmissionResponse | null | undefined) {
  return submission?.individualFeedback?.trim() || submission?.commonFeedback?.trim() || null
}

export function isQuestionAnswered(question: Pick<QnaQuestionSummary, 'qnaStatus' | 'adoptedAnswerId' | 'answerCount'>) {
  return question.qnaStatus === 'ANSWERED' || Boolean(question.adoptedAnswerId) || question.answerCount > 0
}

export function isOwnQnaQuestion(
  question: Pick<QnaQuestionSummary, 'authorId'> | null | undefined,
  userId: number | null | undefined,
) {
  return Boolean(userId && question?.authorId === userId)
}

export function hasLessonAssignment(item: LearningLesson | null | undefined): item is LearningLesson & { assignment: LearningLessonAssignment } {
  return Boolean(item?.assignment?.assignmentId)
}

export function isAssignmentLesson(item: LearningLesson | null | undefined) {
  if (!item) return false
  return hasLessonAssignment(item) || item.lessonType?.toUpperCase() === 'CODING'
}

export function resolveLessonAssignment(item: LearningLesson | null | undefined): LearningLessonAssignment | null {
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

export function isQuizLesson(item: LearningLesson | null | undefined): boolean {
  if (!item) return false
  return item.lessonType?.toUpperCase() !== 'VIDEO' && /퀴즈|quiz/i.test(item.title)
}

export function isLessonProgressCompleted(item: LearningLessonProgress | null | undefined) {
  return Boolean(item?.isCompleted) || (item?.progressPercent ?? 0) >= 100
}

export function isReadableSubmissionFile(file: File, extension: string) {
  return (
    file.size <= SUBMISSION_FILE_TEXT_LIMIT &&
    (file.type.startsWith('text/') || TEXT_REVIEW_FILE_EXTENSIONS.has(extension))
  )
}

export async function readSubmissionFileText(file: File, extension: string) {
  if (!isReadableSubmissionFile(file, extension)) return null
  try {
    return await file.text()
  } catch {
    return null
  }
}

export async function buildSubmissionFiles(files: File[]) {
  return Promise.all(files.map(async (file) => {
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
    return {
      fileName: file.name,
      fileUrl: `local-upload://${encodeURIComponent(file.name)}`,
      fileSize: file.size,
      fileType: extension,
      textContent: await readSubmissionFileText(file, extension),
    }
  }))
}

export function resolveAssignmentResultScore(submission: AssignmentSubmissionResponse) {
  return submission.totalScore ?? null
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function resolveAssignmentMaxScore(assignment: LearningLessonAssignment | null | undefined) {
  return assignment?.totalScore && assignment.totalScore > 0 ? assignment.totalScore : 100
}

export function normalizeScorePercent(score: number | null | undefined, maxScore: number | null | undefined) {
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

export function resolveAssignmentResultScorePercent(
  assignment: LearningLessonAssignment | null | undefined,
  submission: AssignmentSubmissionResponse,
) {
  if (submission.totalScore !== null && submission.totalScore !== undefined) {
    return normalizeScorePercent(submission.totalScore, resolveAssignmentMaxScore(assignment))
  }
  return null
}

export function resolveAssignmentHistoryScorePercent(
  assignment: LearningLessonAssignment,
  history: SubmissionHistoryItem | null | undefined,
) {
  if (!history) return null
  if (history.totalScore !== null && history.totalScore !== undefined) {
    return normalizeScorePercent(history.totalScore, resolveAssignmentMaxScore(assignment))
  }
  return null
}

export function resolveAssignmentResultPassed(
  assignment: LearningLessonAssignment,
  submission: AssignmentSubmissionResponse,
) {
  const score = resolveAssignmentResultScore(submission)
  if (score === null || assignment.passScore === null) return null
  return score >= assignment.passScore
}

export function resolveAssignmentResultBadge(
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

export function buildAssignmentResultReportRows(
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

export function formatShortDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

export const PROOF_CARD_TEXT_LIMITS = {
  description: 112,
  skill: 30,
  titleTopic: 28,
} as const
export const COURSE_127_DEMO_COURSE_ID = 127

export function normalizeProofCardText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

export function isCourse127DemoCourse(course: LearningCourseDetail | null | undefined) {
  return course?.courseId === COURSE_127_DEMO_COURSE_ID
}

export function limitProofCardText(value: string | null | undefined, maxLength: number, fallback = '') {
  const normalized = normalizeProofCardText(value) || normalizeProofCardText(fallback)
  if (!normalized) return ''

  const characters = Array.from(normalized)
  if (characters.length <= maxLength) return normalized

  return `${characters.slice(0, Math.max(0, maxLength - 3)).join('').trimEnd()}...`
}

export function takeProofCardTitleBeforeDelimiter(value: string, delimiter: string) {
  const delimiterIndex = value.indexOf(delimiter)
  if (delimiterIndex < 0) return value

  const prefix = normalizeProofCardText(value.slice(0, delimiterIndex))
  return Array.from(prefix).length >= 2 ? prefix : value
}

export function takeProofCardTitleBeforeColon(value: string) {
  const colonIndex = value.includes(':') ? value.indexOf(':') : value.indexOf('：')
  if (colonIndex < 0) return value

  const prefix = normalizeProofCardText(value.slice(0, colonIndex))
  const prefixLength = Array.from(prefix).length
  return prefixLength >= 2 && prefixLength <= PROOF_CARD_TEXT_LIMITS.titleTopic ? prefix : value
}

export function fitProofCardTitleWithoutEllipsis(value: string, maxLength: number) {
  const normalized = normalizeProofCardText(value)
  if (Array.from(normalized).length <= maxLength) return normalized

  const fitted = normalized.split(' ').reduce((current, word) => {
    const next = current ? `${current} ${word}` : word
    return Array.from(next).length <= maxLength ? next : current
  }, '')

  if (fitted) return fitted
  return Array.from(normalized).slice(0, maxLength).join('').trimEnd()
}

export function buildConciseProofCardTitle(value: string | null | undefined, fallback = '학습 완료') {
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

export function inferProofCardType(
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

export function getProofCardTheme(type: ProofCardType) {
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

export function buildCompletionSkills(
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

export function buildCompletionProofCard(
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

export function buildCelebrationParticles(seed: number): CelebrationParticle[] {
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

export function buildQuizModalQuestions(lesson: LearningLesson): QuizModalQuestion[] {
  const configuredQuestions = (lesson.quiz?.questions ?? [])
    .map((question, index) => {
      const options = (question.options ?? []).filter((option) => option.optionText.trim())
      const correctOptionIndex =
        question.correctOptionId == null
          ? -1
          : options.findIndex((option) => option.optionId === question.correctOptionId)
      const supportedQuestionType = question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'TRUE_FALSE'
      if (!supportedQuestionType || options.length < 2 || correctOptionIndex < 0) {
        return null
      }

      return {
        label: `문항 ${index + 1}`,
        questionText: question.questionText,
        options: options.map((option) => option.optionText),
        correctOptionIndex,
        explanation: question.explanation?.trim() || '강의 내용을 바탕으로 정답 근거를 다시 확인해 보세요.',
      }
    })
    .filter((question): question is QuizModalQuestion => question !== null)

  if (configuredQuestions.length > 0) {
    return configuredQuestions
  }

  return [
    {
      label: '렌더링 흐름',
      questionText: '브라우저가 HTML과 CSS를 해석해 화면을 그리기 전까지의 흐름으로 가장 적절한 것은 무엇인가요?',
      options: [
        'HTML 파싱, DOM 생성, CSSOM 생성, 렌더 트리 구성, 레이아웃과 페인트 순서로 이어진다.',
        'CSSOM을 먼저 만들고 HTML은 화면에 그린 뒤 나중에 DOM으로 바꾼다.',
        'JavaScript가 실행되면 DOM과 CSSOM 없이 바로 픽셀이 그려진다.',
        'Vite가 브라우저의 렌더링 엔진을 대신 실행한다.',
      ],
      correctOptionIndex: 0,
      explanation: 'DOM과 CSSOM이 결합되어 렌더 트리가 만들어진 뒤 레이아웃과 페인트가 진행됩니다.',
    },
    {
      label: 'DOM 변경',
      questionText: 'JavaScript가 버튼 클릭 이벤트에서 DOM의 텍스트와 클래스를 바꾸면 어떤 일이 일어날 수 있나요?',
      options: [
        '변경된 DOM과 스타일을 기준으로 스타일 재계산, 레이아웃 또는 페인트가 다시 일어날 수 있다.',
        'JavaScript는 렌더링 이후에는 화면에 아무 영향도 줄 수 없다.',
        'DOM 변경은 항상 서버를 다시 시작해야만 화면에 반영된다.',
        '클래스 변경은 HTML 구조와 스타일 계산에 영향을 주지 않는다.',
      ],
      correctOptionIndex: 0,
      explanation: 'DOM이나 클래스 변경은 스타일 재계산과 레이아웃 또는 페인트를 다시 유발할 수 있습니다.',
    },
    {
      label: 'Vite 역할',
      questionText: 'Vite는 브라우저 렌더링 엔진을 바꾸는 도구다.',
      options: [
        '참',
        '거짓',
      ],
      correctOptionIndex: 1,
      explanation: 'Vite는 개발 서버와 번들링 도구이며 브라우저의 렌더링 엔진 자체를 바꾸지는 않습니다.',
    },
  ]
}

export function formatRelativeTime(value: string | null) {
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

export function toQuestionSummary(question: QnaQuestionDetail): QnaQuestionSummary {
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
