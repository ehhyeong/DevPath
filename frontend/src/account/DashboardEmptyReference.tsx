import { MyMenuSidebar } from './template'
import { navigateTo } from './dashboard-support'

export function DashboardEmptyReference({ displayName }: { displayName: string }) {
  return (
    <>
      <MyMenuSidebar currentPageKey="dashboard" />

      <section className="dashboard-empty-reference-main flex-1 min-w-0 space-y-6">
        <header className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">환영합니다, {displayName}님! 🎉</h1>
            <p className="mt-1 text-sm text-gray-500">DevPath와 함께 커리어 여정을 시작해볼까요?</p>
          </div>
        </header>

        <div className="dashboard-empty-stats grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">연속 학습</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-fire" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-gray-900">0일</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">오늘 첫 학습을 시작하세요!</p>
          </div>

          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">완료 강의</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-check-circle" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-gray-900">0</span>
              <span className="text-sm font-medium text-gray-400">개</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">수강을 완료한 강의가 없습니다.</p>
          </div>

          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">획득 뱃지</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-medal" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-gray-900">0개</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">첫 뱃지에 도전해보세요!</p>
          </div>

          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">총 학습</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-clock" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-gray-900">
                0h <span className="text-lg text-gray-400">0m</span>
              </span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">학습 기록이 없습니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="dashboard-empty-recent-card relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <i className="fas fa-book-open text-xl" />
            </div>
            <p className="mb-1 text-sm font-bold text-gray-700">최근 학습한 강의가 없습니다.</p>
            <p className="mb-4 text-xs text-gray-400">나에게 맞는 첫 강의를 찾아 학습을 시작해보세요!</p>
            <button
              type="button"
              className="rounded-xl bg-brand h-[38px] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#00b365]"
              onClick={() => navigateTo('/lecture-list')}
            >
              강의 둘러보기
            </button>
          </div>

          <div className="dashboard-empty-chart-card flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-chart-bar text-gray-400" /> 주간 학습 시간
              </h3>
              <span className="text-[10px] text-gray-400">이번 주</span>
            </div>
            <div className="relative flex h-24 flex-1 items-end justify-between gap-2">
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <span className="rounded bg-white/80 px-2 py-1 text-xs text-gray-400">데이터가 없습니다</span>
              </div>
              {['월', '화', '수', '목', '금', '토', '일'].map((label) => (
                <div key={label} className="flex h-full w-full flex-col items-center justify-end gap-1 opacity-20">
                  <div className="chart-bar relative h-[0%] w-full overflow-hidden rounded-[6px] bg-[#f3f4f6]" />
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="dashboard-empty-small-card flex h-full min-h-[196px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-rocket text-gray-400" /> 진행 중인 프로젝트
              </h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <i className="fas fa-folder-open" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                현재 참여 중인
                <br />
                프로젝트가 없습니다.
              </p>
              <button type="button" className="mt-3 rounded border border-gray-200 bg-gray-50 h-[26px] px-3 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100">
                팀 찾기
              </button>
            </div>
          </div>

          <div className="dashboard-empty-small-card flex h-full min-h-[196px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-chalkboard-teacher text-gray-400" /> 멘토링
              </h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <i className="fas fa-search" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                현재 진행 중인
                <br />
                멘토링이 없습니다.
              </p>
              <button type="button" className="mt-3 rounded border border-gray-200 bg-gray-50 h-[26px] px-3 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100">
                멘토 찾기
              </button>
            </div>
          </div>

          <div className="dashboard-empty-small-card flex h-full min-h-[196px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-comment-dots text-gray-400" /> 라운지 / 커뮤니티
              </h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <i className="far fa-comments" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                아직 커뮤니티 활동이
                <br />
                없습니다.
              </p>
              <button type="button" className="mt-3 rounded border border-gray-200 bg-gray-50 h-[26px] px-3 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100">
                글 작성하기
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="dashboard-empty-proof-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">보유 스킬 (Proof)</h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-4 min-h-[136px]">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-300 shadow-sm">
                <i className="fas fa-certificate" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                획득한 스킬이 없습니다.
                <br />
                학습을 완료하고 증명하세요.
              </p>
            </div>
          </div>

          <div className="dashboard-empty-ai-card flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <i className="fas fa-magic text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900">AI 맞춤 성장 제안</h3>
            </div>

            <div className="flex h-full flex-col gap-4 md:flex-row">
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center min-h-[136px]">
                <i className="fas fa-robot mb-1 text-2xl text-gray-300" />
                <p className="text-sm font-bold text-gray-500">학습 데이터가 부족합니다</p>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  강의를 수강하고 과제를 진행해보세요.
                  <br />
                  데이터가 충분히 모이면 AI가 맞춤형 성장 방향을 제안합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="dashboard-empty-reference-roadmap hidden w-80 shrink-0 space-y-6 xl:block">
        <div aria-hidden className="mb-2 invisible">
          <h1 className="text-2xl font-bold">.</h1>
          <p className="mt-1 text-sm">.</p>
        </div>
        <div className="dashboard-empty-roadmap-card sticky top-[100px] flex h-fit flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="dashboard-empty-roadmap-title flex items-center gap-2 font-bold text-gray-900">
              <i className="fas fa-map text-gray-400" /> 나의 학습 로드맵
            </h3>
          </div>

          <div className="dashboard-empty-roadmap-body flex flex-1 flex-col items-center justify-center text-center">
            <div className="dashboard-empty-roadmap-icon mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <i className="fas fa-route text-3xl" />
            </div>
            <h4 className="dashboard-empty-roadmap-heading mb-2 text-sm font-bold text-gray-700">선택된 로드맵이 없습니다</h4>
            <p className="dashboard-empty-roadmap-copy mb-8 text-xs leading-relaxed text-gray-400">
              나의 커리어 목표에 맞는
              <br />
              최적의 학습 경로를 찾아보세요!
              <br />
              DevPath가 안내해 드립니다.
            </p>
            <button
              type="button"
              className="dashboard-empty-roadmap-button flex w-full items-center justify-center gap-2 rounded-xl bg-brand h-[49px] text-sm font-bold text-white shadow-sm transition hover:bg-[#00b365]"
              onClick={() => navigateTo('/roadmap-hub')}
            >
              <i className="fas fa-search text-xs" /> 맞춤 로드맵 탐색하기
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
