


export type MentoringTab = 'recruiting' | 'requests' | 'ongoing' | 'completed'
export type MentoringMode = 'study' | 'team'

export type RecruitingRole = { name: string; current: number; total: number }

export type RecruitingProject = {
  id: string
  title: string
  requestTitle: string
  description: string
  mode: MentoringMode
  category: string
  recruitStatus: '모집중' | '모집마감'
  current: number
  total: number
  roles: RecruitingRole[]
  tags: string[]
  mentorName: string
  mentorBio: string
  intro: string
  durationWeeks: number
  weeks: string[]
}

export type PendingRequest = {
  id: string
  applicantName: string
  avatarSeed: string
  submittedAt: string
  projectId: string
  projectTitle: string
  mode: MentoringMode
  role: string
  motivation: string
  portfolioUrl: string
}

export type OngoingProject = {
  id: string
  title: string
  subtitle: string
  week: number
  mode: MentoringMode
  category: string
  progress: number
  primaryAction: string
  secondaryAction: string
  menuActions: string[]
  workspaceId?: number | null
  startDate?: string | null
}

export type MentoringPostDetail = {
  postId: number
  title: string
  content?: string | null
  requiredStacks?: string | null
  category?: string | null
  mentoringType?: string | null
  durationWeeks?: number | null
  curriculum?: string | null
  maxParticipants?: number | null
  status?: string | null
}

export type WorkspaceMemberSummary = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  roleLabel?: string | null
  position?: string | null
  online?: boolean
  lastActiveAt?: string | null
  joinedAt?: string | null
}

export type WorkspaceDashboardSummary = {
  workspaceId: number
  name?: string | null
  description?: string | null
  ownerId?: number | null
  ownerName?: string | null
  members?: WorkspaceMemberSummary[]
}

export type WorkspaceSettingsSummary = {
  workspaceId: number
  name?: string | null
  description?: string | null
  ownerId?: number | null
  canManage?: boolean
  members?: WorkspaceMemberSummary[]
}

export type WorkspaceMilestoneSummary = {
  milestoneId: number
  title: string
  startDate?: string | null
  dueDate?: string | null
  status?: string | null
  createdAt?: string | null
}

export type WorkspaceTaskSummary = {
  taskId: number
  title: string
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | string
  assigneeId?: number | null
  dueDate?: string | null
  createdAt?: string | null
}

export type OngoingProjectView = OngoingProject & {
  displayWeek: number
  displayProgress: number
  milestoneTotal: number
  progressSource: 'milestone' | 'assignment' | 'board'
}

export type WorkspaceSettingsForm = {
  title: string
  subtitle: string
  category: string
}

export type ProjectRoleInput = { name: string; count: number }

export type ProjectFormState = {
  mode: MentoringMode
  category: string
  recruitStatus: '모집중' | '모집마감'
  title: string
  capacityTotal: string
  durationWeeks: string
  tags: string[]
  mentorName: string
  mentorBio: string
  intro: string
  weeks: string[]
  roles: ProjectRoleInput[]
}

