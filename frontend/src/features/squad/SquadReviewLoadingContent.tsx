export default function SquadReviewLoadingContent({ detailOnly = false }: { detailOnly?: boolean }) {
  return (
    <section role="status" aria-label="코드 리뷰를 불러오는 중입니다" aria-busy="true" className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      {!detailOnly ? <div aria-hidden="true" className="hidden w-[320px] shrink-0 space-y-4 border-r border-gray-200 bg-white p-5 lg:block xl:w-[340px]">
        <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
        {[0, 1, 2].map(key => <div key={key} className="space-y-4 rounded-xl border border-gray-100 p-4"><div className="h-4 w-16 animate-pulse rounded bg-gray-100" /><div className="h-5 animate-pulse rounded bg-gray-200" /><div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" /></div>)}
      </div> : null}
      <div className="min-w-0 flex-1 space-y-6 overflow-hidden p-6">
        <div><h2 className="text-xl font-bold text-gray-900">코드 피드백</h2><p className="mt-2 text-sm text-gray-600">코드 리뷰를 불러오는 중입니다...</p></div>
        <div aria-hidden="true" className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="h-7 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
          <div className="space-y-3 border-t border-gray-100 pt-5">{[0, 1, 2, 3].map(key => <div key={key} className="h-4 animate-pulse rounded bg-gray-100" />)}</div>
        </div>
        <div aria-hidden="true" className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      </div>
    </section>
  )
}
