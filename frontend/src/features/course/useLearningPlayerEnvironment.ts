import { useEffect,type Dispatch,type SetStateAction } from 'react'
import { AUTH_SESSION_SYNC_EVENT,readStoredAuthSession } from '../../lib/auth-session'
import type { AuthSession } from '../../types/auth'
import type { LearningCourseDetail,LearningLesson } from '../../types/learning'
import { syncLearningUrl } from './learning-player-support'

type LearningPlayerEnvironmentOptions = {
  course: LearningCourseDetail | null
  lesson: LearningLesson | null
  setSession: Dispatch<SetStateAction<AuthSession | null>>
  setAssignmentMessage: Dispatch<SetStateAction<string | null>>
}

export function useLearningPlayerEnvironment({
  course,
  lesson,
  setSession,
  setAssignmentMessage,
}: LearningPlayerEnvironmentOptions) {
  useEffect(() => {
    document.body.classList.add('overflow-hidden!')
    return () => document.body.classList.remove('overflow-hidden!')
  }, [])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [setSession])

  useEffect(() => {
    if (course && lesson) {
      document.title = `DevPath - ${course.title} | ${lesson.title}`
      syncLearningUrl(course.courseId, lesson.lessonId)
      setAssignmentMessage('파일을 첨부해 주세요.')
      return
    }
    document.title = 'DevPath - 학습 플레이어'
  }, [course, lesson, setAssignmentMessage])
}
