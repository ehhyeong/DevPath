import type { LearningPlayerReadyModel } from './useLearningPlayerController'
import { navigateTo } from '../../lib/spa-navigation'
import LearningPlayerOverlays from './LearningPlayerOverlays'
import LearningPlayerSidebar from './LearningPlayerSidebar'
import LearningVideoPanel from './LearningVideoPanel'

type LearningPlayerViewProps = { model: LearningPlayerReadyModel }

export default function LearningPlayerView({ model }: LearningPlayerViewProps) {
  const { isStudentPreview, studentPreviewReturnHref, learningBackHref, lesson, courseProgressPercent } = model

  return (
    <div className="learning-player-surface flex h-screen flex-col overflow-hidden bg-[#F8F9FA] font-['Pretendard',sans-serif] text-[16px] leading-[1.5] tracking-[0] [&_*]:tracking-[0] [&_button]:font-['Pretendard',sans-serif] [&_input]:font-['Pretendard',sans-serif] [&_select]:font-['Pretendard',sans-serif] [&_textarea]:font-['Pretendard',sans-serif] [&_.custom-scrollbar::-webkit-scrollbar]:h-[6px] [&_.custom-scrollbar::-webkit-scrollbar]:w-[6px] [&_.custom-scrollbar::-webkit-scrollbar-thumb]:rounded-[3px] [&_.custom-scrollbar::-webkit-scrollbar-thumb]:bg-[#CBD5E1]">
      {/* 상단 헤더 */}
      <header className="learning-player-top-header z-50 flex h-[56px] min-h-[56px] shrink-0 items-center justify-between border-b border-[#1F2937] bg-[#111827] px-[24px] text-white [box-sizing:border-box]">
        <div className="learning-player-top-header-left flex min-w-0 items-center gap-[16px]">
          <button
            type="button"
            onClick={() => navigateTo(isStudentPreview ? studentPreviewReturnHref : learningBackHref)}
            className="learning-player-back-link m-0 inline-flex shrink-0 appearance-none items-center whitespace-nowrap border-0 bg-transparent p-0 font-['Pretendard',sans-serif] text-[14px]! leading-[20px]! font-normal text-[#9CA3AF] transition hover:text-white"
          >
            <i className="learning-player-back-icon fas fa-chevron-left mr-[8px] text-[14px] leading-[14px]" />
            {isStudentPreview ? '질문 게시판으로 돌아가기' : '로드맵으로 돌아가기'}
          </button>
          <div className="learning-player-header-divider h-[16px] w-[1px] shrink-0 bg-[#374151]" />
          <span className="learning-player-header-title min-w-0 truncate font-['Pretendard',sans-serif] text-[14px] leading-[20px] font-bold text-[#F3F4F6]" title={lesson.title}>{lesson.title}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-[#00C471] transition-[width]" style={{ width: `${courseProgressPercent}%` }} />
            </div>
            <span className="text-xs">{courseProgressPercent}% 완료</span>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <LearningVideoPanel model={model} />
        <LearningPlayerSidebar model={model} />
      </div>
      <LearningPlayerOverlays model={model} />
    </div>
  )
}
