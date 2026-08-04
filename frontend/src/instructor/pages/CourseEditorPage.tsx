import { useEffect, useState } from 'react'
import { ErrorCard, LoadingCard } from '../../account/ui'
import { useRef } from 'react'
import { instructorCourseApi, userApi } from '../../lib/api'
import type { LearningCourseDetail, LearningLesson, LearningSection } from '../../types/learning'
import type { TechTag } from '../../types/learner'
import { buildLessonEditorHref } from '../course-editor/editor-routing'

type PersistedCourseStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
type LessonKind = 'lecture' | 'quiz' | 'assignment'

type EditorJobCard = {
  localId: string
  name: string
  nameEn: string
  description: string
  keywords: string
}

type EditorLesson = {
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

type EditorSection = {
  localId: string
  sectionId?: number
  title: string
  description: string
  isPublished: boolean
  lessons: EditorLesson[]
}

type EditorInfoSection = {
  localId: string
  sectionKey: string
  title: string
  content: string
  removable: boolean
}

type PreparedLesson = {
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

type PreparedSection = {
  localId: string
  sectionId?: number
  title: string
  description: string | null
  isPublished: boolean
  lessons: PreparedLesson[]
}

type SaveToastState = {
  message: string
  persistent: boolean
  variant?: 'info' | 'error'
}

const SAVE_TOAST_DURATION_MS = 2200
const INSTRUCTOR_HEADER_HEIGHT_PX = 64
const EDITOR_ACTION_BUTTONS_STICKY_TOP_PX = INSTRUCTOR_HEADER_HEIGHT_PX + 8
const EDITOR_ACTION_BUTTONS_STACK_SPACE_PX = 72
const EDITOR_SIDE_CARD_STICKY_TOP_PX = EDITOR_ACTION_BUTTONS_STICKY_TOP_PX + EDITOR_ACTION_BUTTONS_STACK_SPACE_PX
const COURSE_EDITOR_PAGE_UI_LOCK_CLASSES = [
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

class CourseEditorValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CourseEditorValidationError'
  }
}

const lessonKindMeta: Record<
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

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function createEmptyJobCard(): EditorJobCard {
  return { localId: createLocalId('job'), name: '', nameEn: '', description: '', keywords: '' }
}

function createLesson(kind: LessonKind): EditorLesson {
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

function getDefaultSectionTitle(sectionNumber: number) {
  return `섹션 ${sectionNumber}`
}

function isAutoSectionTitle(value: string) {
  return /^섹션\s*\d+$/.test(value.trim())
}

function normalizeSectionTitle(value: string, sectionIndex: number) {
  const title = value.trim()
  return !title || isAutoSectionTitle(title) ? getDefaultSectionTitle(sectionIndex + 1) : title
}

function createSection(sectionNumber = 1): EditorSection {
  return {
    localId: createLocalId('section'),
    title: getDefaultSectionTitle(sectionNumber),
    description: '',
    isPublished: true,
    lessons: [createLesson('lecture'), createLesson('quiz'), createLesson('assignment')],
  }
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

function parsePriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

function parseDurationInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

function normalizeTagName(value: string) {
  return value.trim().replace(/^#/, '').toLowerCase()
}

function parseBulletItems(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.startsWith('-'))
    .map((item) => item.replace(/^-\s*/, '').trim())
    .filter(Boolean)
}

function formatBulletItems(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n')
}

function createInfoSection(sectionKey: string, title: string, items: string[] = [], removable = false): EditorInfoSection {
  return {
    localId: createLocalId('info-section'),
    sectionKey,
    title,
    content: formatBulletItems(items),
    removable,
  }
}

function createDefaultInfoSections() {
  return [
    createInfoSection('TARGET_AUDIENCE', '이런 분들에게 추천합니다'),
    createInfoSection('PREREQUISITES', '수강 전 알아두면 좋아요'),
    createInfoSection('OBJECTIVES', '이 강의를 듣고 나면'),
  ]
}

function createCustomInfoSection() {
  return createInfoSection(`CUSTOM_${Date.now()}`, '새 분류', [], true)
}

function getInfoSectionPlaceholder(sectionKey: string) {
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

function mapCourseInfoSections(detail: LearningCourseDetail) {
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

function lessonKindToApiType(kind: LessonKind) {
  switch (kind) {
    case 'quiz':
      return 'reading'
    case 'assignment':
      return 'coding'
    default:
      return 'video'
  }
}

function getFallbackLessonTitle(kind: LessonKind) {
  switch (kind) {
    case 'quiz':
      return '새 퀴즈'
    case 'assignment':
      return '새 과제'
    default:
      return ''
  }
}

function getPreparedLessonTitle(lesson: Pick<EditorLesson, 'title' | 'kind'>) {
  return lesson.title.trim() || getFallbackLessonTitle(lesson.kind)
}

function apiTypeToLessonKind(value: string | null | undefined): LessonKind {
  switch (value) {
    case 'READING':
      return 'quiz'
    case 'CODING':
      return 'assignment'
    default:
      return 'lecture'
  }
}

function parseJobCard(raw: string): EditorJobCard {
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

function serializeJobCard(card: EditorJobCard) {
  const values = [card.name, card.nameEn, card.description, card.keywords].map((item) => item.trim())
  return values.every((item) => !item)
    ? null
    : `직무명: ${values[0] || '-'}; 영문명: ${values[1] || '-'}; 설명: ${values[2] || '-'}; 키워드: ${values[3] || '-'}`
}

function getStatusChip(status: PersistedCourseStatus | null) {
  switch (status) {
    case 'PUBLISHED':
      return { label: '공개 중', tone: 'bg-emerald-100 text-emerald-700' }
    case 'IN_REVIEW':
      return { label: '심사 중', tone: 'bg-blue-100 text-blue-700' }
    default:
      return { label: '작성 중', tone: 'bg-gray-200 text-gray-600' }
  }
}

function getCourseIdFromUrl() {
  const rawValue = new URLSearchParams(window.location.search).get('courseId')
  if (!rawValue) {
    return null
  }
  const nextValue = Number(rawValue)
  return Number.isFinite(nextValue) ? nextValue : null
}

function getAssetLabel(value: string, emptyLabel: string) {
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

function mapLesson(lesson: LearningLesson): EditorLesson {
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

function mapSection(section: LearningSection, sectionIndex: number): EditorSection {
  return {
    localId: createLocalId('section'),
    sectionId: section.sectionId,
    title: normalizeSectionTitle(section.title, sectionIndex),
    description: section.description ?? '',
    isPublished: section.isPublished !== false,
    lessons: section.lessons.map(mapLesson),
  }
}

function prepareSections(sections: EditorSection[]) {
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

export default function CourseEditorPage() {
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
      window.location.href = '/course-management'
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
      throw new Error(nextError instanceof Error ? nextError.message : '파일 업로드에 실패했습니다.')
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
      window.location.assign(editorHref)
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

  if (loading) {
    return (
      <div className={`course-editor-page p-8 ${COURSE_EDITOR_PAGE_UI_LOCK_CLASSES}`}>
        <LoadingCard label="강의 편집 데이터를 불러오는 중입니다." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`course-editor-page p-8 ${COURSE_EDITOR_PAGE_UI_LOCK_CLASSES}`}>
        <ErrorCard message={error} />
      </div>
    )
  }

  const statusChip = getStatusChip(status)
  const thumbnailDisplayUrl = thumbnailPreviewUrl || thumbnailUrl
  const actionButtonsFloatingStyle = { top: `${EDITOR_ACTION_BUTTONS_STICKY_TOP_PX}px` }
  const sideCardStickyStyle = { top: `${EDITOR_SIDE_CARD_STICKY_TOP_PX}px` }

  function renderActionButtons(containerClassName: string) {
    return (
      <div className={`course-editor-action-buttons ${containerClassName}`}>
        <button
          type="button"
          onClick={handlePreview}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
        >
          <i className="fas fa-eye" /> 미리보기
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
        <button
          type="button"
          onClick={handleRequestReview}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_10px_15px_-3px_rgba(37,99,235,0.2)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="fas fa-paper-plane" /> 심사 요청하기
        </button>
      </div>
    )
  }

  return (
    <div className={`course-editor-page p-8 ${COURSE_EDITOR_PAGE_UI_LOCK_CLASSES}`}>
      <div className="course-editor-topbar mb-6 flex flex-col gap-4 bg-[#F3F4F6] py-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.location.assign('/course-management')}
            className="course-editor-back-button text-gray-400 transition hover:text-gray-800"
          >
            <i className="fas fa-arrow-left text-xl" />
          </button>
          <h1 className="text-2xl font-black text-gray-900">강의 편집</h1>
          <span className={`rounded px-2 py-1 text-xs font-bold ${statusChip.tone}`}>{statusChip.label}</span>
        </div>

        {renderActionButtons('flex flex-wrap gap-2 xl:justify-end')}
      </div>

      <div id="course-editor-action-buttons-sentinel" className="h-px w-full" />

      {showFloatingActionButtons ? (
        <div className="pointer-events-none fixed left-8 right-8 z-30" style={actionButtonsFloatingStyle}>
          {renderActionButtons('pointer-events-auto ml-auto flex w-fit max-w-full flex-wrap justify-end gap-2')}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </div>
      ) : null}

      <div className="course-editor-layout grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1180px)_360px]! lg:justify-start!">
        <div className="course-editor-main-column space-y-8 lg:max-w-[1180px]! lg:[grid-column:auto/span_1]!">
          <section className="course-editor-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-info-circle text-gray-400" /> 기본 정보
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">강의 제목</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  type="text"
                  placeholder="강의 제목을 입력해 주세요."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">한 줄 요약 (부제)</label>
                <input
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  type="text"
                  placeholder="강의를 한 줄로 설명해 주세요."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">검색용 태그 (공식 태그 기준)</label>
                <div className="course-editor-tag-container flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-white p-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setTags((current) => current.filter((item) => normalizeTagName(item) !== normalizeTagName(tag)))
                        }
                      >
                        <i className="fas fa-times" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addTagFromInput()
                      }
                    }}
                    type="text"
                    placeholder="태그 입력 후 Enter"
                    className="course-editor-tag-input min-w-[60px] flex-1 border-none text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="course-editor-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-align-left text-gray-400" /> 강의 소개
            </h3>

            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">강의 상세 설명</label>
                <div className="course-editor-description-editor overflow-hidden rounded-lg border border-gray-300">
                  <div className="course-editor-description-toolbar flex gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-gray-500">
                    <button type="button" onClick={() => insertDescriptionMarkdown('**', '**', '굵게 표시할 문구')}>
                      <i className="fas fa-bold" />
                    </button>
                    <button type="button" onClick={() => insertDescriptionMarkdown('*', '*', '기울임 문구')}>
                      <i className="fas fa-italic" />
                    </button>
                    <button type="button" onClick={() => insertDescriptionMarkdown('- ', '', '목록 항목')}>
                      <i className="fas fa-list-ul" />
                    </button>
                    <button type="button" onClick={insertDescriptionImage}>
                      <i className="fas fa-image" />
                    </button>
                    <input
                      ref={descriptionImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleDescriptionImageFileChange(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                  </div>
                  <textarea
                    ref={descriptionTextareaRef}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="강의의 목표, 특징, 수강 효과 등을 자세히 적어주세요."
                    className="h-32 w-full resize-none p-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold text-gray-500">강의 안내 분류</label>
                  <button
                    type="button"
                    onClick={() => setInfoSections((current) => [...current, createCustomInfoSection()])}
                    className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:border-emerald-400 hover:text-emerald-600"
                  >
                    <i className="fas fa-plus mr-1" /> 분류 추가
                  </button>
                </div>

                <div className="course-editor-info-section-grid grid grid-cols-1 gap-4 md:grid-cols-3">
                  {infoSections.map((section) => (
                    <div key={section.localId} className="course-editor-info-section-card rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="course-editor-info-section-header mb-2 flex items-center gap-2">
                        {section.removable ? (
                          <input
                            value={section.title}
                            onChange={(event) =>
                              setInfoSections((current) =>
                                current.map((item) =>
                                  item.localId === section.localId ? { ...item, title: event.target.value } : item,
                                ),
                              )
                            }
                            className="course-editor-info-section-title-input min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 outline-none transition focus:border-emerald-500"
                          />
                        ) : (
                          <div className="course-editor-info-section-title-label min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-bold text-gray-700">
                            {section.title}
                          </div>
                        )}
                        {section.removable ? (
                          <button
                            type="button"
                            onClick={() => setInfoSections((current) => current.filter((item) => item.localId !== section.localId))}
                            className="course-editor-info-section-remove shrink-0 rounded-md px-2 py-1 text-xs text-gray-400 transition hover:bg-white hover:text-rose-500"
                          >
                            <i className="fas fa-times" />
                          </button>
                        ) : null}
                      </div>
                      <textarea
                        value={section.content}
                        onChange={(event) =>
                          setInfoSections((current) =>
                            current.map((item) =>
                              item.localId === section.localId ? { ...item, content: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder={getInfoSectionPlaceholder(section.sectionKey)}
                        className="course-editor-info-section-textarea h-24 w-full resize-none rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none transition focus:border-emerald-500"
                      />
                      <p className="course-editor-info-section-help mt-1 text-[11px] font-medium text-gray-400">
                        <i className="fas fa-check mr-1" /> 예시처럼 - 로 시작한 줄만 저장됩니다.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="course-editor-card course-editor-job-section rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900">
              <i className="fas fa-briefcase text-blue-500" /> 직무 연관성 설정
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-normal text-blue-600">
                학생들에게 이 강의가 어떤 직무에 도움이 되는지 알려줍니다.
              </span>
            </h3>

            <div className="space-y-4">
              {jobCards.map((card) => (
                <div key={card.localId} className="course-editor-job-card relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <button
                    type="button"
                    onClick={() => removeJobCard(card.localId)}
                    className="absolute top-2 right-2 text-gray-400 transition hover:text-rose-500"
                  >
                    <i className="fas fa-times" />
                  </button>

                  <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-gray-500">직무명 (한글)</label>
                      <input
                        value={card.name}
                        onChange={(event) => updateJobCard(card.localId, 'name', event.target.value)}
                        type="text"
                        className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-gray-500">직무명 (영문)</label>
                      <input
                        value={card.nameEn}
                        onChange={(event) => updateJobCard(card.localId, 'nameEn', event.target.value)}
                        type="text"
                        className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="mb-1 block text-[10px] font-bold text-gray-500">설명</label>
                    <input
                      value={card.description}
                      onChange={(event) => updateJobCard(card.localId, 'description', event.target.value)}
                      type="text"
                      className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-500">키워드</label>
                    <input
                      value={card.keywords}
                      onChange={(event) => updateJobCard(card.localId, 'keywords', event.target.value)}
                      type="text"
                      className="w-full rounded border border-gray-300 p-2 text-xs outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setJobCards((current) => [...current, createEmptyJobCard()])}
              className="mt-4 w-full rounded-lg border border-dashed border-blue-300 bg-blue-50 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
            >
              + 직무 추가하기
            </button>
          </section>

          <section className="course-editor-card course-editor-curriculum-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="flex items-center gap-2 font-bold text-gray-900">
                <i className="fas fa-list-ol text-gray-400" /> 커리큘럼 구성
              </h3>
              <button
                type="button"
                onClick={() => setSections((current) => [...current, createSection(current.length + 1)])}
                className="rounded bg-gray-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black"
              >
                + 섹션 추가
              </button>
            </div>

            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <div key={section.localId} className="course-editor-section-card rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-2">
                      <i className="fas fa-bars cursor-move text-gray-300" />
                      <input
                        value={section.title}
                        onChange={(event) => updateSectionField(section.localId, 'title', event.target.value)}
                        type="text"
                        placeholder={`섹션 ${sectionIndex + 1} 제목`}
                        className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSection(section.localId)}
                      className="text-xs text-gray-300 transition hover:text-rose-500"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>

                  <div className="mb-3 space-y-2">
                    {section.lessons.map((lesson) => {
                      const meta = lessonKindMeta[lesson.kind]

                      return (
                        <div key={lesson.localId} className={`course-editor-lesson-card group rounded-lg border p-3 transition ${meta.containerTone}`}>
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                            <div className="flex w-6 justify-center">
                              <i className={`${meta.icon} text-lg ${meta.iconTone}`} />
                            </div>
                            <input
                              value={lesson.title}
                              onChange={(event) => updateLessonField(section.localId, lesson.localId, 'title', event.target.value)}
                              type="text"
                              placeholder={meta.placeholder}
                              className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none"
                            />
                            {lesson.kind === 'lecture' ? (
                              <label
                                className={`course-editor-lesson-upload-label rounded px-3 py-1.5 text-xs font-bold transition ${meta.buttonTone}`}
                                title={getAssetLabel(lesson.videoUrl, '영상 업로드')}
                              >
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  onChange={(event) => {
                                    void handleLessonVideoFileChange(section.localId, lesson.localId, event.target.files?.[0] ?? null)
                                    event.target.value = ''
                                  }}
                                />
                                <span>영상 업로드</span>
                              </label>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  await openLessonEditor(lesson)
                                }}
                                disabled={saving}
                                className={`rounded px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${meta.buttonTone}`}
                              >
                                {meta.buttonLabel}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeLesson(section.localId, lesson.localId)}
                              className="text-gray-300 transition hover:text-rose-500"
                            >
                              <i className="fas fa-times" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => addLesson(section.localId, 'lecture')}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800"
                    >
                      <i className="fas fa-video" /> 강의 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => addLesson(section.localId, 'quiz')}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600"
                    >
                      <i className="fas fa-question-circle" /> 퀴즈 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => addLesson(section.localId, 'assignment')}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <i className="fas fa-file-code" /> 과제 추가
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="course-editor-side-column space-y-6 lg:w-[360px]! lg:max-w-[360px]! lg:[grid-column:auto/span_1]!">
          <section className="course-editor-media-card sticky rounded-xl border border-gray-200 bg-white p-6 shadow-sm" style={sideCardStickyStyle}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
              <i className="fas fa-photo-video text-gray-400" /> 미디어 설정
            </h3>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold text-gray-500">썸네일 이미지</label>
              <button
                type="button"
                onClick={() => thumbnailImageInputRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 transition hover:bg-gray-50"
              >
                {thumbnailDisplayUrl ? (
                  <img src={thumbnailDisplayUrl} alt="썸네일 미리보기" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt mb-1 text-xl text-gray-400" />
                    <span className="text-xs text-gray-400">이미지 업로드</span>
                  </>
                )}
              </button>
              <input
                ref={thumbnailImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleThumbnailFileChange(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-xs font-bold text-gray-500">미리보기 영상 (Trailer)</label>
              <button
                type="button"
                onClick={() => trailerVideoInputRef.current?.click()}
                className="flex h-10 w-full items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-left transition hover:bg-gray-100"
              >
                <i className="fas fa-video mr-2 text-gray-400" />
                <span className="truncate text-xs text-gray-500">{getAssetLabel(trailerUrl, '파일 선택...')}</span>
                <span className="ml-auto text-xs font-bold text-emerald-500">업로드</span>
              </button>
              <input
                ref={trailerVideoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  void handleTrailerFileChange(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="mb-1 block text-xs font-bold text-gray-500">가격 (원)</label>
              <input
                value={priceInput}
                onChange={(event) => setPriceInput(formatPriceInput(event.target.value))}
                type="text"
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 p-2 text-right text-sm font-bold outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold text-gray-500">공개 상태</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PersistedCourseStatus)}
                className="w-full cursor-pointer rounded-lg border border-gray-300 p-2 text-sm outline-none"
              >
                <option value="DRAFT">비공개 (작성 중)</option>
                <option value="PUBLISHED">공개 (수강 신청 가능)</option>
                {status === 'IN_REVIEW' ? <option value="IN_REVIEW">심사 중</option> : null}
              </select>
            </div>

            {loadedCourse?.status === 'IN_REVIEW' ? (
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-xs font-medium text-blue-700">
                현재 이 강의는 심사 중입니다. 저장하면 선택한 공개 상태 값으로 다시 반영됩니다.
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {saveToast ? (
        <div className="pointer-events-none fixed top-20 left-1/2 z-[1000] -translate-x-1/2">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl border px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-sm ${
              saveToast.variant === 'error' ? 'border-rose-500 bg-rose-600/95' : 'border-gray-700 bg-gray-900/90'
            }`}
          >
            <i
              className={`fas mr-2 ${
                saveToast.variant === 'error' ? 'fa-exclamation-circle text-white' : 'fa-info-circle text-[#00C471]'
              }`}
            />
            {saveToast.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}
