


import MarkdownContent from '../../components/MarkdownContent'
import UserAvatar from '../../components/UserAvatar'


import type { AuthSession } from '../../types/auth'
import type { InstructorQnaInboxItem } from '../../types/instructor'


type QuestionStatusFilter = 'pending' | 'answered'


const recommendedQuickTemplates = [
  {
    id: 'classic',
    title: '✅ 결론 → 이유 → 예시',
    description: '개념/이론 질문에 적합한 구조',
    content:
      '결론부터 말하면, 이 부분은 다음처럼 이해하면 됩니다.\n\n이유는 ... 때문입니다.\n\n예를 들어 ... 상황에서는 ... 방식으로 동작합니다.',
  },
  {
    id: 'steps',
    title: '🧭 단계별 트러블슈팅',
    description: '설치 및 환경변수 오류 해결용',
    content:
      '아래 순서대로 확인해보세요.\n\n1. 현재 설정 값을 먼저 확인합니다.\n2. 변경한 뒤 터미널이나 IDE를 완전히 재실행합니다.\n3. 같은 문제가 반복되면 에러 메시지의 첫 원인 줄을 기준으로 다시 확인합니다.',
  },
  {
    id: 'code',
    title: '{</>} 코드 교정 중심',
    description: '코드 피드백 및 모범 답안 제시',
    content:
      '현재 코드에서 핵심 문제는 ... 입니다.\n\n```java\n// 개선 예시\n```\n\n이렇게 바꾸면 ... 때문에 더 안전하게 동작합니다.',
  },
]


