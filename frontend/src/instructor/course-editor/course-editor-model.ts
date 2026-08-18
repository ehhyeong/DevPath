import type { LearningCourseDetail,LearningLesson,LearningSection } from '../../types/learning'


export type PersistedCourseStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
export type LessonKind = 'lecture' | 'quiz' | 'assignment'

export type EditorJobCard = {
  localId: string
  name: string
  nameEn: string
  description: string
  keywords: string
}

export type EditorLesson = {
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

export type EditorSection = {
  localId: string
  sectionId?: number
  title: string
  description: string
  isPublished: boolean
  lessons: EditorLesson[]
}

export type EditorInfoSection = {
  localId: string
  sectionKey: string
  title: string
  content: string
  removable: boolean
}

export type PreparedLesson = {
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

export type PreparedSection = {
  localId: string
  sectionId?: number
  title: string
  description: string | null
  isPublished: boolean
  lessons: PreparedLesson[]
}

export type SaveToastState = {
  message: string
  persistent: boolean
  variant?: 'info' | 'error'
}

export const SAVE_TOAST_DURATION_MS = 2200
export const INSTRUCTOR_HEADER_HEIGHT_PX = 64
export const EDITOR_ACTION_BUTTONS_STICKY_TOP_PX = INSTRUCTOR_HEADER_HEIGHT_PX + 8
export const EDITOR_ACTION_BUTTONS_STACK_SPACE_PX = 72
export const EDITOR_SIDE_CARD_STICKY_TOP_PX = EDITOR_ACTION_BUTTONS_STICKY_TOP_PX + EDITOR_ACTION_BUTTONS_STACK_SPACE_PX
export const COURSE_EDITOR_PAGE_UI_LOCK_CLASSES = [
  "w-full! max-w-none! min-h-[111.111111%]! box-border! bg-[#f3f4f6]! text-[#1f2937]! font-['Pretendard',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]! [zoom:0.9] origin-top-left",
  '[&_.course-editor-topbar]:sticky! [&_.course-editor-topbar]:top-0! [&_.course-editor-topbar]:z-10! [&_.course-editor-topbar]:mb-[24px]! [&_.course-editor-topbar]:py-[8px]! [&_.course-editor-topbar]:bg-[#f3f4f6]!',
  '[&_.course-editor-topbar_h1]:text-[#111827]! [&_.course-editor-topbar_h1]:text-[24px]! [&_.course-editor-topbar_h1]:leading-[32px]! [&_.course-editor-topbar_h1]:font-[700]! [&_.course-editor-topbar_h1]:tracking-[0]!',
  '[&_.course-editor-topbar>div:first-child]:gap-[16px]! [&_.course-editor-topbar>div:first-child>button]:text-[#9ca3af]!',
  '[&_.course-editor-back-button]:inline-flex! [&_.course-editor-back-button]:h-auto! [&_.course-editor-back-button]:min-h-0! [&_.course-editor-back-button]:w-auto! [&_.course-editor-back-button]:min-w-0! [&_.course-editor-back-button]:items-center! [&_.course-editor-back-button]:justify-center! [&_.course-editor-back-button]:border-0! [&_.course-editor-back-button]:rounded-none! [&_.course-editor-back-button]:bg-transparent! [&_.course-editor-back-button]:p-0! [&_.course-editor-back-button]:leading-[1]! [&_.course-editor-back-button]:text-[#9ca3af]! [&_.course-editor-back-button]:[box-shadow:none]!',
  '[&_.course-editor-back-button:hover]:text-[#1f2937]! [&_.course-editor-back-button_i]:text-[20px]! [&_.course-editor-back-button_i]:leading-[1]!',
  '[&_.course-editor-action-buttons]:gap-[8px]! [&_.course-editor-action-buttons_button]:h-[40px]! [&_.course-editor-action-buttons_button]:min-h-[40px]! [&_.course-editor-action-buttons_button]:rounded-[8px]! [&_.course-editor-action-buttons_button]:px-[16px]! [&_.course-editor-action-buttons_button]:py-[8px]! [&_.course-editor-action-buttons_button]:text-[14px]! [&_.course-editor-action-buttons_button]:leading-[20px]! [&_.course-editor-action-buttons_button]:font-[700]! [&_.course-editor-action-buttons_button]:tracking-[0]!',
  '[&_.course-editor-action-buttons_button:last-child]:bg-[#2563eb]! [&_.course-editor-action-buttons_button:last-child]:text-[#ffffff]! [&_.course-editor-action-buttons_button:last-child]:[box-shadow:0_10px_15px_-3px_rgba(37,99,235,0.2)]!',
  '[&_.course-editor-layout]:gap-[32px]! [&_.course-editor-main-column]:gap-y-[32px]! [&_.course-editor-side-column]:gap-y-[32px]!',
  '[&_.course-editor-card]:rounded-[12px]! [&_.course-editor-card]:border-[1px]! [&_.course-editor-card]:border-[#e5e7eb]! [&_.course-editor-card]:bg-[#ffffff]! [&_.course-editor-card]:p-[24px]! [&_.course-editor-card]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.course-editor-media-card]:rounded-[12px]! [&_.course-editor-media-card]:border-[1px]! [&_.course-editor-media-card]:border-[#e5e7eb]! [&_.course-editor-media-card]:bg-[#ffffff]! [&_.course-editor-media-card]:p-[24px]! [&_.course-editor-media-card]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.course-editor-job-section]:border-l-[4px]! [&_.course-editor-job-section]:border-l-[#3b82f6]!',
  '[&_.course-editor-card>h3]:mb-[16px]! [&_.course-editor-card>h3]:border-b-[1px]! [&_.course-editor-card>h3]:border-b-[#f3f4f6]! [&_.course-editor-card>h3]:pb-[8px]! [&_.course-editor-card>h3]:text-[#111827]! [&_.course-editor-card>h3]:text-[16px]! [&_.course-editor-card>h3]:leading-[24px]! [&_.course-editor-card>h3]:font-[700]! [&_.course-editor-card>h3]:tracking-[0]!',
  '[&_.course-editor-card>div:first-child>h3]:mb-[16px]! [&_.course-editor-card>div:first-child>h3]:border-b-[1px]! [&_.course-editor-card>div:first-child>h3]:border-b-[#f3f4f6]! [&_.course-editor-card>div:first-child>h3]:pb-[8px]! [&_.course-editor-card>div:first-child>h3]:text-[#111827]! [&_.course-editor-card>div:first-child>h3]:text-[16px]! [&_.course-editor-card>div:first-child>h3]:leading-[24px]! [&_.course-editor-card>div:first-child>h3]:font-[700]! [&_.course-editor-card>div:first-child>h3]:tracking-[0]!',
  '[&_.course-editor-media-card>h3]:mb-[16px]! [&_.course-editor-media-card>h3]:border-b-[1px]! [&_.course-editor-media-card>h3]:border-b-[#f3f4f6]! [&_.course-editor-media-card>h3]:pb-[8px]! [&_.course-editor-media-card>h3]:text-[#111827]! [&_.course-editor-media-card>h3]:text-[16px]! [&_.course-editor-media-card>h3]:leading-[24px]! [&_.course-editor-media-card>h3]:font-[700]! [&_.course-editor-media-card>h3]:tracking-[0]!',
  '[&_label]:mb-[4px]! [&_label]:text-[#6b7280]! [&_label]:text-[12px]! [&_label]:leading-[16px]! [&_label]:font-[700]! [&_label]:tracking-[0]!',
  '[&_input]:rounded-[8px]! [&_input]:border-[#d1d5db]! [&_input]:text-[#1f2937]! [&_input]:text-[14px]! [&_input]:leading-[20px]! [&_input]:tracking-[0]!',
  '[&_textarea]:rounded-[8px]! [&_textarea]:border-[#d1d5db]! [&_textarea]:text-[#1f2937]! [&_textarea]:text-[14px]! [&_textarea]:leading-[20px]! [&_textarea]:tracking-[0]!',
  '[&_select]:rounded-[8px]! [&_select]:border-[#d1d5db]! [&_select]:text-[#1f2937]! [&_select]:text-[14px]! [&_select]:leading-[20px]! [&_select]:tracking-[0]!',
  '[&_input:not([type=checkbox]):not([type=radio])]:min-h-[40px]! [&_input:not([type=checkbox]):not([type=radio])]:p-[10px]! [&_select]:min-h-[40px]! [&_select]:p-[10px]! [&_textarea]:p-[10px]!',
  '[&_input::placeholder]:text-[#9ca3af]! [&_input::placeholder]:opacity-100! [&_textarea::placeholder]:text-[#9ca3af]! [&_textarea::placeholder]:opacity-100!',
  '[&_.course-editor-tag-container]:min-h-[42px]! [&_.course-editor-tag-container]:items-center! [&_.course-editor-tag-container]:gap-x-[8px]! [&_.course-editor-tag-container]:gap-y-[6px]! [&_.course-editor-tag-container]:rounded-[8px]! [&_.course-editor-tag-container]:border-[1px]! [&_.course-editor-tag-container]:border-[#e5e7eb]! [&_.course-editor-tag-container]:bg-[#ffffff]! [&_.course-editor-tag-container]:px-[8px]! [&_.course-editor-tag-container]:py-[6px]!',
  '[&_.course-editor-tag-container>span]:min-h-[24px]! [&_.course-editor-tag-container>span]:rounded-[9999px]! [&_.course-editor-tag-container>span]:px-[8px]! [&_.course-editor-tag-container>span]:py-[2px]! [&_.course-editor-tag-container>span]:text-[12px]! [&_.course-editor-tag-container>span]:leading-[16px]! [&_.course-editor-tag-container>span]:font-[700]!',
  '[&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:h-[24px]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:min-h-[24px]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:max-h-[24px]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:min-w-[60px]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:flex-[1_1_60px]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:border-0! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:border-[#1f2937]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:rounded-none! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:bg-transparent! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:p-0! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:text-[14px]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:leading-[20px]! [&_.course-editor-tag-container>input.course-editor-tag-input.course-editor-tag-input]:[box-shadow:none]!',
  '[&_.course-editor-description-editor]:rounded-[8px]! [&_.course-editor-description-editor]:border-[1px]! [&_.course-editor-description-editor]:border-[#d1d5db]!',
  '[&_.course-editor-description-toolbar]:flex! [&_.course-editor-description-toolbar]:gap-[8px]! [&_.course-editor-description-toolbar]:rounded-t-[8px]! [&_.course-editor-description-toolbar]:border-b-[1px]! [&_.course-editor-description-toolbar]:border-b-[#e5e7eb]! [&_.course-editor-description-toolbar]:bg-[#f9fafb]! [&_.course-editor-description-toolbar]:p-[8px]! [&_.course-editor-description-toolbar]:text-[#6b7280]!',
  '[&_.course-editor-description-toolbar_button]:inline-flex! [&_.course-editor-description-toolbar_button]:h-auto! [&_.course-editor-description-toolbar_button]:min-h-0! [&_.course-editor-description-toolbar_button]:w-auto! [&_.course-editor-description-toolbar_button]:min-w-0! [&_.course-editor-description-toolbar_button]:items-center! [&_.course-editor-description-toolbar_button]:justify-center! [&_.course-editor-description-toolbar_button]:border-0! [&_.course-editor-description-toolbar_button]:rounded-none! [&_.course-editor-description-toolbar_button]:bg-transparent! [&_.course-editor-description-toolbar_button]:p-0! [&_.course-editor-description-toolbar_button]:text-[#6b7280]! [&_.course-editor-description-toolbar_button]:text-[14px]! [&_.course-editor-description-toolbar_button]:leading-[20px]! [&_.course-editor-description-toolbar_button]:[box-shadow:none]!',
  '[&_.course-editor-description-toolbar_button:hover]:text-[#111827]!',
  '[&_.course-editor-card_.rounded-full.border-emerald-200]:rounded-[99px]! [&_.course-editor-card_.rounded-full.border-emerald-200]:px-[8px]! [&_.course-editor-card_.rounded-full.border-emerald-200]:py-[2px]! [&_.course-editor-card_.rounded-full.border-emerald-200]:text-[12px]! [&_.course-editor-card_.rounded-full.border-emerald-200]:leading-[16px]! [&_.course-editor-card_.rounded-full.border-emerald-200]:font-[700]!',
  '[&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300>div:first-child]:gap-[8px]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300>div:first-child]:rounded-t-[8px]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300>div:first-child]:border-b-[1px]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300>div:first-child]:border-b-[#e5e7eb]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300>div:first-child]:bg-[#f9fafb]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300>div:first-child]:p-[8px]!',
  '[&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300_textarea]:min-h-[150px]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300_textarea]:rounded-t-none! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300_textarea]:rounded-b-[8px]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300_textarea]:border-t-0! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300_textarea]:border-t-[#1f2937]! [&_.course-editor-card_.overflow-hidden.rounded-lg.border.border-gray-300_textarea]:bg-[#ffffff]!',
  '[&_.course-editor-info-section-grid]:gap-[12px]! [&_.course-editor-info-section-card]:rounded-[8px]! [&_.course-editor-info-section-card]:border-[1px]! [&_.course-editor-info-section-card]:border-[#e5e7eb]! [&_.course-editor-info-section-card]:bg-[#ffffff]! [&_.course-editor-info-section-card]:p-[12px]! [&_.course-editor-info-section-card]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.course-editor-info-section-header]:min-h-[32px]! [&_.course-editor-info-section-header]:mb-[8px]!',
  '[&_.course-editor-info-section-title-label]:flex! [&_.course-editor-info-section-title-label]:h-[32px]! [&_.course-editor-info-section-title-label]:min-h-[32px]! [&_.course-editor-info-section-title-label]:items-center! [&_.course-editor-info-section-title-label]:rounded-[7px]! [&_.course-editor-info-section-title-label]:border-transparent! [&_.course-editor-info-section-title-label]:bg-[#f3f4f6]! [&_.course-editor-info-section-title-label]:px-[10px]! [&_.course-editor-info-section-title-label]:py-[7px]! [&_.course-editor-info-section-title-label]:text-[#374151]! [&_.course-editor-info-section-title-label]:text-[13px]! [&_.course-editor-info-section-title-label]:leading-[18px]! [&_.course-editor-info-section-title-label]:font-[700]! [&_.course-editor-info-section-title-label]:tracking-[0]!',
  '[&_.course-editor-info-section-title-input]:h-[32px]! [&_.course-editor-info-section-title-input]:min-h-[32px]! [&_.course-editor-info-section-title-input]:rounded-[7px]! [&_.course-editor-info-section-title-input]:border-[1px]! [&_.course-editor-info-section-title-input]:border-[#d1d5db]! [&_.course-editor-info-section-title-input]:bg-[#ffffff]! [&_.course-editor-info-section-title-input]:px-[10px]! [&_.course-editor-info-section-title-input]:py-[7px]! [&_.course-editor-info-section-title-input]:text-[#111827]! [&_.course-editor-info-section-title-input]:text-[13px]! [&_.course-editor-info-section-title-input]:leading-[18px]! [&_.course-editor-info-section-title-input]:font-[700]! [&_.course-editor-info-section-title-input]:tracking-[0]!',
  '[&_.course-editor-info-section-remove]:h-[28px]! [&_.course-editor-info-section-remove]:min-h-[28px]! [&_.course-editor-info-section-remove]:w-[28px]! [&_.course-editor-info-section-remove]:min-w-[28px]! [&_.course-editor-info-section-remove]:rounded-[7px]! [&_.course-editor-info-section-remove]:p-0! [&_.course-editor-info-section-remove]:text-[#9ca3af]! [&_.course-editor-info-section-remove]:text-[12px]! [&_.course-editor-info-section-remove]:leading-[1]!',
  '[&_.course-editor-info-section-remove:hover]:bg-[#fef2f2]! [&_.course-editor-info-section-remove:hover]:text-[#e11d48]!',
  '[&_.course-editor-info-section-textarea]:h-[112px]! [&_.course-editor-info-section-textarea]:min-h-[112px]! [&_.course-editor-info-section-textarea]:rounded-[8px]! [&_.course-editor-info-section-textarea]:border-[1px]! [&_.course-editor-info-section-textarea]:border-[#d1d5db]! [&_.course-editor-info-section-textarea]:bg-[#ffffff]! [&_.course-editor-info-section-textarea]:px-[12px]! [&_.course-editor-info-section-textarea]:py-[10px]! [&_.course-editor-info-section-textarea]:text-[#1f2937]! [&_.course-editor-info-section-textarea]:text-[13px]! [&_.course-editor-info-section-textarea]:leading-[20px]! [&_.course-editor-info-section-textarea]:font-[500]!',
  '[&_.course-editor-info-section-textarea::placeholder]:text-[#9ca3af]! [&_.course-editor-info-section-textarea::placeholder]:text-[13px]! [&_.course-editor-info-section-textarea::placeholder]:leading-[20px]! [&_.course-editor-info-section-textarea::placeholder]:font-[500]! [&_.course-editor-info-section-textarea::placeholder]:opacity-100!',
  '[&_.course-editor-info-section-help]:mt-[7px]! [&_.course-editor-info-section-help]:text-[#6b7280]! [&_.course-editor-info-section-help]:text-[11px]! [&_.course-editor-info-section-help]:leading-[16px]! [&_.course-editor-info-section-help]:font-[600]! [&_.course-editor-info-section-help_i]:text-[#10b981]! [&_.course-editor-info-section-help_i]:text-[10px]!',
  '[&_.course-editor-job-card]:rounded-[8px]! [&_.course-editor-job-card]:border-[1px]! [&_.course-editor-job-card]:border-[#e5e7eb]! [&_.course-editor-job-card]:bg-[#f9fafb]! [&_.course-editor-job-card]:p-[16px]!',
  '[&_.course-editor-section-card]:rounded-[8px]! [&_.course-editor-section-card]:border-[1px]! [&_.course-editor-section-card]:border-[#e5e7eb]! [&_.course-editor-section-card]:p-[16px]!',
  '[&_.course-editor-job-card_input]:min-h-[33px]! [&_.course-editor-job-card_input]:rounded-[4px]! [&_.course-editor-job-card_input]:bg-[#ffffff]! [&_.course-editor-job-card_input]:p-[8px]! [&_.course-editor-job-card_input]:text-[12px]! [&_.course-editor-job-card_input]:leading-[16px]! [&_.course-editor-job-card_label]:text-[12px]! [&_.course-editor-job-card_label]:leading-[16px]!',
  '[&_.course-editor-section-card_textarea]:text-[12px]! [&_.course-editor-section-card_textarea]:leading-[16px]!',
  '[&_.course-editor-curriculum-card>div:first-child]:mb-[16px]! [&_.course-editor-curriculum-card>div:first-child]:border-b-[1px]! [&_.course-editor-curriculum-card>div:first-child]:border-b-[#f3f4f6]! [&_.course-editor-curriculum-card>div:first-child]:pb-[8px]!',
  '[&_.course-editor-section-card>div:first-child_input]:min-h-0! [&_.course-editor-section-card>div:first-child_input]:rounded-none! [&_.course-editor-section-card>div:first-child_input]:border-0! [&_.course-editor-section-card>div:first-child_input]:border-[#1f2937]! [&_.course-editor-section-card>div:first-child_input]:bg-transparent! [&_.course-editor-section-card>div:first-child_input]:p-0! [&_.course-editor-section-card>div:first-child_input]:text-[14px]! [&_.course-editor-section-card>div:first-child_input]:leading-[20px]! [&_.course-editor-section-card>div:first-child_input]:font-[700]! [&_.course-editor-section-card>div:first-child_input]:[box-shadow:none]!',
  '[&_.course-editor-curriculum-card>div:first-child_button]:rounded-[8px]! [&_.course-editor-curriculum-card>div:first-child_button]:text-[12px]! [&_.course-editor-curriculum-card>div:first-child_button]:leading-[16px]! [&_.course-editor-curriculum-card>div:first-child_button]:font-[700]!',
  '[&_.course-editor-job-section>button]:rounded-[8px]! [&_.course-editor-job-section>button]:text-[12px]! [&_.course-editor-job-section>button]:leading-[16px]! [&_.course-editor-job-section>button]:font-[700]!',
  '[&_.course-editor-lesson-card]:rounded-[8px]! [&_.course-editor-lesson-card]:p-[12px]! [&_.course-editor-lesson-card>div:first-child]:gap-[12px]!',
  '[&_.course-editor-lesson-card_input]:text-[12px]! [&_.course-editor-lesson-card_input]:leading-[16px]!',
  '[&_.course-editor-lesson-card>div:first-child_input]:min-h-0! [&_.course-editor-lesson-card>div:first-child_input]:rounded-none! [&_.course-editor-lesson-card>div:first-child_input]:border-0! [&_.course-editor-lesson-card>div:first-child_input]:border-[#1f2937]! [&_.course-editor-lesson-card>div:first-child_input]:bg-transparent! [&_.course-editor-lesson-card>div:first-child_input]:p-0! [&_.course-editor-lesson-card>div:first-child_input]:text-[14px]! [&_.course-editor-lesson-card>div:first-child_input]:leading-[20px]! [&_.course-editor-lesson-card>div:first-child_input]:font-[500]! [&_.course-editor-lesson-card>div:first-child_input]:[box-shadow:none]!',
  '[&_.course-editor-lesson-card_button]:inline-flex! [&_.course-editor-lesson-card_button]:min-h-[28px]! [&_.course-editor-lesson-card_button]:cursor-pointer! [&_.course-editor-lesson-card_button]:items-center! [&_.course-editor-lesson-card_button]:justify-center! [&_.course-editor-lesson-card_button]:rounded-[4px]! [&_.course-editor-lesson-card_button]:px-[12px]! [&_.course-editor-lesson-card_button]:py-[6px]! [&_.course-editor-lesson-card_button]:text-[12px]! [&_.course-editor-lesson-card_button]:leading-[16px]! [&_.course-editor-lesson-card_button]:font-[700]!',
  '[&_.course-editor-lesson-upload-label]:inline-flex! [&_.course-editor-lesson-upload-label]:h-auto! [&_.course-editor-lesson-upload-label]:min-h-[28px]! [&_.course-editor-lesson-upload-label]:w-[76px]! [&_.course-editor-lesson-upload-label]:max-w-[76px]! [&_.course-editor-lesson-upload-label]:flex-[0_0_76px]! [&_.course-editor-lesson-upload-label]:cursor-pointer! [&_.course-editor-lesson-upload-label]:items-center! [&_.course-editor-lesson-upload-label]:justify-center! [&_.course-editor-lesson-upload-label]:whitespace-nowrap! [&_.course-editor-lesson-upload-label]:rounded-[4px]! [&_.course-editor-lesson-upload-label]:px-[12px]! [&_.course-editor-lesson-upload-label]:py-[6px]! [&_.course-editor-lesson-upload-label]:text-[12px]! [&_.course-editor-lesson-upload-label]:leading-[16px]! [&_.course-editor-lesson-upload-label]:font-[700]!',
  '[&_.course-editor-section-card>.grid_button]:rounded-[8px]! [&_.course-editor-section-card>.grid_button]:p-[8px]! [&_.course-editor-section-card>.grid_button]:text-[12px]! [&_.course-editor-section-card>.grid_button]:leading-[16px]!',
  '[&_.course-editor-media-card]:top-[80px]! [&_.course-editor-media-card_button]:rounded-[8px]! [&_.course-editor-media-card_button.aspect-video]:border-[2px]! [&_.course-editor-media-card_button.aspect-video]:border-dashed! [&_.course-editor-media-card_button.aspect-video]:border-[#d1d5db]! [&_.course-editor-media-card_button.aspect-video]:bg-[#f3f4f6]!',
  '[&_.course-editor-media-card_button:not(.aspect-video)]:h-[40px]! [&_.course-editor-media-card_button:not(.aspect-video)]:bg-[#f9fafb]! [&_.course-editor-media-card_button:not(.aspect-video)]:px-[12px]! [&_.course-editor-media-card_button:not(.aspect-video)]:py-0!',
  '[&_.course-editor-media-card_.rounded-lg.bg-gray-50]:rounded-[8px]! [&_.course-editor-media-card_.rounded-lg.bg-gray-50]:p-[12px]! [&_.course-editor-media-card_.rounded-lg.bg-gray-50]:text-[12px]! [&_.course-editor-media-card_.rounded-lg.bg-gray-50]:leading-[20px]!',
].join(' ')

export const lessonKindMeta: Record<
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

export function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyJobCard(): EditorJobCard {
  return { localId: createLocalId('job'), name: '', nameEn: '', description: '', keywords: '' }
}

export function createLesson(kind: LessonKind): EditorLesson {
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

export function getDefaultSectionTitle(sectionNumber: number) {
  return `섹션 ${sectionNumber}`
}

export function isAutoSectionTitle(value: string) {
  return /^섹션\s*\d+$/.test(value.trim())
}

export function normalizeSectionTitle(value: string, sectionIndex: number) {
  const title = value.trim()
  return !title || isAutoSectionTitle(title) ? getDefaultSectionTitle(sectionIndex + 1) : title
}

export function createSection(sectionNumber = 1): EditorSection {
  return {
    localId: createLocalId('section'),
    title: getDefaultSectionTitle(sectionNumber),
    description: '',
    isPublished: true,
    lessons: [createLesson('lecture'), createLesson('quiz'), createLesson('assignment')],
  }
}

export function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

export function parsePriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

export function parseDurationInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

export function normalizeTagName(value: string) {
  return value.trim().replace(/^#/, '').toLowerCase()
}

export function parseBulletItems(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.startsWith('-'))
    .map((item) => item.replace(/^-\s*/, '').trim())
    .filter(Boolean)
}

export function formatBulletItems(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n')
}

export function createInfoSection(sectionKey: string, title: string, items: string[] = [], removable = false): EditorInfoSection {
  return {
    localId: createLocalId('info-section'),
    sectionKey,
    title,
    content: formatBulletItems(items),
    removable,
  }
}

export function createDefaultInfoSections() {
  return [
    createInfoSection('TARGET_AUDIENCE', '이런 분들에게 추천합니다'),
    createInfoSection('PREREQUISITES', '수강 전 알아두면 좋아요'),
    createInfoSection('OBJECTIVES', '이 강의를 듣고 나면'),
  ]
}

export function createCustomInfoSection() {
  return createInfoSection(`CUSTOM_${Date.now()}`, '새 분류', [], true)
}

export function getInfoSectionPlaceholder(sectionKey: string) {
  switch (sectionKey) {
    case 'TARGET_AUDIENCE':
      return '- 이 분야를 처음 시작하는 입문자\n- 실무 프로젝트로 개념을 정리하고 싶은 학습자'
    case 'PREREQUISITES':
      return '- HTML, CSS 기본 문법을 알고 있으면 좋아요\n- 별도 선수 지식 없이도 따라올 수 있어요'
    case 'OBJECTIVES':
      return '- 강의가 끝나면 직접 기능을 구현할 수 있습니다\n- 실무에서 쓰는 구조와 흐름을 설명할 수 있습니다'
    default:
      return '- 이 분류에 보여줄 내용을 입력하세요\n- 학습자가 이해하기 쉬운 짧은 문장으로 적어주세요'
  }
}

export function mapCourseInfoSections(detail: LearningCourseDetail) {
  if (detail.infoSections?.length) {
    return detail.infoSections.map((section) =>
      createInfoSection(
        section.sectionKey ?? `CUSTOM_${section.displayOrder ?? Date.now()}`,
        section.title,
        section.items,
        !['TARGET_AUDIENCE', 'PREREQUISITES', 'OBJECTIVES'].includes(section.sectionKey ?? ''),
      ),
    )
  }

  return [
    createInfoSection(
      'TARGET_AUDIENCE',
      '이런 분들에게 추천합니다',
      detail.targetAudiences.map((item) => item.audienceDescription),
    ),
    createInfoSection('PREREQUISITES', '수강 전 알아두면 좋아요', detail.prerequisites),
    createInfoSection(
      'OBJECTIVES',
      '이 강의를 듣고 나면',
      detail.objectives.map((item) => item.objectiveText),
    ),
  ]
}

export function lessonKindToApiType(kind: LessonKind) {
  switch (kind) {
    case 'quiz':
      return 'reading'
    case 'assignment':
      return 'coding'
    default:
      return 'video'
  }
}

export function getFallbackLessonTitle(kind: LessonKind) {
  switch (kind) {
    case 'quiz':
      return '새 퀴즈'
    case 'assignment':
      return '새 과제'
    default:
      return ''
  }
}

export function getPreparedLessonTitle(lesson: Pick<EditorLesson, 'title' | 'kind'>) {
  return lesson.title.trim() || getFallbackLessonTitle(lesson.kind)
}

export function apiTypeToLessonKind(value: string | null | undefined): LessonKind {
  switch (value) {
    case 'READING':
      return 'quiz'
    case 'CODING':
      return 'assignment'
    default:
      return 'lecture'
  }
}

export function parseJobCard(raw: string): EditorJobCard {
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

export function serializeJobCard(card: EditorJobCard) {
  const values = [card.name, card.nameEn, card.description, card.keywords].map((item) => item.trim())
  return values.every((item) => !item)
    ? null
    : `직무명: ${values[0] || '-'}; 영문명: ${values[1] || '-'}; 설명: ${values[2] || '-'}; 키워드: ${values[3] || '-'}`
}

export function getStatusChip(status: PersistedCourseStatus | null) {
  switch (status) {
    case 'PUBLISHED':
      return { label: '공개 중', tone: 'bg-emerald-100 text-emerald-700' }
    case 'IN_REVIEW':
      return { label: '심사 중', tone: 'bg-blue-100 text-blue-700' }
    default:
      return { label: '작성 중', tone: 'bg-gray-200 text-gray-600' }
  }
}

export function getCourseIdFromUrl() {
  const rawValue = new URLSearchParams(window.location.search).get('courseId')
  if (!rawValue) {
    return null
  }
  const nextValue = Number(rawValue)
  return Number.isFinite(nextValue) ? nextValue : null
}

export function getAssetLabel(value: string, emptyLabel: string) {
  if (!value.trim()) {
    return emptyLabel
  }

  try {
    const url = new URL(value)
    return url.pathname.split('/').filter(Boolean).pop() || value
  } catch {
    return value.split('/').filter(Boolean).pop() || value
  }
}

export function mapLesson(lesson: LearningLesson): EditorLesson {
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

export function mapSection(section: LearningSection, sectionIndex: number): EditorSection {
  return {
    localId: createLocalId('section'),
    sectionId: section.sectionId,
    title: normalizeSectionTitle(section.title, sectionIndex),
    description: section.description ?? '',
    isPublished: section.isPublished !== false,
    lessons: section.lessons.map(mapLesson),
  }
}

export function prepareSections(sections: EditorSection[]) {
  return sections
    .map<PreparedSection>((section, sectionIndex) => ({
      localId: section.localId,
      sectionId: section.sectionId,
      title: normalizeSectionTitle(section.title, sectionIndex),
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
