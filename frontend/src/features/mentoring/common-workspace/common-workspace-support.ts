import type { MentoringCommonPage,MentoringWorkspaceData,PageConfig,TaskPriority,TaskStatus } from './common-types'


export type RenderedMentoringCommonPage = Exclude<MentoringCommonPage, 'live-meeting'>

export const MENTORING_COMMON_PAGE_LOCK_CLASS_NAME = [
  'bg-[#F3F4F6]!',
  'text-[#1F2937]!',
  "font-['Pretendard',sans-serif]!",
  'text-[16px]!',
  'leading-[24px]!',
  "[&_button]:font-['Pretendard',sans-serif]!",
  "[&_input]:font-['Pretendard',sans-serif]!",
  "[&_select]:font-['Pretendard',sans-serif]!",
  "[&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_.text-2xl]:text-[24px]!',
  '[&_.text-2xl]:leading-[32px]!',
  '[&_.text-xl]:text-[20px]!',
  '[&_.text-xl]:leading-[28px]!',
  '[&_.text-lg]:text-[18px]!',
  '[&_.text-lg]:leading-[28px]!',
  '[&_.text-sm]:text-[14px]!',
  '[&_.text-sm]:leading-[20px]!',
  '[&_button]:text-[14px]!',
  '[&_button]:leading-[20px]!',
  '[&_input]:text-[14px]!',
  '[&_input]:leading-[20px]!',
  '[&_textarea]:text-[14px]!',
  '[&_textarea]:leading-[20px]!',
  '[&_.text-xs]:text-[12px]!',
  '[&_.text-xs]:leading-[16px]!',
  String.raw`[&_.text-\[11px\]]:text-[11px]!`,
  String.raw`[&_.text-\[11px\]]:leading-[16px]!`,
  String.raw`[&_.text-\[10px\]]:text-[10px]!`,
  String.raw`[&_.text-\[10px\]]:leading-[14px]!`,
  String.raw`[&_.text-\[9px\]]:text-[9px]!`,
  String.raw`[&_.text-\[9px\]]:leading-[12px]!`,
  '[&_.text-brand]:text-[#00C471]!',
  '[&_.bg-brand]:bg-[#00C471]!',
  '[&_.text-mentor]:text-[#7C3AED]!',
  '[&_.bg-mentor]:bg-[#7C3AED]!',
  '[&_.mentoring-common-sidebar.pinned]:w-[256px]!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-text]:ml-[0.75rem]!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-text]:w-auto!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-text]:opacity-100!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-section]:mt-[1.5rem]!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-section]:mb-[0.5rem]!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-section]:h-auto!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-section]:opacity-100!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-pin]:ml-[0.5rem]!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-pin]:w-[28px]!',
  '[&_.mentoring-common-sidebar.pinned_.mentoring-sidebar-pin]:opacity-100!',
  '[&_.mentoring-common-scroll]:bg-[#F8F9FA]!',
  '[&_.mentoring-common-scroll]:p-[32px]!',
  '[&_.mentoring-common-container]:max-w-[1152px]!',
  '[&_.mentoring-common-container]:gap-y-[24px]!',
  '[&.mentoring-common-workspace-page_.mentoring-common-container]:h-full!',
  '[&.mentoring-common-workspace-page_.mentoring-common-container]:w-full!',
  '[&.mentoring-common-workspace-page_.mentoring-common-container]:max-w-none!',
  '[&.mentoring-common-erd-page_.mentoring-common-scroll]:overflow-hidden!',
  '[&.mentoring-common-erd-page_.mentoring-common-scroll]:p-0!',
  '[&.mentoring-common-erd-page_.mentoring-common-container]:h-full!',
  '[&.mentoring-common-erd-page_.mentoring-common-container]:w-full!',
  '[&.mentoring-common-erd-page_.mentoring-common-container]:max-w-none!',
  '[&.mentoring-common-erd-page_.mentoring-common-container]:gap-y-0!',
  '[&.mentoring-common-erd-page_.erd-column-name-input]:text-[12px]!',
  '[&.mentoring-common-erd-page_.erd-column-name-input]:leading-[16px]!',
  '[&.mentoring-common-erd-page_.erd-column-type-select]:text-[10px]!',
  '[&.mentoring-common-erd-page_.erd-column-type-select]:leading-[14px]!',
  '[&.mentoring-common-erd-page_.erd-column-flag-label]:text-[9px]!',
  '[&.mentoring-common-erd-page_.erd-column-flag-label]:leading-[18px]!',
  '[&.mentoring-common-erd-page_.erd-column-flag-label]:font-extrabold!',
  '[&.mentoring-common-erd-page_.erd-column-delete-button]:leading-[1]!',
  '[&_.mentoring-common-page-heading]:hidden!',
  '[&_.mentoring-dashboard-hero]:gap-[32px]!',
  '[&_.mentoring-dashboard-hero]:rounded-[24px]!',
  '[&_.mentoring-dashboard-hero]:border-[1px]!',
  '[&_.mentoring-dashboard-hero]:border-[#F3F4F6]!',
  '[&_.mentoring-dashboard-hero]:bg-white!',
  '[&_.mentoring-dashboard-hero]:p-[32px]!',
  '[&_.mentoring-dashboard-hero]:[box-shadow:0_1px_2px_0_rgb(0_0_0_/_0.05)]!',
  '[&_.mentoring-dashboard-hero_.h-20.w-20]:h-[80px]!',
  '[&_.mentoring-dashboard-hero_.h-20.w-20]:w-[80px]!',
  '[&_.mentoring-dashboard-hero_.h-20.w-20]:border-[4px]!',
  '[&_.mentoring-dashboard-hero_h2]:text-[24px]!',
  '[&_.mentoring-dashboard-hero_h2]:leading-[32px]!',
  '[&_.mentoring-dashboard-hero_h2]:font-extrabold!',
  '[&_.mentoring-dashboard-hero_h2]:text-[#111827]!',
  '[&_.mentoring-dashboard-hero_p]:text-[#6B7280]!',
  '[&_.mentoring-dashboard-dm-button]:h-[34px]!',
  '[&_.mentoring-dashboard-dm-button]:min-h-[34px]!',
  '[&_.mentoring-dashboard-dm-button]:w-auto!',
  '[&_.mentoring-dashboard-dm-button]:rounded-[8px]!',
  '[&_.mentoring-dashboard-dm-button]:border-[1px]!',
  '[&_.mentoring-dashboard-dm-button]:border-[#E5E7EB]!',
  '[&_.mentoring-dashboard-dm-button]:bg-white!',
  '[&_.mentoring-dashboard-dm-button]:px-[16px]!',
  '[&_.mentoring-dashboard-dm-button]:py-0!',
  '[&_.mentoring-dashboard-dm-button]:text-[12px]!',
  '[&_.mentoring-dashboard-dm-button]:leading-[16px]!',
  '[&_.mentoring-dashboard-dm-button]:font-bold!',
  '[&_.mentoring-dashboard-dm-button]:text-[#4B5563]!',
  '[&_.mentoring-dashboard-dm-button]:[box-shadow:0_1px_2px_0_rgb(0_0_0_/_0.05)]!',
  '[&_.mentoring-dashboard-progress-card]:w-[288px]!',
  '[&_.mentoring-dashboard-progress-card]:rounded-[16px]!',
  '[&_.mentoring-dashboard-progress-card]:border-[1px]!',
  '[&_.mentoring-dashboard-progress-card]:border-[#F3F4F6]!',
  '[&_.mentoring-dashboard-progress-card]:bg-[#F9FAFB]!',
  '[&_.mentoring-dashboard-progress-card]:p-[20px]!',
  '[&_.mentoring-dashboard-grid]:items-stretch!',
  '[&_.mentoring-dashboard-grid]:gap-[24px]!',
  '[&_.mentoring-dashboard-main-col>*]:my-0!',
  '[&_.mentoring-dashboard-side-col>*]:my-0!',
  '[&_.mentoring-dashboard-card]:rounded-[16px]!',
  '[&_.mentoring-dashboard-card]:border-[1px]!',
  '[&_.mentoring-dashboard-card]:border-[#F3F4F6]!',
  '[&_.mentoring-dashboard-card]:bg-white!',
  '[&_.mentoring-dashboard-card]:p-[24px]!',
  '[&_.mentoring-dashboard-card]:[box-shadow:0_1px_2px_0_rgb(0_0_0_/_0.05)]!',
  '[&_.mentoring-dashboard-mission-card]:rounded-[16px]!',
  '[&_.mentoring-dashboard-mission-card]:border-[1px]!',
  '[&_.mentoring-dashboard-mission-card]:border-[#F3F4F6]!',
  '[&_.mentoring-dashboard-mission-card]:bg-white!',
  '[&_.mentoring-dashboard-mission-card]:p-[24px]!',
  '[&_.mentoring-dashboard-mission-card]:[box-shadow:0_1px_2px_0_rgb(0_0_0_/_0.05)]!',
  '[&_.mentoring-dashboard-card>div:first-child]:mb-[20px]!',
  '[&_.mentoring-dashboard-card>div:first-child]:border-b-[1px]!',
  '[&_.mentoring-dashboard-card>div:first-child]:border-b-[#F9FAFB]!',
  '[&_.mentoring-dashboard-card>div:first-child]:pb-[12px]!',
  '[&_.mentoring-dashboard-card>div:first-child_h3]:text-[14px]!',
  '[&_.mentoring-dashboard-card>div:first-child_h3]:leading-[20px]!',
  '[&_.mentoring-dashboard-card>div:first-child_h3]:font-extrabold!',
  '[&_.mentoring-dashboard-card>div:first-child_h3]:text-[#111827]!',
  '[&_.mentoring-dashboard-notice-card>div:first-child_h3]:text-[16px]!',
  '[&_.mentoring-dashboard-notice-card>div:first-child_h3]:leading-[24px]!',
  '[&_.mentoring-dashboard-files-card>div:first-child_h3]:text-[16px]!',
  '[&_.mentoring-dashboard-files-card>div:first-child_h3]:leading-[24px]!',
  '[&_.mentoring-dashboard-card-link]:inline-flex!',
  '[&_.mentoring-dashboard-card-link]:items-center!',
  '[&_.mentoring-dashboard-card-link]:gap-[2px]!',
  '[&_.mentoring-dashboard-card-link]:rounded-[4px]!',
  '[&_.mentoring-dashboard-card-link]:px-[8px]!',
  '[&_.mentoring-dashboard-card-link]:py-[4px]!',
  '[&_.mentoring-dashboard-card-link]:text-[12px]!',
  '[&_.mentoring-dashboard-card-link]:leading-[16px]!',
  '[&_.mentoring-dashboard-card-link]:font-bold!',
  '[&_.mentoring-dashboard-card-link]:text-[#9CA3AF]!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:inline-flex!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:items-center!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:gap-[2px]!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:rounded-[4px]!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:px-[8px]!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:py-[4px]!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:text-[12px]!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:leading-[16px]!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:font-bold!',
  '[&_.mentoring-dashboard-files-card_a.text-xs]:text-[#9CA3AF]!',
  '[&_.mentoring-dashboard-card-link_i]:ml-[2px]!',
  '[&_.mentoring-dashboard-card-link_i]:text-[10px]!',
  '[&_.mentoring-dashboard-mission-card]:border-l-[4px]!',
  '[&_.mentoring-dashboard-mission-card]:border-l-[#7C3AED]!',
  '[&_.mentoring-dashboard-mission-card_.rounded-xl.bg-gray-50]:rounded-[12px]!',
  '[&_.mentoring-dashboard-mission-card_.rounded-xl.bg-gray-50]:bg-[#F9FAFB]!',
  '[&_.mentoring-dashboard-mission-card_.rounded-xl.bg-gray-50]:p-[20px]!',
  '[&_.mentoring-dashboard-mission-card_h3]:text-[20px]!',
  '[&_.mentoring-dashboard-mission-card_h3]:leading-[28px]!',
  '[&_.mentoring-dashboard-mission-card_h3]:font-extrabold!',
  '[&_.mentoring-dashboard-mission-card_h3]:text-[#111827]!',
  '[&_.mentoring-dashboard-mission-footer]:mt-[20px]!',
  '[&_.mentoring-dashboard-mission-footer]:pt-[20px]!',
  '[&_.mentoring-dashboard-submit-button]:inline-flex!',
  '[&_.mentoring-dashboard-submit-button]:h-[40px]!',
  '[&_.mentoring-dashboard-submit-button]:min-w-[132px]!',
  '[&_.mentoring-dashboard-submit-button]:items-center!',
  '[&_.mentoring-dashboard-submit-button]:justify-center!',
  '[&_.mentoring-dashboard-submit-button]:gap-[8px]!',
  '[&_.mentoring-dashboard-submit-button]:rounded-[12px]!',
  '[&_.mentoring-dashboard-submit-button]:bg-[#00C471]!',
  '[&_.mentoring-dashboard-submit-button]:px-[24px]!',
  '[&_.mentoring-dashboard-submit-button]:py-0!',
  '[&_.mentoring-dashboard-submit-button]:text-[14px]!',
  '[&_.mentoring-dashboard-submit-button]:leading-[20px]!',
  '[&_.mentoring-dashboard-submit-button]:font-bold!',
  '[&_.mentoring-dashboard-submit-button]:text-white!',
  '[&_.mentoring-dashboard-submit-button]:[box-shadow:0_4px_6px_-1px_rgb(0_0_0_/_0.1),0_2px_4px_-2px_rgb(0_0_0_/_0.1)]!',
  '[&_.mentoring-dashboard-inline-empty]:flex!',
  '[&_.mentoring-dashboard-inline-empty]:min-h-[136px]!',
  '[&_.mentoring-dashboard-inline-empty]:flex-col!',
  '[&_.mentoring-dashboard-inline-empty]:items-center!',
  '[&_.mentoring-dashboard-inline-empty]:justify-center!',
  '[&_.mentoring-dashboard-inline-empty]:px-[16px]!',
  '[&_.mentoring-dashboard-inline-empty]:py-[24px]!',
  '[&_.mentoring-dashboard-inline-empty]:text-center!',
  '[&_.mentoring-dashboard-inline-empty]:opacity-80!',
  '[&_.mentoring-dashboard-inline-empty-icon]:mb-[12px]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:flex!',
  '[&_.mentoring-dashboard-inline-empty-icon]:h-[48px]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:w-[48px]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:items-center!',
  '[&_.mentoring-dashboard-inline-empty-icon]:justify-center!',
  '[&_.mentoring-dashboard-inline-empty-icon]:rounded-[9999px]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:border-[1px]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:border-[#F3F4F6]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:bg-[#F9FAFB]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:text-[20px]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:leading-[28px]!',
  '[&_.mentoring-dashboard-inline-empty-icon]:text-[#D1D5DB]!',
  '[&_.mentoring-dashboard-inline-empty-title]:m-0!',
  '[&_.mentoring-dashboard-inline-empty-title]:text-[14px]!',
  '[&_.mentoring-dashboard-inline-empty-title]:leading-[20px]!',
  '[&_.mentoring-dashboard-inline-empty-title]:font-bold!',
  '[&_.mentoring-dashboard-inline-empty-title]:text-[#6B7280]!',
  '[&_.mentoring-dashboard-inline-empty-copy]:mt-[4px]!',
  '[&_.mentoring-dashboard-inline-empty-copy]:mr-0!',
  '[&_.mentoring-dashboard-inline-empty-copy]:mb-0!',
  '[&_.mentoring-dashboard-inline-empty-copy]:ml-0!',
  '[&_.mentoring-dashboard-inline-empty-copy]:max-w-[280px]!',
  '[&_.mentoring-dashboard-inline-empty-copy]:text-[12px]!',
  '[&_.mentoring-dashboard-inline-empty-copy]:leading-[16px]!',
  '[&_.mentoring-dashboard-inline-empty-copy]:text-[#9CA3AF]!',
  '[&_.mentoring-dashboard-files-empty_.mentoring-dashboard-inline-empty-copy]:w-max!',
  '[&_.mentoring-dashboard-files-empty_.mentoring-dashboard-inline-empty-copy]:max-w-none!',
  '[&_.mentoring-dashboard-files-empty_.mentoring-dashboard-inline-empty-copy]:whitespace-nowrap!',
  '[&_.mentoring-dashboard-inline-empty-action]:mt-[16px]!',
  '[&_.mentoring-dashboard-outline-button]:inline-flex!',
  '[&_.mentoring-dashboard-outline-button]:h-[38px]!',
  '[&_.mentoring-dashboard-outline-button]:items-center!',
  '[&_.mentoring-dashboard-outline-button]:justify-center!',
  '[&_.mentoring-dashboard-outline-button]:rounded-[12px]!',
  '[&_.mentoring-dashboard-outline-button]:border-[1px]!',
  '[&_.mentoring-dashboard-outline-button]:border-[#E5E7EB]!',
  '[&_.mentoring-dashboard-outline-button]:bg-white!',
  '[&_.mentoring-dashboard-outline-button]:px-[16px]!',
  '[&_.mentoring-dashboard-outline-button]:py-0!',
  '[&_.mentoring-dashboard-outline-button]:text-[12px]!',
  '[&_.mentoring-dashboard-outline-button]:leading-[16px]!',
  '[&_.mentoring-dashboard-outline-button]:font-bold!',
  '[&_.mentoring-dashboard-outline-button]:text-[#4B5563]!',
  '[&_.mentoring-dashboard-outline-button]:[box-shadow:0_1px_2px_0_rgb(0_0_0_/_0.05)]!',
  '[&_.mentoring-dashboard-wide-button]:inline-flex!',
  '[&_.mentoring-dashboard-wide-button]:mt-[16px]!',
  '[&_.mentoring-dashboard-wide-button]:h-[38px]!',
  '[&_.mentoring-dashboard-wide-button]:w-full!',
  '[&_.mentoring-dashboard-wide-button]:items-center!',
  '[&_.mentoring-dashboard-wide-button]:justify-center!',
  '[&_.mentoring-dashboard-wide-button]:rounded-[12px]!',
  '[&_.mentoring-dashboard-wide-button]:border-[1px]!',
  '[&_.mentoring-dashboard-wide-button]:border-[#E5E7EB]!',
  '[&_.mentoring-dashboard-wide-button]:bg-[#F9FAFB]!',
  '[&_.mentoring-dashboard-wide-button]:px-[16px]!',
  '[&_.mentoring-dashboard-wide-button]:py-0!',
  '[&_.mentoring-dashboard-wide-button]:text-[12px]!',
  '[&_.mentoring-dashboard-wide-button]:leading-[16px]!',
  '[&_.mentoring-dashboard-wide-button]:font-bold!',
  '[&_.mentoring-dashboard-wide-button]:text-[#4B5563]!',
  '[&_.mentoring-dashboard-wide-button]:[box-shadow:0_1px_2px_0_rgb(0_0_0_/_0.05)]!',
  '[&_.mentoring-dashboard-wide-button.white]:bg-white!',
  '[&_.mentoring-dashboard-feedback-item]:block!',
  '[&_.mentoring-dashboard-feedback-item]:rounded-[12px]!',
  '[&_.mentoring-dashboard-feedback-item]:border-[1px]!',
  '[&_.mentoring-dashboard-feedback-item]:border-[#00C471]!',
  '[&_.mentoring-dashboard-feedback-item]:bg-[#EBFDF5]!',
  '[&_.mentoring-dashboard-feedback-item]:p-[16px]!',
  '[&_.mentoring-dashboard-task-item]:block!',
  '[&_.mentoring-dashboard-task-item]:rounded-[12px]!',
  '[&_.mentoring-dashboard-task-item]:border-[1px]!',
  '[&_.mentoring-dashboard-task-item]:border-[#E5E7EB]!',
  '[&_.mentoring-dashboard-task-item]:bg-[#F9FAFB]!',
  '[&_.mentoring-dashboard-task-item]:p-[16px]!',
  '[&_.mentoring-dashboard-qna-item]:block!',
  '[&_.mentoring-dashboard-qna-item]:rounded-[12px]!',
  '[&_.mentoring-dashboard-qna-item]:border-[1px]!',
  '[&_.mentoring-dashboard-qna-item]:border-[#E5E7EB]!',
  '[&_.mentoring-dashboard-qna-item]:bg-[#F9FAFB]!',
  '[&_.mentoring-dashboard-qna-item]:p-[16px]!',
  '[&_.mentoring-dashboard-feedback-badge]:inline-flex!',
  '[&_.mentoring-dashboard-feedback-badge]:rounded-[4px]!',
  '[&_.mentoring-dashboard-feedback-badge]:border-[1px]!',
  '[&_.mentoring-dashboard-feedback-badge]:border-[#D1FAE5]!',
  '[&_.mentoring-dashboard-feedback-badge]:bg-white!',
  '[&_.mentoring-dashboard-feedback-badge]:px-[8px]!',
  '[&_.mentoring-dashboard-feedback-badge]:py-[2px]!',
  '[&_.mentoring-dashboard-feedback-badge]:text-[10px]!',
  '[&_.mentoring-dashboard-feedback-badge]:leading-[14px]!',
  '[&_.mentoring-dashboard-feedback-badge]:font-extrabold!',
  '[&_.mentoring-dashboard-feedback-badge]:text-[#00C471]!',
  '[&_.mentoring-dashboard-count-badge]:inline-flex!',
  '[&_.mentoring-dashboard-count-badge]:h-[22px]!',
  '[&_.mentoring-dashboard-count-badge]:items-center!',
  '[&_.mentoring-dashboard-count-badge]:rounded-[9999px]!',
  '[&_.mentoring-dashboard-count-badge]:bg-[#F3F4F6]!',
  '[&_.mentoring-dashboard-count-badge]:px-[8px]!',
  '[&_.mentoring-dashboard-count-badge]:py-0!',
  '[&_.mentoring-dashboard-count-badge]:text-[10px]!',
  '[&_.mentoring-dashboard-count-badge]:leading-[14px]!',
  '[&_.mentoring-dashboard-count-badge]:font-extrabold!',
  '[&_.mentoring-dashboard-count-badge]:text-[#6B7280]!',
  '[&_.mentoring-dashboard-count-badge.active]:bg-[#DCFCE7]!',
  '[&_.mentoring-dashboard-count-badge.active]:text-[#00C471]!',
  '[&_.mentoring-dashboard-task-source]:inline-flex!',
  '[&_.mentoring-dashboard-task-source]:items-center!',
  '[&_.mentoring-dashboard-task-source]:rounded-[4px]!',
  '[&_.mentoring-dashboard-task-source]:border-[1px]!',
  '[&_.mentoring-dashboard-task-source]:border-[#EDE9FE]!',
  '[&_.mentoring-dashboard-task-source]:bg-[#F5F3FF]!',
  '[&_.mentoring-dashboard-task-source]:px-[6px]!',
  '[&_.mentoring-dashboard-task-source]:py-[2px]!',
  '[&_.mentoring-dashboard-task-source]:text-[9px]!',
  '[&_.mentoring-dashboard-task-source]:leading-[12px]!',
  '[&_.mentoring-dashboard-task-source]:font-extrabold!',
  '[&_.mentoring-dashboard-task-source]:text-[#7C3AED]!',
  '[&_.mentoring-dashboard-priority-badge]:inline-flex!',
  '[&_.mentoring-dashboard-priority-badge]:items-center!',
  '[&_.mentoring-dashboard-priority-badge]:rounded-[4px]!',
  '[&_.mentoring-dashboard-priority-badge]:border-[1px]!',
  '[&_.mentoring-dashboard-priority-badge]:border-[#E5E7EB]!',
  '[&_.mentoring-dashboard-priority-badge]:bg-[#F3F4F6]!',
  '[&_.mentoring-dashboard-priority-badge]:px-[6px]!',
  '[&_.mentoring-dashboard-priority-badge]:py-[2px]!',
  '[&_.mentoring-dashboard-priority-badge]:text-[9px]!',
  '[&_.mentoring-dashboard-priority-badge]:leading-[12px]!',
  '[&_.mentoring-dashboard-priority-badge]:font-extrabold!',
  '[&_.mentoring-dashboard-priority-badge]:text-[#6B7280]!',
  '[&_.mentoring-dashboard-priority-badge.high]:border-[#FECACA]!',
  '[&_.mentoring-dashboard-priority-badge.high]:bg-[#FEE2E2]!',
  '[&_.mentoring-dashboard-priority-badge.high]:text-[#DC2626]!',
  '[&_.mentoring-dashboard-qna-badge]:inline-flex!',
  '[&_.mentoring-dashboard-qna-badge]:shrink-0!',
  '[&_.mentoring-dashboard-qna-badge]:items-center!',
  '[&_.mentoring-dashboard-qna-badge]:rounded-[4px]!',
  '[&_.mentoring-dashboard-qna-badge]:bg-[#E5E7EB]!',
  '[&_.mentoring-dashboard-qna-badge]:px-[6px]!',
  '[&_.mentoring-dashboard-qna-badge]:py-[2px]!',
  '[&_.mentoring-dashboard-qna-badge]:text-[9px]!',
  '[&_.mentoring-dashboard-qna-badge]:leading-[12px]!',
  '[&_.mentoring-dashboard-qna-badge]:font-extrabold!',
  '[&_.mentoring-dashboard-qna-badge]:text-[#6B7280]!',
  '[&_.mentoring-dashboard-qna-badge.answered]:bg-[#3B82F6]!',
  '[&_.mentoring-dashboard-qna-badge.answered]:text-white!',
].join(' ')

