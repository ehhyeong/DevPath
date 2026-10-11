import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWorkspaceAiDesign, projectApiRequest } from '../project/api'
import type { WorkspaceFileItem } from './files-types'
import AiSquadWorkspaceApp from './AiSquadWorkspaceApp'

vi.mock('../project/api', async (importOriginal) => ({ ...await importOriginal<typeof import('../project/api')>(), projectApiRequest: vi.fn(), getWorkspaceAiDesign: vi.fn() }))
vi.mock('../../lib/auth-session', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/auth-session')>(),
  readStoredAuthSession: () => ({ accessToken: 'test-token', userId: 77, name: '실제 사용자', storage: 'session' }),
}))

let files: WorkspaceFileItem[] = []
const file = (id: number, name: string, itemType: 'FILE' | 'FOLDER' = 'FILE'): WorkspaceFileItem => ({ fileId: id, workspaceId: 42, originalFileName: name, displayName: name, itemType, fileSize: 1024, uploadedById: 77, uploadedByName: '실제 사용자', createdAt: '2026-10-06T12:00:00', contentType: 'text/plain' })

beforeEach(() => {
  window.history.replaceState({}, '', '/squad-files?workspaceId=42&ai=1')
  files = []
  vi.mocked(getWorkspaceAiDesign).mockReset()
  vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-06T12:00:00', design: {
    title: '지역 안전 신고 플랫폼', summary: '주민 위험 신고', difficulty: 'mvp',
    stack: { frontend: 'React', backend: 'Spring Boot', database: 'PostgreSQL', libraries: [], selectionReason: '신고 서비스' },
    scenario: { userFlows: [{ actor: '주민', action: '신고 등록' }], coreFeatures: ['위치 기반 신고'] },
    architecture: { style: '모놀리스', description: 'REST API', components: [], erdMermaid: 'erDiagram', entities: [], technicalChallenges: [] },
    apis: [{ method: 'POST', path: '/reports', description: '신고 생성', auth: 'JWT', requestExample: '{}', responseExample: '{}' }],
    roadmap: [{ phase: 1, title: '신고 구현', goal: '신고 생성', estimatedWeeks: 1, tasks: ['API 구현'] }],
    interviewQuestions: [{ category: '설계', question: '신고 중복을 막는 방법은?', answer: '요청 검증', keywords: ['검증'] }],
  } })
  vi.mocked(projectApiRequest).mockReset().mockImplementation(async (path, options) => {
    if (path.endsWith('/dashboard')) return { workspaceId: 42, name: '지역 안전 신고 플랫폼', ownerId: 77, status: 'ACTIVE', type: 'SQUAD', members: [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자' }] } as never
    if (path.endsWith('/storage')) return { usedBytes: 0, quotaBytes: 1073741824, storageProvider: 'LOCAL' } as never
    if (path.endsWith('/folders') && options?.method === 'POST') {
      files = [...files, file(55, JSON.parse(options.body as string).name, 'FOLDER')]
      return files.at(-1) as never
    }
    if (path.endsWith('/files')) return files as never
    return [] as never
  })
})

