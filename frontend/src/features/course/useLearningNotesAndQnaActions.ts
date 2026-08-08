import { startTransition } from 'react'
import { lessonNoteApi, qnaApi } from '../../lib/api/learner'
import type { LearningCourseDetail, LearningLesson, TimestampNote } from '../../types/learning'
import type { CreateQnaQuestionRequest } from '../../types/qna'
import { formatTime, getNotesStorageKey, writeJsonStorage } from './learning-player-support'
import { toQuestionSummary, type TabKey } from './learning-player-model'
import { useLearningNotesAndQnaState } from './useLearningPlayerState'

type Props = {
  state: ReturnType<typeof useLearningNotesAndQnaState>
  lesson: LearningLesson | null
  course: LearningCourseDetail | null
  currentTime: number
  isStudentPreview: boolean
  sessionUserId: number | null
  setActiveTab: (tab: TabKey) => void
}

export function useLearningNotesAndQnaActions({ state, lesson, course, currentTime, isStudentPreview, sessionUserId, setActiveTab }: Props) {
  const { notes, setNotes, noteContent, setNoteContent, setNoteComposerOpen, setNoteMessage, setQnaQuestions, qnaDetails, setQnaDetails, setQnaError, setOpenQuestionId, loadingQuestionId, setLoadingQuestionId, questionForm, setQuestionForm, setQuestionMessage, setQuestionBusy, setQuestionComposerOpen, openNoteId, setOpenNoteId, editingNoteContent, setEditingNoteContent } = state

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

  return { handleToggleQuestion, handleSaveNote, handleDeleteNote, handleUpdateNote, handleSubmitQuestion }
}