export const PAGE_CONFIG: Record<MentoringCommonPage, PageConfig> = {
  dashboard: {
    path: '/mentoring-dashboard',
    label: '멘토링 대시보드',
    title: '멘토링 대시보드',
    icon: 'fas fa-home',
  },
  curriculum: {
    path: '/mentoring-curriculum',
    label: '주차별 미션 & 피드백',
    title: '주차별 미션 & 피드백',
    icon: 'fas fa-tasks',
  },
  qna: {
    path: '/mentoring-qna',
    label: '멘토 Q&A',
    title: '멘토 Q&A',
    icon: 'fas fa-comments',
  },
  workspace: {
    path: '/mentoring-workspace',
    label: '개인 칸반',
    title: '개인 칸반',
    icon: 'fas fa-columns',
  },
  schedule: {
    path: '/mentoring-schedule',
    label: '일정',
    title: '일정',
    icon: 'fas fa-calendar-alt',
  },
  files: {
    path: '/mentoring-files',
    label: '자료실',
    title: '자료실',
    icon: 'fas fa-folder-open',
  },
  meeting: {
    path: '/mentoring-meeting',
    label: '화상 멘토링',
    title: '화상 멘토링',
    icon: 'fas fa-video',
  },
  'live-meeting': {
    path: '/mentoring-live-meeting',
    label: '라이브 룸',
    title: '라이브 룸',
    icon: 'fas fa-headset',
  },
  erd: {
    path: '/mentoring-erd',
    label: 'ERD 설계',
    title: 'ERD 설계',
    icon: 'fas fa-project-diagram',
  },
}

