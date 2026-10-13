import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectApiRequest } from '../project/api'
import AiInterviewQuestionBank from './AiInterviewQuestionBank'
import { emptyInterviewAnswer, useInterviewAnswers, type InterviewQuestion } from './interview-practice'
import type { InterviewEvidence } from './interview-evidence'

vi.mock('../project/api', () => ({ projectApiRequest: vi.fn() }))
const questions: InterviewQuestion[] = [
  { id: 'Q1', category: '설계', question: '중복 신고는 어떻게 막나요?', answer: '유니크 제약으로 중복 저장을 방지합니다.', keywords: ['유니크', '제약'], level: 2 },
  { id: 'Q2', category: '성능', question: '신고 조회를 어떻게 최적화하나요?', answer: '인덱스로 최적화합니다.', keywords: ['인덱스'], level: 3 },
]
function Bank({ workspaceId = 42, evidence, questionList = questions }: { workspaceId?: number; evidence?: InterviewEvidence; questionList?: InterviewQuestion[] }) {
  const [answers, setAnswers] = useInterviewAnswers(workspaceId)
  return <AiInterviewQuestionBank questions={questionList} workspaceId={workspaceId} answers={answers} setAnswers={setAnswers} evidence={evidence} />
}
beforeEach(() => { localStorage.clear(); vi.mocked(projectApiRequest).mockReset() })

