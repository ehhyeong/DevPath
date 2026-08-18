import LoginRequiredGate from '../../components/LoginRequiredView'

export function EmptyState(props: { iconClassName: string; title: string; description: string; className?: string }) {
  return (
    <div className={`learning-empty-state rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-10 text-center shadow-sm ${props.className ?? ''}`}>
      <div className="learning-empty-state-icon mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <i className={props.iconClassName} />
      </div>
      <h3 className="learning-empty-state-title mt-4 text-sm font-semibold text-gray-900">{props.title}</h3>
      <p className="learning-empty-state-description mt-2 text-sm leading-6 text-gray-500">{props.description}</p>
    </div>
  )
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00c471] border-t-transparent" />
    </div>
  )
}

export function LoginRequiredView() {
  return <LoginRequiredGate message="학습 플레이어는 로그인한 사용자만 이용할 수 있습니다." />
}

export function ErrorView(props: { title: string; message: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="min-h-screen bg-[#0a100f] px-4 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
          <i className="fas fa-circle-exclamation text-2xl" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">{props.title}</h1>
        <p className="mt-3 text-sm leading-7 text-white/70">{props.message}</p>
        <div className="mt-8">
          <a href={props.actionHref} className="inline-flex rounded-full bg-[#00c471] px-6 py-3 text-sm font-bold text-white">
            {props.actionLabel}
          </a>
        </div>
      </div>
    </div>
  )
}