export const NAV_SECTIONS = [
  {
    title: 'Mentoring Core',
    items: ['dashboard', 'curriculum', 'qna'] as MentoringCommonPage[],
  },
  {
    title: 'Collaboration',
    items: ['workspace', 'schedule', 'files', 'meeting', 'erd'] as MentoringCommonPage[],
  },
]

export const EMPTY_DATA: MentoringWorkspaceData = {
  dashboard: null,
  tasks: [],
  events: [],
  questions: [],
  files: [],
  erd: null,
  erdVersions: [],
  meetingNotes: [],
  voiceChannels: [],
  notices: [],
}

export const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string; tone: string; countTone: string }> = [
  {
    status: 'TODO',
    label: 'To Do',
    tone: 'text-gray-800',
    countTone: 'bg-gray-200 text-gray-600',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    tone: 'text-[#00C471]',
    countTone: 'bg-green-100 text-[#00C471]',
  },
  {
    status: 'DONE',
    label: 'Done',
    tone: 'text-gray-500',
    countTone: 'bg-gray-200 text-gray-500',
  },
]

export function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const parsed = Number(params.get('workspaceId') ?? params.get('mentoringId'))

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function buildHref(page: MentoringCommonPage, workspaceId: number | null, extra?: URLSearchParams) {
  const params = new URLSearchParams(extra)

  if (workspaceId) {
    params.set('workspaceId', String(workspaceId))
  }

  const query = params.toString()

  return query ? `${PAGE_CONFIG[page].path}?${query}` : PAGE_CONFIG[page].path
}

