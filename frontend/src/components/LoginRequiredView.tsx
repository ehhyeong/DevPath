import { isLogoutRedirectPending } from '../lib/auth-session'

export default function LoginRequiredView({ message }: { message?: string }) {
  if (isLogoutRedirectPending()) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[36px] border border-white/70 bg-white px-8 py-10 text-center shadow-xl shadow-gray-900/5">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <i className="fas fa-user-lock text-2xl" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-gray-900">로그인이 필요합니다</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            {message ?? '이 페이지는 로그인한 사용자만 접근할 수 있습니다.'}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/home?auth=login"
              className="rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              로그인으로 이동
            </a>
            <a
              href="/home"
              className="rounded-full border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
