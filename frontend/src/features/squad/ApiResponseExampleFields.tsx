import type { ApiResponseExampleDraft } from './api-response-example'

type Props = {
  id: string
  value: ApiResponseExampleDraft
  onChange: (value: ApiResponseExampleDraft) => void
  onGenerate: () => void
  disabled: boolean
  generating: boolean
  canGenerate: boolean
  error: string
}

export default function ApiResponseExampleFields({ id, value, onChange, onGenerate, disabled, generating, canGenerate, error }: Props) {
  return <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold text-gray-800">예상 응답 예시 · 선택사항</span><button disabled={disabled || !canGenerate} onClick={onGenerate} className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-600 hover:bg-purple-100 disabled:opacity-50" type="button"><i aria-hidden="true" className={`fas ${generating ? 'fa-spinner fa-spin' : 'fa-magic'} mr-1`} />{generating ? 'AI 초안 생성 중...' : 'AI로 응답 초안 만들기'}</button></div>
    <p className="text-[11px] leading-relaxed text-gray-500">예상하는 응답을 작성해 주세요. 두 칸을 비우면 응답 미정으로 저장됩니다. AI 초안은 검토 후 저장해 주세요.</p>
    <div><label htmlFor={`${id}-status`} className="mb-1 block text-xs font-bold text-gray-700">응답 상태 코드</label><input id={`${id}-status`} type="number" min={200} max={599} step={1} value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand" placeholder="예: 200 또는 201 · 비우면 미정" /></div>
    <div><label htmlFor={`${id}-body`} className="mb-1 block text-xs font-bold text-gray-700">응답 JSON 예시</label><textarea id={`${id}-body`} rows={5} value={value.body} onChange={(event) => onChange({ ...value, body: event.target.value })} className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:border-brand" placeholder={'{\n  "id": 1,\n  "message": "처리되었습니다."\n}'} /><p className="mt-1 text-[10px] text-gray-400">204·304 응답은 상태 코드만 입력하고 본문은 비워 주세요.</p></div>
    {error ? <p role="alert" className="text-xs font-bold text-red-600">{error}</p> : null}
  </fieldset>
}
