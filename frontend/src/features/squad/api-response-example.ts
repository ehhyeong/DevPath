import type { AiApi } from './ai-squad-data'

export type ApiResponseExampleDraft = { status: string; body: string }

export function parseApiResponseExample(draft: ApiResponseExampleDraft): AiApi['response'] {
  const statusText = draft.status.trim()
  const body = draft.body.trim()
  if (!statusText && !body) return null
  const status = Number(statusText)
  if (!Number.isInteger(status) || status < 200 || status > 599) throw new Error('응답 상태 코드는 200~599 사이의 정수로 입력해 주세요.')
  if (status === 204 || status === 304) {
    if (body) throw new Error(`${status} 응답에는 본문이 없습니다. JSON 예시를 비워 주세요.`)
    return { status }
  }
  if (!body) throw new Error('응답 JSON 예시를 입력하거나 상태 코드도 비워 응답 미정으로 저장해 주세요.')
  try { return { status, body: JSON.parse(body) } }
  catch { throw new Error('응답 JSON 형식이 올바르지 않습니다. 따옴표와 쉼표를 확인해 주세요.') }
}