export function buildMentoringNotificationHref(path: string, workspaceId: number | null) {
  const normalizedPath = path.endsWith('.html') ? path.replace(/\.html$/, '') : path
  const basePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  const [pathname, queryString] = basePath.split('?')
  const params = new URLSearchParams(queryString)

  if (workspaceId) {
    params.set('workspaceId', String(workspaceId))
  }

  const query = params.toString()

  return query ? `${pathname}?${query}` : pathname
}

export function parseDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value?: string | null) {
  const date = parseDate(value)

  if (!date) {
    return '날짜 없음'
  }

  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

export function formatDateTime(value?: string | null) {
  const date = parseDate(value)

  if (!date) {
    return '시간 없음'
  }

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(value?: string | null) {
  const date = parseDate(value)

  if (!date) {
    return '방금 전'
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  if (diffDays < 7) {
    return `${diffDays}일 전`
  }

  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB'
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function percent(done: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((done / total) * 100)
}

export function statusLabel(status?: TaskStatus | null) {
  switch (status) {
    case 'TODO':
      return '대기'
    case 'IN_PROGRESS':
      return '진행 중'
    case 'DONE':
      return '완료'
    default:
      return '대기'
  }
}

export function priorityLabel(priority?: TaskPriority | null) {
  switch (priority) {
    case 'HIGH':
      return '긴급'
    case 'MEDIUM':
      return '보통'
    case 'LOW':
      return '낮음'
    default:
      return '보통'
  }
}

export function initials(name?: string | null) {
  const trimmed = name?.trim()

  if (!trimmed) {
    return 'U'
  }

  return trimmed.slice(0, 2).toUpperCase()
}

export function sortByRecent<T extends { createdAt?: string | null; updatedAt?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = parseDate(left.updatedAt ?? left.createdAt)?.getTime() ?? 0
    const rightTime = parseDate(right.updatedAt ?? right.createdAt)?.getTime() ?? 0

    return rightTime - leftTime
  })
}

export type ErdColumnSchema = {
  name: string
  type?: string | null
  key?: string | null
  primary?: boolean | null
  foreign?: boolean | null
}

export type ErdTableSchema = {
  id?: string | null
  name: string
  columns?: ErdColumnSchema[] | null
  x?: number | null
  y?: number | null
}

export type ErdRelationshipSchema = {
  id?: string | null
  from: string
  to: string
  label?: string | null
  type?: string | null
}

export type ParsedErdSchema = {
  tables: ErdTableSchema[]
  relationships: ErdRelationshipSchema[]
}

export type ErdTool = 'select' | 'connect'
export type ErdRelationType = '1:1' | '1:N' | 'N:M'
export type ErdDragState = {
  tableId: string
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

export const ERD_TABLE_WIDTH = 240
export const ERD_HEADER_HEIGHT = 41
export const ERD_COLUMN_HEIGHT = 33

export function getErdRelationshipId(relationship: ErdRelationshipSchema) {
  return relationship.id ?? `${relationship.from}-${relationship.to}`
}

export function getErdRelationCardinality(type?: string | null) {
  switch (type) {
    case '1:1':
      return { source: '1', target: '1' }
    case 'N:M':
      return { source: 'N', target: 'N' }
    case '1:N':
    default:
      return { source: '1', target: 'N' }
  }
}

export function parseErdSchema(schemaJson?: string | null, mermaidCode?: string | null): ParsedErdSchema {
  if (schemaJson?.trim()) {
    try {
      const parsed = JSON.parse(schemaJson) as Partial<ParsedErdSchema>

      return {
        tables: Array.isArray(parsed.tables) ? parsed.tables : [],
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      }
    } catch {
      // Fall through to the Mermaid parser.
    }
  }

  return parseMermaidErd(mermaidCode)
}

export function parseMermaidErd(mermaidCode?: string | null): ParsedErdSchema {
  if (!mermaidCode?.trim()) {
    return { tables: [], relationships: [] }
  }

  const tables = new Map<string, ErdTableSchema>()
  const relationships: ErdRelationshipSchema[] = []
  let activeTable: ErdTableSchema | null = null

  mermaidCode.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim()

    if (!line || line === 'erDiagram') {
      return
    }

    const tableStart = line.match(/^([A-Za-z0-9_]+)\s*\{$/)
    if (tableStart) {
      activeTable = { name: tableStart[1], columns: [] }
      tables.set(activeTable.name, activeTable)
      return
    }

    if (line === '}') {
      activeTable = null
      return
    }

    if (activeTable) {
      const [type = 'VARCHAR', name = 'column', key] = line.split(/\s+/)
      activeTable.columns = [
        ...(activeTable.columns ?? []),
        {
          name,
          type,
          key,
          primary: key === 'PK',
          foreign: key === 'FK',
        },
      ]
      return
    }

    const relation = line.match(/^([A-Za-z0-9_]+)\s+[|}{o]+--[|}{o]+\s+([A-Za-z0-9_]+)\s*:?\s*(.*)$/)
    if (relation) {
      relationships.push({
        from: relation[1],
        to: relation[2],
        label: relation[3] || null,
      })
      tables.set(relation[1], tables.get(relation[1]) ?? { name: relation[1], columns: [] })
      tables.set(relation[2], tables.get(relation[2]) ?? { name: relation[2], columns: [] })
    }
  })

  return { tables: [...tables.values()], relationships }
}

export function getErdTablePosition(table: ErdTableSchema, index: number) {
  const fallbackPositions = [
    { x: 140, y: 130 },
    { x: 540, y: 130 },
    { x: 140, y: 360 },
    { x: 540, y: 360 },
    { x: 900, y: 250 },
    { x: 900, y: 500 },
  ]
  const fallback = fallbackPositions[index % fallbackPositions.length]

  return {
    x: typeof table.x === 'number' ? table.x : fallback.x,
    y: typeof table.y === 'number' ? table.y : fallback.y,
  }
}

export function toErdSlug(value: string) {
  const slug = value.trim().replace(/[^A-Za-z0-9_가-힣-]+/g, '-').replace(/-+/g, '-')

  return slug || 'table'
}

export function makeErdTableId(table: ErdTableSchema, index: number) {
  return table.id?.trim() || `table-${toErdSlug(table.name)}-${index + 1}`
}

export function normalizeErdSchema(schema: ParsedErdSchema): ParsedErdSchema {
  const tables = schema.tables.map((table, index) => {
    const position = getErdTablePosition(table, index)

    return {
      ...table,
      id: makeErdTableId(table, index),
      name: table.name?.trim() || 'Unnamed',
      columns: table.columns ?? [],
      x: position.x,
      y: position.y,
    }
  })
  const tableByName = new Map(tables.map((table) => [table.name, table]))
  const tableById = new Map(tables.map((table) => [table.id ?? table.name, table]))
  const relationships = schema.relationships.reduce<ErdRelationshipSchema[]>((items, relationship, index) => {
    const from = tableById.get(relationship.from) ?? tableByName.get(relationship.from)
    const to = tableById.get(relationship.to) ?? tableByName.get(relationship.to)

    if (!from || !to) {
      return items
    }

    items.push({
      ...relationship,
      id: relationship.id?.trim() || `conn-${index + 1}`,
      from: from.id ?? from.name,
      to: to.id ?? to.name,
      type: (relationship.type ?? relationship.label ?? '1:N') as ErdRelationType,
    })

    return items
  }, [])

  return { tables, relationships }
}

export function erdRelationToMermaid(type?: string | null) {
  switch (type) {
    case '1:1':
      return '||--||'
    case 'N:M':
      return '}o--o{'
    case '1:N':
    default:
      return '||--o{'
  }
}

export function generateMermaidErd(tables: ErdTableSchema[], relationships: ErdRelationshipSchema[]) {
  const tableById = new Map(tables.map((table) => [table.id ?? table.name, table]))
  const lines = ['erDiagram']

  relationships.forEach((relationship) => {
    const from = tableById.get(relationship.from)
    const to = tableById.get(relationship.to)

    if (!from || !to) {
      return
    }

    lines.push(`  ${from.name || 'Unnamed'} ${erdRelationToMermaid(relationship.type)} ${to.name || 'Unnamed'} : ${relationship.type ?? '1:N'}`)
  })

  tables.forEach((table) => {
    lines.push(`  ${table.name || 'Unnamed'} {`)
    ;(table.columns ?? []).forEach((column) => {
      const key = column.primary ? ' PK' : column.foreign ? ' FK' : ''
      lines.push(`    ${column.type || 'VARCHAR'} ${column.name || 'column'}${key}`)
    })
    lines.push('  }')
  })

  return lines.join('\n')
}