export const INSTRUCTOR_MENTORING_UI_LOCK_CLASSES = [
  "p-[32px]! text-[#1f2937]! font-['Pretendard',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]!",
  '[&_.instructor-mentoring-content]:m-0! [&_.instructor-mentoring-content]:w-[111.111111%]! [&_.instructor-mentoring-content]:max-w-none! [&_.instructor-mentoring-content]:[transform:scale(0.9)]! [&_.instructor-mentoring-content]:origin-top-left!',
  '[&_.instructor-mentoring-heading-row]:mb-[24px]! [&_.instructor-mentoring-heading-row]:items-center!',
  '[&_h1]:m-0! [&_h1]:text-[#111827]! [&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[700]! [&_h1]:tracking-[0]!',
  '[&_.instructor-mentoring-create-button]:h-[40px]! [&_.instructor-mentoring-create-button]:gap-[8px]! [&_.instructor-mentoring-create-button]:rounded-[8px]! [&_.instructor-mentoring-create-button]:bg-[#00c471]! [&_.instructor-mentoring-create-button]:px-[16px]! [&_.instructor-mentoring-create-button]:py-[10px]! [&_.instructor-mentoring-create-button]:text-[#ffffff]! [&_.instructor-mentoring-create-button]:text-[12px]! [&_.instructor-mentoring-create-button]:leading-[16px]! [&_.instructor-mentoring-create-button]:font-[700]! [&_.instructor-mentoring-create-button]:[box-shadow:0_1px_2px_rgba(15,23,42,0.08)]!',
  '[&_.instructor-mentoring-tabs]:mb-[24px]! [&_.instructor-mentoring-tabs]:gap-[8px]! [&_.instructor-mentoring-tabs]:border-b-[1px]! [&_.instructor-mentoring-tabs]:border-b-[#e5e7eb]!',
  '[&_.instructor-mentoring-tab]:mr-0! [&_.instructor-mentoring-tab]:border-b-[2px]! [&_.instructor-mentoring-tab]:border-b-transparent! [&_.instructor-mentoring-tab]:bg-transparent! [&_.instructor-mentoring-tab]:px-[16px]! [&_.instructor-mentoring-tab]:py-[12px]! [&_.instructor-mentoring-tab]:text-[#6b7280]! [&_.instructor-mentoring-tab]:text-[14px]! [&_.instructor-mentoring-tab]:leading-[20px]! [&_.instructor-mentoring-tab]:font-[500]!',
  '[&_.instructor-mentoring-tab.active]:border-b-[#00c471]! [&_.instructor-mentoring-tab.active]:text-[#00c471]! [&_.instructor-mentoring-tab.active]:font-[700]!',
  '[&_.instructor-mentoring-tab_span]:inline-flex! [&_.instructor-mentoring-tab_span]:min-h-[18px]! [&_.instructor-mentoring-tab_span]:items-center! [&_.instructor-mentoring-tab_span]:ml-[4px]! [&_.instructor-mentoring-tab_span]:rounded-[9999px]! [&_.instructor-mentoring-tab_span]:px-[6px]! [&_.instructor-mentoring-tab_span]:py-[2px]! [&_.instructor-mentoring-tab_span]:text-[10px]! [&_.instructor-mentoring-tab_span]:leading-[12px]!',
  '[&_.instructor-mentoring-card-grid]:gap-[24px]!',
  '[&_.instructor-mentoring-card]:h-full! [&_.instructor-mentoring-card]:rounded-[12px]! [&_.instructor-mentoring-card]:border-[1px]! [&_.instructor-mentoring-card]:border-[#e5e7eb]! [&_.instructor-mentoring-card]:bg-[#ffffff]! [&_.instructor-mentoring-card]:p-[24px]! [&_.instructor-mentoring-card]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.instructor-mentoring-card:hover]:border-[#00c471]!',
  '[&_.instructor-mentoring-card>div:first-child]:mb-[16px]!',
  '[&_.instructor-mentoring-card>div:first-child_span]:rounded-[4px]! [&_.instructor-mentoring-card>div:first-child_span]:px-[8px]! [&_.instructor-mentoring-card>div:first-child_span]:py-[4px]! [&_.instructor-mentoring-card>div:first-child_span]:text-[10px]! [&_.instructor-mentoring-card>div:first-child_span]:leading-[12px]! [&_.instructor-mentoring-card>div:first-child_span]:font-[700]!',
  '[&_.instructor-mentoring-card_h3]:text-[#111827]! [&_.instructor-mentoring-card_h3]:text-[18px]! [&_.instructor-mentoring-card_h3]:leading-[22px]! [&_.instructor-mentoring-card_h3]:font-[800]! [&_.instructor-mentoring-card_h3]:tracking-[0]!',
  '[&_.instructor-mentoring-card_p]:text-[#6b7280]! [&_.instructor-mentoring-card_p]:text-[12px]! [&_.instructor-mentoring-card_p]:leading-[19px]!',
  '[&_.instructor-mentoring-card_button.rounded-xl.bg-brand]:min-h-[46px]! [&_.instructor-mentoring-card_button.rounded-xl.bg-brand]:rounded-[12px]! [&_.instructor-mentoring-card_button.rounded-xl.bg-brand]:px-[16px]! [&_.instructor-mentoring-card_button.rounded-xl.bg-brand]:py-[14px]! [&_.instructor-mentoring-card_button.rounded-xl.bg-brand]:text-[12px]! [&_.instructor-mentoring-card_button.rounded-xl.bg-brand]:leading-[16px]! [&_.instructor-mentoring-card_button.rounded-xl.bg-brand]:font-[700]!',
  '[&_.instructor-mentoring-card_.rounded-lg.bg-gray-50]:mb-[24px]! [&_.instructor-mentoring-card_.rounded-lg.bg-gray-50]:rounded-[8px]! [&_.instructor-mentoring-card_.rounded-lg.bg-gray-50]:p-[12px]!',
  '[&_.instructor-mentoring-dropdown]:top-[calc(100%+8px)]! [&_.instructor-mentoring-dropdown]:right-0! [&_.instructor-mentoring-dropdown]:z-[50]! [&_.instructor-mentoring-dropdown]:min-w-[160px]! [&_.instructor-mentoring-dropdown]:rounded-[8px]! [&_.instructor-mentoring-dropdown]:border-[1px]! [&_.instructor-mentoring-dropdown]:border-[#e5e7eb]! [&_.instructor-mentoring-dropdown]:bg-[#ffffff]! [&_.instructor-mentoring-dropdown]:[box-shadow:0_4px_6px_-1px_rgba(0,0,0,0.1)]!',
  '[&_.instructor-mentoring-dropdown_button]:px-[16px]! [&_.instructor-mentoring-dropdown_button]:py-[8px]! [&_.instructor-mentoring-dropdown_button]:text-[14px]! [&_.instructor-mentoring-dropdown_button]:leading-[20px]!',
  '[&_.instructor-mentoring-request-toolbar]:mb-[16px]! [&_.instructor-mentoring-request-toolbar]:gap-[16px]!',
  '[&_.instructor-mentoring-select]:h-[34px]! [&_.instructor-mentoring-select]:rounded-[8px]! [&_.instructor-mentoring-select]:border-[1px]! [&_.instructor-mentoring-select]:border-[#e5e7eb]! [&_.instructor-mentoring-select]:bg-[#ffffff]! [&_.instructor-mentoring-select]:px-[12px]! [&_.instructor-mentoring-select]:py-[8px]! [&_.instructor-mentoring-select]:text-[#374151]! [&_.instructor-mentoring-select]:text-[12px]! [&_.instructor-mentoring-select]:leading-[16px]! [&_.instructor-mentoring-select]:font-[700]!',
  '[&_.instructor-mentoring-table-wrap]:rounded-[12px]! [&_.instructor-mentoring-table-wrap]:border-[1px]! [&_.instructor-mentoring-table-wrap]:border-[#e5e7eb]! [&_.instructor-mentoring-table-wrap]:bg-[#ffffff]! [&_.instructor-mentoring-table-wrap]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.instructor-mentoring-table]:w-full! [&_.instructor-mentoring-table]:min-w-full! [&_.instructor-mentoring-table]:border-collapse! [&_.instructor-mentoring-table]:text-left!',
  '[&_.instructor-mentoring-table_thead]:border-b-[1px]! [&_.instructor-mentoring-table_thead]:border-b-[#f3f4f6]! [&_.instructor-mentoring-table_thead]:bg-[#f9fafb]! [&_.instructor-mentoring-table_thead]:text-[#9ca3af]! [&_.instructor-mentoring-table_thead]:text-[11px]! [&_.instructor-mentoring-table_thead]:leading-[14px]! [&_.instructor-mentoring-table_thead]:font-[700]! [&_.instructor-mentoring-table_thead]:tracking-[0.05em]! [&_.instructor-mentoring-table_thead]:uppercase!',
  '[&_.instructor-mentoring-table_th]:px-[24px]! [&_.instructor-mentoring-table_th]:py-[16px]! [&_.instructor-mentoring-table_td]:px-[24px]! [&_.instructor-mentoring-table_td]:py-[16px]!',
  '[&_.instructor-mentoring-table_img]:h-[32px]! [&_.instructor-mentoring-table_img]:w-[32px]! [&_.instructor-mentoring-table_img]:rounded-[9999px]!',
  '[&_.instructor-mentoring-table_td]:text-[12px]! [&_.instructor-mentoring-table_td]:leading-[16px]! [&_.instructor-mentoring-table_td_button]:text-[11px]! [&_.instructor-mentoring-table_td_button]:leading-[14px]!',
  '[&_.instructor-mentoring-ongoing-card_h3]:mb-[8px]! [&_.instructor-mentoring-ongoing-card>p]:mb-[24px]!',
  '[&_.instructor-mentoring-ongoing-card_.instructor-mentoring-progress-bar]:h-[6px]!',
  '[&_.instructor-mentoring-ongoing-card_.border-t]:pt-[16px]! [&_.instructor-mentoring-ongoing-card_.border-t_button]:min-h-[38px]! [&_.instructor-mentoring-ongoing-card_.border-t_button]:rounded-[12px]! [&_.instructor-mentoring-ongoing-card_.border-t_button]:px-[12px]! [&_.instructor-mentoring-ongoing-card_.border-t_button]:py-[10px]! [&_.instructor-mentoring-ongoing-card_.border-t_button]:text-[12px]! [&_.instructor-mentoring-ongoing-card_.border-t_button]:leading-[16px]! [&_.instructor-mentoring-ongoing-card_.border-t_button]:font-[700]!',
  '[&_.instructor-mentoring-completed]:p-[32px]! [&_.instructor-mentoring-completed]:text-[#6b7280]! [&_.instructor-mentoring-completed]:text-[14px]! [&_.instructor-mentoring-completed]:leading-[20px]! [&_.instructor-mentoring-completed]:font-[700]!',
  '[&_.instructor-mentoring-application-modal]:w-full! [&_.instructor-mentoring-application-modal]:max-w-[448px]! [&_.instructor-mentoring-application-modal]:rounded-[16px]! [&_.instructor-mentoring-application-modal]:bg-[#ffffff]! [&_.instructor-mentoring-application-modal]:p-[24px]! [&_.instructor-mentoring-application-modal]:[transform:scale(0.9)]! [&_.instructor-mentoring-application-modal]:origin-center! [&_.instructor-mentoring-application-modal]:[box-shadow:0_25px_50px_-12px_rgba(15,23,42,0.28)]!',
  '[&_.instructor-mentoring-application-modal_h3]:text-[18px]! [&_.instructor-mentoring-application-modal_h3]:leading-[28px]! [&_.instructor-mentoring-application-modal_h3]:font-[700]! [&_.instructor-mentoring-application-modal_p]:tracking-[0]!',
  '[&_.instructor-mentoring-application-modal_a]:rounded-[12px]! [&_.instructor-mentoring-application-modal_a]:p-[12px]! [&_.instructor-mentoring-application-modal_a]:text-[12px]! [&_.instructor-mentoring-application-modal_a]:leading-[16px]! [&_.instructor-mentoring-application-modal_a]:font-[700]!',
  '[&_.instructor-mentoring-application-modal_button]:rounded-[12px]! [&_.instructor-mentoring-application-modal_button]:text-[12px]! [&_.instructor-mentoring-application-modal_button]:leading-[16px]! [&_.instructor-mentoring-application-modal_button]:font-[700]!',
  '[&_.instructor-mentoring-setup-modal]:w-full! [&_.instructor-mentoring-setup-modal]:max-w-[512px]! [&_.instructor-mentoring-setup-modal]:rounded-[16px]! [&_.instructor-mentoring-setup-modal]:bg-[#ffffff]! [&_.instructor-mentoring-setup-modal]:[transform:scale(0.9)]! [&_.instructor-mentoring-setup-modal]:origin-center! [&_.instructor-mentoring-setup-modal]:[box-shadow:0_25px_50px_-12px_rgba(15,23,42,0.28)]!',
  '[&_.instructor-mentoring-setup-modal_h3]:text-[18px]! [&_.instructor-mentoring-setup-modal_h3]:leading-[28px]! [&_.instructor-mentoring-setup-modal_h3]:font-[700]! [&_.instructor-mentoring-setup-modal_p]:tracking-[0]! [&_.instructor-mentoring-setup-modal_span]:tracking-[0]!',
  '[&_.instructor-mentoring-setup-modal_input]:rounded-[12px]! [&_.instructor-mentoring-setup-modal_input]:border-[1px]! [&_.instructor-mentoring-setup-modal_input]:border-[#e5e7eb]! [&_.instructor-mentoring-setup-modal_input]:p-[12px]! [&_.instructor-mentoring-setup-modal_input]:text-[14px]! [&_.instructor-mentoring-setup-modal_input]:leading-[20px]!',
  '[&_.instructor-mentoring-setup-modal_textarea]:h-[128px]! [&_.instructor-mentoring-setup-modal_textarea]:rounded-[12px]! [&_.instructor-mentoring-setup-modal_textarea]:border-[1px]! [&_.instructor-mentoring-setup-modal_textarea]:border-[#e5e7eb]! [&_.instructor-mentoring-setup-modal_textarea]:p-[12px]! [&_.instructor-mentoring-setup-modal_textarea]:text-[14px]! [&_.instructor-mentoring-setup-modal_textarea]:leading-[20px]!',
  '[&_.instructor-mentoring-setup-modal_button]:rounded-[12px]! [&_.instructor-mentoring-setup-modal_button]:text-[14px]! [&_.instructor-mentoring-setup-modal_button]:leading-[20px]! [&_.instructor-mentoring-setup-modal_button]:font-[700]!',
  '[&_.instructor-mentoring-form-backdrop]:z-[2400]! [&_.instructor-mentoring-form-backdrop]:bg-[rgba(17,24,39,0.5)]! [&_.instructor-mentoring-form-backdrop]:p-[16px]! [&_.instructor-mentoring-form-backdrop]:[backdrop-filter:blur(2px)]!',
  '[&_.instructor-mentoring-form-modal]:w-[min(1100px,100%)]! [&_.instructor-mentoring-form-modal]:max-w-[1100px]! [&_.instructor-mentoring-form-modal]:max-h-[min(90vh,960px)]! [&_.instructor-mentoring-form-modal]:rounded-[18px]! [&_.instructor-mentoring-form-modal]:border-[1px]! [&_.instructor-mentoring-form-modal]:border-[#e5e7eb]! [&_.instructor-mentoring-form-modal]:bg-[#ffffff]! [&_.instructor-mentoring-form-modal]:[transform:scale(0.9)]! [&_.instructor-mentoring-form-modal]:origin-center! [&_.instructor-mentoring-form-modal]:[box-shadow:0_30px_90px_rgba(17,24,39,0.28)]!',
  '[&_.instructor-mentoring-form-modal>div:first-child]:border-b-[1px]! [&_.instructor-mentoring-form-modal>div:first-child]:border-b-[#f3f4f6]! [&_.instructor-mentoring-form-modal>div:first-child]:px-[16px]! [&_.instructor-mentoring-form-modal>div:first-child]:py-[14px]!',
  '[&_.instructor-mentoring-form-modal>div:first-child>div]:gap-[10px]! [&_.instructor-mentoring-form-modal>div:first-child>div]:text-[#111827]! [&_.instructor-mentoring-form-modal>div:first-child>div]:text-[14px]! [&_.instructor-mentoring-form-modal>div:first-child>div]:leading-[20px]! [&_.instructor-mentoring-form-modal>div:first-child>div]:font-[900]!',
  '[&_.instructor-mentoring-form-modal>div:first-child>button]:h-[36px]! [&_.instructor-mentoring-form-modal>div:first-child>button]:w-[36px]! [&_.instructor-mentoring-form-modal>div:first-child>button]:rounded-[12px]!',
  '[&_.instructor-mentoring-form-modal_.custom-scrollbar]:px-[16px]! [&_.instructor-mentoring-form-modal_.custom-scrollbar]:py-[14px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-form-grid]:gap-[14px]!',
  '[&_.instructor-mentoring-form-modal_.rounded-2xl]:rounded-[16px]!',
  '[&_.instructor-mentoring-form-modal_label]:text-[12px]! [&_.instructor-mentoring-form-modal_label]:leading-[16px]! [&_.instructor-mentoring-form-modal_label_span]:text-[12px]! [&_.instructor-mentoring-form-modal_label_span]:leading-[16px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-fixed-text]:text-[12px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-fixed-text]:leading-[16px]!',
  '[&_.instructor-mentoring-form-modal_input]:rounded-[12px]! [&_.instructor-mentoring-form-modal_input]:border-[1px]! [&_.instructor-mentoring-form-modal_input]:border-[#e5e7eb]! [&_.instructor-mentoring-form-modal_input]:px-[10px]! [&_.instructor-mentoring-form-modal_input]:py-[8px]! [&_.instructor-mentoring-form-modal_input]:text-[13px]! [&_.instructor-mentoring-form-modal_input]:leading-[18px]!',
  '[&_.instructor-mentoring-form-modal_select]:rounded-[12px]! [&_.instructor-mentoring-form-modal_select]:border-[1px]! [&_.instructor-mentoring-form-modal_select]:border-[#e5e7eb]! [&_.instructor-mentoring-form-modal_select]:px-[10px]! [&_.instructor-mentoring-form-modal_select]:py-[8px]! [&_.instructor-mentoring-form-modal_select]:text-[13px]! [&_.instructor-mentoring-form-modal_select]:leading-[18px]!',
  '[&_.instructor-mentoring-form-modal_textarea]:min-h-[92px]! [&_.instructor-mentoring-form-modal_textarea]:rounded-[12px]! [&_.instructor-mentoring-form-modal_textarea]:border-[1px]! [&_.instructor-mentoring-form-modal_textarea]:border-[#e5e7eb]! [&_.instructor-mentoring-form-modal_textarea]:px-[10px]! [&_.instructor-mentoring-form-modal_textarea]:py-[8px]! [&_.instructor-mentoring-form-modal_textarea]:text-[13px]! [&_.instructor-mentoring-form-modal_textarea]:leading-[18px]!',
  '[&_.instructor-mentoring-form-modal_button]:rounded-[12px]! [&_.instructor-mentoring-form-modal_button]:text-[13px]! [&_.instructor-mentoring-form-modal_button]:leading-[18px]! [&_.instructor-mentoring-form-modal_button]:font-[900]!',
  '[&_.instructor-mentoring-form-modal>div:last-child]:gap-[8px]! [&_.instructor-mentoring-form-modal>div:last-child]:border-t-[1px]! [&_.instructor-mentoring-form-modal>div:last-child]:border-t-[#f3f4f6]! [&_.instructor-mentoring-form-modal>div:last-child]:px-[16px]! [&_.instructor-mentoring-form-modal>div:last-child]:py-[12px]!',
  '[&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:grid! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:grid-cols-1! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:mb-[16px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:gap-[8px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:rounded-[12px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:border-[1px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:border-[#f3f4f6]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:bg-[#f9fafb]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-panel]:p-[12px]!',
  '[&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-label]:block! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-label]:m-0! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-label]:text-[#374151]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-label]:text-[12px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-label]:leading-[16px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-label]:font-[900]!',
  '[&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-grid]:grid! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-grid]:grid-cols-2! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-grid]:gap-[8px]!',
  '[&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:block! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:min-h-[68px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:w-full! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:rounded-[8px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:border-[1px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:border-[#e5e7eb]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:bg-[#ffffff]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:px-0! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:py-[10px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:text-center! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:text-[#4b5563]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:text-[12px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:leading-[16px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:font-[700]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:[box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option]:[transition:background-color_0.15s_ease,border-color_0.15s_ease,color_0.15s_ease]!',
  '[&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option:hover]:bg-[#f9fafb]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option.is-active]:border-[#7c3aed]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option.is-active]:bg-[#faf5ff]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-option.is-active]:text-[#7c3aed]!',
  '[&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-icon]:block! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-icon]:m-0! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-icon]:mb-[4px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-icon]:text-[18px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-icon]:leading-[28px]!',
  '[&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-desc]:mt-[8px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-desc]:text-center! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-desc]:text-[#6b7280]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-desc]:text-[10px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-desc]:leading-[14px]! [&_.instructor-mentoring-form-modal_.instructor-mentoring-mode-desc]:font-[400]!',
].join(' ')

