export default function AdminReportsView() {
  return (
    <div id="view-reports" className="view-section hidden space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            {"신규 강의 검수 대기열"}
          </h3>
        </div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {"강의 정보"}
              </th>
              <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {"제출자"}
              </th>
              <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {"검수 결정"}
              </th>
            </tr>
          </thead>
          <tbody id="courseTableBody" className="bg-white text-sm"></tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            {"사용자 신고 접수 내역"}
          </h3>
        </div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {"신고 대상"}
              </th>
              <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {"신고 사유"}
              </th>
              <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {"관리"}
              </th>
            </tr>
          </thead>
          <tbody id="reportTableBody" className="bg-white text-sm"></tbody>
        </table>
      </div>
    </div>
  )
}
