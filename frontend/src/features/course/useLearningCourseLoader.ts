import { useEffect, type MutableRefObject } from 'react'
import { courseApi, learningPlayerApi, lessonNoteApi, lessonSessionApi } from '../../lib/api/learner'
import type { LearningLessonProgress, TimestampNote } from '../../types/learning'
import { COURSE_LOAD_TIMEOUT_MS, createDefaultPlayerConfig, isAbortError, LESSON_LOAD_TIMEOUT_MS, requestWithTimeout } from './learning-player-model'
import { createDefaultProgress, getFlattenedLessons, getNotesStorageKey, getProgressStorageKey, normalizeCourseDetail, readJsonStorage, writeJsonStorage, type FlattenedLesson } from './learning-player-support'
import { useLearningCourseState, useLearningNotesAndQnaState, useLearningPlaybackState } from './useLearningPlayerState'

type Props = {
  courseState: ReturnType<typeof useLearningCourseState>
  playbackState: ReturnType<typeof useLearningPlaybackState>
  notesState: ReturnType<typeof useLearningNotesAndQnaState>
  initialCourseId: number | null
  initialLessonId: number | null
  isStudentPreview: boolean
  lessons: FlattenedLesson[]
  lesson: FlattenedLesson | null
  selectedLessonLocked: boolean
  shouldResumePlayback: boolean
  resolveInitialPlaybackSeconds: (lessonId: number, fallbackSeconds: number) => number
  mergeLessonProgress: (lessonId: number, nextProgress: LearningLessonProgress, currentProgress?: LearningLessonProgress | null) => LearningLessonProgress
  resumeTimeRef: MutableRefObject<number>
  lastRenderedSecondRef: MutableRefObject<number>
  completedPersistedLessonIdRef: MutableRefObject<number | null>
}

