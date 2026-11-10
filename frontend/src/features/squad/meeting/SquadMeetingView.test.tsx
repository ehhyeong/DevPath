import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SquadMeetingView from './SquadMeetingView'
import type { SquadMeetingViewModel } from './useSquadMeetingController'
import { DEMO_TEXT } from '../../../lib/demo-typing'
import { getWorkspaceAiDesign } from '../../project/api'
import { userApi } from '../../../lib/api/auth'
import type { VoiceChatMessage, VoiceMeetingActionItem } from './meeting-types'

vi.mock('../../../lib/auth-session', async (original) => ({ ...await original<typeof import('../../../lib/auth-session')>(), readStoredAuthSession: () => ({ userId: 7 }) }))
vi.mock('../../project/api', async (original) => ({ ...await original<typeof import('../../project/api')>(), getWorkspaceAiDesign: vi.fn() }))
vi.mock('../../../components/SquadWorkspaceAside', () => ({ default: () => null }))
vi.mock('./MeetingParticipantStage', () => ({ default: () => null }))
vi.mock('./MeetingAudioSettings', () => ({ default: () => null }))

beforeEach(() => {
  vi.spyOn(userApi, 'getMyProfile').mockResolvedValue({ userId: 7, email: 'kim.hakseup@devpath.com' } as never)
})

function Room({ send, saving = false, draft = '', interim = '', messages = [], summary = '', actions = [] }: { send: (text: string) => void; saving?: boolean; draft?: string; interim?: string; messages?: VoiceChatMessage[]; summary?: string; actions?: VoiceMeetingActionItem[] }) {
  const [voiceChatInput, setVoiceChatInput] = useState('')
  const [roomPanelTab, setRoomPanelTab] = useState<'minutes' | 'chat'>('chat')
  const [recording, setRecording] = useState(false)
  const [minutesSummaryReportOpen, setMinutesSummaryReportOpen] = useState(false)
  const [selectedMinutesActionItems, setSelectedMinutesActionItems] = useState(actions.map((_, index) => index))
  const minutesTextareaRef = useRef<HTMLTextAreaElement>(null)
  return <SquadMeetingView {...{
    workspaceId: 42, session: { userId: 7, name: '김학습' }, activeChannel: { channelId: 1, name: '회의실' },
    channels: [], participants: [], members: [], roomParticipants: [], waitingMembers: [], voiceChatMessages: messages, voiceChatLoaded: true,
    roomPanelTab, setRoomPanelTab, roomSidePanelOpen: true, voiceChatInput, setVoiceChatInput,
    voiceMinutes: { channelId: 1, recording, transcript: '', summary }, minutesSaving: saving,
    toggleMinutesRecording: () => setRecording((current) => !current),
    minutesDraft: draft, minutesInterimTranscript: interim, minutesTextareaRef,
    minutesActionItems: actions, selectedMinutesActionItems, minutesSummaryReportOpen, setMinutesSummaryReportOpen,
    toggleMinutesActionItem: (index: number) => setSelectedMinutesActionItems((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]),
    remoteScreenShares: [], remoteCameraStreams: [],
    floatingReactions: [], localCameraStream: null, localScreenShareStream: null, micLevel: 0,
    securityStatus: { detail: '연결됨' }, networkStatus: { detail: '연결됨', label: '온라인', tone: 'good' },
    isJoined: true, loading: false, projectName: 'RoutineCare', sendVoiceChatMessage: () => send(voiceChatInput),
  } as unknown as SquadMeetingViewModel} aiWorkspace />
}

describe('회의실 시연 채팅', () => {
  it.each([true, false])('시연 여부 %s에서 회의실 채팅 클릭만 처리하고 여러 줄과 전송 내용을 보존한다', async (demoWorkspace) => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace } as never)
    const send = vi.fn()
    await act(async () => render(<Room send={send} />))
    const input = screen.getByPlaceholderText('메시지 입력...')
    fireEvent.click(input)
    expect(input).toHaveValue(demoWorkspace ? DEMO_TEXT.meeting : '')
    expect(input.tagName).toBe('TEXTAREA')
    expect(send).not.toHaveBeenCalled()
    if (demoWorkspace) {
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(send).toHaveBeenCalledWith(DEMO_TEXT.meeting)
    }
  })
})

