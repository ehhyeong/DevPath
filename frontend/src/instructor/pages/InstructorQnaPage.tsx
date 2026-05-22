import { useEffect, useRef, useState } from 'react'
import MarkdownContent from '../../components/MarkdownContent'
import UserAvatar from '../../components/UserAvatar'
import {
  buildInstructorCourseOptions,
  normalizeInstructorCourseTitle,
} from '../../instructor/course-display'
import {
  readInstructorChannelCustomization,
  sanitizeInstructorProfileImageUrl,
} from '../../instructor-channel-customization'
import { instructorCourseApi, instructorQnaApi, userApi } from '../../lib/api'
import type { AuthSession } from '../../types/auth'
import type {
  InstructorCourseListItem,
  InstructorQnaInboxItem,
  InstructorQnaTemplate,
  InstructorQnaTimeline,
} from '../../types/instructor'
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

function formatRelativeTime(value: string | null) {
  if (!value) return '방금 전'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`
  return `${Math.floor(diffMinutes / 1440)}일 전`
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

function buildLearnerAvatarSeed(question: InstructorQnaInboxItem) {
  return (question.learnerName ?? question.learnerAvatarSeed ?? String(question.questionId)).replace(/\s+/g, '-')
}

function buildStatusBadgeClasses(status: string) {
  return status === 'UNANSWERED'
    ? 'border border-orange-200 bg-orange-50 text-orange-700'
    : 'border border-green-200 bg-green-50 text-green-700'
}

function buildStatusLabel(status: string) {
  return status === 'UNANSWERED' ? '미답변' : '답변 완료'
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

function Modal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string
  icon: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[2400] flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <i className={`${icon} text-[#00c471]`} /> {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function InstructorQnaPage({ session }: { session: AuthSession }) {
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
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [editingAnswer, setEditingAnswer] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)

    Promise.all([
      instructorQnaApi.getInbox(statusFilter === 'pending' ? 'UNANSWERED' : 'ANSWERED', controller.signal),
      instructorQnaApi.getTemplates(controller.signal),
    ])
      .then(([nextQuestions, nextTemplates]) => {
        setQuestions(nextQuestions.map(normalizeQuestion))
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
  const allowedCourseIds = new Set(courseOptions.map(([value]) => Number(value)))
  const scopedQuestions =
    courseCatalog.length > 0
      ? questions.filter((question) => question.courseId !== null && allowedCourseIds.has(question.courseId))
      : questions
  const visibleQuestions = [...scopedQuestions]
    .filter((question) => {
      if (courseFilter !== 'all' && String(question.courseId) !== courseFilter) {
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

  useEffect(() => {
    if (!visibleQuestions.some((question) => question.questionId === selectedId)) {
      setSelectedId(visibleQuestions[0]?.questionId ?? null)
    }
  }, [selectedId, visibleQuestions])

  useEffect(() => {
    if (!selectedId) {
      setTimeline(null)
      setDraftText('')
      return
    }

    const controller = new AbortController()
    setTimelineLoading(true)
    setEditingAnswer(false)

    instructorQnaApi
      .getTimeline(selectedId, controller.signal)
      .then((nextTimeline) => {
        const normalizedTimeline = normalizeTimeline(nextTimeline)
        setTimeline(normalizedTimeline)
        setDraftText(
          normalizedTimeline.draft?.draftContent ?? normalizedTimeline.publishedAnswer?.content ?? '',
        )
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setToast({ message: error.message, tone: 'info' })
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setTimelineLoading(false)
        }
      })

    return () => controller.abort()
  }, [selectedId])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const current =
    timeline?.question ?? visibleQuestions.find((question) => question.questionId === selectedId) ?? null
  const customization = readInstructorChannelCustomization(session.userId)
  const instructorDisplayName =
    customization?.displayName?.trim() ||
    profile?.channelName?.trim() ||
    profile?.name?.trim() ||
    timeline?.publishedAnswer?.authorName?.trim() ||
    session.name ||
    '강사'
  const instructorProfileImage =
    sanitizeInstructorProfileImageUrl(customization?.profileImageUrl) ??
    sanitizeInstructorProfileImageUrl(profile?.profileImage) ??
    sanitizeInstructorProfileImageUrl(timeline?.publishedAnswer?.authorProfileImage) ??
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
      window.location.assign(url.toString())
    }
  }

  useEffect(() => {
    if (courseFilter !== 'all' && !courseOptions.some(([value]) => value === courseFilter)) {
      setCourseFilter('all')
    }
  }, [courseFilter, courseOptions])

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
      if (timeline?.publishedAnswer) {
        await instructorQnaApi.updateAnswer(
          current.questionId,
          timeline.publishedAnswer.answerId,
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
      setDraftText(normalizedTimeline.publishedAnswer?.content ?? normalizedTimeline.draft?.draftContent ?? '')
      setEditingAnswer(false)
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f3f4f6]">
      {toast ? (
        <div
          className={`pointer-events-none fixed top-24 left-1/2 z-[9999] -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-2xl ${
            toast.tone === 'success' ? 'bg-[#00c471]' : 'bg-gray-800'
          }`}
        >
          <i className={`mr-2 ${toast.tone === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle'}`} />
          {toast.message}
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-64px)] flex-col xl:flex-row">
        <section className="w-full shrink-0 border-r border-gray-200 bg-white xl:w-[390px]">
          <div className="border-b border-gray-100 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">수강생 Q&amp;A</h2>
              <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold text-orange-700">
                {statusFilter === 'pending' ? '미답변' : '답변 완료'} {visibleQuestions.length}건
              </span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <i className="fas fa-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#00c471]"
                  placeholder="제목, 작성자, 내용으로 검색"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={courseFilter}
                  onChange={(event) => setCourseFilter(event.target.value)}
                  className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#00c471]"
                >
                  <option value="all">전체 강의</option>
                  {courseOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={sortFilter}
                  onChange={(event) => setSortFilter(event.target.value as 'latest' | 'oldest')}
                  className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#00c471]"
                >
                  <option value="latest">최신순 정렬</option>
                  <option value="oldest">오래된 순 정렬</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                {[
                  ['pending', '미답변'],
                  ['answered', '답변 완료'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key as QuestionStatusFilter)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-xs font-bold transition ${
                      statusFilter === key
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-240px)] overflow-y-auto bg-[#f8f9fa] p-4 xl:max-h-[calc(100vh-64px-176px)]">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm font-semibold text-gray-400">
                질문 목록을 불러오는 중입니다.
              </div>
            ) : visibleQuestions.length > 0 ? (
              visibleQuestions.map((question) => (
                <button
                  key={question.questionId}
                  type="button"
                  onClick={() => setSelectedId(question.questionId)}
                  className={`mb-3 w-full rounded-2xl border border-l-4 p-4 text-left transition ${
                    selectedId === question.questionId
                      ? 'border-[#00c471] border-l-[#00c471] bg-[#f0fdf4] shadow-[0_6px_18px_rgba(0,196,113,0.08)]'
                      : 'border-gray-200 border-l-transparent bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)]'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(buildLearnerAvatarSeed(question))}`}
                        alt={question.learnerName ?? '수강생'}
                        className="h-7 w-7 rounded-full border border-gray-200 bg-white"
                      />
                      <span className="text-xs font-bold text-gray-900">{question.learnerName ?? '수강생'}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400">
                      {formatRelativeTime(question.createdAt)}
                    </span>
                  </div>

                  <h3 className="mb-1.5 line-clamp-1 text-sm font-extrabold text-gray-900">
                    {question.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
                    {question.content}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">
                      {question.courseTitle ?? '공통'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${buildStatusBadgeClasses(question.status)}`}
                    >
                      {buildStatusLabel(question.status)}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-gray-400">
                조건에 맞는 질문이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8f9fa]">
          {current ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4 shadow-sm lg:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                    {current.courseTitle ?? '공통 질문'}
                  </span>
                  <i className="fas fa-chevron-right text-[10px] text-gray-300" />
                  <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                    <i className="fas fa-play-circle text-gray-400" />
                    {current.lessonTitle ?? (current.lectureTimestamp ? '영상 구간 질문' : '일반 질문')}
                  </span>
                  {current.lectureTimestamp ? (
                    <span className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-[#00c471]">
                      <i className="fas fa-clock" />
                      {current.lectureTimestamp}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => openCourseScreen(current)}
                  disabled={!current.courseId}
                  className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-sm transition ${
                    current.courseId
                      ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#00c471]'
                      : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                >
                  <i className="fas fa-external-link-alt" />
                  강의 화면 보기
                </button>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden xl:flex-row">
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                  <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-5">
                      <div className="flex items-center gap-4">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(buildLearnerAvatarSeed(current))}`}
                          alt={current.learnerName ?? '수강생'}
                          className="h-11 w-11 rounded-full border border-gray-200 bg-gray-50 shadow-sm"
                        />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            {current.learnerName ?? '수강생'}
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                              수강생
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-gray-400">
                            {current.lectureTimestamp
                              ? `영상 구간 ${current.lectureTimestamp} · ${formatRelativeTime(current.createdAt)}`
                              : formatRelativeTime(current.createdAt)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${buildStatusBadgeClasses(current.status)}`}
                      >
                        {buildStatusLabel(current.status)}
                      </span>
                    </div>

                    <h3 className="mb-4 text-lg font-black text-gray-900 lg:text-xl">{current.title}</h3>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <MarkdownContent content={current.content} />
                    </div>
                  </div>
                  {timelineLoading ? (
                    <div className="mt-6 rounded-[28px] border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-400 shadow-sm">
                      답변 정보를 불러오는 중입니다.
                    </div>
                  ) : showAnswerForm ? (
                    <div className="mt-6 overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          {[
                            ['heading', 'fas fa-heading', '제목'],
                            ['bold', 'fas fa-bold', '굵게'],
                            ['italic', 'fas fa-italic', '기울임'],
                          ].map(([key, icon, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                applyMarkdown(key as 'heading' | 'bold' | 'italic')
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-900"
                              title={label}
                            >
                              <i className={icon} />
                            </button>
                          ))}
                          <div className="mx-1 h-4 w-px bg-gray-300" />
                          {[
                            ['link', 'fas fa-link', '링크'],
                            ['code', 'fas fa-code', '코드'],
                            ['image', 'fas fa-image', '이미지'],
                          ].map(([key, icon, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => applyMarkdown(key as 'link' | 'code' | 'image')}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-900"
                              title={label}
                            >
                              <i className={icon} />
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-gray-400">
                            {draftText.length} / 1000
                          </span>
                          <button
                            type="button"
                            onClick={() => setTemplateOpen(true)}
                            disabled={quickReplies.length === 0}
                            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-sm transition ${
                              quickReplies.length > 0
                                ? 'border-gray-200 bg-white text-gray-700 hover:border-[#00c471] hover:text-[#00c471]'
                                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            }`}
                          >
                            <i className="fas fa-magic text-[#00c471]" />
                            템플릿 사용
                          </button>
                        </div>
                      </div>

                      <textarea
                        ref={editorRef}
                        value={draftText}
                        onChange={(event) => setDraftText(event.target.value)}
                        maxLength={1000}
                        className="h-56 w-full resize-none bg-white px-6 py-6 text-sm leading-relaxed text-gray-800 outline-none"
                        placeholder={
                          '수강생에게 격려의 말과 해결책을 함께 담아 답변해주세요.\n(오른쪽 빠른 답변 카드나 상단 마크다운 버튼을 바로 사용할 수 있습니다.)'
                        }
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                          <i className="fas fa-info-circle text-gray-300" />
                          Markdown 문법을 지원합니다.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveDraft}
                            className="h-11 rounded-xl bg-gray-100 px-5 text-xs font-bold text-gray-600 transition hover:bg-gray-200"
                          >
                            임시저장
                          </button>
                          <button
                            type="button"
                            onClick={submitAnswer}
                            className="flex h-11 items-center gap-2 rounded-xl bg-[#00c471] px-7 text-xs font-bold text-white shadow-md transition hover:bg-[#00b366]"
                          >
                            <i className="fas fa-paper-plane" />
                            {timeline?.publishedAnswer ? '답변 수정' : '답변 등록'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[28px] border border-green-200 bg-white p-6 shadow-sm lg:p-8">
                      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={instructorDisplayName}
                            imageUrl={instructorProfileImage}
                            className="h-10 w-10 shadow-sm"
                            alt={instructorDisplayName}
                          />
                          <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                              {instructorDisplayName}
                              <span className="rounded bg-[#00c471] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                강사
                              </span>
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-gray-400">
                              답변 완료
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingAnswer(true)}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:text-[#00c471]"
                        >
                          <i className="fas fa-edit mr-1" />
                          수정
                        </button>
                      </div>

                      <MarkdownContent content={timeline?.publishedAnswer?.content ?? ''} />
                    </div>
                  )}
                </div>

                <aside className="w-full shrink-0 border-l border-gray-200 bg-white xl:w-[320px]">
                  <div className="border-b border-gray-100 bg-gray-50/50 p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <i className="fas fa-bolt text-yellow-500" />
                      빠른 답변 도구
                    </h3>
                    <p className="mt-1 text-[11px] font-medium text-gray-500">
                      자주 쓰는 문구와 템플릿을 한 번에 삽입할 수 있습니다.
                    </p>
                  </div>

                  <div className="space-y-6 p-5">
                    <div>
                      <h4 className="mb-3 px-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-400">
                        빠른 삽입
                      </h4>
                      <div className="space-y-2">
                        {quickReplies.length > 0 ? (
                          quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              type="button"
                              onClick={() => appendReply(reply.content)}
                              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:shadow-[0_10px_18px_rgba(15,23,42,0.05)]"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-1 text-[13px] font-black text-gray-900">
                                  {reply.title}
                                </div>
                                <div className="mt-1 line-clamp-2 text-[11px] font-medium leading-5 text-gray-500">
                                  {reply.content}
                                </div>
                              </div>
                              <i className="fas fa-plus-circle mt-1 text-lg text-gray-300" />
                            </button>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-xs font-medium text-gray-500">
                            저장된 빠른 답변이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-400">
                          저장한 빠른 답변
                        </h4>
                        <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-600">
                          {visibleQuestions.length}
                        </span>
                      </div>

                      <div className="mb-3 space-y-2">
                        {quickReplies.length > 0 ? (
                          quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              type="button"
                              onClick={() => appendReply(reply.content)}
                              className="group w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-left transition hover:border-[#00c471] hover:shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="line-clamp-1 flex-1 text-xs font-extrabold text-gray-900">
                                  {reply.title}
                                </div>
                                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openQuickModal(reply)
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-500"
                                    title="수정"
                                  >
                                    <i className="fas fa-pen text-[10px]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      deleteQuickReply(reply.id)
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-red-500"
                                    title="삭제"
                                  >
                                    <i className="fas fa-trash text-[10px]" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed font-medium text-gray-500">
                                {reply.content}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center text-[11px] font-semibold text-gray-400">
                            저장된 빠른 답변이 없습니다.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openQuickModal()}
                        className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-bold text-gray-500 transition hover:border-[#00c471] hover:bg-green-50 hover:text-[#00c471]"
                      >
                        <i className="fas fa-plus mr-1" />
                        빠른 답변 추가하기
                      </button>
                    </div>

                    <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold text-blue-800">
                        <i className="fas fa-check-double" />
                        좋은 답변 체크리스트
                      </h4>
                      <ul className="space-y-2 text-[11px] font-medium text-blue-700">
                        <li className="flex items-start gap-2">
                          <i className="fas fa-check-circle mt-0.5 opacity-50" />
                          결론을 먼저 말하고, 왜 그런지 바로 이어서 설명하기
                        </li>
                        <li className="flex items-start gap-2">
                          <i className="fas fa-check-circle mt-0.5 opacity-50" />
                          공식 문서나 확인 포인트가 있으면 함께 안내하기
                        </li>
                        <li className="flex items-start gap-2">
                          <i className="fas fa-check-circle mt-0.5 opacity-50" />
                          코드 예시는 마크다운 코드 블록으로 정리하기
                        </li>
                      </ul>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-16">
              <div className="max-w-md rounded-[28px] border border-dashed border-gray-300 bg-white px-8 py-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <i className="fas fa-inbox text-xl" />
                </div>
                <h3 className="text-lg font-black text-gray-900">표시할 질문이 없습니다.</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  왼쪽 목록에서 다른 필터를 선택하거나, 새 질문이 들어오면 여기서 바로 확인할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {quickOpen ? (
        <Modal title="저장한 빠른 답변 편집" icon="fas fa-bookmark" onClose={() => setQuickOpen(false)}>
          <div className="space-y-5 bg-[#f8f9fa] p-6">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-600">제목</label>
              <input
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                maxLength={30}
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium outline-none focus:border-[#00c471]"
                placeholder="예: JPA 순환 참조 답변"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600">답변 내용</label>
                <span className="text-[10px] font-bold text-gray-400">{quickBody.length} / 1000</span>
              </div>
              <textarea
                value={quickBody}
                onChange={(event) => setQuickBody(event.target.value)}
                maxLength={1000}
                className="h-48 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed outline-none focus:border-[#00c471]"
                placeholder="버튼 클릭 시 에디터에 그대로 삽입될 답변을 작성해주세요."
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
            <button
              type="button"
              onClick={() => setQuickBody(draftText)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 shadow-sm"
            >
              현재 에디터 내용 가져오기
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="rounded-xl px-5 py-2.5 text-xs font-semibold text-gray-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveQuickReply}
                className="rounded-xl bg-gray-900 px-6 py-2.5 text-xs font-bold text-white shadow-md"
              >
                저장하기
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {templateOpen ? (
        <Modal title="답변 템플릿 선택" icon="fas fa-magic" onClose={() => setTemplateOpen(false)}>
          <div className="space-y-3 bg-[#f8f9fa] p-6">
            {quickReplies.length > 0 ? (
              quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => {
                    appendReply(reply.content)
                    setTemplateOpen(false)
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-black text-gray-900">{reply.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs font-medium text-gray-500">
                      {reply.content}
                    </div>
                  </div>
                  <i className="fas fa-check-circle mt-1 text-xl text-gray-300" />
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm font-medium text-gray-500">
                등록된 답변 템플릿이 없습니다.
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
