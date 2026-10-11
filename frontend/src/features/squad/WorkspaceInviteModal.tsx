import { useEffect, useRef, useState, type FormEvent } from 'react'
import { projectApiRequest } from '../project/api'

type InviteLink = { workspaceId: number; token: string; expiresAt: string }

export default function WorkspaceInviteModal({ workspaceId, onClose }: { workspaceId: number; onClose: () => void }) {
  const [link, setLink] = useState<InviteLink | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    const controller = new AbortController()
    setLoading(true)
    setError('')
    projectApiRequest<InviteLink>(`/api/workspaces/hub/projects/${workspaceId}/invite-link`, { method: 'POST', signal: controller.signal }, 'required')
      .then((response) => { if (!controller.signal.aborted) setLink(response) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '초대 링크를 생성하지 못했습니다.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [workspaceId, retry])

  const inviteUrl = link ? `${window.location.origin}/workspace-hub?inviteToken=${encodeURIComponent(link.token)}` : ''

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setNotice('초대 링크를 복사했습니다. 팀원에게 공유해 주세요.')
      setError('')
    } catch {
      setError('자동 복사가 지원되지 않습니다. 초대 링크를 선택해 직접 복사해 주세요.')
    }
  }

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      await projectApiRequest(`/api/workspaces/hub/projects/${workspaceId}/invites`, { method: 'POST', body: JSON.stringify({ email: email.trim() }) }, 'required')
      setNotice('팀원의 DevPath 계정에 초대 알림을 보냈습니다. 알림에서 참여할 수 있습니다.')
      setEmail('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '초대 알림을 보내지 못했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose() }} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="workspace-invite-title" className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 id="workspace-invite-title" className="text-xl font-black text-gray-900">팀원 초대하기</h3>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="초대 모달 닫기" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-800"><i className="fas fa-times text-xl" /></button>
        </div>
        <label htmlFor="workspace-invite-link" className="mb-2 block text-sm font-bold text-gray-700">초대 링크 (누구나 참여 가능)</label>
        <div className="flex gap-2">
          <input id="workspace-invite-link" readOnly value={inviteUrl} placeholder={loading ? '초대 링크 생성 중...' : '초대 링크'} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 outline-none focus:border-brand" />
          <button type="button" disabled={!link || loading} onClick={() => void copyLink()} className="shrink-0 rounded-xl bg-gray-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">복사</button>
        </div>
        {link ? <p className="mt-2 text-[11px] text-gray-400">{new Date(link.expiresAt).toLocaleDateString('ko-KR')}까지 유효합니다. 로그인 후 참여할 수 있습니다.</p> : !loading ? <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 text-xs font-bold text-brand">링크 생성 다시 시도</button> : null}
        <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-gray-100" /><span className="text-xs font-medium text-gray-400">또는 이메일로 팀원 초대</span><div className="h-px flex-1 bg-gray-100" /></div>
        <form onSubmit={(event) => void sendInvite(event)} className="flex gap-2">
          <input type="email" required aria-label="팀원의 이메일 주소" placeholder="팀원의 이메일 주소" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand" />
          <button type="submit" disabled={sending || loading || !link} className="shrink-0 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{sending ? '전송 중...' : '초대 보내기'}</button>
        </form>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-400">가입된 이메일로 찾은 DevPath 계정에 초대 알림을 보냅니다.</p>
        {error ? <p role="alert" className="mt-4 text-xs font-bold text-red-500">{error}</p> : null}
        {notice ? <p role="status" className="mt-4 text-xs font-bold text-brand">{notice}</p> : null}
      </section>
    </div>
  )
}
