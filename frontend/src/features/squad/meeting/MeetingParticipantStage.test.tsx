import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MeetingParticipantStage from './MeetingParticipantStage'
import type { VoiceParticipant } from './meeting-types'

vi.mock('./meeting-media-stream-video', () => ({ MediaStreamVideo: ({ stream }: { stream: MediaStream }) => <video data-testid="media-video" data-stream-id={stream.id} /> }))

const participants: VoiceParticipant[] = [
  { participantId: 2, channelId: 301, userId: 79, userName: '두 번째', active: true, muted: false, speaking: true, handRaised: false, joinedAt: '2026-10-06T10:01:00Z' },
  { participantId: 1, channelId: 301, userId: 77, userName: '첫 번째', active: true, muted: false, speaking: false, handRaised: false, joinedAt: '2026-10-06T10:00:00Z' },
]
const props = { participants, members: [], currentUserId: 77, getCamera: () => null, screenShares: [], onFullscreenShare: vi.fn() }

describe('회의 참가자 카드', () => {
  it('입장 순서대로 실제 인원만 표시하고 자동 발표 화면을 만들지 않는다', () => {
    const { container, rerender } = render(<MeetingParticipantStage {...props} participants={[participants[1]]} />)
    expect(container.querySelectorAll('.meeting-participant-card')).toHaveLength(1)
    expect(screen.queryByText('내 화면에서만 크게 보고 있습니다.')).not.toBeInTheDocument()
    rerender(<MeetingParticipantStage {...props} />)
    expect([...container.querySelectorAll('.meeting-participant-card')].map((card) => card.getAttribute('data-participant-id'))).toEqual(['1', '2'])
  })

  it('확대는 해당 뷰에만 적용되고 복귀하면 전체 참가자를 표시한다', () => {
    const first = render(<MeetingParticipantStage {...props} />)
    const second = render(<MeetingParticipantStage {...props} />)
    fireEvent.click(within(first.container).getByRole('button', { name: '첫 번째 (나) 크게 보기' }))
    expect(first.container.querySelector('.meeting-focused-card')).not.toBeNull()
    expect(second.container.querySelector('.meeting-focused-card')).toBeNull()
    expect(second.container.querySelectorAll('.meeting-participant-card')).toHaveLength(2)
    fireEvent.click(within(first.container).getByRole('button', { name: /전체 참가자 보기/ }))
    expect(first.container.querySelectorAll('.meeting-participant-card')).toHaveLength(2)
  })

  it('같은 참가자 카드에서 공유를 우선 표시하고 종료하면 카메라로 복귀한다', () => {
    const cameraStream = { id: 'camera-stream' } as MediaStream
    const shareStream = { id: 'share-stream' } as MediaStream
    const mediaProps = { ...props, getCamera: (participant: VoiceParticipant) => participant.userId === 77 ? { userId: 77, userName: '첫 번째', local: true, stream: cameraStream } : null, screenShares: [{ userId: 77, userName: '첫 번째', local: true, stream: shareStream }] }
    const { container, rerender } = render(<MeetingParticipantStage {...mediaProps} screenShares={[]} />)
    const card = container.querySelector('.meeting-participant-card')
    rerender(<MeetingParticipantStage {...mediaProps} />)
    expect(container.querySelector('.meeting-participant-card')).toBe(card)
    expect([...container.querySelectorAll('.meeting-participant-card')].map((card) => card.getAttribute('data-media-kind'))).toEqual(['screen', 'camera'])
    expect(screen.getAllByTestId('media-video')).toHaveLength(1)
    expect(screen.getByTestId('media-video')).toHaveAttribute('data-stream-id', 'share-stream')
    fireEvent.click(screen.getByRole('button', { name: '첫 번째 (나) 화면 공유 전체화면으로 보기' }))
    expect(props.onFullscreenShare).toHaveBeenCalledWith(77)
    fireEvent.click(screen.getByRole('button', { name: '첫 번째 (나) 화면 공유 크게 보기' }))
    expect(container.querySelector('.meeting-focused-card')).not.toBeNull()
    rerender(<MeetingParticipantStage {...mediaProps} screenShares={[]} />)
    expect(screen.getByTestId('media-video')).toHaveAttribute('data-stream-id', 'camera-stream')
    fireEvent.click(screen.getByRole('button', { name: /전체 참가자 보기/ }))
    expect(container.querySelectorAll('.meeting-participant-card')).toHaveLength(2)
    rerender(<MeetingParticipantStage {...mediaProps} />)
    expect(container.querySelector('.meeting-focused-card')).toBeNull()
    expect(container.querySelectorAll('.meeting-participant-card')).toHaveLength(2)
  })

  it('카메라가 없는 원격 참가자도 공유 종료 후 같은 카드의 프로필로 복귀한다', () => {
    const { container, rerender } = render(<MeetingParticipantStage {...props} screenShares={[{ userId: 79, userName: '두 번째', local: false, stream: { id: 'remote-share' } as MediaStream }]} />)
    const card = container.querySelector('[data-participant-id="2"]')
    expect(container.querySelectorAll('.meeting-participant-card')).toHaveLength(2)
    expect(screen.getByTestId('media-video')).toHaveAttribute('data-stream-id', 'remote-share')
    rerender(<MeetingParticipantStage {...props} />)
    expect(container.querySelector('[data-participant-id="2"]')).toBe(card)
    expect(screen.queryByTestId('media-video')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: '두 번째 default profile' })).toBeInTheDocument()
  })
})