export const modeMeta = {
  study: { label: '공통 과제형', fullLabel: '공통 과제 (스터디형)', icon: 'fas fa-users', tone: 'bg-purple-50 text-[#7C3AED] border-purple-100' },
  team: { label: '팀 프로젝트형', fullLabel: '역할 분담 (팀 프로젝트형)', icon: 'fas fa-puzzle-piece', tone: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
} as const

export function createDefaultForm(): ProjectFormState {
  return {
    mode: 'study',
    category: 'Backend',
    recruitStatus: '모집중',
    title: '',
    capacityTotal: '10',
    durationWeeks: '4',
    tags: ['Spring Boot', 'Redis'],
    mentorName: '',
    mentorBio: '',
    intro: '',
    weeks: ['요구사항 분석 및 ERD 설계', '핵심 API 비즈니스 로직 개발'],
    roles: [{ name: 'Frontend', count: 2 }, { name: 'Backend', count: 2 }],
  }
}

export function createSampleForm(): ProjectFormState {
  return {
    mode: 'study',
    category: 'Backend',
    recruitStatus: '모집중',
    title: '대용량 트래픽 커머스 서버 구축',
    capacityTotal: '10',
    durationWeeks: '4',
    tags: ['Spring Boot', 'Redis', 'Kafka', 'MySQL'],
    mentorName: '코드마스터 J',
    mentorBio: '네카라쿠배 백엔드 리드 개발자',
    intro: '실제 운영 환경과 유사한 트래픽 시나리오를 경험합니다. 선착순 쿠폰 발급, 재고 동시성 이슈 등을 집중적으로 다루며 코드 리뷰를 진행합니다.',
    weeks: ['요구사항 분석 및 ERD 설계', '회원/상품 기능 구현 및 단위 테스트 작성', '대용량 트래픽 처리를 위한 Redis/Kafka 도입', '성능 최적화 및 최종 발표'],
    roles: [{ name: 'Frontend', count: 2 }, { name: 'Backend', count: 2 }],
  }
}

export function projectToForm(project: RecruitingProject): ProjectFormState {
  return {
    mode: project.mode,
    category: project.category,
    recruitStatus: project.recruitStatus,
    title: project.title,
    capacityTotal: String(project.total || 10),
    durationWeeks: String(project.durationWeeks || 4),
    tags: project.tags,
    mentorName: project.mentorName,
    mentorBio: project.mentorBio,
    intro: project.intro,
    weeks: project.weeks.length > 0 ? project.weeks : [''],
    roles: project.roles.length > 0 ? project.roles.map((role) => ({ name: role.name, count: role.total })) : [{ name: 'Frontend', count: 2 }, { name: 'Backend', count: 2 }],
  }
}

export function getPreviewCapacity(form: ProjectFormState) {
  if (form.mode === 'study') {
    return { total: Number(form.capacityTotal || 0), detail: '' }
  }

  const roles = form.roles.filter((role) => role.name.trim() && role.count > 0)
  return { total: roles.reduce((sum, role) => sum + role.count, 0), detail: roles.map((role) => `${role.name} ${role.count}`).join(', ') }
}

export function buildProjectFromForm(form: ProjectFormState, previousProject?: RecruitingProject): RecruitingProject {
  const weeks = form.weeks.map((week) => week.trim()).filter(Boolean)
  const tags = form.tags.map((tag) => tag.trim()).filter(Boolean)
  const requestTitle = form.title.replace(/ 구축$| 서비스$| 스터디$/g, '').trim() || form.title.trim()

  if (form.mode === 'study') {
    const total = Math.max(1, Number(form.capacityTotal || 0))
    return {
      id: previousProject?.id ?? `project-${Date.now()}`,
      title: form.title.trim(),
      requestTitle,
      description: form.intro.trim(),
      mode: 'study',
      category: form.category,
      recruitStatus: form.recruitStatus,
      current: previousProject?.mode === 'study' ? Math.min(previousProject.current, total) : 0,
      total,
      roles: [],
      tags,
      mentorName: form.mentorName.trim(),
      mentorBio: form.mentorBio.trim(),
      intro: form.intro.trim(),
      durationWeeks: Math.max(1, Number(form.durationWeeks || 0)),
      weeks,
    }
  }

  const roles = form.roles.map((role) => ({ name: role.name.trim(), total: Math.max(1, role.count || 0) })).filter((role) => role.name)
  const previousRoleMap = new Map(previousProject?.roles.map((role) => [role.name, role.current]) ?? [])

  return {
    id: previousProject?.id ?? `project-${Date.now()}`,
    title: form.title.trim(),
    requestTitle,
    description: form.intro.trim(),
    mode: 'team',
    category: form.category,
    recruitStatus: form.recruitStatus,
    current: roles.reduce((sum, role) => sum + Math.min(previousRoleMap.get(role.name) ?? 0, role.total), 0),
    total: roles.reduce((sum, role) => sum + role.total, 0),
    roles: roles.map((role) => ({ name: role.name, total: role.total, current: Math.min(previousRoleMap.get(role.name) ?? 0, role.total) })),
    tags,
    mentorName: form.mentorName.trim(),
    mentorBio: form.mentorBio.trim(),
    intro: form.intro.trim(),
    durationWeeks: Math.max(1, Number(form.durationWeeks || 0)),
    weeks,
  }
}

export function applyApprovedRequest(project: RecruitingProject, request: PendingRequest): RecruitingProject {
  if (project.mode === 'study') {
    return { ...project, current: Math.min(project.total, project.current + 1) }
  }

  const roles = project.roles.map((role) => (role.name === request.role ? { ...role, current: Math.min(role.total, role.current + 1) } : role))
  return { ...project, roles, current: roles.reduce((sum, role) => sum + role.current, 0) }
}

export function getLiveApplicationId(requestId: string) {
  if (!requestId.startsWith('application-')) {
    return null
  }

  const applicationId = Number(requestId.replace('application-', ''))
  return Number.isFinite(applicationId) && applicationId > 0 ? applicationId : null
}

export function getLivePostId(projectId: string) {
  if (!projectId.startsWith('post-')) {
    return null
  }

  const postId = Number(projectId.replace('post-', ''))
  return Number.isFinite(postId) && postId > 0 ? postId : null
}

export function toMentoringPostPayload(project: RecruitingProject) {
  return {
    title: project.title,
    content: project.intro || project.description,
    requiredStacks: project.tags.join(', '),
    category: project.category,
    mentoringType: project.mode,
    durationWeeks: project.durationWeeks,
    curriculum: project.weeks.join('\n'),
    maxParticipants: Math.max(1, project.total || 1),
    status: project.recruitStatus === '모집마감' ? 'CLOSED' : 'OPEN',
  }
}

export function withPostId(project: RecruitingProject, post: MentoringPostDetail): RecruitingProject {
  return {
    ...project,
    id: `post-${post.postId}`,
    title: post.title || project.title,
    requestTitle: post.title || project.requestTitle,
    description: post.content ?? project.description,
    intro: post.content ?? project.intro,
    category: post.category ?? project.category,
    mode: post.mentoringType === 'team' ? 'team' : 'study',
    durationWeeks: post.durationWeeks ?? project.durationWeeks,
    total: post.maxParticipants ?? project.total,
    recruitStatus: post.status === 'CLOSED' ? '모집마감' : '모집중',
  }
}

export function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function startOfDay(date: Date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

export function sortMilestones(milestones: WorkspaceMilestoneSummary[]) {
  return [...milestones].sort((a, b) => {
    const left = parseDate(a.startDate)?.getTime() ?? parseDate(a.dueDate)?.getTime() ?? parseDate(a.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const right = parseDate(b.startDate)?.getTime() ?? parseDate(b.dueDate)?.getTime() ?? parseDate(b.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return left - right
  })
}

export function inferAssignmentWeek(task: WorkspaceTaskSummary, fallback: number) {
  const koreanWeek = task.title.match(/(\d+)\s*주차/i)
  const englishWeek = task.title.match(/week\s*(\d+)/i)
  const parsed = Number(koreanWeek?.[1] ?? englishWeek?.[1] ?? NaN)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback
}

export function sortTasks(tasks: WorkspaceTaskSummary[]) {
  return [...tasks].sort((a, b) => {
    const left = parseDate(a.dueDate)?.getTime() ?? parseDate(a.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const right = parseDate(b.dueDate)?.getTime() ?? parseDate(b.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
    if (left !== right) return left - right
    return a.taskId - b.taskId
  })
}

export function calculateAssignmentProgress(project: OngoingProject, tasks: WorkspaceTaskSummary[]): OngoingProjectView | null {
  const sorted = sortTasks(tasks)
  if (sorted.length === 0) return null

  const taskByWeek = new Map<number, WorkspaceTaskSummary[]>()
  sorted.forEach((task, index) => {
    const week = inferAssignmentWeek(task, (index % 4) + 1)
    taskByWeek.set(week, [...(taskByWeek.get(week) ?? []), task])
  })

  const weeks = [...taskByWeek.keys()].sort((a, b) => a - b)
  const total = weeks.length
  const today = startOfDay(new Date())
  const completedCount = weeks.filter((week) => {
    const weekTasks = taskByWeek.get(week) ?? []
    const dueDates = weekTasks.map((task) => startOfDay(parseDate(task.dueDate) ?? new Date(Number.NaN))).filter((date) => !Number.isNaN(date.getTime()))
    const weekDueDate = dueDates.length ? new Date(Math.max(...dueDates.map((date) => date.getTime()))) : null
    const allDone = weekTasks.length > 0 && weekTasks.every((task) => String(task.status ?? '').toUpperCase() === 'DONE')
    return allDone || (weekDueDate !== null && today > weekDueDate)
  }).length
  const displayWeek = completedCount >= total ? weeks[weeks.length - 1] : weeks[Math.min(completedCount, total - 1)]

  return {
    ...project,
    displayWeek: Math.max(1, displayWeek),
    displayProgress: Math.max(0, Math.min(100, Math.round((completedCount / total) * 100))),
    milestoneTotal: total,
    progressSource: 'assignment',
  }
}

export function calculateOngoingProgress(project: OngoingProject, milestones: WorkspaceMilestoneSummary[], tasks: WorkspaceTaskSummary[]): OngoingProjectView {
  if (project.mode === 'study') {
    const assignmentProgress = calculateAssignmentProgress(project, tasks)
    if (assignmentProgress) return assignmentProgress
  }

  const sorted = sortMilestones(milestones)
  const total = sorted.length

  if (project.mode !== 'team' || total === 0) {
    return {
      ...project,
      displayWeek: Math.max(1, project.week || 1),
      displayProgress: Math.max(0, Math.min(100, project.progress || 0)),
      milestoneTotal: Math.max(1, project.week || 1),
      progressSource: 'board',
    }
  }

  const today = startOfDay(new Date())
  const ranges = sorted.map((milestone, index) => {
    const start = startOfDay(parseDate(milestone.startDate) ?? parseDate(milestone.dueDate) ?? addDays(today, index * 7))
    const due = startOfDay(parseDate(milestone.dueDate) ?? addDays(start, 6))
    return { milestone, start, due }
  })
  const currentRangeIndex = ranges.findIndex((range) => today >= range.start && today <= range.due)
  const firstFutureIndex = ranges.findIndex((range) => today < range.start)
  const completedCount = ranges.filter((range) => String(range.milestone.status ?? '').toUpperCase() === 'COMPLETED' || today > range.due).length
  const week = currentRangeIndex >= 0
    ? currentRangeIndex + 1
    : firstFutureIndex >= 0
      ? Math.max(1, firstFutureIndex + 1)
      : total
  const progress = Math.round((completedCount / total) * 100)

  return {
    ...project,
    displayWeek: Math.max(1, Math.min(total, week)),
    displayProgress: Math.max(0, Math.min(100, progress)),
    milestoneTotal: total,
    progressSource: 'milestone',
  }
}

export function shortRoleLabel(position?: string | null) {
  if (!position) return null
  const normalized = position.toLowerCase()
  if (normalized.includes('front')) return 'FE'
  if (normalized.includes('back')) return 'BE'
  if (normalized.includes('full')) return 'FS'
  if (normalized.includes('design') || normalized.includes('디자')) return 'DES'
  if (normalized.includes('pm') || normalized.includes('기획')) return 'PM'
  if (normalized.includes('devops') || normalized.includes('infra') || normalized.includes('인프라')) return 'OPS'
  return position
}

export function avatarUrl(name?: string | null) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'DevPath')}`
}