describe('회의 기록 공통 제어', () => {
  it('요약 제목과 목록을 구분하고 리포트에서 할 일 정보와 선택 수를 표시한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace: false } as never)
    await act(async () => render(<Room send={vi.fn()} summary={'### 한눈에 보기\n- **결제 화면** 리뷰를 진행했다.\n\n### 결정 사항\n- 금요일에 배포한다.'} actions={[
      { title: '결제 화면 테스트', description: '실패 시나리오를 확인한다.', assigneeName: '박주승', dueDate: '2026-11-13' },
      { title: '배포 일정 확인' },
    ]} />))
    fireEvent.click(screen.getByRole('button', { name: 'AI 회의록' }))
    expect(screen.getByRole('heading', { name: '결정 사항' })).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('결제 화면', { selector: 'strong' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '요약 리포트 열기' }))
    expect(screen.getByText('실패 시나리오를 확인한다.')).toBeVisible()
    expect(screen.getByText('담당 박주승')).toBeVisible()
    expect(screen.getByText('마감 2026-11-13')).toBeVisible()
    const create = screen.getByRole('button', { name: /선택한 할 일 2개 칸반에 등록/ })
    expect(create).toBeEnabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /결제 화면 테스트/ }))
    expect(screen.getByRole('button', { name: /선택한 할 일 1개 칸반에 등록/ })).toBeEnabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /배포 일정 확인/ }))
    expect(screen.getByRole('button', { name: /선택한 할 일 0개 칸반에 등록/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '요약 리포트 닫기' }))
    expect(screen.getByRole('button', { name: '요약 리포트 열기' })).toBeVisible()
  })

  it('회의록 탭에서 새 채팅 배지와 접근성 알림을 표시하고 채팅을 열면 해제한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace: false } as never)
    const send = vi.fn()
    const view = render(<Room send={send} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'AI 회의록' }))
    const messages = Array.from({ length: 105 }, (_, index) => ({ messageId: index + 1, channelId: 1, senderId: 8, senderName: '박주승', content: `메시지 ${index + 1}` }))
    view.rerender(<Room send={send} messages={messages} />)
    expect(view.container.querySelector('.meeting-chat-unread-badge')).toHaveTextContent('99+')
    expect(screen.getByRole('status')).toHaveTextContent('읽지 않은 팀 채팅 105개')
    fireEvent.click(screen.getByRole('button', { name: '팀 채팅방' }))
    expect(view.container.querySelector('.meeting-chat-unread-badge')).toBeNull()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
  it('중간 문장을 교체하고 중지 후 저장 대기 문장도 지우지 않고 표시한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace: false } as never)
    const send = vi.fn()
    const view = render(<Room send={send} draft="확정된 회의 기록" interim="[오후 6:30] 박주승: 로그인" />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: '기록 시작' }))
    fireEvent.click(screen.getByRole('button', { name: /AI 회의록$/ }))
    const transcript = screen.getByRole('textbox')
    expect(transcript).toHaveValue('확정된 회의 기록\n[오후 6:30] 박주승: 로그인')
    expect(transcript).toHaveProperty('readOnly', true)
    Object.defineProperty(transcript, 'scrollHeight', { configurable: true, value: 600 })
    view.rerender(<Room send={send} draft="확정된 회의 기록" interim="[오후 6:30] 박주승: 로그인 기능 테스트" />)
    expect(transcript).toHaveValue('확정된 회의 기록\n[오후 6:30] 박주승: 로그인 기능 테스트')
    expect(transcript.scrollTop).toBe(600)
    fireEvent.click(screen.getByRole('button', { name: '기록 중지' }))
    expect(transcript).toHaveValue('확정된 회의 기록\n[오후 6:30] 박주승: 로그인 기능 테스트')
    expect(transcript).toHaveProperty('readOnly', true)
    expect(screen.getByRole('button', { name: 'AI 회의 핵심 요약 생성' })).toBeEnabled()
    view.rerender(<Room send={send} draft="확정된 회의 기록\n[오후 6:30] 박주승: 로그인 기능 테스트" />)
    expect(transcript).toHaveProperty('readOnly', false)
  })

  it('팀 채팅방에서 기록을 시작·중지하고 탭 전환 뒤에도 상태와 입력을 유지한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace: false } as never)
    await act(async () => render(<Room send={vi.fn()} />))
    const input = screen.getByPlaceholderText('메시지 입력...')
    fireEvent.change(input, { target: { value: '계속 작성 중인 회의 채팅' } })
    expect(screen.getAllByRole('button', { name: '기록 시작' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '기록 시작' }))
    expect(screen.getByRole('button', { name: '기록 중지' })).toBeVisible()
    expect(input).toHaveValue('계속 작성 중인 회의 채팅')
    fireEvent.click(screen.getByRole('button', { name: /AI 회의록$/ }))
    expect(screen.getAllByRole('button', { name: '기록 중지' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '기록 중지' }))
    fireEvent.click(screen.getByRole('button', { name: /팀 채팅방$/ }))
    expect(screen.getByPlaceholderText('메시지 입력...')).toHaveValue('계속 작성 중인 회의 채팅')
    fireEvent.click(screen.getByRole('button', { name: '기록 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '기록 중지' }))
    expect(screen.getByRole('button', { name: '기록 시작' })).toBeVisible()
  })

  it('저장 중에는 두 탭 모두에서 기록 버튼을 비활성화한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace: false } as never)
    await act(async () => render(<Room send={vi.fn()} saving />))
    const start = screen.getByRole('button', { name: '기록 시작' })
    expect(start).toBeDisabled()
    fireEvent.click(start)
    expect(screen.queryByRole('button', { name: '기록 중지' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /AI 회의록$/ }))
    expect(screen.getByRole('button', { name: '기록 시작' })).toBeDisabled()
  })
})
