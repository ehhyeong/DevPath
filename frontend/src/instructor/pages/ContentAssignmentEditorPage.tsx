import CourseAssignmentEditorOverlay from '../course-editor/CourseAssignmentEditorOverlay'
import { buildCourseEditorHref, readLessonEditorContextFromUrl } from '../course-editor/editor-routing'

const CONTENT_ASSIGNMENT_EDITOR_UI_LOCK_CLASSES = [
  "h-[calc(100dvh-var(--app-header-height))]! min-h-0! w-full! overflow-hidden! bg-[#f8f9fa]! text-[#1f2937]! font-['Pretendard',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]!",
  '[&_*]:box-border! [&_*]:tracking-[0]! [&_button]:[font:inherit]! [&_input]:[font:inherit]! [&_select]:[font:inherit]!',
  '[&_.content-assignment-editor-shell]:h-full! [&_.content-assignment-editor-shell]:min-h-0! [&_.content-assignment-editor-shell]:overflow-hidden! [&_.content-assignment-editor-shell]:bg-[#f8f9fa]!',
  '[&_.content-assignment-editor-topbar]:h-[64px]! [&_.content-assignment-editor-topbar]:min-h-[64px]! [&_.content-assignment-editor-topbar]:border-b-[1px]! [&_.content-assignment-editor-topbar]:border-b-[#e5e7eb]! [&_.content-assignment-editor-topbar]:bg-[#ffffff]! [&_.content-assignment-editor-topbar]:px-[32px]! [&_.content-assignment-editor-topbar]:py-0! [&_.content-assignment-editor-topbar]:[box-shadow:0_1px_2px_rgba(15,23,42,0.05)]!',
  '[&_.content-assignment-editor-back-button]:h-[32px]! [&_.content-assignment-editor-back-button]:min-h-[32px]! [&_.content-assignment-editor-back-button]:w-[32px]! [&_.content-assignment-editor-back-button]:min-w-[32px]! [&_.content-assignment-editor-back-button]:rounded-[9999px]! [&_.content-assignment-editor-back-button]:border-[1px]! [&_.content-assignment-editor-back-button]:border-solid! [&_.content-assignment-editor-back-button]:border-[#e5e7eb]! [&_.content-assignment-editor-back-button]:bg-[#ffffff]! [&_.content-assignment-editor-back-button]:p-0! [&_.content-assignment-editor-back-button]:text-[#6b7280]! [&_.content-assignment-editor-back-button]:text-[14px]!',
  '[&_.content-assignment-editor-back-button:hover]:bg-[#f9fafb]! [&_.content-assignment-editor-back-button:hover]:text-[#111827]!',
  '[&_.content-assignment-editor-topbar_h1]:m-0! [&_.content-assignment-editor-topbar_h1]:text-[#111827]! [&_.content-assignment-editor-topbar_h1]:text-[18px]! [&_.content-assignment-editor-topbar_h1]:leading-[28px]! [&_.content-assignment-editor-topbar_h1]:font-[800]!',
  '[&_.content-assignment-editor-topbar_p]:mt-[2px]! [&_.content-assignment-editor-topbar_p]:rounded-[4px]! [&_.content-assignment-editor-topbar_p]:bg-[#f3f4f6]! [&_.content-assignment-editor-topbar_p]:px-[8px]! [&_.content-assignment-editor-topbar_p]:py-[2px]! [&_.content-assignment-editor-topbar_p]:text-[#6b7280]! [&_.content-assignment-editor-topbar_p]:text-[10px]! [&_.content-assignment-editor-topbar_p]:leading-[14px]! [&_.content-assignment-editor-topbar_p]:font-[700]!',
  '[&_.content-assignment-editor-save-button]:h-[40px]! [&_.content-assignment-editor-save-button]:min-h-[40px]! [&_.content-assignment-editor-save-button]:gap-[8px]! [&_.content-assignment-editor-save-button]:rounded-[12px]! [&_.content-assignment-editor-save-button]:bg-[#00c471]! [&_.content-assignment-editor-save-button]:px-[24px]! [&_.content-assignment-editor-save-button]:py-[10px]! [&_.content-assignment-editor-save-button]:text-[#ffffff]! [&_.content-assignment-editor-save-button]:text-[14px]! [&_.content-assignment-editor-save-button]:leading-[20px]! [&_.content-assignment-editor-save-button]:font-[700]! [&_.content-assignment-editor-save-button]:[box-shadow:0_10px_15px_-3px_rgba(0,196,113,0.2)]!',
  '[&_.content-assignment-editor-save-button:hover:not(:disabled)]:bg-[#16a34a]!',
  '[&_.content-assignment-editor-body]:min-h-0! [&_.content-assignment-editor-body]:overflow-y-auto! [&_.content-assignment-editor-body]:bg-[#f8f9fa]! [&_.content-assignment-editor-body]:p-[32px]!',
  '[&_.content-assignment-editor-content]:mx-auto! [&_.content-assignment-editor-content]:w-full! [&_.content-assignment-editor-content]:max-w-[896px]! [&_.content-assignment-editor-content]:gap-y-[24px]! [&_.content-assignment-editor-content]:pb-[80px]!',
  '[&_.content-assignment-editor-card]:rounded-[16px]! [&_.content-assignment-editor-card]:border-[1px]! [&_.content-assignment-editor-card]:border-solid! [&_.content-assignment-editor-card]:border-[#e5e7eb]! [&_.content-assignment-editor-card]:bg-[#ffffff]! [&_.content-assignment-editor-card]:[box-shadow:0_1px_2px_rgba(15,23,42,0.05)]!',
  '[&_.content-assignment-editor-content>.content-assignment-editor-card]:p-[32px]!',
  '[&_label]:text-[#1f2937]! [&_label]:font-[800]!',
  '[&_.content-assignment-editor-card>label]:mb-[8px]! [&_.content-assignment-editor-card>label]:text-[#1f2937]! [&_.content-assignment-editor-card>label]:text-[14px]! [&_.content-assignment-editor-card>label]:leading-[20px]! [&_.content-assignment-editor-card>label]:font-[800]!',
  '[&_input:not([type=checkbox]):not([type=file])]:text-[#111827]! [&_input:not([type=checkbox]):not([type=file])]:[outline:none]! [&_textarea]:text-[#111827]! [&_textarea]:[outline:none]!',
  '[&_.content-assignment-editor-card>input[type=text]]:mb-[32px]! [&_.content-assignment-editor-card>input[type=text]]:rounded-none! [&_.content-assignment-editor-card>input[type=text]]:[border-width:0_0_2px]! [&_.content-assignment-editor-card>input[type=text]]:border-[#e5e7eb]! [&_.content-assignment-editor-card>input[type=text]]:bg-[#ffffff]! [&_.content-assignment-editor-card>input[type=text]]:px-0! [&_.content-assignment-editor-card>input[type=text]]:pt-0! [&_.content-assignment-editor-card>input[type=text]]:pb-[8px]! [&_.content-assignment-editor-card>input[type=text]]:text-[20px]! [&_.content-assignment-editor-card>input[type=text]]:leading-[28px]! [&_.content-assignment-editor-card>input[type=text]]:font-[700]!',
  '[&_.content-assignment-editor-card>input[type=text]:focus]:border-[#00c471]!',
  '[&_.content-assignment-editor-markdown]:mb-[32px]! [&_.content-assignment-editor-markdown]:rounded-[12px]! [&_.content-assignment-editor-markdown]:border-[1px]! [&_.content-assignment-editor-markdown]:border-solid! [&_.content-assignment-editor-markdown]:border-[#e5e7eb]! [&_.content-assignment-editor-markdown]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.content-assignment-editor-toolbar]:gap-[4px]! [&_.content-assignment-editor-toolbar]:border-b-[1px]! [&_.content-assignment-editor-toolbar]:border-b-[#e5e7eb]! [&_.content-assignment-editor-toolbar]:bg-[#f9fafb]! [&_.content-assignment-editor-toolbar]:p-[8px]! [&_.content-assignment-editor-toolbar]:text-[#4b5563]!',
  '[&_.content-assignment-editor-toolbar_button]:h-[32px]! [&_.content-assignment-editor-toolbar_button]:min-h-[32px]! [&_.content-assignment-editor-toolbar_button]:w-[32px]! [&_.content-assignment-editor-toolbar_button]:min-w-[32px]! [&_.content-assignment-editor-toolbar_button]:rounded-[4px]! [&_.content-assignment-editor-toolbar_button]:p-0! [&_.content-assignment-editor-toolbar_button]:text-[14px]!',
  '[&_.content-assignment-editor-toolbar_button:hover]:bg-[#e5e7eb]!',
  '[&_textarea]:min-h-[192px]! [&_textarea]:resize-y! [&_textarea]:bg-[#ffffff]! [&_textarea]:p-[20px]! [&_textarea]:text-[14px]! [&_textarea]:leading-[22px]! [&_textarea]:font-[400]!',
  '[&_.content-assignment-editor-upload]:min-h-[142px]! [&_.content-assignment-editor-upload]:rounded-[12px]! [&_.content-assignment-editor-upload]:border-[2px]! [&_.content-assignment-editor-upload]:border-dashed! [&_.content-assignment-editor-upload]:border-[#d1d5db]! [&_.content-assignment-editor-upload]:bg-[#ffffff]! [&_.content-assignment-editor-upload]:p-[24px]!',
  '[&_.content-assignment-editor-upload:hover]:border-[#00c471]! [&_.content-assignment-editor-upload:hover]:bg-[#ecfdf5]!',
  '[&_.content-assignment-editor-upload_i]:mb-[8px]! [&_.content-assignment-editor-upload_i]:text-[#9ca3af]! [&_.content-assignment-editor-upload_i]:text-[24px]! [&_.content-assignment-editor-upload_i]:leading-[32px]!',
  '[&_.content-assignment-editor-upload_span:first-of-type]:text-[#4b5563]! [&_.content-assignment-editor-upload_span:first-of-type]:text-[14px]! [&_.content-assignment-editor-upload_span:first-of-type]:leading-[20px]! [&_.content-assignment-editor-upload_span:first-of-type]:font-[700]!',
  '[&_.content-assignment-editor-upload_span:last-of-type]:mt-[4px]! [&_.content-assignment-editor-upload_span:last-of-type]:text-[#9ca3af]! [&_.content-assignment-editor-upload_span:last-of-type]:text-[10px]! [&_.content-assignment-editor-upload_span:last-of-type]:leading-[14px]!',
  '[&_input[type=checkbox]]:h-[16px]! [&_input[type=checkbox]]:w-[16px]! [&_input[type=checkbox]]:accent-[#2563eb]!',
  '[&_.content-assignment-editor-rubric-panel]:overflow-visible! [&_.content-assignment-editor-rubric-panel]:p-0!',
  '[&_.content-assignment-editor-card-header]:rounded-[16px_16px_0_0]! [&_.content-assignment-editor-card-header]:border-b-[1px]! [&_.content-assignment-editor-card-header]:border-b-[#f3f4f6]! [&_.content-assignment-editor-card-header]:bg-[rgba(249,250,251,0.5)]! [&_.content-assignment-editor-card-header]:p-[24px]!',
  '[&_.content-assignment-editor-card-header_h2]:m-0! [&_.content-assignment-editor-card-header_h2]:gap-[8px]! [&_.content-assignment-editor-card-header_h2]:text-[#111827]! [&_.content-assignment-editor-card-header_h2]:text-[18px]! [&_.content-assignment-editor-card-header_h2]:leading-[28px]! [&_.content-assignment-editor-card-header_h2]:font-[800]!',
  '[&_.content-assignment-editor-card-header_h2_i]:text-[#00c471]!',
  '[&_.content-assignment-editor-card-header_p]:mt-[4px]! [&_.content-assignment-editor-card-header_p]:text-[#6b7280]! [&_.content-assignment-editor-card-header_p]:text-[12px]! [&_.content-assignment-editor-card-header_p]:leading-[16px]! [&_.content-assignment-editor-card-header_p]:font-[500]!',
  '[&_.content-assignment-editor-rubric-panel>div:last-child]:p-[24px]!',
  '[&_.content-assignment-editor-rubric-item]:gap-[16px]! [&_.content-assignment-editor-rubric-item]:rounded-[12px]! [&_.content-assignment-editor-rubric-item]:border-[1px]! [&_.content-assignment-editor-rubric-item]:border-solid! [&_.content-assignment-editor-rubric-item]:border-[#e5e7eb]! [&_.content-assignment-editor-rubric-item]:bg-[#ffffff]! [&_.content-assignment-editor-rubric-item]:p-[16px]! [&_.content-assignment-editor-rubric-item]:[box-shadow:0_1px_2px_rgba(15,23,42,0.05)]!',
  '[&_.content-assignment-editor-rubric-item_label]:mb-[4px]! [&_.content-assignment-editor-rubric-item_label]:text-[#6b7280]! [&_.content-assignment-editor-rubric-item_label]:text-[10px]! [&_.content-assignment-editor-rubric-item_label]:leading-[14px]! [&_.content-assignment-editor-rubric-item_label]:font-[800]!',
  '[&_.content-assignment-editor-rubric-item_input]:min-h-[38px]! [&_.content-assignment-editor-rubric-item_input]:rounded-[8px]! [&_.content-assignment-editor-rubric-item_input]:border-[1px]! [&_.content-assignment-editor-rubric-item_input]:border-solid! [&_.content-assignment-editor-rubric-item_input]:border-[#e5e7eb]! [&_.content-assignment-editor-rubric-item_input]:bg-[#f9fafb]! [&_.content-assignment-editor-rubric-item_input]:px-[12px]! [&_.content-assignment-editor-rubric-item_input]:py-[8px]! [&_.content-assignment-editor-rubric-item_input]:text-[#1f2937]! [&_.content-assignment-editor-rubric-item_input]:text-[14px]! [&_.content-assignment-editor-rubric-item_input]:leading-[20px]! [&_.content-assignment-editor-rubric-item_input]:font-[700]!',
  '[&_.content-assignment-editor-rubric-item_input:focus]:border-[#00c471]!',
  '[&_.content-assignment-editor-add-rubric]:mt-[16px]! [&_.content-assignment-editor-add-rubric]:min-h-[46px]! [&_.content-assignment-editor-add-rubric]:rounded-[12px]! [&_.content-assignment-editor-add-rubric]:border-[2px]! [&_.content-assignment-editor-add-rubric]:border-dashed! [&_.content-assignment-editor-add-rubric]:border-[#d1d5db]! [&_.content-assignment-editor-add-rubric]:bg-[#f9fafb]! [&_.content-assignment-editor-add-rubric]:p-[12px]! [&_.content-assignment-editor-add-rubric]:text-[#6b7280]! [&_.content-assignment-editor-add-rubric]:text-[14px]! [&_.content-assignment-editor-add-rubric]:leading-[20px]! [&_.content-assignment-editor-add-rubric]:font-[700]!',
  '[&_.content-assignment-editor-add-rubric:hover]:border-[#00c471]! [&_.content-assignment-editor-add-rubric:hover]:bg-[#ecfdf5]! [&_.content-assignment-editor-add-rubric:hover]:text-[#00c471]!',
  '[&_.content-assignment-editor-score-card]:gap-[32px]! [&_.content-assignment-editor-score-card]:p-[32px]!',
  '[&_.content-assignment-editor-score-card_label]:text-[#1f2937]! [&_.content-assignment-editor-score-card_label]:text-[14px]! [&_.content-assignment-editor-score-card_label]:leading-[20px]! [&_.content-assignment-editor-score-card_label]:font-[800]!',
  '[&_.content-assignment-editor-score-card_input]:min-h-[48px]! [&_.content-assignment-editor-score-card_input]:rounded-[12px]! [&_.content-assignment-editor-score-card_input]:border-[1px]! [&_.content-assignment-editor-score-card_input]:border-solid! [&_.content-assignment-editor-score-card_input]:border-[#e5e7eb]! [&_.content-assignment-editor-score-card_input]:bg-[#f9fafb]! [&_.content-assignment-editor-score-card_input]:pt-[12px]! [&_.content-assignment-editor-score-card_input]:pr-[48px]! [&_.content-assignment-editor-score-card_input]:pb-[12px]! [&_.content-assignment-editor-score-card_input]:pl-[16px]! [&_.content-assignment-editor-score-card_input]:text-[18px]! [&_.content-assignment-editor-score-card_input]:leading-[28px]! [&_.content-assignment-editor-score-card_input]:font-[900]!',
  '[&_.content-assignment-editor-toast-container]:top-[calc(var(--app-header-height)+16px)]! [&_.content-assignment-editor-toast-container]:right-[32px]!',
].join(' ')

function InvalidLessonView({ courseId }: { courseId: number | null }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-white/70 bg-white px-8 py-10 text-center shadow-xl shadow-gray-900/5">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <i className="fas fa-circle-exclamation text-2xl" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-gray-900">과제 편집 정보를 찾지 못했습니다</h1>
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

export default function ContentAssignmentEditorPage() {
  const { lessonId, lessonTitle, courseId } = readLessonEditorContextFromUrl()

  if (!lessonId) {
    return <InvalidLessonView courseId={courseId} />
  }

  return (
    <CourseAssignmentEditorOverlay
      lessonId={lessonId}
      lessonTitle={lessonTitle || '새 과제'}
      onClose={() => window.location.assign(buildCourseEditorHref(courseId))}
      standalone
      standaloneClassName={CONTENT_ASSIGNMENT_EDITOR_UI_LOCK_CLASSES}
    />
  )
}
