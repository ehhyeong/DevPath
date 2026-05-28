import { useEffect, useState } from 'react'
import CourseQuizEditorOverlay from '../course-editor/CourseQuizEditorOverlay'
import { buildCourseEditorHref, readLessonEditorContextFromUrl } from '../course-editor/editor-routing'
import { instructorCourseApi } from '../../lib/api'

function InvalidLessonView({ courseId }: { courseId: number | null }) {
  return (
    <div className="min-h-screen bg-[#f0f2f5] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-white/70 bg-white px-8 py-10 text-center shadow-xl shadow-gray-900/5">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <i className="fas fa-circle-exclamation text-2xl" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-gray-900">퀴즈 편집 정보를 찾지 못했습니다</h1>
        <p className="mt-3 text-sm leading-7 text-gray-500">
          `course-editor`에서 레슨을 저장한 뒤 다시 들어와 주세요.
        </p>
        <a
          href={buildCourseEditorHref(courseId)}
          className="mt-8 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
        >
          강의 편집기로 돌아가기
        </a>
      </div>
    </div>
  )
}

export default function QuizCreatorPage() {
  const { lessonId, lessonTitle, courseId } = readLessonEditorContextFromUrl()
  const [courseTags, setCourseTags] = useState<string[]>([])

  useEffect(() => {
    if (!courseId) {
      setCourseTags([])
      return
    }

    const controller = new AbortController()

    instructorCourseApi
      .getCourseDetail(courseId, controller.signal)
      .then((course) => {
        setCourseTags(course.tags.map((tag) => tag.tagName))
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCourseTags([])
        }
      })

    return () => controller.abort()
  }, [courseId])

  if (!lessonId) {
    return <InvalidLessonView courseId={courseId} />
  }

  return (
    <CourseQuizEditorOverlay
      lessonId={lessonId}
      lessonTitle={lessonTitle || '새 퀴즈'}
      courseTags={courseTags}
      onClose={() => window.location.assign(buildCourseEditorHref(courseId))}
      standalone
    />
  )
}
