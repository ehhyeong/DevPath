import { describe, expect, it } from 'vitest'
import { apiAuthLabel, apiTaskReference, findApiTask, linkApisToTask, readWorkspaceApiDocument, readWorkspaceApis } from './api-workspace-links'
import type { WorkspaceTask } from './dashboard-types'

describe('API와 실제 작업 연결', () => {
  const tasks: WorkspaceTask[] = [{ taskId: 101, workspaceId: 42, title: '인증 구현', assigneeId: 77, dueDate: '2026-10-20', status: 'IN_PROGRESS' }]

  it('기존 문서의 그룹을 유추하고 엔드포인트 없는 사용자 그룹을 보존한다', () => {
    const endpoint = { method: 'POST', path: '/api/v1/auth/login', auth: 'None', description: '로그인', requestExample: '{}', responseExample: '{}' }
    const original = readWorkspaceApiDocument(JSON.stringify({ format: 'devpath-ai-api-v1', endpoints: [endpoint] }))
    expect(original.groups).toEqual(['Auth'])
    const document = readWorkspaceApiDocument(JSON.stringify({ ...original, groups: ['Auth', '알림', 'Auth'] }))
    expect(document.groups).toEqual(['Auth', '알림'])
    const linked = { ...document, endpoints: linkApisToTask(document.endpoints, 101, ['A1']) }
    expect(readWorkspaceApiDocument(JSON.stringify(linked))).toMatchObject({ groups: ['Auth', '알림'], endpoints: [{ task: 'DP-101' }] })
    expect(readWorkspaceApiDocument(JSON.stringify({ ...linked, endpoints: [] }))).toMatchObject({ groups: ['Auth', '알림'], endpoints: [] })
  })

  it('문서의 실제 작업 ID만 찾고 없는 작업과 제목을 임의로 연결하지 않는다', () => {
    expect(findApiTask('DP-101', tasks)).toBe(tasks[0])
    expect(findApiTask('DP-0101', tasks)).toBe(tasks[0])
    expect(findApiTask('DP-01', tasks)).toBeUndefined()
    expect(findApiTask('인증 구현', tasks)).toBeUndefined()
    expect(findApiTask('', tasks)).toBeUndefined()
    expect(apiTaskReference(1)).toBe('DP-01')
    expect(apiTaskReference(101)).toBe('DP-101')
  })

  it('편집한 문서를 양쪽 화면에서 동일하게 읽으며 작업·상태·권한을 보존한다', () => {
    const endpoint = { id: 'A-existing', group: 'AUTH', method: 'POST', path: '/api/v1/auth/login', desc: '로그인', auth: 'None', source: 'team', status: 'done', task: 'DP-101', response: { status: 200, body: {} } }
    const [api] = readWorkspaceApis(JSON.stringify({ format: 'devpath-api-v1', endpoints: [endpoint] }))
    expect(api).toEqual(endpoint)
    expect(findApiTask(api.task, tasks)?.assigneeId).toBe(77)
    expect(apiAuthLabel(api.auth)).toBe('없음')
  })

  it('초기 설계는 작업을 임의 배정하지 않으며 지원하지 않는 문서는 오류를 표시한다', () => {
    const [api] = readWorkspaceApis(JSON.stringify({ format: 'devpath-ai-api-v1', endpoints: [{ method: 'POST', path: '/api/v1/auth/login', auth: 'None', description: '로그인', requestExample: '{}', responseExample: '{}' }] }))
    expect(api).toMatchObject({ task: '', group: 'Auth' })
    expect(() => readWorkspaceApis('{"format":"unknown","endpoints":[]}')).toThrow('저장된 API 명세의 형식을 확인해 주세요.')
  })

  it('작업에서 여러 API를 연결·이동·해제하며 다른 작업의 연결과 명세를 보존한다', () => {
    const apis = readWorkspaceApis(JSON.stringify({ format: 'devpath-api-v1', endpoints: ['DP-0101', 'DP-99', 'DP-101', 'DP-77'].map((task, index) => ({ id: `A${index + 1}`, group: 'AUTH', method: 'POST', path: `/auth/${index}`, desc: '인증', auth: 'JWT', source: 'team', status: 'done', task, response: { status: 200, body: { kept: true } } })) }))
    const next = linkApisToTask(apis, 101, ['A1', 'A2'])
    expect(next.map((api) => api.task)).toEqual(['DP-101', 'DP-101', '', 'DP-77'])
    expect(next[1]).toEqual({ ...apis[1], task: 'DP-101' })
    expect(next[3]).toBe(apis[3])
    expect(apis.map((api) => api.task)).toEqual(['DP-0101', 'DP-99', 'DP-101', 'DP-77'])
    expect(linkApisToTask(next, 101, []).map((api) => api.task)).toEqual(['', '', '', 'DP-77'])
  })
})

describe('API 권한 표시', () => {
  it.each(['None', 'none', 'NONE', ' null ', 'no auth', '없음', ''])('%s 권한을 없음으로 표시한다', (auth) => {
    expect(apiAuthLabel(auth)).toBe('없음')
  })

  it('역할·인증 방식은 유지한다', () => {
    expect(apiAuthLabel('AUTHOR (본인)')).toBe('AUTHOR (본인)')
    expect(apiAuthLabel('JWT')).toBe('JWT')
  })
})
