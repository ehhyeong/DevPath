export default function AdminRoadmapInfoView() {
  return (
    <div id="view-roadmap-info" className="view-section hidden space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {"로드맵 소개 관리"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {"로드맵 상세 화면 상단의 소개 아코디언 제목과 본문을 수정합니다."}
            </p>
          </div>
          <div id="roadmapInfoSummary" className="text-xs font-medium text-slate-500">
            {"전체 0개 · 소개 등록 0개"}
          </div>
        </div>
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative block flex-1">
              <i className="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400"></i>
              <input id="roadmapInfoFilterInput" className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" type="text" placeholder="로드맵명, 소개 제목, 소개 본문으로 필터" />
            </label>
            <div id="roadmapInfoFilterSummary" className="text-xs font-medium text-slate-500">
              {"전체 0개"}
            </div>
          </div>
        </div>
        <div className="grid gap-0 2xl:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
          <div className="overflow-x-auto border-b border-slate-100 2xl:border-r 2xl:border-b-0">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[30%]" />
                <col className="w-[35%]" />
                <col className="w-[11%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"ID"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"로드맵"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"소개 콘텐츠"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"상태"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"관리"}
                  </th>
                </tr>
              </thead>
              <tbody id="roadmapInfoTableBody" className="bg-white text-sm"></tbody>
            </table>
          </div>
          <form id="roadmapInfoForm" className="bg-white p-5">
            <div className="mb-4 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
              <div className="text-[11px] font-bold tracking-wide text-cyan-700 uppercase">
                {"선택한 로드맵"}
              </div>
              <div id="roadmapInfoSelectedTitle" className="mt-2 text-base font-black text-slate-900">
                {"로드맵을 선택하세요"}
              </div>
              <p id="roadmapInfoSelectedDescription" className="mt-1 text-xs leading-5 text-slate-500">
                {"목록에서 로드맵을 선택하면 소개 제목과 본문을 수정할 수 있습니다."}
              </p>
            </div>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">
                {"로드맵 선택"}
              </span>
              <select id="roadmapInfoRoadmapSelect" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"로드맵을 선택하세요"}
                </option>
              </select>
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">
                {"소개 제목"}
              </span>
              <input id="roadmapInfoTitleInput" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50" type="text" placeholder="예: 백엔드 개발이란 무엇인가요?" autoComplete="off" disabled />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">
                {"소개 본문"}
              </span>
              <span className="mb-2 block text-[11px] leading-5 text-slate-400">
                {"일반 문장으로 입력하세요. 빈 줄은 문단으로, `- `로 시작하는 줄은 목록으로 저장됩니다. 제목처럼 강조할 줄은 `## `로 시작하면 됩니다."}
              </span>
              <textarea id="roadmapInfoContentInput" className="min-h-[260px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50" placeholder="예: 백엔드 개발은 웹 개발의 서버 측 부분을 의미합니다.\n\n## 주요 업무\n- 외부 서비스 통합: 결제 게이트웨이 및 클라우드 서비스 연동\n- 성능 최적화: 시스템 성능과 확장성 향상" disabled></textarea>
            </label>
            <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
              {"HTML 태그를 몰라도 됩니다. 저장 시 로드맵 상세 화면에 맞는 문단과 목록 HTML로 자동 변환됩니다."}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-bold text-slate-500">
                {"미리보기"}
              </div>
              <div id="roadmapInfoPreview" className="space-y-3 text-sm leading-6 text-slate-700">
                <p className="text-slate-400">
                  {"로드맵을 선택하면 소개 본문 미리보기가 표시됩니다."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button id="roadmapInfoSaveButton" className="rounded-md bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled>
                <i className="fas fa-save mr-1"></i>
                {"소개 저장"}
              </button>
              <button id="roadmapInfoDeleteButton" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled>
                <i className="fas fa-trash mr-1"></i>
                {"소개 삭제"}
              </button>
              <button id="roadmapInfoResetButton" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
                {"선택 해제"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
