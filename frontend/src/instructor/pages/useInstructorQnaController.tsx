import { useEffect, useRef, useState } from 'react'
import { navigateTo } from '../../lib/spa-navigation'


import { buildInstructorCourseOptions, normalizeInstructorCourseTitle } from '../course-display'
import { readInstructorChannelCustomization, sanitizeInstructorProfileImageUrl } from '../channel/customization'
import { instructorCourseApi, instructorQnaApi } from '../../lib/api/instructor'
import { userApi } from '../../lib/api/auth'
import type { AuthSession } from '../../types/auth'
import type { InstructorCourseListItem, InstructorQnaInboxItem, InstructorQnaTemplate, InstructorQnaTimeline } from '../../types/instructor'
import type { UserProfile } from '../../types/learner'

type QuestionStatusFilter = 'pending' | 'answered'
type MarkdownAction = 'heading' | 'bold' | 'italic' | 'link' | 'code' | 'image'
type ToastState = {
  message: string
  tone: 'info' | 'success'
} | null


const legacyTextMap: Record<string, string> = {
  'Spring Boot Intro': '스프링 부트 입문',
  'JPA Practical Design': 'JPA 실전 설계',
  'Learner Kim': '김수강',
  'Learner Park': '박수강',
  'Learner Lee': '이수강',
  'Instructor Hong': '홍멘토',
  'Hong Backend Lab': '홍 백엔드 연구소',
  'BeanCreationException during startup': 'BeanCreationException이 발생할 때 어디부터 확인해야 하나요?',
  'Spring Boot startup fails with BeanCreationException. Which bean should I inspect first and how do I narrow the cause?':
    '스프링 부트를 실행하면 BeanCreationException이 발생합니다. 어떤 빈부터 확인해야 하고, 원인을 빠르게 좁히는 순서가 궁금합니다.',
  'How to avoid JPA infinite recursion': 'JPA 무한 참조를 안전하게 끊는 방법이 궁금합니다',
  'My entity graph loops when I serialize it to JSON. What is the safest way to stop recursive references?':
    '엔티티를 JSON으로 직렬화하면 양방향 연관관계 때문에 순환 참조가 발생합니다. 가장 안전하게 막는 방법이 무엇인가요?',
  'Start from the root cause in the stack trace, then check configuration classes, component scanning, and constructor dependencies.':
    '스택 트레이스에서 가장 아래쪽 원인 메시지부터 확인한 뒤, 설정 클래스, 컴포넌트 스캔 범위, 생성자 의존성을 순서대로 점검해보세요.',
  'Prefer response DTOs for API output, and use reference annotations only when you must serialize the entity graph directly.':
    'API 응답은 DTO로 분리하고, 꼭 엔티티를 직접 직렬화해야 할 때만 참조 관련 어노테이션을 제한적으로 사용하는 방식이 가장 안전합니다.',
  'Debugging startup errors': '시작 오류 점검 순서',
  'Check stack trace order, configuration classes, environment variables, and recent dependency changes first.':
    '스택 트레이스 순서, 설정 클래스, 환경 변수, 최근 변경한 의존성을 먼저 점검해보세요.',
  'N+1 review checklist': '직렬화 및 연관관계 점검 체크리스트',
  'Compare repository query count, fetch strategy, and entity graph usage before changing domain structure.':
    '도메인 구조를 바꾸기 전에 쿼리 수, fetch 전략, 엔티티 그래프 사용 여부를 먼저 비교해보세요.',
}

function normalizeLegacyText(value: string | null | undefined) {
  if (!value) {
    return value ?? null
  }

  return legacyTextMap[value] ?? value
}

function normalizeQuestion(question: InstructorQnaInboxItem): InstructorQnaInboxItem {
  return {
    ...question,
    courseTitle: normalizeInstructorCourseTitle(
      normalizeLegacyText(question.courseTitle) ?? question.courseTitle,
    ),
    lessonTitle: normalizeLegacyText(question.lessonTitle),
    learnerName: normalizeLegacyText(question.learnerName),
    title: normalizeLegacyText(question.title) ?? question.title,
    content: normalizeLegacyText(question.content) ?? question.content,
  }
}

