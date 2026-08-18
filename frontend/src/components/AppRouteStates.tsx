import { Component,type ErrorInfo,type ReactNode } from 'react'

export function RouteLoadingView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-6" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm font-bold text-gray-600 shadow-sm">
        <i className="fas fa-circle-notch fa-spin text-brand" aria-hidden="true" />
        화면을 불러오는 중입니다.
      </div>
    </main>
  )
}

export function NotFoundPage({ pathname }: { pathname: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-6">
      <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-black tracking-[0.2em] text-brand">404</p>
        <h1 className="mt-3 text-3xl font-black text-gray-900">페이지를 찾을 수 없습니다</h1>
        <p className="mt-4 break-all text-sm leading-6 text-gray-500">요청한 경로 {pathname}이 존재하지 않습니다.</p>
        <a href="/" className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white transition hover:bg-[#00b365]">
          홈으로 돌아가기
        </a>
      </section>
    </main>
  )
}

type RouteErrorBoundaryProps = {
  children: ReactNode
}

type RouteErrorBoundaryState = {
  hasError: boolean
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps,RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Failed to render the requested page.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-6">
          <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <i className="fas fa-triangle-exclamation text-3xl text-amber-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-black text-gray-900">화면을 불러오지 못했습니다</h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">잠시 후 다시 시도하거나 홈으로 이동해 주세요.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => window.location.reload()} className="h-11 rounded-xl border border-gray-300 bg-white px-5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                다시 시도
              </button>
              <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-[#00b365]">
                홈으로 이동
              </a>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
