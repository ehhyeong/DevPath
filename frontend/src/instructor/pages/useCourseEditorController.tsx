import { useEffect, useRef, useState } from 'react'

import { navigateTo } from '../../lib/spa-navigation'
import { instructorCourseApi } from '../../lib/api/instructor'
import { userApi } from '../../lib/api/auth'
import type { TechTag } from '../../types/learner'
import type { LearningCourseDetail } from '../../types/learning'
import { type EditorInfoSection, type EditorJobCard, type EditorLesson, type EditorSection, type LessonKind, type PersistedCourseStatus, type PreparedSection, type SaveToastState, createDefaultInfoSections, createEmptyJobCard, createLesson, createSection, EDITOR_ACTION_BUTTONS_STICKY_TOP_PX, getAssetLabel, getCourseIdFromUrl, getPreparedLessonTitle, lessonKindToApiType, mapCourseInfoSections, mapSection, normalizeSectionTitle, normalizeTagName, parseBulletItems, parseJobCard, parsePriceInput, prepareSections, SAVE_TOAST_DURATION_MS, serializeJobCard } from '../course-editor/course-editor-model'
import { buildLessonEditorHref } from '../course-editor/editor-routing'


class CourseEditorValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CourseEditorValidationError'
  }
}export function useCourseEditorController() {
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
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const descriptionImageInputRef = useRef<HTMLInputElement | null>(null)
  const thumbnailImageInputRef = useRef<HTMLInputElement | null>(null)
  const trailerVideoInputRef = useRef<HTMLInputElement | null>(null)
  const [infoSections, setInfoSections] = useState<EditorInfoSection[]>(createDefaultInfoSections)
  const [jobCards, setJobCards] = useState<EditorJobCard[]>([createEmptyJobCard()])
  const [sections, setSections] = useState<EditorSection[]>([createSection()])
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('')
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
          setInfoSections(createDefaultInfoSections())
          setJobCards([createEmptyJobCard()])
          setSections([createSection(1)])
          setThumbnailUrl('')
          setThumbnailPreviewUrl('')
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
        setInfoSections(mapCourseInfoSections(detail))
        setJobCards(detail.jobRelevance.length ? detail.jobRelevance.map(parseJobCard) : [createEmptyJobCard()])
        setSections(detail.sections.length ? detail.sections.map(mapSection) : [createSection(1)])
        setThumbnailUrl(detail.thumbnailUrl ?? '')
        setThumbnailPreviewUrl('')
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
    return () => {
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl)
      }
    }
  }, [thumbnailPreviewUrl])

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
      return nextSections.length ? nextSections.map((section, index) => ({ ...section, title: normalizeSectionTitle(section.title, index) })) : [createSection(1)]
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
    const preparedInfoSections = infoSections
      .map((section) => ({
        sectionKey: section.sectionKey,
        title: section.title.trim(),
        items: parseBulletItems(section.content),
        removable: section.removable,
      }))
      .filter((section) => section.title && (!section.removable || section.items.length > 0))
    const prerequisites =
      preparedInfoSections.find((section) => section.sectionKey === 'PREREQUISITES')?.items ?? []
    const jobRelevance = jobCards.map(serializeJobCard).filter((item): item is string => item !== null)
    const { matchedTagIds, unresolvedTags } = resolveTagIds()

    if (!trimmedTitle) {
      throw new CourseEditorValidationError('강의 제목을 입력해 주세요.')
    }

    if (!matchedTagIds.length) {
      throw new CourseEditorValidationError('공식 태그와 일치하는 태그를 1개 이상 입력해 주세요.')
    }

    if (unresolvedTags.length > 0) {
      throw new CourseEditorValidationError(`공식 태그에 없는 항목이 있습니다: ${unresolvedTags.join(', ')}`)
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

    await instructorCourseApi.replaceInfoSections(
      activeCourseId,
      preparedInfoSections.map(({ sectionKey, title, items }) => ({ sectionKey, title, items })),
    )

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
      if (nextError instanceof CourseEditorValidationError) {
        setSaveToast({ message: nextError.message, persistent: false, variant: 'error' })
      } else {
        setSaveToast(null)
        setActionError(nextError instanceof Error ? nextError.message : '강의를 저장하지 못했습니다.')
      }
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
      navigateTo('/course-management')
    } catch (nextError) {
      if (nextError instanceof CourseEditorValidationError) {
        setSaveToast({ message: nextError.message, persistent: false, variant: 'error' })
      } else {
        setActionError(nextError instanceof Error ? nextError.message : '심사 요청에 실패했습니다.')
      }
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

  function insertDescriptionMarkdown(prefix: string, suffix = '', fallback = '') {
    const textarea = descriptionTextareaRef.current
    const selectionStart = textarea?.selectionStart ?? description.length
    const selectionEnd = textarea?.selectionEnd ?? description.length
    const selectedText = description.slice(selectionStart, selectionEnd)
    const nextText = selectedText || fallback
    const insertedText = `${prefix}${nextText}${suffix}`
    const nextDescription = `${description.slice(0, selectionStart)}${insertedText}${description.slice(selectionEnd)}`

    setDescription(nextDescription)

    window.setTimeout(() => {
      textarea?.focus()
      const cursorStart = selectionStart + prefix.length
      const cursorEnd = cursorStart + nextText.length
      textarea?.setSelectionRange(cursorStart, cursorEnd)
    }, 0)
  }

  function insertDescriptionImage() {
    descriptionImageInputRef.current?.click()
  }

  async function uploadCourseEditorAsset(file: File, assetType: string) {
    setActionError(null)
    setSaveToast({ message: '파일 업로드 중입니다...', persistent: true })

    try {
      const asset = await instructorCourseApi.uploadCourseAsset(file, assetType)
      setSaveToast({ message: '파일 업로드가 완료되었습니다.', persistent: false })
      return asset.url
    } catch (nextError) {
      setSaveToast(null)
      throw new Error(nextError instanceof Error ? nextError.message : '파일 업로드에 실패했습니다.', {
        cause: nextError,
      })
    }
  }

  async function handleDescriptionImageFileChange(file: File | null) {
    if (!file) {
      return
    }

    try {
      const uploadedUrl = await uploadCourseEditorAsset(file, 'description-image')
      insertDescriptionMarkdown(`![${file.name}](`, ')', uploadedUrl)
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : '파일 업로드에 실패했습니다.')
    }
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
      navigateTo(editorHref)
    } catch (nextError) {
      if (nextError instanceof CourseEditorValidationError) {
        setSaveToast({ message: nextError.message, persistent: false, variant: 'error' })
      } else {
        setSaveToast(null)
        setActionError(nextError instanceof Error ? nextError.message : '강의를 저장하지 못했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleThumbnailFileChange(file: File | null) {
    if (!file) {
      return
    }

    try {
      const uploadedUrl = await uploadCourseEditorAsset(file, 'thumbnail')
      setThumbnailUrl(uploadedUrl)
      setThumbnailPreviewUrl('')
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : '파일 업로드에 실패했습니다.')
    }
  }

  async function handleTrailerFileChange(file: File | null) {
    if (!file) {
      return
    }

    try {
      const uploadedUrl = await uploadCourseEditorAsset(file, 'trailer')
      setTrailerUrl(uploadedUrl)
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : '파일 업로드에 실패했습니다.')
    }
  }

  async function handleLessonVideoFileChange(sectionLocalId: string, lessonLocalId: string, file: File | null) {
    if (!file) {
      return
    }

    try {
      const uploadedUrl = await uploadCourseEditorAsset(file, 'lesson-video')
      updateLessonField(sectionLocalId, lessonLocalId, 'videoUrl', uploadedUrl)
      updateLessonField(sectionLocalId, lessonLocalId, 'durationSeconds', '')
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : '파일 업로드에 실패했습니다.')
    }
  }
  return { courseId, setCourseId, loading, setLoading, saving, setSaving, saveToast, setSaveToast, showFloatingActionButtons, setShowFloatingActionButtons, error, setError, actionError, setActionError, loadedCourse, setLoadedCourse, techTags, setTechTags, title, setTitle, subtitle, setSubtitle, tagInput, setTagInput, tags, setTags, description, setDescription, descriptionTextareaRef, descriptionImageInputRef, thumbnailImageInputRef, trailerVideoInputRef, infoSections, setInfoSections, jobCards, setJobCards, sections, setSections, thumbnailUrl, setThumbnailUrl, thumbnailPreviewUrl, setThumbnailPreviewUrl, trailerUrl, setTrailerUrl, priceInput, setPriceInput, status, setStatus, originalPrice, setOriginalPrice, difficultyLevel, setDifficultyLevel, language, setLanguage, hasCertificate, setHasCertificate, rememberCourseId, addTagFromInput, updateJobCard, removeJobCard, updateSectionField, removeSection, addLesson, updateLessonField, removeLesson, assignPersistedSectionId, assignPersistedLessonId, resolveTagIds, syncCurriculum, persistCourse, handleSave, handleRequestReview, handlePreview, insertDescriptionMarkdown, insertDescriptionImage, uploadCourseEditorAsset, handleDescriptionImageFileChange, openLessonEditor, handleThumbnailFileChange, handleTrailerFileChange, handleLessonVideoFileChange }
}