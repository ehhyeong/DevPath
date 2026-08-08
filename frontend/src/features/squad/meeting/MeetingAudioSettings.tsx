import type { SquadMeetingViewModel } from './useSquadMeetingController'
import { showAuthToast } from '../../../lib/auth-toast'

type Props = { model: SquadMeetingViewModel }

function AudioProcessingBadge({ label, enabled }: { label: string; enabled: boolean | null }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${enabled === true ? 'border-green-100 bg-green-50 text-green-700' : enabled === false ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-yellow-100 bg-yellow-50 text-yellow-700'}`}>
      <i className={`fas ${enabled === true ? 'fa-check' : enabled === false ? 'fa-minus' : 'fa-spinner fa-spin'} text-[9px]`}></i>
      {label} {enabled === true ? '켜짐' : enabled === false ? '꺼짐' : '확인 중'}
    </span>
  )
}

export default function MeetingAudioSettings({ model }: Props) {
  const { audioSettingsOpen, setAudioSettingsOpen, audioInputs, audioOutputs, selectedInputId, setSelectedInputId, selectedOutputId, setSelectedOutputId, audioDeviceError, setAudioDeviceError, audioProcessingStatus, micLevel, speakerLevel, micTesting, soundTesting, localVoiceStreamRef, remoteAudioContainerRef, loadAudioDevices, replaceLocalVoiceInput, toggleMicTest, playSoundTest, startMicMonitor } = model
  return (
    <>
      {audioSettingsOpen ? (
        <div className="squad-meeting-audio-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
          <div className="squad-meeting-audio-panel w-[min(448px,calc(100vw-32px))]! max-w-[448px]! animate-[modalScaleIn_0.2s_ease-out_forwards] overflow-hidden rounded-[16px]! bg-white shadow-2xl">
            <div className="squad-meeting-audio-header flex h-[69px]! items-center justify-between border-b border-gray-100 bg-gray-50 p-[20px]!">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-sliders-h text-brand"></i> 오디오 설정
              </h3>
              <button
                type="button"
                onClick={() => setAudioSettingsOpen(false)}
                className="squad-meeting-audio-close h-[28px]! w-[20px]! flex-[0_0_20px] p-0! leading-[28px]! text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="squad-meeting-audio-body p-[24px]! [&>*+*]:mt-[24px]!">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">마이크 (입력)</label>
                <select
                  value={selectedInputId}
                  onChange={(event) => setSelectedInputId(event.target.value)}
                  className="squad-meeting-audio-select mb-3 h-[46px]! w-full cursor-pointer rounded-[12px]! border border-gray-200 bg-white px-[16px]! py-0! text-[14px]! leading-[20px]! font-medium shadow-sm outline-none transition focus:border-brand"
                >
                  {audioInputs.map((option) => (
                    <option key={option.deviceId} value={option.deviceId}>{option.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void toggleMicTest()}
                    className={`squad-meeting-audio-test-button h-[34px]! w-[112px]! shrink-0 whitespace-nowrap rounded-[8px]! border px-[16px]! py-0! text-[12px]! leading-[16px]! font-bold transition ${
                      micTesting
                        ? 'bg-green-50 border-green-200 text-brand hover:bg-green-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {micTesting ? '테스트 중지' : '마이크 테스트'}
                  </button>
                  <div className={`flex-1 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner relative ${micLevel > 0 || micTesting ? 'audio-testing' : ''}`}>
                    <div className={`audio-meter-bar h-full w-0 bg-brand [transition:width_0.1s_ease-out] ${micLevel > 0 || micTesting ? '[animation:squadMeetingMeterBounce_0.5s_infinite_alternate_ease-in-out]' : ''}`} style={{ width: `${micLevel}%` }}></div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <AudioProcessingBadge label="에코 제거" enabled={audioProcessingStatus.echoCancellation} />
                  <AudioProcessingBadge label="잡음 억제" enabled={audioProcessingStatus.noiseSuppression} />
                  <AudioProcessingBadge label="자동 게인" enabled={audioProcessingStatus.autoGainControl} />
                  <AudioProcessingBadge label="노이즈 게이트" enabled={audioProcessingStatus.noiseGate} />
                </div>
                <p className="mt-2 text-[11px] font-bold text-gray-400">
                  브라우저가 지원하는 항목만 실제로 켜집니다.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">스피커 (출력)</label>
                <select
                  value={selectedOutputId}
                  onChange={(event) => setSelectedOutputId(event.target.value)}
                  className="squad-meeting-audio-select mb-3 h-[46px]! w-full cursor-pointer rounded-[12px]! border border-gray-200 bg-white px-[16px]! py-0! text-[14px]! leading-[20px]! font-medium shadow-sm outline-none transition focus:border-brand"
                >
                  {audioOutputs.map((option) => (
                    <option key={option.deviceId} value={option.deviceId}>{option.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void playSoundTest()}
                    className="squad-meeting-audio-sound-button flex h-[34px]! w-[122px]! shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px]! border border-blue-200 bg-blue-50 px-[16px]! py-0! text-[12px]! leading-[16px]! font-bold text-blue-600 transition hover:bg-blue-100 disabled:opacity-60"
                  >
                    <i className={`fas ${soundTesting ? 'fa-stop' : 'fa-play'} text-[10px]`}></i>
                    {soundTesting ? '테스트 중지' : '사운드 테스트'}
                  </button>
                  <div className={`flex-1 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner relative ${soundTesting ? 'audio-testing' : ''}`}>
                    <div className={`audio-meter-bar h-full w-0 bg-blue-500 [transition:width_0.1s_ease-out] ${soundTesting ? '[animation:squadMeetingMeterBounce_0.5s_infinite_alternate_ease-in-out]' : ''}`} style={{ width: `${speakerLevel}%` }}></div>
                  </div>
                </div>
              </div>
              {audioDeviceError ? (
                <p className="sr-only" role="status">{audioDeviceError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void loadAudioDevices(true).then(() => startMicMonitor(selectedInputId))}
                className="squad-meeting-device-refresh-button flex h-[38px]! w-full items-center justify-center gap-2 rounded-[12px]! border border-gray-200 bg-white px-[16px]! py-0! text-[12px]! leading-[16px]! font-bold text-gray-700 transition hover:border-brand hover:text-brand"
              >
                <i className="fas fa-sync-alt"></i> 장치 다시 검색
              </button>
            </div>
            <div className="squad-meeting-audio-footer flex h-[73px]! justify-end gap-2 border-t border-gray-100 bg-gray-50 p-[20px]!">
              <button
                type="button"
                onClick={() => setAudioSettingsOpen(false)}
                className="squad-meeting-audio-cancel h-[36px]! rounded-[12px]! border border-gray-200 bg-white px-5 pt-0! pb-0! text-[14px]! leading-[20px]! font-bold text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudioSettingsOpen(false)
                  if (localVoiceStreamRef.current) {
                    void replaceLocalVoiceInput().catch(() => {
                      setAudioDeviceError('음성 회의 마이크 입력 장치를 변경하지 못했습니다.')
                    })
                  }
                  showAuthToast({ message: '오디오 설정을 적용했습니다.', durationMs: 1600 })
                }}
                className="squad-meeting-audio-apply h-[36px]! rounded-[12px]! bg-gray-900 px-6 pt-0! pb-0! text-[14px]! leading-[20px]! font-bold text-white shadow-md transition hover:bg-black"
              >
                설정 적용
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={remoteAudioContainerRef} className="hidden" aria-hidden="true"></div>
    </>
  )
}