describe('AI 워크스페이스 자료실 원본 화면', () => {
  it('빈 자료실에서도 원본의 도구 모음과 필터, 파일 표를 유지한다', async () => {
    const { container } = render(<AiSquadWorkspaceApp />)
    expect(await screen.findByRole('heading', { name: '팀 자료실' }, { timeout: 5000 })).toBeInTheDocument()
    expect(container.querySelector('.squad-files-toolbar')).toBeInTheDocument()
    expect(container.querySelector('.squad-files-table-header')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('파일 및 폴더 이름 검색...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새 폴더' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '업로드' })).toBeInTheDocument()
    for (const label of ['전체', '폴더', 'PDF', '이미지', '문서']) expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('date-desc')
    expect(await screen.findByText('00_AI_설계서 (자동 생성)')).toBeInTheDocument()
    expect(screen.queryByText('이 폴더가 비어있거나 조건에 맞는 파일이 없습니다.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '작업 현황판' })).toHaveAttribute('href', '/squad-workspace?workspaceId=42&ai=1')
    expect(screen.getByRole('button', { name: 'AI 설계서' })).toBeInTheDocument()
    expect(getWorkspaceAiDesign).toHaveBeenCalledWith(42, expect.any(AbortSignal))
    expect(screen.queryByText('김개발')).not.toBeInTheDocument()
  })

  it('실제 API 파일을 검색하고 필터·이름 정렬하며 폴더를 생성한다', async () => {
    files = [file(1, 'z-note.txt'), file(2, 'a-report.pdf'), file(3, '실제 폴더', 'FOLDER')]
    files[1].contentType = 'application/pdf'
    const { container } = render(<AiSquadWorkspaceApp />)
    await screen.findByText('z-note.txt')
    fireEvent.change(screen.getByPlaceholderText('파일 및 폴더 이름 검색...'), { target: { value: 'report' } })
    expect(screen.queryByText('z-note.txt')).not.toBeInTheDocument()
    expect(screen.getByText('a-report.pdf')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('파일 및 폴더 이름 검색...'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }))
    expect(screen.queryByText('실제 폴더')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '전체' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'name-asc' } })
    const rows = container.querySelectorAll('.file-row.squad-files-row')
    expect(rows[0]).toHaveTextContent('실제 폴더')
    expect(rows[1]).toHaveTextContent('a-report.pdf')
    expect(rows[2]).toHaveTextContent('z-note.txt')
    fireEvent.click(screen.getByRole('button', { name: '새 폴더' }))
    fireEvent.change(screen.getByPlaceholderText('폴더 이름을 입력하세요.'), { target: { value: '팀 문서' } })
    fireEvent.click(screen.getByRole('button', { name: '생성하기' }))
    expect(await screen.findByText('팀 문서')).toBeInTheDocument()
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/42/files/folders', { method: 'POST', body: JSON.stringify({ name: '팀 문서', parentId: null }) }, 'required')
  })

  it('원본 업로드 모달에서 실제 파일을 multipart로 전송한다', async () => {
    const { container } = render(<AiSquadWorkspaceApp />)
    fireEvent.click(await screen.findByRole('button', { name: '업로드' }))
    const panel = container.querySelector('.squad-files-upload-panel')!
    const upload = new File(['real content'], '팀자료.txt', { type: 'text/plain' })
    fireEvent.change(container.querySelector('#squadFileInput')!, { target: { files: { item: () => upload } } })
    fireEvent.click(within(panel as HTMLElement).getByRole('button', { name: '업로드' }))
    await waitFor(() => expect(container.querySelector('.squad-files-upload-panel')).not.toBeInTheDocument())
    const call = vi.mocked(projectApiRequest).mock.calls.find(([path, options]) => path.endsWith('/files') && options?.method === 'POST')
    expect(call).toBeDefined()
    expect((call![1]!.body as FormData).get('file')).toBe(upload)
  })

  it('AI 설계서 필터와 자동 생성 폴더가 저장 설계의 문서 5종을 보여준다', async () => {
    render(<AiSquadWorkspaceApp />)
    fireEvent.click(await screen.findByText('00_AI_설계서 (자동 생성)'))
    expect(await screen.findByRole('button', { name: '01_기획_시나리오.md' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '05_개발_로드맵_면접.md' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '업로드' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '01_기획_시나리오.md' }))
    expect(screen.getByRole('dialog', { name: '01_기획_시나리오.md' })).toHaveTextContent('지역 안전 신고 플랫폼')
    expect(screen.getByRole('dialog', { name: '01_기획_시나리오.md' })).toHaveTextContent('위치 기반 신고')
    fireEvent.click(screen.getByRole('button', { name: '설계서 미리보기 닫기' }))
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI 설계서' }))
    expect(await screen.findByRole('button', { name: '04_API_명세서.md' })).toBeInTheDocument()
  })
})
