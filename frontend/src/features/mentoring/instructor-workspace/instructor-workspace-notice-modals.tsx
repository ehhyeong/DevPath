import { useState,type FormEvent } from 'react';



export function NoticeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (title: string, content: string, important: boolean) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [important, setImportant] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(title.trim(), content.trim(), important)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-bullhorn text-[#7C3AED]" /> 새 공지사항 작성</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400"><i className="fas fa-times" /></button>
        </div>
        <div className="space-y-5 p-6">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">공지 제목 <span className="text-red-500">*</span></span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="수강생들에게 보일 제목을 입력하세요." />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">상세 내용 <span className="text-red-500">*</span></span>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="안내할 내용을 상세히 적어주세요. 마크다운(Markdown) 입력이 지원됩니다." />
          </label>
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-red-500" />
              <span className="select-none text-sm font-bold text-red-500">중요 공지로 설정 (수강생 알림 강조)</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700">취소</button>
          <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
            <i className="fas fa-paper-plane" />작성 및 푸시 알림 전송
          </button>
        </div>
      </form>
    </div>
  )
}

export function NoticeSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-3xl text-[#7C3AED] shadow-sm">
          <i className="fas fa-check" />
        </div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">배포 완료!</h3>
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">공지사항이 워크스페이스에 등록되었으며,<br />모든 수강생에게 알림이 발송되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#7C3AED] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700">확인</button>
      </div>
    </div>
  )
}