function formatRelativeTime(value: string | null) {
  if (!value) return '방금 전'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`
  return `${Math.floor(diffMinutes / 1440)}일 전`
}


function buildLearnerAvatarSeed(question: InstructorQnaInboxItem) {
  return (question.learnerName ?? question.learnerAvatarSeed ?? String(question.questionId)).replace(/\s+/g, '-')
}

function buildStatusBadgeClasses(status: string) {
  return status === 'UNANSWERED'
    ? 'border border-orange-200 bg-orange-50 text-orange-700'
    : 'border border-green-200 bg-green-50 text-green-700'
}

function buildStatusLabel(status: string) {
  return status === 'UNANSWERED' ? '미답변' : '답변 완료'
}


const INSTRUCTOR_QNA_UI_LOCK_CLASSES = [
  "h-[calc(100vh-64px)]! min-h-[calc(100vh-64px)]! overflow-hidden! bg-[#f3f4f6]! text-[#1f2937]! font-['Pretendard',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]!",
  '[&_.instructor-qna-main]:h-[calc(100vh-64px)]! [&_.instructor-qna-main]:min-h-[calc(100vh-64px)]! [&_.instructor-qna-main]:overflow-hidden! [&_.instructor-qna-main]:bg-[#f3f4f6]!',
  '[&_.instructor-qna-inbox]:z-[10]! [&_.instructor-qna-inbox]:border-r-[1px]! [&_.instructor-qna-inbox]:border-r-[#e5e7eb]! [&_.instructor-qna-inbox]:bg-[#ffffff]! [&_.instructor-qna-inbox]:[box-shadow:4px_0_24px_rgba(0,0,0,0.02)]!',
  '[&_.instructor-qna-inbox>div:first-child]:border-b-[1px]! [&_.instructor-qna-inbox>div:first-child]:border-b-[#f3f4f6]! [&_.instructor-qna-inbox>div:first-child]:p-[24px]!',
  '[&_.instructor-qna-inbox_h2]:text-[#111827]! [&_.instructor-qna-inbox_h2]:text-[20px]! [&_.instructor-qna-inbox_h2]:leading-[28px]! [&_.instructor-qna-inbox_h2]:font-[800]! [&_.instructor-qna-inbox_h2]:tracking-[0]!',
  '[&_.instructor-qna-inbox_input]:h-[38px]! [&_.instructor-qna-inbox_input]:rounded-[12px]! [&_.instructor-qna-inbox_input]:border-[1px]! [&_.instructor-qna-inbox_input]:border-solid! [&_.instructor-qna-inbox_input]:border-[#e5e7eb]! [&_.instructor-qna-inbox_input]:bg-[#f9fafb]! [&_.instructor-qna-inbox_input]:pt-[10px]! [&_.instructor-qna-inbox_input]:pr-[16px]! [&_.instructor-qna-inbox_input]:pb-[10px]! [&_.instructor-qna-inbox_input]:pl-[40px]! [&_.instructor-qna-inbox_input]:text-[#374151]! [&_.instructor-qna-inbox_input]:text-[12px]! [&_.instructor-qna-inbox_input]:leading-[16px]! [&_.instructor-qna-inbox_input]:font-[700]!',
  '[&_.instructor-qna-inbox_select]:h-[38px]! [&_.instructor-qna-inbox_select]:rounded-[12px]! [&_.instructor-qna-inbox_select]:border-[1px]! [&_.instructor-qna-inbox_select]:border-solid! [&_.instructor-qna-inbox_select]:border-[#e5e7eb]! [&_.instructor-qna-inbox_select]:bg-[#f9fafb]! [&_.instructor-qna-inbox_select]:px-[12px]! [&_.instructor-qna-inbox_select]:py-[10px]! [&_.instructor-qna-inbox_select]:text-[#374151]! [&_.instructor-qna-inbox_select]:text-[12px]! [&_.instructor-qna-inbox_select]:leading-[16px]! [&_.instructor-qna-inbox_select]:font-[700]!',
  '[&_.instructor-qna-filter-tabs]:pt-[8px]! [&_.instructor-qna-filter-tabs_button]:h-[34px]! [&_.instructor-qna-filter-tabs_button]:rounded-[12px]! [&_.instructor-qna-filter-tabs_button]:text-[12px]! [&_.instructor-qna-filter-tabs_button]:leading-[16px]! [&_.instructor-qna-filter-tabs_button]:font-[700]!',
  '[&_.instructor-qna-list]:max-h-[calc(100vh-64px-176px)]! [&_.instructor-qna-list]:bg-[#f8f9fa]! [&_.instructor-qna-list]:p-[16px]!',
  '[&_.instructor-qna-item]:mb-[12px]! [&_.instructor-qna-item]:rounded-[12px]! [&_.instructor-qna-item]:border-[1px]! [&_.instructor-qna-item]:border-solid! [&_.instructor-qna-item]:border-[#e5e7eb]! [&_.instructor-qna-item]:border-l-[4px]! [&_.instructor-qna-item]:border-l-transparent! [&_.instructor-qna-item]:bg-[#ffffff]! [&_.instructor-qna-item]:p-[16px]! [&_.instructor-qna-item]:[box-shadow:none]! [&_.instructor-qna-item]:[transition:transform_0.2s_ease,box-shadow_0.2s_ease,border-color_0.2s_ease]!',
  '[&_.instructor-qna-item:hover]:[transform:translateY(-2px)]! [&_.instructor-qna-item:hover]:border-[#d1d5db]! [&_.instructor-qna-item:hover]:[box-shadow:0_6px_16px_-4px_rgba(0,0,0,0.06)]!',
  '[&_.instructor-qna-item.is-active]:border-[#00c471]! [&_.instructor-qna-item.is-active]:bg-[#f0fdf4]! [&_.instructor-qna-item.is-active]:[box-shadow:0_4px_12px_rgba(0,196,113,0.1)]!',
  '[&_.instructor-qna-item_img]:h-[24px]! [&_.instructor-qna-item_img]:w-[24px]!',
  '[&_.instructor-qna-item_h3]:mb-[6px]! [&_.instructor-qna-item_h3]:text-[#111827]! [&_.instructor-qna-item_h3]:text-[14px]! [&_.instructor-qna-item_h3]:leading-[20px]! [&_.instructor-qna-item_h3]:font-[800]!',
  '[&_.instructor-qna-item_p]:mb-[12px]! [&_.instructor-qna-item_p]:text-[#6b7280]! [&_.instructor-qna-item_p]:text-[12px]! [&_.instructor-qna-item_p]:leading-[19px]! [&_.instructor-qna-item_span]:tracking-[0]!',
  '[&_.instructor-qna-detail]:bg-[#f8f9fa]!',
  '[&_.instructor-qna-context-bar]:z-[10]! [&_.instructor-qna-context-bar]:border-b-[1px]! [&_.instructor-qna-context-bar]:border-b-[#e5e7eb]! [&_.instructor-qna-context-bar]:bg-[#ffffff]! [&_.instructor-qna-context-bar]:px-[32px]! [&_.instructor-qna-context-bar]:py-[16px]! [&_.instructor-qna-context-bar]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.instructor-qna-context-bar_span]:min-h-[30px]! [&_.instructor-qna-context-bar_span]:rounded-[8px]! [&_.instructor-qna-context-bar_span]:px-[12px]! [&_.instructor-qna-context-bar_span]:py-[6px]! [&_.instructor-qna-context-bar_span]:text-[12px]! [&_.instructor-qna-context-bar_span]:leading-[16px]! [&_.instructor-qna-context-bar_span]:font-[700]!',
  '[&_.instructor-qna-context-bar_button]:min-h-[30px]! [&_.instructor-qna-context-bar_button]:rounded-[8px]! [&_.instructor-qna-context-bar_button]:px-[12px]! [&_.instructor-qna-context-bar_button]:py-[6px]! [&_.instructor-qna-context-bar_button]:text-[12px]! [&_.instructor-qna-context-bar_button]:leading-[16px]! [&_.instructor-qna-context-bar_button]:font-[700]!',
  '[&_.instructor-qna-context-bar>button]:h-[30px]! [&_.instructor-qna-context-bar>button]:w-auto! [&_.instructor-qna-context-bar>button]:min-h-[30px]! [&_.instructor-qna-context-bar>button]:gap-[6px]! [&_.instructor-qna-context-bar>button]:whitespace-nowrap! [&_.instructor-qna-context-bar>button]:[box-shadow:0_1px_2px_rgba(15,23,42,0.06)]!',
  '[&_.instructor-qna-workspace]:bg-[#f8f9fa]! [&_.instructor-qna-detail-scroll]:p-[32px]!',
  '[&_.instructor-qna-question-card]:rounded-[16px]! [&_.instructor-qna-question-card]:border-[1px]! [&_.instructor-qna-question-card]:border-solid! [&_.instructor-qna-question-card]:border-[#e5e7eb]! [&_.instructor-qna-question-card]:bg-[#ffffff]! [&_.instructor-qna-question-card]:p-[32px]! [&_.instructor-qna-question-card]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.instructor-qna-answer-card]:rounded-[16px]! [&_.instructor-qna-answer-card]:border-[1px]! [&_.instructor-qna-answer-card]:border-solid! [&_.instructor-qna-answer-card]:border-[#bbf7d0]! [&_.instructor-qna-answer-card]:bg-[#ffffff]! [&_.instructor-qna-answer-card]:p-[32px]! [&_.instructor-qna-answer-card]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.instructor-qna-question-card_h3]:mb-[16px]! [&_.instructor-qna-question-card_h3]:text-[#111827]! [&_.instructor-qna-question-card_h3]:text-[20px]! [&_.instructor-qna-question-card_h3]:leading-[28px]! [&_.instructor-qna-question-card_h3]:font-[900]! [&_.instructor-qna-question-card_img]:h-[40px]! [&_.instructor-qna-question-card_img]:w-[40px]!',
  '[&_.instructor-qna-editor]:mt-[24px]! [&_.instructor-qna-editor]:rounded-[16px]! [&_.instructor-qna-editor]:border-[1px]! [&_.instructor-qna-editor]:border-solid! [&_.instructor-qna-editor]:border-[#e5e7eb]! [&_.instructor-qna-editor]:bg-[#ffffff]! [&_.instructor-qna-editor]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)]!',
  '[&_.instructor-qna-editor:focus-within]:border-[#00c471]! [&_.instructor-qna-editor:focus-within]:[box-shadow:0_0_0_3px_rgba(0,196,113,0.15)]!',
  '[&_.instructor-qna-editor>div:first-child]:rounded-t-[16px]! [&_.instructor-qna-editor>div:first-child]:border-b-[1px]! [&_.instructor-qna-editor>div:first-child]:border-b-[#e5e7eb]! [&_.instructor-qna-editor>div:first-child]:bg-[#f9fafb]! [&_.instructor-qna-editor>div:first-child]:px-[16px]! [&_.instructor-qna-editor>div:first-child]:py-[12px]!',
  '[&_.instructor-qna-editor>div:first-child_button]:h-[28px]! [&_.instructor-qna-editor>div:first-child_button]:w-[28px]! [&_.instructor-qna-editor>div:first-child_button]:rounded-[6px]! [&_.instructor-qna-editor>div:first-child_button]:text-[14px]!',
  '[&_.instructor-qna-editor>div:first-child>div:last-child_span]:flex-[0_0_auto]! [&_.instructor-qna-editor>div:first-child>div:last-child_span]:whitespace-nowrap! [&_.instructor-qna-editor>div:first-child>div:last-child_span]:text-[11px]! [&_.instructor-qna-editor>div:first-child>div:last-child_span]:leading-[16px]! [&_.instructor-qna-editor>div:first-child>div:last-child_span]:font-[700]!',
  '[&_.instructor-qna-editor>div:first-child>div:last-child_button]:h-[30px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:w-auto! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:min-w-0! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:gap-[6px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:whitespace-nowrap! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:rounded-[8px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:border-[1px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:border-solid! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:border-[#e5e7eb]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:bg-[#ffffff]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:px-[12px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:py-[6px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:text-[#374151]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:text-[12px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:leading-[16px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:font-[800]! [&_.instructor-qna-editor>div:first-child>div:last-child_button]:[box-shadow:0_1px_2px_rgba(15,23,42,0.06)]!',
  '[&_.instructor-qna-editor>div:first-child>div:last-child_button_i]:text-[12px]! [&_.instructor-qna-editor>div:first-child>div:last-child_button_i]:leading-none!',
  '[&_.instructor-qna-editor_textarea]:h-[224px]! [&_.instructor-qna-editor_textarea]:p-[24px]! [&_.instructor-qna-editor_textarea]:text-[#1f2937]! [&_.instructor-qna-editor_textarea]:text-[14px]! [&_.instructor-qna-editor_textarea]:leading-[22px]!',
  '[&_.instructor-qna-editor>div:last-child]:border-t-[1px]! [&_.instructor-qna-editor>div:last-child]:border-t-[#f3f4f6]! [&_.instructor-qna-editor>div:last-child]:p-[16px]!',
  '[&_.instructor-qna-editor>div:last-child_button]:h-[40px]! [&_.instructor-qna-editor>div:last-child_button]:rounded-[12px]! [&_.instructor-qna-editor>div:last-child_button]:text-[12px]! [&_.instructor-qna-editor>div:last-child_button]:leading-[16px]! [&_.instructor-qna-editor>div:last-child_button]:font-[800]!',
  '[&_.instructor-qna-editor>div:last-child_button:first-child]:h-[38px]! [&_.instructor-qna-editor>div:last-child_button:first-child]:bg-[#f3f4f6]! [&_.instructor-qna-editor>div:last-child_button:first-child]:px-[20px]! [&_.instructor-qna-editor>div:last-child_button:first-child]:py-[10px]! [&_.instructor-qna-editor>div:last-child_button:first-child]:text-[#4b5563]!',
  '[&_.instructor-qna-editor>div:last-child_button:last-child]:h-[38px]! [&_.instructor-qna-editor>div:last-child_button:last-child]:gap-[8px]! [&_.instructor-qna-editor>div:last-child_button:last-child]:px-[32px]! [&_.instructor-qna-editor>div:last-child_button:last-child]:py-[10px]!',
  '[&_.instructor-qna-answer-card]:relative! [&_.instructor-qna-answer-card]:overflow-hidden! [&_.instructor-qna-answer-card::before]:absolute! [&_.instructor-qna-answer-card::before]:top-0! [&_.instructor-qna-answer-card::before]:left-0! [&_.instructor-qna-answer-card::before]:h-full! [&_.instructor-qna-answer-card::before]:w-[4px]! [&_.instructor-qna-answer-card::before]:bg-[#00c471]! [&_.instructor-qna-answer-card::before]:content-[\'\']!',
  '[&_.instructor-qna-answer-card_button]:h-[30px]! [&_.instructor-qna-answer-card_button]:w-auto! [&_.instructor-qna-answer-card_button]:min-h-[30px]! [&_.instructor-qna-answer-card_button]:whitespace-nowrap! [&_.instructor-qna-answer-card_button]:rounded-[8px]! [&_.instructor-qna-answer-card_button]:border-[1px]! [&_.instructor-qna-answer-card_button]:border-solid! [&_.instructor-qna-answer-card_button]:border-[#e5e7eb]! [&_.instructor-qna-answer-card_button]:bg-[#f9fafb]! [&_.instructor-qna-answer-card_button]:px-[12px]! [&_.instructor-qna-answer-card_button]:py-[6px]! [&_.instructor-qna-answer-card_button]:text-[#6b7280]! [&_.instructor-qna-answer-card_button]:text-[12px]! [&_.instructor-qna-answer-card_button]:leading-[16px]! [&_.instructor-qna-answer-card_button]:font-[700]!',
  '[&_.instructor-qna-tools]:z-[10]! [&_.instructor-qna-tools]:flex! [&_.instructor-qna-tools]:h-auto! [&_.instructor-qna-tools]:min-h-0! [&_.instructor-qna-tools]:w-[320px]! [&_.instructor-qna-tools]:flex-[0_0_320px]! [&_.instructor-qna-tools]:flex-col! [&_.instructor-qna-tools]:border-l-[1px]! [&_.instructor-qna-tools]:border-l-[#e5e7eb]! [&_.instructor-qna-tools]:bg-[#ffffff]! [&_.instructor-qna-tools]:box-border! [&_.instructor-qna-tools_*]:box-border!',
  '[&_.instructor-qna-tools>div:first-child]:border-b-[1px]! [&_.instructor-qna-tools>div:first-child]:border-b-[#f3f4f6]! [&_.instructor-qna-tools>div:first-child]:bg-[rgba(249,250,251,0.5)]! [&_.instructor-qna-tools>div:first-child]:p-[20px]!',
  '[&_.instructor-qna-tools_h3]:text-[#111827]! [&_.instructor-qna-tools_h3]:text-[14px]! [&_.instructor-qna-tools_h3]:leading-[20px]! [&_.instructor-qna-tools_h3]:font-[800]! [&_.instructor-qna-tools_p]:mt-[4px]! [&_.instructor-qna-tools_p]:text-[#6b7280]! [&_.instructor-qna-tools_p]:text-[10px]! [&_.instructor-qna-tools_p]:leading-[14px]! [&_.instructor-qna-tools_p]:font-[700]!',
  '[&_.instructor-qna-tools>div:nth-child(2)]:min-h-0! [&_.instructor-qna-tools>div:nth-child(2)]:flex-[1_1_auto]! [&_.instructor-qna-tools>div:nth-child(2)]:overflow-y-auto! [&_.instructor-qna-tools>div:nth-child(2)]:p-[20px]!',
  '[&_.instructor-qna-tools_h4]:mb-[12px]! [&_.instructor-qna-tools_h4]:text-[#9ca3af]! [&_.instructor-qna-tools_h4]:text-[10px]! [&_.instructor-qna-tools_h4]:leading-[14px]! [&_.instructor-qna-tools_h4]:font-[800]! [&_.instructor-qna-tools_h4]:tracking-[0.18em]!',
  '[&_.instructor-qna-tools_button]:rounded-[12px]! [&_.instructor-qna-tools_button]:border-[1px]! [&_.instructor-qna-tools_button]:border-solid! [&_.instructor-qna-tools_button]:border-[#e5e7eb]! [&_.instructor-qna-tools_button]:bg-[#ffffff]! [&_.instructor-qna-tools_button]:p-[14px]! [&_.instructor-qna-tools_button]:text-left! [&_.instructor-qna-tools_button]:[transition:transform_0.2s_ease,box-shadow_0.2s_ease,border-color_0.2s_ease,background-color_0.2s_ease]!',
  '[&_.instructor-qna-tools_button:hover]:[transform:translateY(-2px)]! [&_.instructor-qna-tools_button:hover]:border-[#d1d5db]! [&_.instructor-qna-tools_button:hover]:bg-[#f9fafb]! [&_.instructor-qna-tools_button:hover]:[box-shadow:0_6px_12px_-4px_rgba(0,0,0,0.05)]!',
  '[&_.instructor-qna-tools_button.instructor-qna-template-action]:flex! [&_.instructor-qna-tools_button.instructor-qna-template-action]:h-[24px]! [&_.instructor-qna-tools_button.instructor-qna-template-action]:w-[24px]! [&_.instructor-qna-tools_button.instructor-qna-template-action]:items-center! [&_.instructor-qna-tools_button.instructor-qna-template-action]:justify-center! [&_.instructor-qna-tools_button.instructor-qna-template-action]:rounded-[4px]! [&_.instructor-qna-tools_button.instructor-qna-template-action]:border-[#e5e7eb]! [&_.instructor-qna-tools_button.instructor-qna-template-action]:bg-[#f9fafb]! [&_.instructor-qna-tools_button.instructor-qna-template-action]:p-0! [&_.instructor-qna-tools_button.instructor-qna-template-action]:text-[#6b7280]! [&_.instructor-qna-tools_button.instructor-qna-template-action]:transform-none! [&_.instructor-qna-tools_button.instructor-qna-template-action]:[box-shadow:none]!',
  '[&_.instructor-qna-tools_button.instructor-qna-template-delete]:border-[#fee2e2]! [&_.instructor-qna-tools_button.instructor-qna-template-delete]:bg-[#fef2f2]! [&_.instructor-qna-tools_button.instructor-qna-template-delete]:text-[#ef4444]!',
  '[&_.instructor-qna-tools_button.instructor-qna-add-template]:h-[34px]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:justify-center! [&_.instructor-qna-tools_button.instructor-qna-add-template]:border-dashed! [&_.instructor-qna-tools_button.instructor-qna-add-template]:border-[#d1d5db]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:bg-[#ffffff]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:px-[12px]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:py-[8px]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:text-center! [&_.instructor-qna-tools_button.instructor-qna-add-template]:text-[#6b7280]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:text-[12px]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:leading-[16px]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:font-[700]! [&_.instructor-qna-tools_button.instructor-qna-add-template]:[box-shadow:none]!',
  '[&_.instructor-qna-tools_button.instructor-qna-add-template:hover]:border-[#d1d5db]! [&_.instructor-qna-tools_button.instructor-qna-add-template:hover]:bg-[#ffffff]! [&_.instructor-qna-tools_button.instructor-qna-add-template:hover]:text-[#6b7280]! [&_.instructor-qna-tools_button.instructor-qna-add-template:hover]:[box-shadow:none]!',
  '[&_.instructor-qna-tools_button_.line-clamp-1]:text-[#111827]! [&_.instructor-qna-tools_button_.line-clamp-1]:text-[13px]! [&_.instructor-qna-tools_button_.line-clamp-1]:leading-[18px]! [&_.instructor-qna-tools_button_.line-clamp-1]:font-[900]! [&_.instructor-qna-tools_button_.line-clamp-2]:text-[#6b7280]! [&_.instructor-qna-tools_button_.line-clamp-2]:text-[11px]! [&_.instructor-qna-tools_button_.line-clamp-2]:leading-[16px]! [&_.instructor-qna-tools_button_.line-clamp-2]:font-[600]!',
  '[&_.instructor-qna-modal-backdrop]:z-[2400]! [&_.instructor-qna-modal-backdrop]:bg-[rgba(17,24,39,0.6)]! [&_.instructor-qna-modal-backdrop]:p-[16px]! [&_.instructor-qna-modal-backdrop]:[backdrop-filter:blur(4px)]!',
  '[&_.instructor-qna-modal]:w-[min(560px,100%)]! [&_.instructor-qna-modal]:max-w-[560px]! [&_.instructor-qna-modal]:rounded-[24px]! [&_.instructor-qna-modal]:bg-[#ffffff]! [&_.instructor-qna-modal]:[box-shadow:0_30px_60px_rgba(0,0,0,0.15)]!',
  '[&_.instructor-qna-modal>div:first-child]:border-b-[1px]! [&_.instructor-qna-modal>div:first-child]:border-b-[#f3f4f6]! [&_.instructor-qna-modal>div:first-child]:bg-[#f9fafb]! [&_.instructor-qna-modal>div:first-child]:p-[24px]!',
  '[&_.instructor-qna-modal_h3]:text-[#111827]! [&_.instructor-qna-modal_h3]:text-[18px]! [&_.instructor-qna-modal_h3]:leading-[28px]! [&_.instructor-qna-modal_h3]:font-[800]!',
  '[&_.instructor-qna-modal_input]:rounded-[12px]! [&_.instructor-qna-modal_input]:border-[1px]! [&_.instructor-qna-modal_input]:border-solid! [&_.instructor-qna-modal_input]:border-[#e5e7eb]! [&_.instructor-qna-modal_input]:text-[14px]! [&_.instructor-qna-modal_input]:leading-[20px]! [&_.instructor-qna-modal_textarea]:h-[192px]! [&_.instructor-qna-modal_textarea]:rounded-[12px]! [&_.instructor-qna-modal_textarea]:border-[1px]! [&_.instructor-qna-modal_textarea]:border-solid! [&_.instructor-qna-modal_textarea]:border-[#e5e7eb]! [&_.instructor-qna-modal_textarea]:text-[14px]! [&_.instructor-qna-modal_textarea]:leading-[20px]!',
  '[&_.instructor-qna-modal_button]:rounded-[12px]! [&_.instructor-qna-modal_button]:text-[12px]! [&_.instructor-qna-modal_button]:leading-[16px]! [&_.instructor-qna-modal_button]:font-[800]!',
].join(' ')

function Modal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string
  icon: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="instructor-qna-modal-backdrop fixed inset-0 z-[2400] flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div
        className="instructor-qna-modal w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <i className={`${icon} text-[#00c471]`} /> {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
import { useInstructorQnaController } from './useInstructorQnaController'

export default function InstructorQnaPage({ session }: { session: AuthSession }) {
  const { statusFilter, search, sortFilter, setSortFilter, draftText, setDraftText, quickReplies, quickOpen, setQuickOpen, templateOpen, setTemplateOpen, quickTitle, setQuickTitle, quickBody, setQuickBody, toast, loading, setEditingAnswerId, editorRef, courseOptions, activeCourseFilter, visibleQuestions, activeSelectedId, activeTimeline, timelineLoading, current, instructorDisplayName, instructorProfileImage, showAnswerForm, openCourseScreen, changeStatusFilter, changeCourseFilter, changeSearch, selectQuestion, appendReply, applyMarkdown, saveDraft, submitAnswer, openQuickModal, saveQuickReply, deleteQuickReply } = useInstructorQnaController({ session })


  return (
    <div className={`instructor-qna-page min-h-[calc(100vh-64px)] bg-[#f3f4f6] ${INSTRUCTOR_QNA_UI_LOCK_CLASSES}`}>
      {toast ? (
        <div
          className={`pointer-events-none fixed top-24 left-1/2 z-[9999] -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-2xl ${
            toast.tone === 'success' ? 'bg-[#00c471]' : 'bg-gray-800'
          }`}
        >
          <i className={`mr-2 ${toast.tone === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle'}`} />
          {toast.message}
        </div>
      ) : null}

      <div className="instructor-qna-main flex min-h-[calc(100vh-64px)] flex-col xl:flex-row">
        <section className="instructor-qna-inbox w-full shrink-0 border-r border-gray-200 bg-white xl:w-[400px]! xl:flex-[0_0_400px]!">
          <div className="border-b border-gray-100 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">수강생 Q&amp;A</h2>
              <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold text-orange-700">
                {statusFilter === 'pending' ? '미답변' : '답변 완료'} {visibleQuestions.length}건
              </span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <i className="fas fa-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => changeSearch(event.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#00c471]"
                  placeholder="제목, 작성자, 내용으로 검색"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={activeCourseFilter}
                  onChange={(event) => changeCourseFilter(event.target.value)}
                  className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#00c471]"
                >
                  <option value="all">전체 강의</option>
                  {courseOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={sortFilter}
                  onChange={(event) => setSortFilter(event.target.value as 'latest' | 'oldest')}
                  className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#00c471]"
                >
                  <option value="latest">최신순 정렬</option>
                  <option value="oldest">오래된 순 정렬</option>
                </select>
              </div>

              <div className="instructor-qna-filter-tabs flex gap-2 pt-1">
                {[
                  ['pending', '미답변'],
                  ['answered', '답변 완료'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeStatusFilter(key as QuestionStatusFilter)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-xs font-bold transition ${
                      statusFilter === key
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="instructor-qna-list max-h-[calc(100vh-240px)] overflow-y-auto bg-[#f8f9fa] p-4 xl:max-h-[calc(100vh-64px-176px)]">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm font-semibold text-gray-400">
                질문 목록을 불러오는 중입니다.
              </div>
            ) : visibleQuestions.length > 0 ? (
              visibleQuestions.map((question) => (
                <button
                  key={question.questionId}
                  type="button"
                  onClick={() => selectQuestion(question.questionId)}
                  className={`instructor-qna-item mb-3 w-full rounded-2xl border border-l-4 p-4 text-left transition ${
                    activeSelectedId === question.questionId
                      ? 'is-active border-[#00c471] border-l-[#00c471] bg-[#f0fdf4] shadow-[0_6px_18px_rgba(0,196,113,0.08)]'
                      : 'border-gray-200 border-l-transparent bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)]'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={question.learnerName ?? buildLearnerAvatarSeed(question)}
                        imageUrl={question.learnerProfileImage}
                        alt={question.learnerName ?? '수강생'}
                        className="h-7 w-7 bg-white"
                        iconClassName="text-[10px]"
                      />
                      <span className="text-xs font-bold text-gray-900">{question.learnerName ?? '수강생'}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400">
                      {formatRelativeTime(question.createdAt)}
                    </span>
                  </div>

                  <h3 className="mb-1.5 line-clamp-1 text-sm font-extrabold text-gray-900">
                    {question.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
                    {question.content}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">
                      {question.courseTitle ?? '공통'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${buildStatusBadgeClasses(question.status)}`}
                    >
                      {buildStatusLabel(question.status)}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-gray-400">
                조건에 맞는 질문이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="instructor-qna-detail flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8f9fa]">
          {current ? (
            <>
              <div className="instructor-qna-context-bar flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4 shadow-sm lg:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                    {current.courseTitle ?? '공통 질문'}
                  </span>
                  <i className="fas fa-chevron-right text-[10px] text-gray-300" />
                  <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                    <i className="fas fa-play-circle text-gray-400" />
                    {current.lessonTitle ?? (current.lectureTimestamp ? '영상 구간 질문' : '일반 질문')}
                  </span>
                  {current.lectureTimestamp ? (
                    <span className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-[#00c471]">
                      <i className="fas fa-clock" />
                      {current.lectureTimestamp}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => openCourseScreen(current)}
                  disabled={!current.courseId}
                  className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-sm transition ${
                    current.courseId
                      ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#00c471]'
                      : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                >
                  <i className="fas fa-external-link-alt" />
                  강의 화면 보기
                </button>
              </div>

              <div className="instructor-qna-workspace flex flex-1 flex-col overflow-hidden xl:flex-row">
                <div className="instructor-qna-detail-scroll flex-1 overflow-y-auto p-6 lg:p-8">
                  <div className="instructor-qna-question-card rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-5">
                      <div className="flex items-center gap-4">
                        <UserAvatar
                          name={current.learnerName ?? buildLearnerAvatarSeed(current)}
                          imageUrl={current.learnerProfileImage}
                          alt={current.learnerName ?? '수강생'}
                          className="h-11 w-11 bg-gray-50 shadow-sm"
                          iconClassName="text-base"
                        />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            {current.learnerName ?? '수강생'}
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                              수강생
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-gray-400">
                            {current.lectureTimestamp
                              ? `영상 구간 ${current.lectureTimestamp} · ${formatRelativeTime(current.createdAt)}`
                              : formatRelativeTime(current.createdAt)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${buildStatusBadgeClasses(current.status)}`}
                      >
                        {buildStatusLabel(current.status)}
                      </span>
                    </div>

                    <h3 className="mb-4 text-lg font-black text-gray-900 lg:text-xl">{current.title}</h3>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <MarkdownContent content={current.content} />
                    </div>
                  </div>
                  {timelineLoading ? (
                    <div className="mt-6 rounded-[28px] border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-400 shadow-sm">
                      답변 정보를 불러오는 중입니다.
                    </div>
                  ) : showAnswerForm ? (
                    <div className="instructor-qna-editor mt-6 overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          {[
                            ['heading', 'fas fa-heading', '제목'],
                            ['bold', 'fas fa-bold', '굵게'],
                            ['italic', 'fas fa-italic', '기울임'],
                          ].map(([key, icon, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                applyMarkdown(key as 'heading' | 'bold' | 'italic')
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-900"
                              title={label}
                            >
                              <i className={icon} />
                            </button>
                          ))}
                          <div className="mx-1 h-4 w-px bg-gray-300" />
                          {[
                            ['link', 'fas fa-link', '링크'],
                            ['code', 'fas fa-code', '코드'],
                            ['image', 'fas fa-image', '이미지'],
                          ].map(([key, icon, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => applyMarkdown(key as 'link' | 'code' | 'image')}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-900"
                              title={label}
                            >
                              <i className={icon} />
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-gray-400">
                            {draftText.length} / 1000
                          </span>
                          <button
                            type="button"
                            onClick={() => setTemplateOpen(true)}
                            disabled={quickReplies.length === 0}
                            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-sm transition ${
                              quickReplies.length > 0
                                ? 'border-gray-200 bg-white text-gray-700 hover:border-[#00c471] hover:text-[#00c471]'
                                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            }`}
                          >
                            <i className="fas fa-magic text-[#00c471]" />
                            템플릿 사용
                          </button>
                        </div>
                      </div>

                      <textarea
                        ref={editorRef}
                        value={draftText}
                        onChange={(event) => setDraftText(event.target.value)}
                        maxLength={1000}
                        className="h-56 w-full resize-none bg-white px-6 py-6 text-sm leading-relaxed text-gray-800 outline-none"
                        placeholder={
                          '수강생에게 격려의 말과 해결책을 함께 담아 답변해주세요.\n(오른쪽 빠른 답변 카드나 상단 마크다운 버튼을 바로 사용할 수 있습니다.)'
                        }
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                          <i className="fas fa-info-circle text-gray-300" />
                          Markdown 문법을 지원합니다.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveDraft}
                            className="h-11 rounded-xl bg-gray-100 px-5 text-xs font-bold text-gray-600 transition hover:bg-gray-200"
                          >
                            임시저장
                          </button>
                          <button
                            type="button"
                            onClick={submitAnswer}
                            className="flex h-11 items-center gap-2 rounded-xl bg-[#00c471] px-7 text-xs font-bold text-white shadow-md transition hover:bg-[#00b366]"
                          >
                            <i className="fas fa-paper-plane" />
                            {activeTimeline?.publishedAnswer ? '답변 수정' : '답변 등록'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="instructor-qna-answer-card mt-6 rounded-[28px] border border-green-200 bg-white p-6 shadow-sm lg:p-8">
                      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={instructorDisplayName}
                            imageUrl={instructorProfileImage}
                            className="h-10 w-10 shadow-sm"
                            alt={instructorDisplayName}
                          />
                          <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                              {instructorDisplayName}
                              <span className="rounded bg-[#00c471] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                강사
                              </span>
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-gray-400">
                              답변 완료
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingAnswerId(activeSelectedId)}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:text-[#00c471]"
                        >
                          <i className="fas fa-edit mr-1" />
                          수정
                        </button>
                      </div>

                      <MarkdownContent content={activeTimeline?.publishedAnswer?.content ?? ''} />
                    </div>
                  )}
                </div>

                <aside className="instructor-qna-tools w-full shrink-0 border-l border-gray-200 bg-white xl:w-[320px]">
                  <div className="border-b border-gray-100 bg-gray-50/50 p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <i className="fas fa-bolt text-yellow-500" />
                      빠른 답변 도구
                    </h3>
                    <p className="mt-1 text-[11px] font-medium text-gray-500">
                      자주 쓰는 템플릿을 원클릭으로 삽입하세요.
                    </p>
                  </div>

                  <div className="space-y-6 p-5">
                    <div>
                      <h4 className="mb-3 px-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-400">
                        추천 템플릿
                      </h4>
                      <div className="space-y-2">
                        {recommendedQuickTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => appendReply(template.content)}
                            className="instructor-qna-template-card group flex w-full items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:shadow-[0_6px_12px_-4px_rgba(0,0,0,0.05)]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-1 text-[13px] font-black text-gray-900 transition group-hover:text-[#00c471]">
                                {template.title}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-[1.4] text-gray-500">
                                {template.description}
                              </div>
                            </div>
                            <i className="fas fa-plus-circle mt-1 text-lg text-gray-300 transition group-hover:text-[#00c471]" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-400">
                          나만의 빠른 답변
                        </h4>
                        <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-600">
                          {quickReplies.length}
                        </span>
                      </div>

                      <div className="mb-3 space-y-2">
                        {quickReplies.length > 0 ? (
                          quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              type="button"
                              onClick={() => appendReply(reply.content)}
                              className="group w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-left transition hover:border-[#00c471] hover:shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="line-clamp-1 flex-1 text-xs font-extrabold text-gray-900">
                                  {reply.title}
                                </div>
                                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openQuickModal(reply)
                                    }}
                                    className="instructor-qna-template-action flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-500"
                                    title="수정"
                                  >
                                    <i className="fas fa-pen text-[10px]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      deleteQuickReply(reply.id)
                                    }}
                                    className="instructor-qna-template-action instructor-qna-template-delete flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-red-500"
                                    title="삭제"
                                  >
                                    <i className="fas fa-trash text-[10px]" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed font-medium text-gray-500">
                                {reply.content}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center text-[11px] font-semibold text-gray-400">
                            저장된 빠른 답변이 없습니다.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openQuickModal()}
                        className="instructor-qna-add-template w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-bold text-gray-500 transition hover:border-[#00c471] hover:bg-green-50 hover:text-[#00c471]"
                      >
                        <i className="fas fa-plus mr-1" />
                        내 답변 추가하기
                      </button>
                    </div>

                    <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold text-blue-800">
                        <i className="fas fa-check-double" />
                        좋은 답변 체크리스트
                      </h4>
                      <ul className="space-y-2 text-[11px] font-medium text-blue-700">
                        <li className="flex items-start gap-2">
                          <i className="fas fa-check-circle mt-0.5 opacity-50" />
                          결론을 먼저 말하고, 왜 그런지 바로 이어서 설명하기
                        </li>
                        <li className="flex items-start gap-2">
                          <i className="fas fa-check-circle mt-0.5 opacity-50" />
                          공식 문서나 확인 포인트가 있으면 함께 안내하기
                        </li>
                        <li className="flex items-start gap-2">
                          <i className="fas fa-check-circle mt-0.5 opacity-50" />
                          코드 예시는 마크다운 코드 블록으로 정리하기
                        </li>
                      </ul>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-16">
              <div className="max-w-md rounded-[28px] border border-dashed border-gray-300 bg-white px-8 py-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <i className="fas fa-inbox text-xl" />
                </div>
                <h3 className="text-lg font-black text-gray-900">표시할 질문이 없습니다.</h3>
                <p className="mt-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-500">
                  필터 변경이나 새 질문은 바로 표시됩니다.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {quickOpen ? (
        <Modal title="저장한 빠른 답변 편집" icon="fas fa-bookmark" onClose={() => setQuickOpen(false)}>
          <div className="space-y-5 bg-[#f8f9fa] p-6">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-600">제목</label>
              <input
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                maxLength={30}
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium outline-none focus:border-[#00c471]"
                placeholder="예: JPA 순환 참조 답변"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600">답변 내용</label>
                <span className="text-[10px] font-bold text-gray-400">{quickBody.length} / 1000</span>
              </div>
              <textarea
                value={quickBody}
                onChange={(event) => setQuickBody(event.target.value)}
                maxLength={1000}
                className="h-48 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed outline-none focus:border-[#00c471]"
                placeholder="버튼 클릭 시 에디터에 그대로 삽입될 답변을 작성해주세요."
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
            <button
              type="button"
              onClick={() => setQuickBody(draftText)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 shadow-sm"
            >
              현재 에디터 내용 가져오기
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="rounded-xl px-5 py-2.5 text-xs font-semibold text-gray-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveQuickReply}
                className="rounded-xl bg-gray-900 px-6 py-2.5 text-xs font-bold text-white shadow-md"
              >
                저장하기
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {templateOpen ? (
        <Modal title="답변 템플릿 선택" icon="fas fa-magic" onClose={() => setTemplateOpen(false)}>
          <div className="space-y-3 bg-[#f8f9fa] p-6">
            {quickReplies.length > 0 ? (
              quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => {
                    appendReply(reply.content)
                    setTemplateOpen(false)
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-black text-gray-900">{reply.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs font-medium text-gray-500">
                      {reply.content}
                    </div>
                  </div>
                  <i className="fas fa-check-circle mt-1 text-xl text-gray-300" />
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm font-medium text-gray-500">
                등록된 답변 템플릿이 없습니다.
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