export function useLearningCourseLoader(props: Props) {
  const { courseState, playbackState, notesState, initialCourseId, initialLessonId, isStudentPreview, lessons, lesson, selectedLessonLocked, shouldResumePlayback, resolveInitialPlaybackSeconds, mergeLessonProgress, resumeTimeRef, lastRenderedSecondRef, completedPersistedLessonIdRef } = props
  const { session, setCourse, setCourseError, setSelectedLessonId, setLoadingCourse, setLessonProgressById, setLoadingLessonProgressMap, setProgress, setPlayerConfig, setLoadingLesson, setNotice } = courseState
  const { setDuration, setCurrentTime, setIsPipActive, setIsPlaying, setVideoFailed } = playbackState
  const { setNotes, setNoteContent, setNoteMessage } = notesState

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
        setSelectedLessonId(initialLessonId && nextLessons.some((item) => item.lessonId === initialLessonId)
          ? initialLessonId
          : nextLessons[0].lessonId)
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
  }, [initialCourseId, initialLessonId, session, setCourse, setCourseError, setLoadingCourse, setSelectedLessonId])

  useEffect(() => {
    if (!session || !lessons.length) {
      setLessonProgressById({})
      setLoadingLessonProgressMap(false)
      return
    }
    if (isStudentPreview) {
      setLessonProgressById(Object.fromEntries(lessons.map((item) => [item.lessonId, createDefaultProgress(item.lessonId)])))
      setLoadingLessonProgressMap(false)
      return
    }
    let cancelled = false

    async function loadLessonProgressMap() {
      setLoadingLessonProgressMap(true)
      const progressEntries = await Promise.all(lessons.map(async (item) => {
        try {
          const nextProgress = await requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => lessonSessionApi.getProgress(item.lessonId, signal))
          return [item.lessonId, nextProgress] as const
        } catch {
          return [item.lessonId, createDefaultProgress(item.lessonId)] as const
        }
      }))
      if (cancelled) return
      setLessonProgressById(Object.fromEntries(progressEntries))
      setLoadingLessonProgressMap(false)
    }

    void loadLessonProgressMap()
    return () => { cancelled = true }
  }, [isStudentPreview, lessons, session, setLessonProgressById, setLoadingLessonProgressMap])

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
    const selectedLesson = lesson

    async function loadLessonState() {
      setLoadingLesson(true)
      setNotice(null)
      setVideoFailed(false)
      setNoteContent('')
      setNoteMessage(null)
      completedPersistedLessonIdRef.current = null

      const storedProgress = readJsonStorage(getProgressStorageKey(selectedLesson.lessonId), createDefaultProgress(selectedLesson.lessonId))
      const storedNotes = readJsonStorage(getNotesStorageKey(selectedLesson.lessonId), [] as TimestampNote[])
      const lessonDuration = selectedLesson.durationSeconds ?? 0
      const storedFullyWatched = lessonDuration > 0 && storedProgress.progressSeconds >= lessonDuration
      const initialProgressSeconds = resolveInitialPlaybackSeconds(selectedLesson.lessonId, shouldResumePlayback && !storedFullyWatched ? storedProgress.progressSeconds : 0)
      resumeTimeRef.current = initialProgressSeconds
      lastRenderedSecondRef.current = initialProgressSeconds
      setProgress(storedProgress)
      setPlayerConfig(createDefaultPlayerConfig(selectedLesson.lessonId))
      setNotes(storedNotes)
      setCurrentTime(initialProgressSeconds)
      setDuration(lessonDuration)

      if (isStudentPreview) {
        const previewProgress: LearningLessonProgress = {
          ...createDefaultProgress(selectedLesson.lessonId),
          progressPercent: lessonDuration > 0 ? Math.max(0, Math.min(100, Math.round((initialProgressSeconds / lessonDuration) * 100))) : 0,
          progressSeconds: initialProgressSeconds,
        }
        setProgress(previewProgress)
        setLessonProgressById((current) => ({ ...current, [selectedLesson.lessonId]: previewProgress }))
        setLoadingLesson(false)
        return
      }

      try {
        const [sessionProgress, config, fetchedNotes] = await Promise.all([
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => lessonSessionApi.startSession(selectedLesson.lessonId, signal)),
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => learningPlayerApi.getPlayerConfig(selectedLesson.lessonId, signal)).catch(() => null),
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => lessonNoteApi.getNotes(selectedLesson.lessonId, signal)).catch(() => null),
        ])
        if (cancelled) return
        const nextProgress = {
          ...sessionProgress,
          defaultPlaybackRate: config?.defaultPlaybackRate ?? sessionProgress.defaultPlaybackRate ?? 1,
          pipEnabled: config?.pipEnabled ?? sessionProgress.pipEnabled ?? false,
        }
        const sessionFullyWatched = lessonDuration > 0 && nextProgress.progressSeconds >= lessonDuration
        const nextResumeSeconds = resolveInitialPlaybackSeconds(selectedLesson.lessonId, shouldResumePlayback && !sessionFullyWatched ? nextProgress.progressSeconds : 0)
        resumeTimeRef.current = nextResumeSeconds
        lastRenderedSecondRef.current = nextResumeSeconds
        setProgress(nextProgress)
        setLessonProgressById((current) => ({ ...current, [selectedLesson.lessonId]: mergeLessonProgress(selectedLesson.lessonId, nextProgress, current[selectedLesson.lessonId]) }))
        setPlayerConfig({ lessonId: selectedLesson.lessonId, defaultPlaybackRate: nextProgress.defaultPlaybackRate, pipEnabled: nextProgress.pipEnabled })
        setCurrentTime(nextResumeSeconds)
        writeJsonStorage(getProgressStorageKey(selectedLesson.lessonId), nextProgress)
        if (fetchedNotes) {
          setNotes(fetchedNotes)
          writeJsonStorage(getNotesStorageKey(selectedLesson.lessonId), fetchedNotes)
        }
      } catch (error) {
        if (!cancelled && isAbortError(error)) setNotice('강의 상태 불러오기가 오래 걸립니다. 캐시된 값을 표시합니다.')
      } finally {
        if (!cancelled) setLoadingLesson(false)
      }
    }

    void loadLessonState()
    return () => { cancelled = true }
  }, [completedPersistedLessonIdRef, isStudentPreview, lastRenderedSecondRef, lesson, mergeLessonProgress, resolveInitialPlaybackSeconds, resumeTimeRef, selectedLessonLocked, setCurrentTime, setDuration, setIsPipActive, setIsPlaying, setLessonProgressById, setLoadingLesson, setNoteContent, setNoteMessage, setNotes, setNotice, setPlayerConfig, setProgress, setVideoFailed, shouldResumePlayback])
}