function normalizeTemplate(template: InstructorQnaTemplate): InstructorQnaTemplate {
  return {
    ...template,
    title: normalizeLegacyText(template.title) ?? template.title,
    content: normalizeLegacyText(template.content) ?? template.content,
  }
}

function normalizeTimeline(timeline: InstructorQnaTimeline): InstructorQnaTimeline {
  return {
    ...timeline,
    question: normalizeQuestion(timeline.question),
    publishedAnswer: timeline.publishedAnswer
      ? {
          ...timeline.publishedAnswer,
          authorName: normalizeLegacyText(timeline.publishedAnswer.authorName) ?? timeline.publishedAnswer.authorName,
          content: normalizeLegacyText(timeline.publishedAnswer.content) ?? timeline.publishedAnswer.content,
        }
      : null,
    draft: timeline.draft
      ? {
          ...timeline.draft,
          draftContent: normalizeLegacyText(timeline.draft.draftContent) ?? timeline.draft.draftContent,
        }
      : null,
    lectureTitle: normalizeLegacyText(timeline.lectureTitle),
  }
}


function buildQuestionSearchText(question: InstructorQnaInboxItem) {
  return [
    question.title,
    question.content,
    question.learnerName,
    question.courseTitle,
    question.lectureTimestamp,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}


function parseLectureTimestampSeconds(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parts = value
    .split(':')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part >= 0)

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  return null
}

function buildReturnToHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function useInstructorQnaController({ session }: { session: AuthSession }) {
  const [questions, setQuestions] = useState<InstructorQnaInboxItem[]>([])
  const [courseCatalog, setCourseCatalog] = useState<InstructorCourseListItem[]>([])
  const [timeline, setTimeline] = useState<InstructorQnaTimeline | null>(null)
  const [statusFilter, setStatusFilter] = useState<QuestionStatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [sortFilter, setSortFilter] = useState<'latest' | 'oldest'>('latest')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draftText, setDraftText] = useState('')
  const [quickReplies, setQuickReplies] = useState<InstructorQnaTemplate[]>([])
  const [quickOpen, setQuickOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [editingQuickId, setEditingQuickId] = useState<number | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickBody, setQuickBody] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const [loadedTimelineId, setLoadedTimelineId] = useState<number | null>(null)
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      instructorQnaApi.getInbox(statusFilter === 'pending' ? 'UNANSWERED' : 'ANSWERED', controller.signal),
      instructorQnaApi.getTemplates(controller.signal),
    ])
      .then(([nextQuestions, nextTemplates]) => {
        const normalizedQuestions = nextQuestions.map(normalizeQuestion)
        setQuestions(normalizedQuestions)
        setSelectedId(normalizedQuestions[0]?.questionId ?? null)
        setQuickReplies(nextTemplates.map(normalizeTemplate))
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setToast({ message: error.message, tone: 'info' })
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [statusFilter])

  useEffect(() => {
    const controller = new AbortController()

    instructorCourseApi
      .getCourses(controller.signal)
      .then((nextCourses) => setCourseCatalog(nextCourses))
      .catch(() => {})

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((nextProfile) => setProfile(nextProfile))
      .catch(() => {})

    return () => controller.abort()
  }, [])

  const courseOptions = buildInstructorCourseOptions(courseCatalog).filter(([value]) =>
    questions.some((question) => String(question.courseId) === value),
  )
  const activeCourseFilter = courseFilter === 'all' || courseOptions.some(([value]) => value === courseFilter)
    ? courseFilter
    : 'all'
  const allowedCourseIds = new Set(courseOptions.map(([value]) => Number(value)))
  const scopedQuestions =
    courseCatalog.length > 0
      ? questions.filter((question) => question.courseId !== null && allowedCourseIds.has(question.courseId))
      : questions
  const visibleQuestions = [...scopedQuestions]
    .filter((question) => {
      if (activeCourseFilter !== 'all' && String(question.courseId) !== activeCourseFilter) {
        return false
      }

      if (!search.trim()) {
        return true
      }

      return buildQuestionSearchText(question).includes(search.trim().toLowerCase())
    })
    .sort((left, right) =>
      sortFilter === 'latest'
        ? (right.createdAt ?? '').localeCompare(left.createdAt ?? '')
        : (left.createdAt ?? '').localeCompare(right.createdAt ?? ''),
    )

  const activeSelectedId = visibleQuestions.some((question) => question.questionId === selectedId)
    ? selectedId
    : visibleQuestions[0]?.questionId ?? null

  useEffect(() => {
    if (!activeSelectedId) {
      return
    }

    const controller = new AbortController()

    instructorQnaApi
      .getTimeline(activeSelectedId, controller.signal)
      .then((nextTimeline) => {
        const normalizedTimeline = normalizeTimeline(nextTimeline)
        setTimeline(normalizedTimeline)
        setDraftText(
          normalizedTimeline.draft?.draftContent ?? normalizedTimeline.publishedAnswer?.content ?? '',
        )
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setDraftText('')
          setToast({ message: error.message, tone: 'info' })
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadedTimelineId(activeSelectedId)
        }
      })

    return () => controller.abort()
  }, [activeSelectedId])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const activeTimeline = timeline?.question.questionId === activeSelectedId ? timeline : null
  const timelineLoading = activeSelectedId !== null && loadedTimelineId !== activeSelectedId
  const editingAnswer = editingAnswerId === activeSelectedId
  const current =
    activeTimeline?.question ?? visibleQuestions.find((question) => question.questionId === activeSelectedId) ?? null
  const customization = readInstructorChannelCustomization(session.userId)
  const instructorDisplayName =
    customization?.displayName?.trim() ||
    profile?.channelName?.trim() ||
    profile?.name?.trim() ||
    activeTimeline?.publishedAnswer?.authorName?.trim() ||
    session.name ||
    '강사'
  const instructorProfileImage =
    sanitizeInstructorProfileImageUrl(customization?.profileImageUrl) ??
    sanitizeInstructorProfileImageUrl(profile?.profileImage) ??
    sanitizeInstructorProfileImageUrl(activeTimeline?.publishedAnswer?.authorProfileImage) ??
    null
  const showAnswerForm = current ? current.status === 'UNANSWERED' || editingAnswer : false

  function openCourseScreen(question: InstructorQnaInboxItem) {
    if (!question.courseId) {
      setToast({ message: '연결된 강의 정보가 없습니다.', tone: 'info' })
      return
    }

    const returnTo = buildReturnToHref()
    const timestampSeconds = parseLectureTimestampSeconds(question.lectureTimestamp)
    const url = new URL('/learning', window.location.href)
    url.searchParams.set('courseId', String(question.courseId))
    url.searchParams.set('preview', 'student')
    url.searchParams.set('autoplay', '1')
    url.searchParams.set('returnTo', returnTo)
    url.searchParams.set('from', 'instructor-qna')
    url.searchParams.set('questionId', String(question.questionId))

    if (question.lessonId) {
      url.searchParams.set('lessonId', String(question.lessonId))
    }

    if (timestampSeconds !== null) {
      url.searchParams.set('t', String(timestampSeconds))
    }

    const opened = window.open(url.toString(), '_blank')
    if (opened) {
      opened.opener = null
      return
    }

    if (!opened) {
      navigateTo(url.toString())
    }
  }

  function changeStatusFilter(nextStatus: QuestionStatusFilter) {
    if (nextStatus === statusFilter) return
    setLoading(true)
    setSelectedId(null)
    setEditingAnswerId(null)
    setStatusFilter(nextStatus)
  }

  function changeCourseFilter(nextCourseFilter: string) {
    setCourseFilter(nextCourseFilter)
    setSelectedId(null)
    setEditingAnswerId(null)
  }

  function changeSearch(nextSearch: string) {
    setSearch(nextSearch)
    setSelectedId(null)
    setEditingAnswerId(null)
  }

  function selectQuestion(questionId: number) {
    setSelectedId(questionId)
    setEditingAnswerId(null)
  }

  function focusEditorSelection(start: number, end: number) {
    window.requestAnimationFrame(() => {
      if (!editorRef.current) {
        return
      }

      editorRef.current.focus()
      editorRef.current.setSelectionRange(start, end)
    })
  }

  function replaceEditorSelection(
    builder: (selectedText: string) => { text: string; selectionStart: number; selectionEnd: number },
  ) {
    if (!editorRef.current) {
      return
    }

    const textarea = editorRef.current
    const currentValue = textarea.value
    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const selectedText = currentValue.slice(selectionStart, selectionEnd)
    const insertion = builder(selectedText)
    const nextValue =
      currentValue.slice(0, selectionStart) + insertion.text + currentValue.slice(selectionEnd)

    setDraftText(nextValue)
    focusEditorSelection(
      selectionStart + insertion.selectionStart,
      selectionStart + insertion.selectionEnd,
    )
  }

  function appendReply(value: string) {
    setDraftText((currentDraft) =>
      currentDraft.trim() ? `${currentDraft.trimEnd()}\n\n${value}` : value,
    )

    window.requestAnimationFrame(() => {
      editorRef.current?.focus()
      const nextLength = (editorRef.current?.value ?? value).length
      editorRef.current?.setSelectionRange(nextLength, nextLength)
    })
  }

  function applyMarkdown(action: MarkdownAction) {
    if (!showAnswerForm) {
      return
    }

    if (action === 'link') {
      const href = window.prompt('링크 주소를 입력하세요.', 'https://')
      if (!href) {
        return
      }

      replaceEditorSelection((selectedText) => {
        const label = selectedText || '링크 텍스트'
        return {
          text: `[${label}](${href})`,
          selectionStart: 1,
          selectionEnd: 1 + label.length,
        }
      })
      return
    }

    if (action === 'image') {
      const src = window.prompt('이미지 주소를 입력하세요.', 'https://')
      if (!src) {
        return
      }

      const alt = window.prompt('이미지 설명을 입력하세요.', '이미지 설명')
      if (alt === null) {
        return
      }

      replaceEditorSelection(() => ({
        text: `![${alt}](${src})`,
        selectionStart: 2,
        selectionEnd: 2 + alt.length,
      }))
      return
    }

    replaceEditorSelection((selectedText) => {
      if (action === 'heading') {
        const label = selectedText || '제목을 입력하세요'
        return {
          text: `## ${label}`,
          selectionStart: 3,
          selectionEnd: 3 + label.length,
        }
      }

      if (action === 'bold') {
        const label = selectedText || '강조할 문구'
        return {
          text: `**${label}**`,
          selectionStart: 2,
          selectionEnd: 2 + label.length,
        }
      }

      if (action === 'italic') {
        const label = selectedText || '기울임 문구'
        return {
          text: `*${label}*`,
          selectionStart: 1,
          selectionEnd: 1 + label.length,
        }
      }

      const label = selectedText || '코드를 입력하세요'

      if (selectedText.includes('\n') || !selectedText) {
        return {
          text: `\`\`\`\n${label}\n\`\`\``,
          selectionStart: 4,
          selectionEnd: 4 + label.length,
        }
      }

      return {
        text: `\`${label}\``,
        selectionStart: 1,
        selectionEnd: 1 + label.length,
      }
    })
  }

  async function saveDraft() {
    if (!current) {
      return
    }

    try {
      const savedDraft = await instructorQnaApi.saveDraft(current.questionId, draftText)
      setTimeline((existing) =>
        existing
          ? normalizeTimeline({
              ...existing,
              draft: savedDraft,
            })
          : existing,
      )
      setToast({ message: '답변 초안을 저장했습니다.', tone: 'success' })
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : '초안 저장에 실패했습니다.',
        tone: 'info',
      })
    }
  }

  async function submitAnswer() {
    if (!current) {
      return
    }

    const content = draftText.trim()
    if (!content) {
      window.alert('답변 내용을 입력해주세요.')
      editorRef.current?.focus()
      return
    }

    try {
      if (activeTimeline?.publishedAnswer) {
        await instructorQnaApi.updateAnswer(
          current.questionId,
          activeTimeline.publishedAnswer.answerId,
          content,
        )
      } else {
        await instructorQnaApi.createAnswer(current.questionId, content)
      }

      const [nextQuestions, nextTimeline] = await Promise.all([
        instructorQnaApi.getInbox(statusFilter === 'pending' ? 'UNANSWERED' : 'ANSWERED'),
        instructorQnaApi.getTimeline(current.questionId),
      ])
      const normalizedTimeline = normalizeTimeline(nextTimeline)

      setQuestions(nextQuestions.map(normalizeQuestion))
      setTimeline(normalizedTimeline)
      setLoadedTimelineId(current.questionId)
      setDraftText(normalizedTimeline.publishedAnswer?.content ?? normalizedTimeline.draft?.draftContent ?? '')
      setEditingAnswerId(null)
      setToast({ message: '답변을 등록했습니다.', tone: 'success' })
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : '답변 저장에 실패했습니다.',
        tone: 'info',
      })
    }
  }

  function openQuickModal(reply?: InstructorQnaTemplate) {
    setEditingQuickId(reply?.id ?? null)
    setQuickTitle(reply?.title ?? '')
    setQuickBody(reply?.content ?? '')
    setQuickOpen(true)
  }

  async function saveQuickReply() {
    if (!quickTitle.trim() || !quickBody.trim()) {
      window.alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    try {
      const savedReply = editingQuickId
        ? await instructorQnaApi.updateTemplate(editingQuickId, {
            title: quickTitle.trim(),
            content: quickBody.trim(),
          })
        : await instructorQnaApi.createTemplate({
            title: quickTitle.trim(),
            content: quickBody.trim(),
          })
      const normalizedReply = normalizeTemplate(savedReply)

      setQuickReplies((currentReplies) =>
        editingQuickId
          ? currentReplies.map((reply) => (reply.id === editingQuickId ? normalizedReply : reply))
          : [...currentReplies, normalizedReply],
      )
      setQuickOpen(false)
      setToast({ message: '빠른 답변을 저장했습니다.', tone: 'success' })
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : '빠른 답변 저장에 실패했습니다.',
        tone: 'info',
      })
    }
  }

  async function deleteQuickReply(replyId: number) {
    if (!window.confirm('이 빠른 답변을 삭제할까요?')) {
      return
    }

    try {
      await instructorQnaApi.deleteTemplate(replyId)
      setQuickReplies((currentReplies) => currentReplies.filter((reply) => reply.id !== replyId))
      setToast({ message: '빠른 답변을 삭제했습니다.', tone: 'success' })
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : '빠른 답변 삭제에 실패했습니다.',
        tone: 'info',
      })
    }
  }
  return { questions, setQuestions, courseCatalog, setCourseCatalog, timeline, setTimeline, statusFilter, setStatusFilter, search, setSearch, courseFilter, setCourseFilter, sortFilter, setSortFilter, selectedId, setSelectedId, draftText, setDraftText, quickReplies, setQuickReplies, quickOpen, setQuickOpen, templateOpen, setTemplateOpen, editingQuickId, setEditingQuickId, quickTitle, setQuickTitle, quickBody, setQuickBody, toast, setToast, loading, setLoading, loadedTimelineId, setLoadedTimelineId, editingAnswerId, setEditingAnswerId, profile, setProfile, editorRef, courseOptions, activeCourseFilter, allowedCourseIds, scopedQuestions, visibleQuestions, activeSelectedId, activeTimeline, timelineLoading, editingAnswer, current, customization, instructorDisplayName, instructorProfileImage, showAnswerForm, openCourseScreen, changeStatusFilter, changeCourseFilter, changeSearch, selectQuestion, focusEditorSelection, replaceEditorSelection, appendReply, applyMarkdown, saveDraft, submitAnswer, openQuickModal, saveQuickReply, deleteQuickReply }
}