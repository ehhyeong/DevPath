import { useEffect, useState } from 'react'
import CourseQuizEditorOverlay from '../course-editor/CourseQuizEditorOverlay'
import { buildCourseEditorHref, readLessonEditorContextFromUrl } from '../course-editor/editor-routing'
import { instructorCourseApi } from '../../lib/api/instructor'

const QUIZ_CREATOR_UI_LOCK_CLASSES = [
  "h-[calc(100dvh-var(--app-header-height))]! min-h-0! w-full! overflow-hidden! bg-[#f0f2f5]! text-[#1f2937]! font-['Pretendard',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]!",
  '[&_*]:box-border! [&_*]:tracking-[0]! [&_button]:[font:inherit]! [&_input]:[font:inherit]! [&_select]:[font:inherit]! [&_textarea]:[font:inherit]!',
  '[&_.course-quiz-editor-shell]:h-full! [&_.course-quiz-editor-shell]:min-h-0! [&_.course-quiz-editor-shell]:overflow-hidden!',
  '[&_.course-quiz-editor-ai-panel]:z-10! [&_.course-quiz-editor-ai-panel]:h-full! [&_.course-quiz-editor-ai-panel]:w-[384px]! [&_.course-quiz-editor-ai-panel]:flex-[0_0_384px]! [&_.course-quiz-editor-ai-panel]:border-r-[1px]! [&_.course-quiz-editor-ai-panel]:border-r-[#e5e7eb]! [&_.course-quiz-editor-ai-panel]:bg-[#ffffff]! [&_.course-quiz-editor-ai-panel]:[box-shadow:0_10px_15px_-3px_rgba(15,23,42,0.1),0_4px_6px_-4px_rgba(15,23,42,0.1)]!',
  '[&_.course-quiz-editor-ai-header]:flex-[0_0_auto]! [&_.course-quiz-editor-ai-header]:p-[24px]! [&_.course-quiz-editor-generator-footer]:flex-[0_0_auto]! [&_.course-quiz-editor-generator-footer]:p-[24px]!',
  '[&_.course-quiz-editor-ai-header_h2]:m-0! [&_.course-quiz-editor-ai-header_h2]:gap-[8px]! [&_.course-quiz-editor-ai-header_h2]:text-[#111827]! [&_.course-quiz-editor-ai-header_h2]:text-[20px]! [&_.course-quiz-editor-ai-header_h2]:leading-[28px]! [&_.course-quiz-editor-ai-header_h2]:font-[700]!',
  '[&_.course-quiz-editor-ai-header_h2_i]:text-[#9333ea]! [&_.course-quiz-editor-ai-header_h2_i]:text-[20px]!',
  '[&_.course-quiz-editor-ai-header_p]:mt-[4px]! [&_.course-quiz-editor-ai-header_p]:text-[#6b7280]! [&_.course-quiz-editor-ai-header_p]:text-[12px]! [&_.course-quiz-editor-ai-header_p]:leading-[16px]!',
  '[&_.course-quiz-editor-ai-body]:min-h-0! [&_.course-quiz-editor-ai-body]:p-[24px]!',
  '[&_.course-quiz-editor-mode-tabs]:mb-[24px]! [&_.course-quiz-editor-mode-tabs]:h-[40px]! [&_.course-quiz-editor-mode-tabs]:rounded-[12px]! [&_.course-quiz-editor-mode-tabs]:bg-[#f3f4f6]! [&_.course-quiz-editor-mode-tabs]:p-[4px]!',
  '[&_.course-quiz-editor-mode-tab]:h-[32px]! [&_.course-quiz-editor-mode-tab]:min-h-[32px]! [&_.course-quiz-editor-mode-tab]:rounded-[8px]! [&_.course-quiz-editor-mode-tab]:px-0! [&_.course-quiz-editor-mode-tab]:py-[8px]! [&_.course-quiz-editor-mode-tab]:text-[12px]! [&_.course-quiz-editor-mode-tab]:leading-[16px]! [&_.course-quiz-editor-mode-tab]:font-[700]!',
  '[&_.course-quiz-editor-upload-box]:min-h-[154px]! [&_.course-quiz-editor-upload-box]:rounded-[12px]! [&_.course-quiz-editor-upload-box]:border-[2px]! [&_.course-quiz-editor-upload-box]:border-dashed! [&_.course-quiz-editor-upload-box]:border-[#d1d5db]! [&_.course-quiz-editor-upload-box]:p-[32px]!',
  '[&_.course-quiz-editor-upload-box_i]:mb-[8px]! [&_.course-quiz-editor-upload-box_i]:text-[30px]! [&_.course-quiz-editor-upload-box_i]:leading-[36px]!',
  '[&_.course-quiz-editor-upload-box_span:first-of-type]:text-[#4b5563]! [&_.course-quiz-editor-upload-box_span:first-of-type]:text-[14px]! [&_.course-quiz-editor-upload-box_span:first-of-type]:leading-[20px]! [&_.course-quiz-editor-upload-box_span:first-of-type]:font-[700]!',
  '[&_.course-quiz-editor-upload-box_span:last-of-type]:mt-[4px]! [&_.course-quiz-editor-upload-box_span:last-of-type]:text-[#9ca3af]! [&_.course-quiz-editor-upload-box_span:last-of-type]:text-[10px]! [&_.course-quiz-editor-upload-box_span:last-of-type]:leading-[14px]!',
  '[&_.course-quiz-editor-ai-body_label]:text-[#374151]! [&_.course-quiz-editor-ai-body_label]:text-[12px]! [&_.course-quiz-editor-ai-body_label]:leading-[16px]! [&_.course-quiz-editor-ai-body_label]:font-[700]!',
  '[&_.course-quiz-editor-ai-body_input:not([type=range]):not([type=file])]:text-[#111827]! [&_.course-quiz-editor-ai-body_input:not([type=range]):not([type=file])]:text-[14px]! [&_.course-quiz-editor-ai-body_input:not([type=range]):not([type=file])]:leading-[20px]! [&_.course-quiz-editor-ai-body_textarea]:text-[#111827]! [&_.course-quiz-editor-ai-body_textarea]:text-[14px]! [&_.course-quiz-editor-ai-body_textarea]:leading-[20px]!',
  '[&_.course-quiz-editor-ai-body_textarea]:h-[128px]! [&_.course-quiz-editor-ai-body_textarea]:rounded-[8px]! [&_.course-quiz-editor-ai-body_textarea]:p-[12px]!',
  '[&_.course-quiz-editor-ai-body_.rounded-full]:px-[12px]! [&_.course-quiz-editor-ai-body_.rounded-full]:py-[4px]! [&_.course-quiz-editor-ai-body_.rounded-full]:text-[11px]! [&_.course-quiz-editor-ai-body_.rounded-full]:leading-[14px]! [&_.course-quiz-editor-ai-body_.rounded-full]:font-[700]!',
  '[&_.course-quiz-editor-ai-body_input[type=range]]:h-[6px]!',
  '[&_.course-quiz-editor-generator-footer]:border-t-[1px]! [&_.course-quiz-editor-generator-footer]:border-t-[#f3f4f6]! [&_.course-quiz-editor-generator-footer]:bg-[#f9fafb]!',
  '[&_.course-quiz-editor-generate-button]:h-[44px]! [&_.course-quiz-editor-generate-button]:min-h-[44px]! [&_.course-quiz-editor-generate-button]:rounded-[12px]! [&_.course-quiz-editor-generate-button]:bg-[#111827]! [&_.course-quiz-editor-generate-button]:px-[16px]! [&_.course-quiz-editor-generate-button]:py-[12px]! [&_.course-quiz-editor-generate-button]:text-[14px]! [&_.course-quiz-editor-generate-button]:leading-[20px]! [&_.course-quiz-editor-generate-button]:font-[700]! [&_.course-quiz-editor-generate-button]:[box-shadow:0_10px_15px_-3px_rgba(17,24,39,0.18)]!',
  '[&_.course-quiz-editor-generate-button:hover:not(:disabled)]:bg-[#000000]!',
  '[&_.course-quiz-editor-workspace]:h-full! [&_.course-quiz-editor-workspace]:min-h-0! [&_.course-quiz-editor-workspace]:min-w-0! [&_.course-quiz-editor-workspace]:bg-[#f0f2f5]!',
  '[&_.course-quiz-editor-workspace-header]:h-[64px]! [&_.course-quiz-editor-workspace-header]:min-h-[64px]! [&_.course-quiz-editor-workspace-header]:border-b-[1px]! [&_.course-quiz-editor-workspace-header]:border-b-[#e5e7eb]! [&_.course-quiz-editor-workspace-header]:bg-[#ffffff]! [&_.course-quiz-editor-workspace-header]:px-[32px]! [&_.course-quiz-editor-workspace-header]:py-0!',
  '[&_.course-quiz-editor-workspace-header_h1]:m-0! [&_.course-quiz-editor-workspace-header_h1]:text-[#111827]! [&_.course-quiz-editor-workspace-header_h1]:text-[18px]! [&_.course-quiz-editor-workspace-header_h1]:leading-[28px]! [&_.course-quiz-editor-workspace-header_h1]:font-[700]!',
  '[&_.course-quiz-editor-workspace-header_p]:m-0! [&_.course-quiz-editor-workspace-header_p]:text-[#6b7280]! [&_.course-quiz-editor-workspace-header_p]:text-[12px]! [&_.course-quiz-editor-workspace-header_p]:leading-[16px]!',
  '[&_.course-quiz-editor-title-group]:gap-[12px]!',
  '[&_.course-quiz-editor-back-button]:h-[32px]! [&_.course-quiz-editor-back-button]:min-h-[32px]! [&_.course-quiz-editor-back-button]:w-[32px]! [&_.course-quiz-editor-back-button]:min-w-[32px]! [&_.course-quiz-editor-back-button]:rounded-[9999px]! [&_.course-quiz-editor-back-button]:border-0! [&_.course-quiz-editor-back-button]:[border-style:none]! [&_.course-quiz-editor-back-button]:bg-[#f9fafb]! [&_.course-quiz-editor-back-button]:p-0! [&_.course-quiz-editor-back-button]:text-[#4b5563]! [&_.course-quiz-editor-back-button]:text-[14px]! [&_.course-quiz-editor-back-button]:leading-none! [&_.course-quiz-editor-back-button]:[box-shadow:0_1px_2px_rgba(15,23,42,0.08)]!',
  '[&_.course-quiz-editor-back-button:hover]:bg-[#e5e7eb]! [&_.course-quiz-editor-back-button:hover]:text-[#111827]!',
  '[&_.course-quiz-editor-meta]:mr-[16px]! [&_.course-quiz-editor-meta]:gap-[8px]! [&_.course-quiz-editor-meta]:text-[#6b7280]! [&_.course-quiz-editor-meta]:text-[12px]! [&_.course-quiz-editor-meta]:leading-[16px]!',
  '[&_.course-quiz-editor-meta_input]:h-[22px]! [&_.course-quiz-editor-meta_input]:min-h-0! [&_.course-quiz-editor-meta_input]:w-[40px]! [&_.course-quiz-editor-meta_input]:rounded-none! [&_.course-quiz-editor-meta_input]:[border-width:0_0_1px]! [&_.course-quiz-editor-meta_input]:border-[#d1d5db]! [&_.course-quiz-editor-meta_input]:bg-transparent! [&_.course-quiz-editor-meta_input]:p-0! [&_.course-quiz-editor-meta_input]:text-center!',
  '[&_.course-quiz-editor-secondary-button]:h-[34px]! [&_.course-quiz-editor-secondary-button]:min-h-[34px]! [&_.course-quiz-editor-secondary-button]:rounded-[8px]! [&_.course-quiz-editor-secondary-button]:text-[12px]! [&_.course-quiz-editor-secondary-button]:leading-[16px]! [&_.course-quiz-editor-secondary-button]:font-[700]! [&_.course-quiz-editor-primary-button]:h-[34px]! [&_.course-quiz-editor-primary-button]:min-h-[34px]! [&_.course-quiz-editor-primary-button]:rounded-[8px]! [&_.course-quiz-editor-primary-button]:text-[12px]! [&_.course-quiz-editor-primary-button]:leading-[16px]! [&_.course-quiz-editor-primary-button]:font-[700]!',
  '[&_.course-quiz-editor-secondary-button]:border-[1px]! [&_.course-quiz-editor-secondary-button]:border-solid! [&_.course-quiz-editor-secondary-button]:border-[#d1d5db]! [&_.course-quiz-editor-secondary-button]:bg-[#ffffff]! [&_.course-quiz-editor-secondary-button]:px-[16px]! [&_.course-quiz-editor-secondary-button]:py-[8px]! [&_.course-quiz-editor-secondary-button]:text-[#4b5563]!',
  '[&_.course-quiz-editor-secondary-button:hover]:bg-[#f9fafb]!',
  '[&_.course-quiz-editor-primary-button]:bg-[#00c471]! [&_.course-quiz-editor-primary-button]:px-[20px]! [&_.course-quiz-editor-primary-button]:py-[8px]! [&_.course-quiz-editor-primary-button]:text-[#ffffff]! [&_.course-quiz-editor-primary-button]:[box-shadow:0_4px_6px_-1px_rgba(0,196,113,0.25)]!',
  '[&_.course-quiz-editor-primary-button:hover:not(:disabled)]:bg-[#16a34a]!',
  '[&_.course-quiz-editor-settings-status]:text-[#00a85f]! [&_.course-quiz-editor-settings-status]:text-[12px]! [&_.course-quiz-editor-settings-status]:leading-[16px]! [&_.course-quiz-editor-settings-status]:font-[800]!',
  '[&_.course-quiz-editor-workspace-body]:min-h-0! [&_.course-quiz-editor-workspace-body]:overflow-y-auto! [&_.course-quiz-editor-workspace-body]:p-[32px]!',
  '[&_.course-quiz-editor-list]:mx-auto! [&_.course-quiz-editor-list]:w-full! [&_.course-quiz-editor-list]:max-w-[768px]! [&_.course-quiz-editor-list]:gap-y-[24px]!',
  '[&_.course-quiz-editor-empty-state]:py-[80px]!',
  '[&_.course-quiz-editor-empty-state_i]:mb-[16px]! [&_.course-quiz-editor-empty-state_i]:text-[#d1d5db]! [&_.course-quiz-editor-empty-state_i]:text-[60px]! [&_.course-quiz-editor-empty-state_i]:leading-none!',
  '[&_.course-quiz-editor-empty-state_p:first-of-type]:text-[#6b7280]! [&_.course-quiz-editor-empty-state_p:first-of-type]:text-[18px]! [&_.course-quiz-editor-empty-state_p:first-of-type]:leading-[28px]! [&_.course-quiz-editor-empty-state_p:first-of-type]:font-[700]!',
  '[&_.course-quiz-editor-empty-state_p:last-of-type]:mt-0! [&_.course-quiz-editor-empty-state_p:last-of-type]:text-[#9ca3af]! [&_.course-quiz-editor-empty-state_p:last-of-type]:text-[14px]! [&_.course-quiz-editor-empty-state_p:last-of-type]:leading-[20px]!',
  '[&_.course-quiz-editor-question-card]:rounded-[12px]! [&_.course-quiz-editor-question-card]:border-[1px]! [&_.course-quiz-editor-question-card]:border-solid! [&_.course-quiz-editor-question-card]:border-[#e5e7eb]! [&_.course-quiz-editor-question-card]:bg-[#ffffff]! [&_.course-quiz-editor-question-card]:p-[24px]! [&_.course-quiz-editor-question-card]:[box-shadow:0_1px_2px_0_rgba(15,23,42,0.05)]!',
  '[&_.course-quiz-editor-question-card:hover]:border-[#00c471]! [&_.course-quiz-editor-question-card:hover]:[box-shadow:0_4px_6px_-1px_rgba(15,23,42,0.1)]!',
  '[&_.course-quiz-editor-question-card>div:first-child]:mb-[16px]!',
  '[&_.course-quiz-editor-type-select]:h-[24px]! [&_.course-quiz-editor-type-select]:min-h-[24px]! [&_.course-quiz-editor-type-select]:rounded-[4px]! [&_.course-quiz-editor-type-select]:border-0! [&_.course-quiz-editor-type-select]:[border-style:none]! [&_.course-quiz-editor-type-select]:bg-[#f3f4f6]! [&_.course-quiz-editor-type-select]:px-[8px]! [&_.course-quiz-editor-type-select]:py-[2px]! [&_.course-quiz-editor-type-select]:text-[#6b7280]! [&_.course-quiz-editor-type-select]:text-[12px]! [&_.course-quiz-editor-type-select]:leading-[16px]! [&_.course-quiz-editor-type-select]:font-[700]!',
  '[&_.course-quiz-editor-card-actions]:gap-[8px]!',
  '[&_.course-quiz-editor-card-actions_button]:inline-flex! [&_.course-quiz-editor-card-actions_button]:h-[24px]! [&_.course-quiz-editor-card-actions_button]:w-[24px]! [&_.course-quiz-editor-card-actions_button]:items-center! [&_.course-quiz-editor-card-actions_button]:justify-center! [&_.course-quiz-editor-card-actions_button]:text-[#9ca3af]! [&_.course-quiz-editor-card-actions_button]:text-[14px]!',
  '[&_.course-quiz-editor-question-input]:mb-[16px]! [&_.course-quiz-editor-question-input]:min-h-[32px]! [&_.course-quiz-editor-question-input]:[border-width:0_0_1px]! [&_.course-quiz-editor-question-input]:border-transparent! [&_.course-quiz-editor-question-input]:px-0! [&_.course-quiz-editor-question-input]:pt-0! [&_.course-quiz-editor-question-input]:pb-[4px]! [&_.course-quiz-editor-question-input]:text-[#111827]! [&_.course-quiz-editor-question-input]:text-[18px]! [&_.course-quiz-editor-question-input]:leading-[28px]! [&_.course-quiz-editor-question-input]:font-[700]!',
  '[&_.course-quiz-editor-question-card_.space-y-2]:gap-y-[8px]! [&_.course-quiz-editor-question-card_.space-y-2]:pl-[8px]!',
  '[&_.course-quiz-editor-question-card_.space-y-2>div]:min-h-[42px]! [&_.course-quiz-editor-question-card_.space-y-2>div]:gap-[12px]! [&_.course-quiz-editor-question-card_.space-y-2>div]:rounded-[8px]! [&_.course-quiz-editor-question-card_.space-y-2>div]:p-[8px]!',
  '[&_.course-quiz-editor-question-card_input[type=radio]]:h-[16px]! [&_.course-quiz-editor-question-card_input[type=radio]]:w-[16px]! [&_.course-quiz-editor-question-card_input[type=radio]]:accent-[#3b82f6]!',
  '[&_.course-quiz-editor-question-card_.space-y-2_input[type=text]]:text-[#4b5563]! [&_.course-quiz-editor-question-card_.space-y-2_input[type=text]]:text-[14px]! [&_.course-quiz-editor-question-card_.space-y-2_input[type=text]]:leading-[20px]! [&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100_input]:text-[#4b5563]! [&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100_input]:text-[14px]! [&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100_input]:leading-[20px]!',
  '[&_.course-quiz-editor-question-card_.space-y-2_.border-emerald-500_input[type=text]]:text-[#15803d]! [&_.course-quiz-editor-question-card_.space-y-2_.border-emerald-500_input[type=text]]:font-[700]!',
  '[&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100]:rounded-[8px]! [&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100]:p-[12px]!',
  '[&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100_input]:h-[38px]! [&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100_input]:rounded-[4px]! [&_.course-quiz-editor-question-card_.rounded-lg.border-emerald-100_input]:p-[8px]!',
  '[&_.course-quiz-editor-question-card_.mt-2.flex.gap-4_button]:min-h-[48px]! [&_.course-quiz-editor-question-card_.mt-2.flex.gap-4_button]:rounded-[8px]! [&_.course-quiz-editor-question-card_.mt-2.flex.gap-4_button]:p-[12px]! [&_.course-quiz-editor-question-card_.mt-2.flex.gap-4_button]:text-[14px]! [&_.course-quiz-editor-question-card_.mt-2.flex.gap-4_button]:leading-[20px]! [&_.course-quiz-editor-question-card_.mt-2.flex.gap-4_button]:font-[700]!',
  '[&_.course-quiz-editor-question-card_.mt-3.flex]:mt-[12px]! [&_.course-quiz-editor-question-card_.mt-3.flex]:pl-[8px]! [&_.course-quiz-editor-question-card_.mt-3.flex]:text-[#3b82f6]! [&_.course-quiz-editor-question-card_.mt-3.flex]:text-[12px]! [&_.course-quiz-editor-question-card_.mt-3.flex]:leading-[16px]! [&_.course-quiz-editor-question-card_.mt-3.flex]:font-[700]!',
  '[&_.course-quiz-editor-add-question-button]:min-h-[84px]! [&_.course-quiz-editor-add-question-button]:rounded-[12px]! [&_.course-quiz-editor-add-question-button]:border-[2px]! [&_.course-quiz-editor-add-question-button]:border-dashed! [&_.course-quiz-editor-add-question-button]:border-[#d1d5db]! [&_.course-quiz-editor-add-question-button]:bg-[rgba(255,255,255,0.7)]! [&_.course-quiz-editor-add-question-button]:p-[16px]! [&_.course-quiz-editor-add-question-button]:text-[#9ca3af]! [&_.course-quiz-editor-add-question-button]:text-[14px]! [&_.course-quiz-editor-add-question-button]:leading-[20px]! [&_.course-quiz-editor-add-question-button]:font-[700]!',
  '[&_.course-quiz-editor-add-question-button_i]:text-[24px]! [&_.course-quiz-editor-add-question-button_i]:leading-none!',
].join(' ')

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
  const [courseTagsResult, setCourseTagsResult] = useState<{ courseId: number; tags: string[] } | null>(null)
  const courseTags = courseTagsResult?.courseId === courseId ? courseTagsResult.tags : []

  useEffect(() => {
    if (!courseId) {
      return
    }

    const controller = new AbortController()

    instructorCourseApi
      .getCourseDetail(courseId, controller.signal)
      .then((course) => {
        setCourseTagsResult({ courseId, tags: course.tags.map((tag) => tag.tagName) })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCourseTagsResult({ courseId, tags: [] })
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
      standaloneClassName={QUIZ_CREATOR_UI_LOCK_CLASSES}
    />
  )
}