describe('원본 면접 질문 카드', () => {
  it('질문 분류·실제 작업 구현 상태와 API·ERD 근거를 모범 답안에서도 표시한다', () => {
    const evidence: InterviewEvidence = { tasks: [{ id: 'DP-101', title: '신고 구현', status: 'todo' }], apis: [{ id: 'A-team', method: 'POST', path: '/reports' }], tables: ['REPORTS'] }
    const linkedQuestion = { ...questions[0], category: '핵심 난제', tasks: ['DP-101'], apis: ['POST /reports'], erd: 'REPORTS' }
    const view = render(<Bank evidence={evidence} questionList={[linkedQuestion]} />)
    expect(screen.getByText('구현 전')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '핵심 난제' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    expect(screen.getByText(/관련 작업 #DP-101은 아직 시작 전/)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Q1 답변 탭' })).getByRole('tab', { name: /모범 답안/ }))
    expect(screen.getByRole('link', { name: '#DP-101 할 일' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'POST /reports' })).toHaveAttribute('href', expect.stringContaining('#A-team'))
    expect(screen.getByRole('link', { name: 'REPORTS' })).toBeInTheDocument()
    view.rerender(<Bank evidence={{ ...evidence, tasks: [{ ...evidence.tasks[0], status: 'progress' }] }} questionList={[linkedQuestion]} />)
    expect(screen.getByText('구현 진행 중')).toBeInTheDocument()
    view.rerender(<Bank evidence={{ ...evidence, tasks: [{ ...evidence.tasks[0], status: 'done' }] }} questionList={[linkedQuestion]} />)
    expect(screen.getByText('코드 근거 있음')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '#DP-101 완료' })).toBeInTheDocument()
  })

  it('모범 답안을 처음에는 가리고 클릭으로 공개·숨김하며 다른 탭에서 돌아오면 다시 가린다', () => {
    render(<Bank />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '유니크 제약으로 중복을 막습니다.' } })
    const tabs = within(screen.getByRole('tablist', { name: 'Q1 답변 탭' }))
    fireEvent.click(tabs.getByRole('tab', { name: /모범 답안/ }))
    const text = screen.getByText(questions[0].answer)
    expect(text).toHaveClass('blur-[5px]')
    expect(text).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('#유니크')).toHaveClass('text-green-700')
    fireEvent.click(screen.getByRole('button', { name: 'Q1 모범 답안 보기' }))
    expect(text).not.toHaveClass('blur-[5px]')
    expect(text).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByRole('button', { name: 'Q1 모범 답안 가리기' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Q1 모범 답안 가리기' }))
    expect(text).toHaveClass('blur-[5px]')
    fireEvent.click(tabs.getByRole('tab', { name: /내 답변/ }))
    fireEvent.click(tabs.getByRole('tab', { name: /모범 답안/ }))
    expect(screen.getByRole('button', { name: 'Q1 모범 답안 보기' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('질문별로 독립적으로 펼치고 접으며 실제 모범 답안과 빈 팀원·꼬리 질문을 표시한다', async () => {
    render(<Bank />)
    const first = screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' })
    const second = screen.getByRole('button', { name: 'Q2 신고 조회를 어떻게 최적화하나요?' })
    expect(first).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(first)
    fireEvent.click(second)
    expect(screen.getByLabelText('Q1 내 답변')).toBeInTheDocument()
    expect(screen.getByLabelText('Q2 내 답변')).toBeInTheDocument()
    const tabs = within(screen.getByRole('tablist', { name: 'Q1 답변 탭' }))
    fireEvent.click(tabs.getByRole('tab', { name: /모범 답안/ }))
    expect(screen.getByText(questions[0].answer)).toBeInTheDocument()
    fireEvent.click(tabs.getByRole('tab', { name: /팀원 답변/ }))
    expect(await screen.findByText('아직 공유된 팀원 답변이 없습니다.')).toBeInTheDocument()
    fireEvent.click(tabs.getByRole('tab', { name: /꼬리 질문/ }))
    expect(screen.getByText('이 설계서에 등록된 꼬리 질문이 없습니다.')).toBeInTheDocument()
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveAttribute('aria-expanded', 'true')
  })

  it('개인 기록 도착 전에는 답변 변경을 막고 모범 답안은 읽을 수 있다', () => {
    const setAnswers = vi.fn()
    const view = render(<AiInterviewQuestionBank questions={[questions[0]]} workspaceId={42} answers={{}} setAnswers={setAnswers} answersReady={false} evidenceReady={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    expect(screen.getByLabelText('Q1 내 답변')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Q1 즐겨찾기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Q1 자신 있어요' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '조회 전에 입력한 값' } })
    expect(setAnswers).not.toHaveBeenCalled()
    expect(screen.getByText('근거 자료 조회 중...')).toBeInTheDocument()
    const tabs = within(screen.getByRole('tablist', { name: 'Q1 답변 탭' }))
    fireEvent.click(tabs.getByRole('tab', { name: /모범 답안/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Q1 모범 답안 보기' }))
    expect(screen.getByText(questions[0].answer)).toHaveAttribute('aria-hidden', 'false')
    view.rerender(<AiInterviewQuestionBank questions={[questions[0]]} workspaceId={42} answers={{ Q1: { ...emptyInterviewAnswer, text: '서버에 저장한 답변' } }} setAnswers={setAnswers} />)
    fireEvent.click(tabs.getByRole('tab', { name: /내 답변/ }))
    expect(screen.getByLabelText('Q1 내 답변')).toBeEnabled()
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('서버에 저장한 답변')
  })

  it('팀원 답변은 해당 탭을 처음 열 때만 조회한다', async () => {
    vi.mocked(projectApiRequest).mockResolvedValue([{ questionId: 'Q1', userId: 88, name: '팀원', text: '동시 요청을 검증했습니다.' }] as never)
    render(<AiInterviewQuestionBank questions={[questions[0]]} workspaceId={42} answers={{}} setAnswers={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    const tabs = within(screen.getByRole('tablist', { name: 'Q1 답변 탭' }))
    fireEvent.click(tabs.getByRole('tab', { name: /모범 답안/ }))
    expect(projectApiRequest).not.toHaveBeenCalled()
    fireEvent.click(tabs.getByRole('tab', { name: /팀원 답변/ }))
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/42/interview/shared-answers', {}, 'required')
    expect(await screen.findByText('동시 요청을 검증했습니다.')).toBeInTheDocument()
  })

  it('답변·버전·즐겨찾기를 저장하고 재방문해도 복원하며 다른 프로젝트와 분리한다', () => {
    const view = render(<Bank />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '유니크 제약으로 중복을 막습니다.' } })
    fireEvent.click(screen.getByRole('button', { name: /버전 저장/ }))
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '다른 답변' } })
    fireEvent.click(screen.getByRole('button', { name: '불러오기' }))
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('유니크 제약으로 중복을 막습니다.')
    fireEvent.click(screen.getByRole('button', { name: 'Q1 즐겨찾기' }))
    view.unmount()
    const revisit = render(<Bank />)
    expect(screen.getByRole('button', { name: 'Q1 즐겨찾기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('키워드 2/2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('유니크 제약으로 중복을 막습니다.')
    revisit.unmount()
    render(<Bank workspaceId={43} />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('')
  })

  it('실제 분류, 검색, 연습 상태와 즐겨찾기 필터가 동작한다', () => {
    render(<Bank />)
    fireEvent.click(screen.getByRole('button', { name: '성능' }))
    expect(screen.queryByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '전체' }))
    fireEvent.click(screen.getByRole('button', { name: 'Q2 즐겨찾기' }))
    fireEvent.change(screen.getByLabelText('연습 상태'), { target: { value: 'fav' } })
    expect(screen.queryByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('질문 검색'), { target: { value: '없는 질문' } })
    expect(screen.getByText('조건에 맞는 질문이 없습니다.')).toBeInTheDocument()
  })

  it('SPA에서 다른 프로젝트로 전환해도 기존 답변을 덮어쓰지 않는다', () => {
    const view = render(<Bank />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '42 프로젝트 답변' } })
    view.rerender(<Bank workspaceId={43} />)
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '43 프로젝트 답변' } })
    view.rerender(<Bank workspaceId={42} />)
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('42 프로젝트 답변')
    view.rerender(<Bank workspaceId={43} />)
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('43 프로젝트 답변')
  })

  it('실제 워크스페이스 AI API에 답변을 보내고 서버 피드백을 표시한다', async () => {
    vi.mocked(projectApiRequest).mockResolvedValue({ answer: '동시 요청에 대한 검증 사례를 보강해 주세요.' } as never)
    render(<Bank />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '유니크 제약을 사용합니다.' } })
    fireEvent.click(screen.getByRole('button', { name: /AI 피드백 받기/ }))
    await waitFor(() => expect(screen.getByText('동시 요청에 대한 검증 사례를 보강해 주세요.')).toBeInTheDocument())
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/42/ai-assist', expect.objectContaining({ method: 'POST' }), 'required')
    const payload = JSON.parse(vi.mocked(projectApiRequest).mock.calls.find(([path]) => path.endsWith('/ai-assist'))![1]?.body as string)
    expect(payload.question).toContain('유니크 제약을 사용합니다.')
    expect(payload.history).toEqual([])
  })

  it('AI 요청 실패 시 작성한 답변을 유지하고 피드백을 꾸며 표시하지 않는다', async () => {
    vi.mocked(projectApiRequest).mockRejectedValue(new Error('AI 요청 한도를 초과했습니다.'))
    render(<Bank />)
    fireEvent.click(screen.getByRole('button', { name: 'Q1 중복 신고는 어떻게 막나요?' }))
    fireEvent.change(screen.getByLabelText('Q1 내 답변'), { target: { value: '내 실제 답변' } })
    fireEvent.click(screen.getByRole('button', { name: /AI 피드백 받기/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /AI 피드백 받기/ })).toBeEnabled())
    expect(screen.getByLabelText('Q1 내 답변')).toHaveValue('내 실제 답변')
    expect(screen.queryByText('AI 답변 코치')).not.toBeInTheDocument()
  })
})
