import { useEffect, useState } from 'react'
import { ErrorCard, LoadingCard } from '../../account/ui'
import { instructorCourseApi, userApi } from '../../lib/api'
import type { LearningCourseDetail, LearningLesson, LearningSection } from '../../types/learning'
import type { TechTag } from '../../types/learner'
import { buildLessonEditorHref } from '../course-editor/editor-routing'

type PersistedCourseStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
type LessonKind = 'lecture' | 'quiz' | 'assignment'

type EditorJobCard = {
  localId: string
  name: string
  nameEn: string
  description: string
  keywords: string
}

type EditorLesson = {
  localId: string
  lessonId?: number
  title: string
  kind: LessonKind
  description: string
  videoUrl: string
  durationSeconds: string
  isPreview: boolean
  isPublished: boolean
}

type EditorSection = {
  localId: string
  sectionId?: number
  title: string
  description: string
  isPublished: boolean
  lessons: EditorLesson[]
}

type PreparedLesson = {
  localId: string
  lessonId?: number
  title: string
  kind: LessonKind
  description: string | null
  videoUrl: string | null
  durationSeconds: number | null
  isPreview: boolean
  isPublished: boolean
}

type PreparedSection = {
  localId: string
  sectionId?: number
  title: string
  description: string | null
  isPublished: boolean
  lessons: PreparedLesson[]
}

type SaveToastState = {
  message: string
  persistent: boolean
}

const SAVE_TOAST_DURATION_MS = 2200
const INSTRUCTOR_HEADER_HEIGHT_PX = 64
const EDITOR_ACTION_BUTTONS_STICKY_TOP_PX = INSTRUCTOR_HEADER_HEIGHT_PX + 8
const EDITOR_ACTION_BUTTONS_STACK_SPACE_PX = 72
const EDITOR_SIDE_CARD_STICKY_TOP_PX = EDITOR_ACTION_BUTTONS_STICKY_TOP_PX + EDITOR_ACTION_BUTTONS_STACK_SPACE_PX

const lessonKindMeta: Record<
  LessonKind,
  {
    containerTone: string
    icon: string
    iconTone: string
    buttonTone: string
    buttonLabel: string
    placeholder: string
  }
