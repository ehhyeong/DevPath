import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import MeetingVolumeSlider from './MeetingVolumeSlider'
import type { VoiceParticipant } from './meeting-types'
import type { MeetingAudioControls } from './useMeetingAudioControls'

export type ParticipantAudioMenuTarget = { participant: VoiceParticipant; x: number; y: number; trigger: HTMLElement }

export default function MeetingParticipantAudioMenu({ target, controls, onClose }: {
  target: ParticipantAudioMenuTarget; controls: MeetingAudioControls; onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { participant } = target
  const settings = controls.getParticipantAudio(participant.userId)
  useEffect(() => {
    menuRef.current?.querySelector<HTMLInputElement>('input[type="range"]')?.focus()
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) onClose()
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        target.trigger.focus()
      }
    }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape, true)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose, target])

  return createPortal(<div ref={menuRef} role="dialog" aria-label={`${participant.userName} 오디오 설정`} onContextMenu={(event) => event.preventDefault()} className="fixed z-[12000] w-64 space-y-4 rounded-xl border border-gray-600 bg-gray-800 p-4 text-white shadow-2xl" style={{ left: Math.max(8, Math.min(target.x, window.innerWidth - 264)), top: Math.max(8, Math.min(target.y, window.innerHeight - 280)) }}>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold">{participant.userName}</p><p className="mt-1 text-[11px] text-gray-400">내게 들리는 소리만 조절합니다.</p></div><button type="button" aria-label="참가자 오디오 설정 닫기" onClick={onClose} className="p-1! text-gray-400 hover:text-white"><i className="fas fa-times" aria-hidden="true" /></button></div>
    <MeetingVolumeSlider dark label="개인 음량" value={settings.volume} onChange={(volume) => controls.setParticipantAudio(participant.userId, { ...settings, volume })} />
    <button type="button" aria-pressed={settings.muted} onClick={() => controls.setParticipantAudio(participant.userId, { ...settings, muted: !settings.muted })} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs! font-bold ${settings.muted ? 'bg-red-500/15 text-red-300' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}><i className={`fas ${settings.muted ? 'fa-volume-mute' : 'fa-volume-up'}`} aria-hidden="true" />내게만 음소거{settings.muted ? ' 해제' : ''}</button>
    <button type="button" onClick={() => controls.setParticipantAudio(participant.userId, { volume: 100, muted: false })} className="w-full text-xs! text-gray-400 hover:text-white">개인 음량 초기화</button>
  </div>, document.fullscreenElement ?? document.body)
}
