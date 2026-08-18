import type { WorkspaceTask } from './common-types'
import { formatDate } from './common-workspace-support'



export function CurriculumPage({
  tasks,
  progressPercent,
}: {
  tasks: WorkspaceTask[]
  progressPercent: number
}) {
  const sourceProgressPercent = Math.max(progressPercent, 75)
  const reviewTask = tasks.find((task) => task.priority === 'HIGH') ?? tasks[1] ?? tasks[0]
  const currentTask = tasks.find((task) => task.status !== 'DONE') ?? tasks[2] ?? tasks[0]

  if (tasks.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="inline-block rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-brand">
              <i className="fas fa-users mr-1"></i>
              공통 과제형
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">주차별 미션 및 피드백</h1>
            <p className="text-sm text-gray-500">이곳에서 모든 주차의 목표를 확인하고, 과제를 제출하고, 멘토와 리뷰를 주고받습니다.</p>
          </div>
          <div className="w-full shrink-0 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:w-60">
            <div className="mb-1.5 flex items-end justify-between">
              <span className="text-xs font-bold text-gray-400">전체 학습 진행률</span>
              <span className="text-xs font-extrabold text-gray-400">0% (진행 전)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-gray-300" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-4xl text-gray-300 shadow-inner">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <h3 className="mb-3 text-xl font-extrabold text-gray-900">아직 등록된 커리큘럼이 없습니다</h3>
          <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-gray-500">
            멘토가 첫 번째 주차 미션과 커리큘럼을 준비하고 있습니다.
            <br />
            새로운 미션이 등록되면 이곳 타임라인에 표시됩니다.
          </p>
          <button type="button" disabled className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-6 py-3 text-sm font-bold text-gray-400">
            <i className="fas fa-hourglass-half"></i>
            미션 등록 대기 중...
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="space-y-1">
          <span className="inline-block rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-brand">
            <i className="fas fa-users mr-1"></i>
            공통 과제형
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">주차별 미션 및 피드백</h1>
          <p className="text-sm text-gray-500">이곳에서 모든 주차의 목표를 확인하고, 과제를 제출하고, 멘토와 리뷰를 주고받습니다.</p>
        </div>

        <div className="w-full shrink-0 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:w-60">
          <div className="mb-1.5 flex items-end justify-between">
            <span className="text-xs font-bold text-gray-400">전체 학습 진행률</span>
            <span className="text-xs font-extrabold text-mentor">{sourceProgressPercent}% (3주차 진행 중)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-mentor transition-all duration-1000" style={{ width: `${sourceProgressPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="relative ml-6 space-y-10 border-l-2 border-gray-200 pb-10">
        <div className="relative pl-8">
          <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-brand text-white shadow-sm">
            <i className="fas fa-check text-[10px]"></i>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 opacity-80 shadow-sm transition hover:opacity-100">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-gray-400">WEEK 1</span>
                <h3 className="text-lg font-bold text-gray-900">요구사항 분석 및 ERD 설계</h3>
              </div>
              <span className="rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-brand">
                <i className="fas fa-check-circle mr-1"></i>
                PASS
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">비즈니스 요구사항을 분석하여 핵심 엔티티를 정의하고, 정규화를 거쳐 실제 데이터베이스 ERD를 설계합니다.</p>
            <button type="button" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-[#EDE9FE] px-3 py-1.5 text-[10px] font-bold text-mentor shadow-sm transition hover:bg-purple-200">
              <i className="fas fa-book-open"></i>
              1주차 학습 자료 및 가이드
            </button>
            <div className="flex items-center justify-between rounded-xl border border-green-100 bg-[#EBFDF5]/50 p-4">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-bold text-brand">최종 멘토 총평</p>
                <p className="truncate pr-4 text-sm font-medium text-gray-700">전체적인 테이블 구조가 요구사항을 잘 반영하고 있습니다. 아주 훌륭합니다!</p>
              </div>
              <button type="button" className="shrink-0 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand">
                리뷰 기록 보기
              </button>
            </div>
          </div>
        </div>

        <div className="relative pl-8">
          <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-red-400 text-white shadow-sm">
            <i className="fas fa-exclamation text-[10px]"></i>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-red-300 bg-white p-6 shadow-md">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-red-400"></div>
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-red-500">WEEK 2</span>
                <h3 className="text-lg font-bold text-gray-900">{reviewTask?.title ?? '회원/상품 기능 구현 및 단위 테스트'}</h3>
              </div>
              <span className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-500">
                <i className="fas fa-exclamation-circle"></i>
                수정 요청됨
              </span>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-gray-600">{reviewTask?.description ?? 'Spring Boot를 이용해 핵심 도메인 로직을 구현하고, JUnit5를 이용해 단위 테스트를 작성합니다.'}</p>
            <button type="button" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-[#EDE9FE] px-3 py-1.5 text-[10px] font-bold text-mentor shadow-sm transition hover:bg-purple-200">
              <i className="fas fa-book-open"></i>
              2주차 학습 자료 및 가이드
            </button>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900">
                  <i className="fas fa-comments mr-1 text-brand"></i>
                  진행 중인 피드백
                </h4>
                <a href="#" className="text-xs font-bold text-blue-600 hover:underline">
                  <i className="fab fa-github"></i>
                  내 제출 코드 보기
                </a>
              </div>
              <div className="mb-5 flex items-start gap-3">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-backend" alt="" className="h-8 w-8 rounded-full border border-gray-200 bg-white" />
                <div className="relative flex-1 rounded-b-xl rounded-tr-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="absolute -left-1.5 top-3 h-3 w-3 -rotate-45 border-l border-t border-gray-100 bg-white"></div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">멘토 코드마스터 J</span>
                    <span className="text-[10px] text-gray-400">어제 14:30</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-gray-700">상품 재고 차감 로직에서 동시성 이슈가 발생할 수 있습니다. 코드 라인에 남겨둔 코멘트를 확인하시고 다시 올려주세요!</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand">
                  <i className="fas fa-history mr-1"></i>
                  전체 기록 보기
                </button>
                <button type="button" className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
                  <i className="fas fa-reply"></i>
                  수정본 제출하기
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative pl-8">
          <div className="timeline-pulse absolute -left-[17px] top-1 flex h-8 w-8 animate-[mentoringTimelinePulse_1.8s_infinite] items-center justify-center rounded-full border-4 border-white bg-mentor text-white">
            <i className="fas fa-spinner fa-spin text-[10px]"></i>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-mentor bg-white p-6 shadow-md">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-mentor"></div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-mentor">WEEK 3 (CURRENT)</span>
                <h3 className="text-xl font-bold text-gray-900">{currentTask?.title ?? 'Redis & Kafka를 활용한 부하 분산'}</h3>
              </div>
              <span className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-600">새 과제 진행 중</span>
            </div>
            <div className="mb-5 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-700">
              <p>{currentTask?.description ?? '대용량 트래픽 상황을 가정하여, 선착순 쿠폰 발급 API의 병목을 해결하는 것이 이번 주 핵심 과제입니다.'}</p>
            </div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button type="button" className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-[#EDE9FE] px-4 py-2.5 text-xs font-bold text-mentor shadow-sm transition hover:bg-purple-200">
                <i className="fas fa-book-reader text-sm"></i>
                학습 자료 및 가이드라인 보기
              </button>
              <button type="button" className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-200">
                <i className="fas fa-plus text-green-600"></i>
                내 개인 칸반에 태스크로 추가하기
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <i className="far fa-clock text-gray-400"></i>
                마감 기한: <span className="text-red-500">{currentTask?.dueDate ? `${formatDate(currentTask.dueDate)} 23:59` : '2026.02.24 (화) 23:59'}</span>
              </div>
              <button type="button" className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
                <i className="fas fa-upload"></i>
                첫 과제 제출하기
              </button>
            </div>
          </div>
        </div>

        <div className="relative pl-8 opacity-50">
          <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#F3F4F6] bg-gray-200 text-gray-400 shadow-sm">
            <i className="fas fa-lock text-[10px]"></i>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
            <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-gray-400">WEEK 4</span>
            <h3 className="text-lg font-bold text-gray-500">성능 튜닝 및 최종 프로젝트 수료</h3>
          </div>
        </div>
      </div>
    </div>
  )
}
