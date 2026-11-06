import { fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useRef, useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import MeetingParticipantAudioMenu, { type ParticipantAudioMenuTarget } from './MeetingParticipantAudioMenu'
import { useMeetingAudioControls } from './useMeetingAudioControls'
import type { VoiceParticipant } from './meeting-types'

const participant = { participantId: 2, userId: 8, userName: '박주승' } as VoiceParticipant
function Harness() {
  const controls = useMeetingAudioControls(7, useRef(false))
  const [target, setTarget] = useState<ParticipantAudioMenuTarget | null>(null)
  const close = useCallback(() => setTarget(null), [])
  return <><button onClick={(event) => setTarget({ participant, x: 100, y: 100, trigger: event.currentTarget })}>타일 설정</button><span data-testid="preferences">{JSON.stringify(controls.participants)}</span>{target ? <MeetingParticipantAudioMenu target={target} controls={controls} onClose={close} /> : null}</>
}

beforeEach(() => localStorage.clear())

describe('참가자별 오디오 메뉴', () => {
  it('숫자로 세밀하게 음량을 조절하고 개인 음소거·초기화를 반영한다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '타일 설정' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: '개인 음량 수치' }), { target: { value: '163' } })
    expect(screen.getByRole('slider', { name: '개인 음량' })).toHaveValue('163')
    fireEvent.click(screen.getByRole('button', { name: '내게만 음소거' }))
    expect(screen.getByTestId('preferences')).toHaveTextContent('"volume":163,"muted":true')
    fireEvent.click(screen.getByRole('button', { name: '개인 음량 초기화' }))
    expect(screen.getByRole('slider', { name: '개인 음량' })).toHaveValue('100')
    expect(screen.getByRole('button', { name: '내게만 음소거' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('Escape와 메뉴 밖 클릭으로 닫힌다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '타일 설정' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '타일 설정' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: '타일 설정' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