> = {
  lecture: {
    containerTone: 'bg-white border-gray-200 hover:border-gray-300',
    icon: 'fas fa-play-circle',
    iconTone: 'text-gray-400',
    buttonTone: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
    buttonLabel: '영상 업로드',
    placeholder: '강의 제목 입력',
  },
  quiz: {
    containerTone: 'bg-purple-50 border-purple-100 hover:border-purple-200',
    icon: 'fas fa-question-circle',
    iconTone: 'text-purple-500',
    buttonTone: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    buttonLabel: '상세 설정 (AI)',
    placeholder: '퀴즈 제목 입력',
  },
  assignment: {
    containerTone: 'bg-orange-50 border-orange-100 hover:border-orange-200',
    icon: 'fas fa-file-code',
    iconTone: 'text-orange-500',
    buttonTone: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    buttonLabel: '내용 편집',
    placeholder: '과제 제목 입력',
  },
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function createEmptyJobCard(): EditorJobCard {
  return { localId: createLocalId('job'), name: '', nameEn: '', description: '', keywords: '' }
}

function createLesson(kind: LessonKind): EditorLesson {
  return {
    localId: createLocalId('lesson'),
    title: '',
    kind,
    description: '',
    videoUrl: '',
    durationSeconds: '',
    isPreview: false,
    isPublished: true,
  }
}

function createSection(): EditorSection {
  return {
    localId: createLocalId('section'),
    title: '',
    description: '',
    isPublished: true,
    lessons: [createLesson('lecture'), createLesson('quiz'), createLesson('assignment')],
  }
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

function parsePriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

function parseDurationInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

function normalizeTagName(value: string) {
  return value.trim().replace(/^#/, '').toLowerCase()
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function lessonKindToApiType(kind: LessonKind) {
  switch (kind) {
    case 'quiz':
      return 'reading'
    case 'assignment':
      return 'coding'
    default:
      return 'video'
  }
}

function getFallbackLessonTitle(kind: LessonKind) {
  switch (kind) {
    case 'quiz':
      return '새 퀴즈'
    case 'assignment':
      return '새 과제'
    default:
      return ''
  }
}

function getPreparedLessonTitle(lesson: Pick<EditorLesson, 'title' | 'kind'>) {
  return lesson.title.trim() || getFallbackLessonTitle(lesson.kind)
}

function apiTypeToLessonKind(value: string | null | undefined): LessonKind {
  switch (value) {
    case 'READING':
      return 'quiz'
    case 'CODING':
      return 'assignment'
    default:
      return 'lecture'
  }
}

function parseJobCard(raw: string): EditorJobCard {
  const card = createEmptyJobCard()
  const segments = raw.split(';').map((item) => item.trim())
  const jobNamePrefixes = ['직무명:', '직무명', '吏곷Т紐?']
  const englishNamePrefixes = ['영문명:', '영문명', '?곷Ц紐?']
  const descriptionPrefixes = ['설명:', '?ㅻ챸:']
  const keywordPrefixes = ['키워드:', '키워드', '?ㅼ썙??']

  if (!segments.some((item) => jobNamePrefixes.some((prefix) => item.startsWith(prefix)))) {
    card.description = raw
    return card
  }

  for (const segment of segments) {
    const jobNamePrefix = jobNamePrefixes.find((prefix) => segment.startsWith(prefix))
    const englishNamePrefix = englishNamePrefixes.find((prefix) => segment.startsWith(prefix))
    const descriptionPrefix = descriptionPrefixes.find((prefix) => segment.startsWith(prefix))
    const keywordPrefix = keywordPrefixes.find((prefix) => segment.startsWith(prefix))

    if (jobNamePrefix) {
      card.name = segment.replace(jobNamePrefix, '').trim()
    } else if (englishNamePrefix) {
      card.nameEn = segment.replace(englishNamePrefix, '').trim()
    } else if (descriptionPrefix) {
      card.description = segment.replace(descriptionPrefix, '').trim()
    } else if (keywordPrefix) {
      card.keywords = segment.replace(keywordPrefix, '').trim()
    }
  }

  return card
}

function serializeJobCard(card: EditorJobCard) {
  const values = [card.name, card.nameEn, card.description, card.keywords].map((item) => item.trim())
  return values.every((item) => !item)
    ? null
    : `직무명: ${values[0] || '-'}; 영문명: ${values[1] || '-'}; 설명: ${values[2] || '-'}; 키워드: ${values[3] || '-'}`
}

function getStatusChip(status: PersistedCourseStatus | null) {
  switch (status) {
    case 'PUBLISHED':
      return { label: '공개 중', tone: 'bg-emerald-100 text-emerald-700' }
    case 'IN_REVIEW':
      return { label: '심사 중', tone: 'bg-blue-100 text-blue-700' }
    default:
      return { label: '작성 중', tone: 'bg-gray-200 text-gray-600' }
  }
}

function getCourseIdFromUrl() {
  const rawValue = new URLSearchParams(window.location.search).get('courseId')
  if (!rawValue) {
    return null
  }
  const nextValue = Number(rawValue)
  return Number.isFinite(nextValue) ? nextValue : null
}

function getAssetLabel(value: string, emptyLabel: string) {
  if (!value.trim()) {
    return emptyLabel
  }

  try {
    const url = new URL(value)
    return url.pathname.split('/').filter(Boolean).pop() || value
  } catch {
    return value
  }
}

function mapLesson(lesson: LearningLesson): EditorLesson {
  return {
    localId: createLocalId('lesson'),
    lessonId: lesson.lessonId,
    title: lesson.title,
    kind: apiTypeToLessonKind(lesson.lessonType),
    description: lesson.description ?? '',
    videoUrl: lesson.videoUrl ?? '',
    durationSeconds: lesson.durationSeconds ? String(lesson.durationSeconds) : '',
    isPreview: Boolean(lesson.isPreview),
    isPublished: lesson.isPublished !== false,
  }
}

function mapSection(section: LearningSection): EditorSection {
  return {
    localId: createLocalId('section'),
    sectionId: section.sectionId,
    title: section.title,
    description: section.description ?? '',
    isPublished: section.isPublished !== false,
    lessons: section.lessons.map(mapLesson),
  }
}

function prepareSections(sections: EditorSection[]) {
  return sections
    .map<PreparedSection>((section, sectionIndex) => ({
      localId: section.localId,
      sectionId: section.sectionId,
      title: section.title.trim() || `섹션 ${sectionIndex + 1}`,
      description: section.description.trim() || null,
      isPublished: section.isPublished,
      lessons: section.lessons
        .map<PreparedLesson>((lesson) => ({
          localId: lesson.localId,
          lessonId: lesson.lessonId,
          title: getPreparedLessonTitle(lesson),
          kind: lesson.kind,
          description: lesson.description.trim() || null,
          videoUrl: lesson.videoUrl.trim() || null,
          durationSeconds: parseDurationInput(lesson.durationSeconds),
          isPreview: lesson.isPreview,
          isPublished: lesson.isPublished,
        }))
        .filter((lesson) => lesson.title),
    }))
    .filter((section) => section.lessons.length > 0 || Boolean(section.sectionId))
}

export default function CourseEditorPage() {
  const [courseId, setCourseId] = useState<number | null>(() => getCourseIdFromUrl())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState<SaveToastState | null>(null)
  const [showFloatingActionButtons, setShowFloatingActionButtons] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadedCourse, setLoadedCourse] = useState<LearningCourseDetail | null>(null)
  const [techTags, setTechTags] = useState<TechTag[]>([])
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [targetAudienceText, setTargetAudienceText] = useState('')
  const [prerequisitesText, setPrerequisitesText] = useState('')
  const [jobCards, setJobCards] = useState<EditorJobCard[]>([createEmptyJobCard()])
  const [sections, setSections] = useState<EditorSection[]>([createSection()])
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [trailerUrl, setTrailerUrl] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [status, setStatus] = useState<PersistedCourseStatus>('DRAFT')
  const [originalPrice, setOriginalPrice] = useState<number | null>(null)
  const [difficultyLevel, setDifficultyLevel] = useState('BEGINNER')
  const [language, setLanguage] = useState('ko')
  const [hasCertificate, setHasCertificate] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    Promise.all([
      userApi.getOfficialTags(controller.signal),
      courseId ? instructorCourseApi.getCourseDetail(courseId, controller.signal) : Promise.resolve(null),
    ])
      .then(([officialTags, detail]) => {
        setTechTags(officialTags)

        if (!detail) {
          setLoadedCourse(null)
          setTitle('')
          setSubtitle('')
          setTags([])
          setDescription('')
          setTargetAudienceText('')
          setPrerequisitesText('')
          setJobCards([createEmptyJobCard()])
          setSections([createSection()])
          setThumbnailUrl('')
          setTrailerUrl('')
          setPriceInput('')
          setStatus('DRAFT')
          setOriginalPrice(null)
          setDifficultyLevel('BEGINNER')
          setLanguage('ko')
          setHasCertificate(false)
          setLoading(false)
          return
        }

        setLoadedCourse(detail)
        setTitle(detail.title)
        setSubtitle(detail.subtitle ?? '')
        setTags(detail.tags.map((item) => item.tagName))
        setDescription(detail.description ?? '')
        setTargetAudienceText(detail.targetAudiences.map((item) => item.audienceDescription).join('\n'))
        setPrerequisitesText(detail.prerequisites.join('\n'))
        setJobCards(detail.jobRelevance.length ? detail.jobRelevance.map(parseJobCard) : [createEmptyJobCard()])
        setSections(detail.sections.length ? detail.sections.map(mapSection) : [createSection()])
        setThumbnailUrl(detail.thumbnailUrl ?? '')
        setTrailerUrl(detail.introVideoUrl ?? '')
        setPriceInput(detail.price ? detail.price.toLocaleString('ko-KR') : '')
        setStatus((detail.status as PersistedCourseStatus | null) ?? 'DRAFT')
        setOriginalPrice(detail.originalPrice ?? null)
        setDifficultyLevel(detail.difficultyLevel ?? 'BEGINNER')
        setLanguage(detail.language ?? 'ko')
        setHasCertificate(Boolean(detail.hasCertificate))
        setLoading(false)
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setError(nextError.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [courseId])

  useEffect(() => {
    if (!saveToast || saveToast.persistent) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSaveToast(null)
    }, SAVE_TOAST_DURATION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [saveToast])

  useEffect(() => {
    const updateFloatingActionButtons = () => {
      const actionButtonsSentinel = document.getElementById('course-editor-action-buttons-sentinel')

      if (!actionButtonsSentinel) {
        return
      }

      setShowFloatingActionButtons(
        actionButtonsSentinel.getBoundingClientRect().top <= EDITOR_ACTION_BUTTONS_STICKY_TOP_PX,
      )
    }

    updateFloatingActionButtons()
    window.addEventListener('scroll', updateFloatingActionButtons, { passive: true })
    window.addEventListener('resize', updateFloatingActionButtons)

    return () => {
      window.removeEventListener('scroll', updateFloatingActionButtons)
      window.removeEventListener('resize', updateFloatingActionButtons)
    }
  }, [])

  function rememberCourseId(nextCourseId: number) {
    setCourseId(nextCourseId)

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('courseId', String(nextCourseId))
    window.history.replaceState({}, '', nextUrl)
  }

  function addTagFromInput() {
    const nextTag = tagInput.trim().replace(/^#/, '')

    if (!nextTag) {
      return
    }

    setTags((current) =>
      current.some((item) => normalizeTagName(item) === normalizeTagName(nextTag)) ? current : [...current, nextTag],
    )
    setTagInput('')
  }

  function updateJobCard(localId: string, field: keyof Omit<EditorJobCard, 'localId'>, value: string) {
    setJobCards((current) => current.map((item) => (item.localId === localId ? { ...item, [field]: value } : item)))
  }

  function removeJobCard(localId: string) {
    setJobCards((current) => {
      const nextCards = current.filter((item) => item.localId !== localId)
      return nextCards.length ? nextCards : [createEmptyJobCard()]
    })
  }

  function updateSectionField(localId: string, field: keyof Omit<EditorSection, 'localId' | 'sectionId' | 'lessons'>, value: string | boolean) {
    setSections((current) =>
      current.map((item) => (item.localId === localId ? { ...item, [field]: value } : item)),
    )
  }

  function removeSection(localId: string) {
    setSections((current) => {
      const nextSections = current.filter((item) => item.localId !== localId)
      return nextSections.length ? nextSections : [createSection()]
    })
  }

  function addLesson(sectionLocalId: string, kind: LessonKind) {
    setSections((current) =>
      current.map((item) =>
        item.localId === sectionLocalId ? { ...item, lessons: [...item.lessons, createLesson(kind)] } : item,
      ),
    )
  }

  function updateLessonField(
    sectionLocalId: string,
    lessonLocalId: string,
    field: keyof Omit<EditorLesson, 'localId' | 'lessonId' | 'kind'>,
    value: string | boolean,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.localId !== sectionLocalId
          ? section
          : {
              ...section,
              lessons: section.lessons.map((lesson) =>
                lesson.localId === lessonLocalId ? { ...lesson, [field]: value } : lesson,
              ),
            },
      ),
    )
  }

  function removeLesson(sectionLocalId: string, lessonLocalId: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.localId !== sectionLocalId) {
          return section
        }

        const nextLessons = section.lessons.filter((lesson) => lesson.localId !== lessonLocalId)
        return { ...section, lessons: nextLessons.length ? nextLessons : [createLesson('lecture')] }
      }),
    )
  }

  function assignPersistedSectionId(localId: string, nextSectionId: number) {
    setSections((current) =>
      current.map((item) => (item.localId === localId ? { ...item, sectionId: nextSectionId } : item)),
    )
  }

  function assignPersistedLessonId(sectionLocalId: string, lessonLocalId: string, nextLessonId: number) {
    setSections((current) =>
      current.map((section) =>
        section.localId !== sectionLocalId
          ? section
          : {
              ...section,
              lessons: section.lessons.map((lesson) =>
                lesson.localId === lessonLocalId ? { ...lesson, lessonId: nextLessonId } : lesson,
              ),
            },
      ),
    )
  }

  function resolveTagIds() {
    const matchedTagIds: number[] = []
    const unresolvedTags: string[] = []

    for (const tag of tags) {
      const matchedTag = techTags.find((item) => normalizeTagName(item.name) === normalizeTagName(tag))

      if (!matchedTag) {
        unresolvedTags.push(tag)
        continue
      }

      if (!matchedTagIds.includes(matchedTag.tagId)) {
        matchedTagIds.push(matchedTag.tagId)
      }
    }

    return { matchedTagIds, unresolvedTags }
  }

  async function syncCurriculum(activeCourseId: number, nextSections: PreparedSection[]) {
    const existingSectionMap = new Map((loadedCourse?.sections ?? []).map((section) => [section.sectionId, section] as const))
    const retainedSectionIds = new Set<number>()
    const lessonIdByLocalId: Record<string, number> = {}

    for (let sectionIndex = 0; sectionIndex < nextSections.length; sectionIndex += 1) {
      const section = nextSections[sectionIndex]
      const sectionPayload = {
        title: section.title,
        description: section.description,
        orderIndex: sectionIndex,
        isPublished: section.isPublished,
      }

      let persistedSectionId = section.sectionId ?? null

      if (persistedSectionId) {
        await instructorCourseApi.updateSection(persistedSectionId, sectionPayload)
      } else {
        persistedSectionId = await instructorCourseApi.createSection(activeCourseId, sectionPayload)
        assignPersistedSectionId(section.localId, persistedSectionId)
      }

      retainedSectionIds.add(persistedSectionId)

      const existingSection = existingSectionMap.get(persistedSectionId)
      const existingLessonIds = new Set((existingSection?.lessons ?? []).map((lesson) => lesson.lessonId))
      const orderedLessonIds: number[] = []

      for (let lessonIndex = 0; lessonIndex < section.lessons.length; lessonIndex += 1) {
        const lesson = section.lessons[lessonIndex]
        const createPayload = {
          title: lesson.title,
          description: lesson.description,
          lessonType: lessonKindToApiType(lesson.kind),
          videoUrl: lesson.videoUrl,
          durationSeconds: lesson.durationSeconds,
          orderIndex: lessonIndex,
          isPreview: lesson.isPreview,
          isPublished: lesson.isPublished,
        }

        let persistedLessonId = lesson.lessonId ?? null

        if (persistedLessonId) {
          await instructorCourseApi.updateLesson(persistedLessonId, {
            title: createPayload.title,
            description: createPayload.description,
            lessonType: createPayload.lessonType,
            videoUrl: createPayload.videoUrl,
            durationSeconds: createPayload.durationSeconds,
            isPreview: createPayload.isPreview,
            isPublished: createPayload.isPublished,
          })
        } else {
          persistedLessonId = await instructorCourseApi.createLesson(persistedSectionId, createPayload)
          assignPersistedLessonId(section.localId, lesson.localId, persistedLessonId)
        }

        orderedLessonIds.push(persistedLessonId)
        lessonIdByLocalId[lesson.localId] = persistedLessonId
      }

      for (const lessonId of existingLessonIds) {
        if (!orderedLessonIds.includes(lessonId)) {
          await instructorCourseApi.deleteLesson(lessonId)
        }
      }

      if (orderedLessonIds.length > 0) {
        await instructorCourseApi.updateLessonOrder({
          sectionId: persistedSectionId,
          lessonOrders: orderedLessonIds.map((lessonId, lessonIndex) => ({
            lessonId,
            orderIndex: lessonIndex,
          })),
        })
      }
    }

    for (const [sectionIdValue] of existingSectionMap) {
      if (!retainedSectionIds.has(sectionIdValue)) {
        await instructorCourseApi.deleteSection(sectionIdValue)
      }
    }

    return lessonIdByLocalId
  }

  async function persistCourse(nextStatus?: PersistedCourseStatus) {
    const trimmedTitle = title.trim()
    const preparedSections = prepareSections(sections)
    const targetAudiences = splitLines(targetAudienceText)
    const prerequisites = splitLines(prerequisitesText)
    const jobRelevance = jobCards.map(serializeJobCard).filter((item): item is string => item !== null)
    const { matchedTagIds, unresolvedTags } = resolveTagIds()

    if (!trimmedTitle) {
      throw new Error('강의 제목을 입력해 주세요.')
    }

    if (!matchedTagIds.length) {
      throw new Error('공식 태그와 일치하는 태그를 1개 이상 입력해 주세요.')
    }

    if (unresolvedTags.length > 0) {
      throw new Error(`공식 태그에 없는 항목이 있습니다: ${unresolvedTags.join(', ')}`)
    }

    let activeCourseId = courseId
    const coursePayload = {
      title: trimmedTitle,
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      price: parsePriceInput(priceInput),
      originalPrice,
      currency: 'KRW',
      difficultyLevel,
      language,
      hasCertificate,
    }

    if (activeCourseId) {
      await instructorCourseApi.updateCourse(activeCourseId, coursePayload)
    } else {
      activeCourseId = await instructorCourseApi.createCourse({ ...coursePayload, tagIds: matchedTagIds })
      rememberCourseId(activeCourseId)
    }

    await instructorCourseApi.updateMetadata(activeCourseId, {
      prerequisites,
      jobRelevance,
      tagIds: matchedTagIds,
    })

    if (targetAudiences.length > 0) {
      await instructorCourseApi.replaceTargetAudiences(activeCourseId, targetAudiences)
    }

    if (thumbnailUrl.trim()) {
      await instructorCourseApi.uploadThumbnail(activeCourseId, {
        thumbnailUrl: thumbnailUrl.trim(),
        originalFileName: getAssetLabel(thumbnailUrl, 'thumbnail'),
      })
    }

    if (trailerUrl.trim()) {
      await instructorCourseApi.uploadTrailer(activeCourseId, {
        trailerUrl: trailerUrl.trim(),
        originalFileName: getAssetLabel(trailerUrl, 'trailer'),
      })
    }

    const lessonIdByLocalId = await syncCurriculum(activeCourseId, preparedSections)
    const statusToApply = nextStatus ?? status
    await instructorCourseApi.updateCourseStatus(activeCourseId, statusToApply)
    setStatus(statusToApply)

    return {
      courseId: activeCourseId,
      lessonIdByLocalId,
    }
  }

  async function handleSave() {
    setSaving(true)
    setActionError(null)
    setSaveToast({ message: '저장 중입니다...', persistent: true })

    try {
      await persistCourse()
      setSaveToast({ message: '저장되었습니다.', persistent: false })
    } catch (nextError) {
      setSaveToast(null)
      setActionError(nextError instanceof Error ? nextError.message : '강의를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRequestReview() {
    if (!window.confirm('모든 내용을 저장한 뒤 심사 요청 상태로 전환합니다. 계속할까요?')) {
      return
    }

    setSaving(true)
    setActionError(null)

    try {
      await persistCourse('IN_REVIEW')
      window.alert('심사 요청이 완료되었습니다.')
      window.location.href = '/course-management'
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : '심사 요청에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function handlePreview() {
    if (!courseId) {
      window.alert('미리보기 전에 먼저 저장해 주세요.')
      return
    }

    const previewUrl = new URL('/course-detail', window.location.origin)
    previewUrl.searchParams.set('courseId', String(courseId))
    previewUrl.searchParams.set('preview', 'student')
    previewUrl.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}${window.location.hash}`)

    window.open(previewUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  async function openLessonEditor(lesson: EditorLesson) {
    setSaving(true)
    setActionError(null)
    setSaveToast({ message: '변경사항 저장 중입니다...', persistent: true })

    try {
      const { courseId: activeCourseId, lessonIdByLocalId } = await persistCourse()
      const activeLessonId = lessonIdByLocalId[lesson.localId] ?? lesson.lessonId

      if (!activeLessonId) {
        throw new Error('레슨 저장 정보를 확인하지 못했습니다.')
      }

      const editorHref = buildLessonEditorHref(lesson.kind === 'quiz' ? 'quiz' : 'assignment', {
        lessonId: activeLessonId,
        lessonTitle: getPreparedLessonTitle(lesson),
        courseId: activeCourseId,
      })

      setSaveToast({ message: '저장되었습니다.', persistent: false })
      window.location.assign(editorHref)
    } catch (nextError) {
      setSaveToast(null)
      setActionError(nextError instanceof Error ? nextError.message : '강의를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function promptThumbnailUrl() {
    const nextValue = window.prompt('썸네일 이미지 URL을 입력해 주세요.', thumbnailUrl)
    if (nextValue !== null) {
      setThumbnailUrl(nextValue.trim())
    }
  }

  function promptTrailerUrl() {
    const nextValue = window.prompt('트레일러 영상 URL을 입력해 주세요.', trailerUrl)
    if (nextValue !== null) {
      setTrailerUrl(nextValue.trim())
    }
  }

  function promptLessonVideo(sectionLocalId: string, lessonLocalId: string, currentValue: string) {
    const nextValue = window.prompt('강의 영상 URL을 입력해 주세요.', currentValue)
    if (nextValue !== null) {
      updateLessonField(sectionLocalId, lessonLocalId, 'videoUrl', nextValue.trim())
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <LoadingCard label="강의 편집 데이터를 불러오는 중입니다." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorCard message={error} />
      </div>
    )
  }

  const statusChip = getStatusChip(status)
  const isNewCourse = !courseId
  const actionButtonsFloatingStyle = { top: `${EDITOR_ACTION_BUTTONS_STICKY_TOP_PX}px` }
  const sideCardStickyStyle = { top: `${EDITOR_SIDE_CARD_STICKY_TOP_PX}px` }

  function renderActionButtons(containerClassName: string) {
    return (
      <div className={containerClassName}>
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
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 bg-[#F3F4F6] py-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.location.assign('/course-management')}
            className="text-gray-400 transition hover:text-gray-800"
          >
            <i className="fas fa-arrow-left text-xl" />
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900">강의 편집</h1>
            <span className={`rounded px-2 py-1 text-xs font-bold ${statusChip.tone}`}>{statusChip.label}</span>
          </div>
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
                <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-white p-2">
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
                    className="min-w-[160px] flex-1 border-none text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-align-left text-gray-400" /> 강의 소개
            </h3>

            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">강의 상세 설명</label>
                <div className="overflow-hidden rounded-lg border border-gray-300">
                  <div className="flex gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-gray-500">
                    <i className="fas fa-bold" />
                    <i className="fas fa-italic" />
                    <i className="fas fa-list-ul" />
                    <i className="fas fa-image" />
                  </div>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="강의의 목표, 핵심 포인트, 수강 효과를 자세히 설명해 주세요."
                    className="h-32 w-full resize-none p-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">수강 대상 (줄바꿈으로 구분)</label>
                  <textarea
                    value={targetAudienceText}
                    onChange={(event) => setTargetAudienceText(event.target.value)}
                    placeholder="- 이런 학습자에게 추천합니다"
                    className="h-24 w-full resize-none rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">선수 지식 (줄바꿈으로 구분)</label>
                  <textarea
                    value={prerequisitesText}
                    onChange={(event) => setPrerequisitesText(event.target.value)}
                    placeholder="- 필요한 사전 지식을 적어 주세요"
                    className="h-24 w-full resize-none rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-briefcase text-blue-500" /> 직무 연계 설정
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-normal text-blue-600">
                수강생에게 이 강의가 어떤 직무와 연결되는지 보여줍니다.
              </span>
            </h3>

            <div className="space-y-4">
              {jobCards.map((card) => (
                <div key={card.localId} className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
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

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="flex items-center gap-2 font-bold text-gray-900">
                <i className="fas fa-list-ol text-gray-400" /> 커리큘럼 구성
              </h3>
              <button
                type="button"
                onClick={() => setSections((current) => [...current, createSection()])}
                className="rounded bg-gray-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black"
              >
                + 섹션 추가
              </button>
            </div>

            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <div key={section.localId} className="rounded-lg border border-gray-200 bg-white p-4">
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

                  <textarea
                    value={section.description}
                    onChange={(event) => updateSectionField(section.localId, 'description', event.target.value)}
                    placeholder="섹션 설명"
                    className="mb-3 min-h-[72px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs outline-none"
                  />

                  <div className="mb-3 space-y-2">
                    {section.lessons.map((lesson) => {
                      const meta = lessonKindMeta[lesson.kind]

                      return (
                        <div key={lesson.localId} className={`group rounded-lg border p-3 transition ${meta.containerTone}`}>
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
                            <button
                              type="button"
                              onClick={async () => {
                                if (lesson.kind === 'lecture') {
                                  promptLessonVideo(section.localId, lesson.localId, lesson.videoUrl)
                                  return
                                }

                                await openLessonEditor(lesson)
                              }}
                              disabled={saving}
                              className={`rounded px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${meta.buttonTone}`}
                            >
                              {meta.buttonLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLesson(section.localId, lesson.localId)}
                              className="text-gray-300 transition hover:text-rose-500"
                            >
                              <i className="fas fa-times" />
                            </button>
                          </div>

                          {lesson.kind === 'lecture' ? (
                            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                              <input
                                value={lesson.videoUrl}
                                onChange={(event) => updateLessonField(section.localId, lesson.localId, 'videoUrl', event.target.value)}
                                type="text"
                                placeholder="영상 URL"
                                className="rounded border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
                              />
                              <input
                                value={lesson.durationSeconds}
                                onChange={(event) =>
                                  updateLessonField(
                                    section.localId,
                                    lesson.localId,
                                    'durationSeconds',
                                    event.target.value.replace(/[^\d]/g, ''),
                                  )
                                }
                                type="text"
                                placeholder="길이(초)"
                                className="rounded border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
                              />
                            </div>
                          ) : null}
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

        <div className="space-y-6">
          <section className="sticky rounded-xl border border-gray-200 bg-white p-6 shadow-sm" style={sideCardStickyStyle}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
              <i className="fas fa-photo-video text-gray-400" /> 미디어 설정
            </h3>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold text-gray-500">썸네일 이미지</label>
              <button
                type="button"
                onClick={promptThumbnailUrl}
                className="flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 transition hover:bg-gray-50"
              >
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="썸네일 미리보기" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt mb-1 text-xl text-gray-400" />
                    <span className="text-xs text-gray-400">이미지 업로드</span>
                  </>
                )}
              </button>
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-xs font-bold text-gray-500">미리보기 영상 (Trailer)</label>
              <button
                type="button"
                onClick={promptTrailerUrl}
                className="flex h-10 w-full items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-left transition hover:bg-gray-100"
              >
                <i className="fas fa-video mr-2 text-gray-400" />
                <span className="truncate text-xs text-gray-500">{getAssetLabel(trailerUrl, '파일 선택...')}</span>
                <span className="ml-auto text-xs font-bold text-emerald-500">업로드</span>
              </button>
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

            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-xs leading-5 text-gray-500">
              {isNewCourse
                ? '새 강의는 먼저 저장해 courseId를 발급받은 뒤, 상세 설정과 미리보기를 사용할 수 있습니다.'
                : '강의 저장 시 기본 정보, 메타데이터, 커리큘럼 순서대로 백엔드 API에 반영됩니다.'}
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
            className="rounded-xl border border-gray-700 bg-gray-900/90 px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-sm"
          >
            <i className="fas fa-info-circle mr-2 text-[#00C471]" />
            {saveToast.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}
