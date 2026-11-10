import { useEffect,useRef,useState,type Dispatch,type SetStateAction } from 'react'
import type { AuthSession } from '../../../types/auth'
import { showAuthToast } from '../../../lib/auth-toast'
import { createSquadNotification,squadActorName } from '../notifications'
import { appendSquadVoiceMinutesTranscriptLine,clearSquadVoiceChatMessages,createSquadVoiceEvent,createSquadVoiceMinutesKanbanTasks,createSquadVoiceMinutesSummary,fetchSquadVoiceChatMessages,fetchSquadVoiceMinutes,sendSquadVoiceChatMessage,updateSquadVoiceMinutes } from './meeting-api'
import { combineMinutesTranscript,normalizeVoiceMeetingSummaryResponse,useLatest } from './meeting-support'
import type { RoomPanelTab,SpeechRecognitionLike,VoiceChannel,VoiceChatMessage,VoiceEventType,VoiceMeetingActionItem,VoiceMeetingMinutes,VoiceMeetingSyncPayload,WindowWithSpeechRecognition } from './meeting-types'

type MeetingMinutesOptions = {
  workspaceId: number | null
  activeChannel: VoiceChannel | null
  isJoined: boolean
  isMuted: boolean
  session: AuthSession | null
  broadcastMeetingSync: (type: 'chat-message' | 'minutes-updated', payload: VoiceMeetingSyncPayload) => void
  setRoomPanelTab: Dispatch<SetStateAction<RoomPanelTab>>
}

export function useSquadMeetingMinutes({ workspaceId,activeChannel,isJoined,isMuted,session,broadcastMeetingSync,setRoomPanelTab }: MeetingMinutesOptions) {
  const [voiceChatMessages, setVoiceChatMessages] = useState<VoiceChatMessage[]>([])
  const [voiceChatChannelId, setVoiceChatChannelId] = useState<number | null>(null)
  const [voiceChatInput, setVoiceChatInput] = useState('')
  const [voiceMinutes, setVoiceMinutes] = useState<VoiceMeetingMinutes | null>(null)
  const [minutesDraft, setMinutesDraft] = useState('')
  const [transcriptPreviews, setTranscriptPreviews] = useState<Record<number, string>>({})
  const localTranscriptPreviewRef = useRef('')
  const localInterimTextRef = useRef('')
  const pendingTranscriptLinesRef = useRef<Array<{ text: string; line: string }>>([])
  const transcriptSaveQueueRef = useRef<Promise<void> | null>(null)
  const latestMinutesRef = useRef<VoiceMeetingMinutes | null>(null)
  const minutesUpdateEpochRef = useRef(0)
  const [minutesActionItems, setMinutesActionItems] = useState<VoiceMeetingActionItem[]>([])
  const [selectedMinutesActionItems, setSelectedMinutesActionItems] = useState<number[]>([])
  const [minutesSummaryReportOpen, setMinutesSummaryReportOpen] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [chatClearing, setChatClearing] = useState(false)
  const [minutesSaving, setMinutesSaving] = useState(false)
  const [kanbanTaskCreating, setKanbanTaskCreating] = useState(false)
  const [speechRecognitionActive, setSpeechRecognitionActive] = useState(false)
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speechRecognitionRestartRef = useRef(false)
  const recognitionStoppingRef = useRef(false)
  const restartAfterStopRef = useRef(false)
  const stopRecognitionRef = useRef<(() => void) | null>(null)
  const minutesTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const minutesAppendErrorShownRef = useRef(false)

async function fetchVoiceChatMessages(channelId: number) {
    return fetchSquadVoiceChatMessages(channelId)
  }

async function fetchVoiceMinutes(channelId: number) {
    return fetchSquadVoiceMinutes(channelId)
  }

function appendVoiceChatMessage(message: VoiceChatMessage) {
    setVoiceChatMessages((current) => {
      if (current.some((item) => item.messageId === message.messageId)) {
        return current
      }

      return [...current, message]
    })
  }

function applyVoiceMinutes(minutes: VoiceMeetingMinutes, syncDraft = false) {
    latestMinutesRef.current = minutes
    minutesUpdateEpochRef.current += 1
    setVoiceMinutes(minutes)

    if (syncDraft || shouldSyncMinutesDraftFromServer()) {
      setMinutesDraft(combineMinutesTranscript(minutes.transcript ?? '', pendingTranscriptLinesRef.current.map(item => item.line).join('\n')))
    }
  }

async function refreshVoiceMeetingPanel(channelId = activeChannel?.channelId, syncDraft = false) {
    if (!channelId) {
      return
    }

    const epoch = minutesUpdateEpochRef.current
    const [messages, minutes] = await Promise.all([
      fetchVoiceChatMessages(channelId),
      fetchVoiceMinutes(channelId),
    ])

    setVoiceChatMessages(messages)
    setVoiceChatChannelId(channelId)
    if (epoch === minutesUpdateEpochRef.current) applyVoiceMinutes(minutes, syncDraft)
  }

function voiceEventLabel(type: VoiceEventType) {
    if (type === 'MUTE') return '마이크를 음소거했습니다.'
    if (type === 'UNMUTE') return '마이크 음소거를 해제했습니다.'
    if (type === 'SPEAKING') return '발언을 시작했습니다.'
    return '발언을 종료했습니다.'
  }

async function createVoiceEvent(type: VoiceEventType, memo: string) {
    if (!activeChannel) {
      return
    }

    await createSquadVoiceEvent(activeChannel.channelId, type, memo)
  }

function getSpeechRecognitionConstructor() {
    const browserWindow = window as WindowWithSpeechRecognition

    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
  }

function shouldSyncMinutesDraftFromServer() {
    return Boolean(latestMinutesRef.current?.recording) || document.activeElement !== minutesTextareaRef.current
  }

function formatLocalTranscriptLine(text: string) {
    const time = new Date().toLocaleTimeString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const speakerName = session?.name?.trim() || '나'

    return `[${time}] ${speakerName}: ${text}`
  }

function appendMinutesTranscript(text: string) {
    const transcript = text.trim()

    if (!transcript) {
      return
    }

    const optimisticLine = formatLocalTranscriptLine(transcript)

    setMinutesDraft((current) => {
      if (!current.trim()) {
        return optimisticLine
      }

      return `${current.trimEnd()}\n${optimisticLine}`
    })

    const pending = { text: transcript, line: optimisticLine }
    pendingTranscriptLinesRef.current.push(pending)
    const previous = transcriptSaveQueueRef.current
    const save = async () => {
      if (previous) await previous
      await appendMinutesTranscriptToServer(pending)
    }
    const saving = save()
    transcriptSaveQueueRef.current = saving
    void saving.finally(() => {
      if (transcriptSaveQueueRef.current === saving) transcriptSaveQueueRef.current = null
    })
  }

function applyTranscriptPreview(userId: number, preview: string) {
    setTranscriptPreviews((current) => {
      const next = { ...current }
      if (preview) next[userId] = preview
      else delete next[userId]
      return next
    })
  }

function updateLocalTranscriptPreview(text: string) {
    localInterimTextRef.current = text.trim()
    const preview = text.trim() ? formatLocalTranscriptLine(text.trim()) : ''
    if (session?.userId != null) applyTranscriptPreview(session.userId, preview)
    const sharedPreview = [...pendingTranscriptLinesRef.current.map(item => item.line), preview].filter(Boolean).join('\n')
    if (sharedPreview === localTranscriptPreviewRef.current) return
    localTranscriptPreviewRef.current = sharedPreview
    // 확정됐어도 저장 응답 전에는 다른 참여자의 화면/요약에서 문장을 빼지 않는다.
    broadcastMeetingSync('minutes-updated', { transcriptPreview: sharedPreview })
  }

async function appendMinutesTranscriptToServer(pending: { text: string; line: string }) {
    if (!activeChannel) {
      return
    }

    try {
      const epoch = minutesUpdateEpochRef.current
      const minutes = await appendSquadVoiceMinutesTranscriptLine(activeChannel.channelId, pending.text)

      pendingTranscriptLinesRef.current = pendingTranscriptLinesRef.current.filter(item => item !== pending)
      minutesAppendErrorShownRef.current = false
      const latest = latestMinutesRef.current
      const next = epoch !== minutesUpdateEpochRef.current && latest
        ? { ...minutes, recording: latest.recording, transcript: (latest.transcript ?? '').startsWith(minutes.transcript ?? '') ? latest.transcript : minutes.transcript }
        : minutes
      applyVoiceMinutes(next)
      const preview = [...pendingTranscriptLinesRef.current.map(item => item.line), localInterimTextRef.current ? formatLocalTranscriptLine(localInterimTextRef.current) : ''].filter(Boolean).join('\n')
      localTranscriptPreviewRef.current = preview
      broadcastMeetingSync('minutes-updated', { minutes: next, transcriptPreview: preview })
    } catch {
      if (!minutesAppendErrorShownRef.current) {
        minutesAppendErrorShownRef.current = true
        showAuthToast({ message: '자동 기록을 회의록에 붙이지 못했습니다.', durationMs: 2200 })
      }
    }
  }

function startMinutesSpeechRecognition() {
    if (isMuted) {
      stopMinutesSpeechRecognition()
      return false
    }

    const SpeechRecognition = getSpeechRecognitionConstructor()

    if (!SpeechRecognition) {
      showAuthToast({ message: '이 브라우저에서는 음성 자동 기록을 지원하지 않습니다.', durationMs: 2200 })
      return false
    }

    if (speechRecognitionRef.current) return true

    try {
      const recognition = new SpeechRecognition()

      recognition.lang = 'ko-KR'
      recognition.continuous = true
      recognition.interimResults = true
      let finished = false
      let stopTimeout: number | undefined
      const finishRecognition = () => {
        if (finished) return
        finished = true
        window.clearTimeout(stopTimeout)
        // 일부 브라우저가 final 없이 끝나도 마지막으로 보여 준 발화는 한 번 보존한다.
        if (localInterimTextRef.current) appendMinutesTranscript(localInterimTextRef.current)
        updateLocalTranscriptPreview('')
        recognition.onresult = null
        recognition.onend = null
        recognition.onerror = null
        const restart = speechRecognitionRestartRef.current || restartAfterStopRef.current
        if (speechRecognitionRef.current === recognition) {
          speechRecognitionRef.current = null
          stopRecognitionRef.current = null
          recognitionStoppingRef.current = false
        }
        setSpeechRecognitionActive(false)
        if (restart) window.setTimeout(() => {
          if (shouldRecognizeRef.current && !speechRecognitionRef.current) startMinutesSpeechRecognitionRef.current()
        }, 300)
      }
      recognition.onresult = (event) => {
        const interimParts: string[] = []
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index]

          if (result?.isFinal) {
            if (index >= event.resultIndex) appendMinutesTranscript(result[0]?.transcript ?? '')
          } else if (result) {
            interimParts.push(result[0]?.transcript ?? '')
          }
        }
        updateLocalTranscriptPreview(interimParts.join(' '))
      }
      recognition.onerror = finishRecognition
      recognition.onend = finishRecognition
      stopRecognitionRef.current = () => {
        if (recognitionStoppingRef.current) return
        recognitionStoppingRef.current = true
        setSpeechRecognitionActive(false)
        // end 이벤트가 오지 않아도 종료 대기를 계속하지 않고 2초 뒤 마지막 표시 문장을 보존한다.
        stopTimeout = window.setTimeout(() => {
          try { recognition.abort() } finally { finishRecognition() }
        }, 2000)
        try { recognition.stop() } catch {
          try { recognition.abort() } finally { finishRecognition() }
        }
      }

      speechRecognitionRef.current = recognition
      speechRecognitionRestartRef.current = true
      recognition.start()
      setSpeechRecognitionActive(true)
      return true
    } catch {
      speechRecognitionRestartRef.current = false
      speechRecognitionRef.current = null
      setSpeechRecognitionActive(false)
      showAuthToast({ message: '음성 기록을 시작하지 못했습니다.', durationMs: 2200 })
      return false
    }
  }

function stopMinutesSpeechRecognition() {
    speechRecognitionRestartRef.current = false
    restartAfterStopRef.current = false
    stopRecognitionRef.current?.()
  }

async function sendVoiceChatMessage() {
    if (!activeChannel) {
      return
    }

    const content = voiceChatInput.trim()

    if (!content) {
      return
    }

    setChatSending(true)

    try {
      const message = await sendSquadVoiceChatMessage(activeChannel.channelId, content)

      setVoiceChatInput('')
      appendVoiceChatMessage(message)
      broadcastMeetingSync('chat-message', { chatMessage: message })
      void refreshVoiceMeetingPanel(activeChannel.channelId).catch(() => undefined)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의 채팅에 메시지를 보냈습니다.`,
        targetPath: '/squad-meeting',
      })
    } catch (chatError) {
      showAuthToast({
        message: chatError instanceof Error ? chatError.message : '회의 채팅을 보내지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setChatSending(false)
    }
  }

async function clearVoiceChatMessages() {
    if (!activeChannel || chatClearing) {
      return
    }

    setChatClearing(true)

    try {
      await clearSquadVoiceChatMessages(activeChannel.channelId)
      setVoiceChatMessages([])
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의 채팅 기록을 비웠습니다.`,
        targetPath: '/squad-meeting',
      })
      showAuthToast({
        message: '내 화면의 이전 회의 채팅을 지웠습니다. 다른 팀원에게는 그대로 보입니다.',
        durationMs: 2200,
      })
    } catch (clearError) {
      showAuthToast({
        message: clearError instanceof Error ? clearError.message : '회의 채팅 기록을 지우지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setChatClearing(false)
    }
  }

async function updateVoiceMinutes(payload: Partial<VoiceMeetingMinutes>, syncDraft = false) {
    if (!activeChannel) {
      return false
    }

    setMinutesSaving(true)

    try {
      const epoch = minutesUpdateEpochRef.current
      const minutes = await updateSquadVoiceMinutes(activeChannel.channelId, payload)
      const latest = latestMinutesRef.current
      const transcript = latest?.transcript ?? ''
      const next = epoch !== minutesUpdateEpochRef.current && payload.transcript === undefined && transcript.startsWith(minutes.transcript ?? '')
        ? { ...minutes, transcript }
        : minutes
      applyVoiceMinutes(next, syncDraft)
      broadcastMeetingSync('minutes-updated', { minutes: next })

      return true
    } catch (minutesError) {
      showAuthToast({
        message: minutesError instanceof Error ? minutesError.message : '회의록을 저장하지 못했습니다.',
        durationMs: 2200,
      })
      return false
    } finally {
      setMinutesSaving(false)
    }
  }

async function toggleMinutesRecording() {
    const nextRecording = !(voiceMinutes?.recording ?? false)
    const updated = await updateVoiceMinutes({ recording: nextRecording })

    if (!updated) {
      return
    }

    if (!nextRecording) {
      stopMinutesSpeechRecognition()
    }
    void createSquadNotification(workspaceId, {
      pageKey: 'squad-meeting',
      message: `${squadActorName(session?.name)}님이 "${activeChannel?.name ?? '음성 회의'}" 회의록 녹음을 ${nextRecording ? '시작' : '종료'}했습니다.`,
      targetPath: '/squad-meeting',
    })
  }

async function saveMinutesDraft(showSavedToast = true) {
    if (await updateVoiceMinutes({ transcript: minutesDraft }, true)) {
      if (showSavedToast) {
        void createSquadNotification(workspaceId, {
          pageKey: 'squad-meeting',
          message: `${squadActorName(session?.name)}님이 "${activeChannel?.name ?? '음성 회의'}" 회의록을 저장했습니다.`,
          targetPath: '/squad-meeting',
        })
      }
      if (showSavedToast) {
        showAuthToast({ message: '회의록이 저장되었습니다.', durationMs: 1600 })
      }
    }
  }

function toggleMinutesActionItem(index: number) {
    setSelectedMinutesActionItems((current) => {
      if (current.includes(index)) {
        return current.filter((itemIndex) => itemIndex !== index)
      }

      return [...current, index]
    })
  }

async function generateMinutesSummary() {
    if (!activeChannel) {
      return
    }

    const transcriptSnapshot = combineMinutesTranscript(minutesDraft, Object.values(transcriptPreviews).join('\n'))
    setMinutesSaving(true)

    try {
      const response = await createSquadVoiceMinutesSummary(activeChannel.channelId, transcriptSnapshot)

      const analysis = normalizeVoiceMeetingSummaryResponse(response)
      const minutes = analysis.minutes
      const actionItems = analysis.actionItems ?? []

      if (!minutes?.channelId) {
        throw new Error('회의 요약 응답을 읽지 못했습니다.')
      }

      const current = latestMinutesRef.current ?? minutes
      minutesUpdateEpochRef.current += 1
      latestMinutesRef.current = { ...current, summary: minutes.summary }
      setVoiceMinutes(latestMinutesRef.current)
      // 요약 중 도착한 원문을 옛 응답으로 되돌리지 않고 상대 화면은 최신 원문을 재조회한다.
      broadcastMeetingSync('minutes-updated', {})
      setMinutesActionItems(actionItems)
      setSelectedMinutesActionItems(actionItems.map((_, index) => index))
      setMinutesSummaryReportOpen(true)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의록 요약을 생성했습니다.`,
        targetPath: '/squad-meeting',
      })
    } catch (summaryError) {
      showAuthToast({
        message: summaryError instanceof Error ? summaryError.message : '회의 요약을 만들지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setMinutesSaving(false)
    }
  }

async function createKanbanTasksFromMinutes() {
    if (!activeChannel || kanbanTaskCreating) {
      return
    }

    const actionItems = minutesActionItems.filter((_, index) =>
      selectedMinutesActionItems.includes(index),
    )

    if (actionItems.length === 0) {
      showAuthToast({ message: '칸반에 등록할 할 일을 선택해 주세요.', durationMs: 1800 })
      return
    }

    setKanbanTaskCreating(true)

    try {
      const result = await createSquadVoiceMinutesKanbanTasks(activeChannel.channelId, actionItems)

      showAuthToast({
        message: `${result.tasks.length}개의 할 일을 칸반 보드에 등록했습니다.`,
        durationMs: 2200,
      })
      setMinutesSummaryReportOpen(false)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의록에서 칸반 작업 ${result.tasks.length}개를 만들었습니다.`,
        targetPath: '/squad-workspace',
      })
    } catch (taskError) {
      showAuthToast({
        message: taskError instanceof Error ? taskError.message : '칸반 보드에 할 일을 등록하지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setKanbanTaskCreating(false)
    }
  }

  const startMinutesSpeechRecognitionRef = useLatest(startMinutesSpeechRecognition)
  const stopMinutesSpeechRecognitionRef = useLatest(stopMinutesSpeechRecognition)
  const applyVoiceMinutesRef = useLatest(applyVoiceMinutes)
  const shouldRecognizeRef = useLatest(Boolean(isJoined && voiceMinutes?.recording && !isMuted))

useEffect(() => {
    if (!isJoined) {
      stopMinutesSpeechRecognitionRef.current()
    }
  }, [isJoined, stopMinutesSpeechRecognitionRef])

useEffect(() => {
    if (!isJoined || !voiceMinutes?.recording || isMuted) {
      stopMinutesSpeechRecognitionRef.current()
      return
    }

    if (!speechRecognitionRef.current) {
      startMinutesSpeechRecognitionRef.current()
    } else if (recognitionStoppingRef.current) {
      restartAfterStopRef.current = true
    }
  }, [activeChannel?.channelId, isJoined, isMuted, startMinutesSpeechRecognitionRef, stopMinutesSpeechRecognitionRef, voiceMinutes?.recording])

useEffect(() => {
    if (!activeChannel?.channelId || !isJoined || !session?.accessToken) {
      setVoiceChatMessages([])
      setVoiceChatChannelId(null)
      setVoiceChatInput('')
      setVoiceMinutes(null)
      setMinutesDraft('')
      setMinutesActionItems([])
      setSelectedMinutesActionItems([])
      setMinutesSummaryReportOpen(false)
      setRoomPanelTab('minutes')
      return
    }

    const channelId = activeChannel.channelId
    let stopped = false

    async function syncMeetingPanel() {
      try {
        const epoch = minutesUpdateEpochRef.current
        const [messages, minutes] = await Promise.all([
          fetchVoiceChatMessages(channelId),
          fetchVoiceMinutes(channelId),
        ])

        if (stopped) {
          return
        }

        setVoiceChatMessages(messages)
        setVoiceChatChannelId(channelId)
        if (epoch === minutesUpdateEpochRef.current) applyVoiceMinutesRef.current(minutes)
      } catch {
        // The call itself should stay usable even if the side panel refresh misses once.
      }
    }

    async function syncRoomPanel() {
      try {
        const epoch = minutesUpdateEpochRef.current
        const [messages, minutes] = await Promise.all([
          fetchVoiceChatMessages(channelId),
          fetchVoiceMinutes(channelId),
        ])

        if (stopped) {
          return
        }

        setVoiceChatMessages(messages)
        setVoiceChatChannelId(channelId)
        if (epoch === minutesUpdateEpochRef.current) applyVoiceMinutesRef.current(minutes)
      } catch {
        // Room panel polling is a convenience layer.
      }
    }

    void syncMeetingPanel()
    const refreshId = window.setInterval(() => {
      void syncRoomPanel()
    }, 4000)

    return () => {
      stopped = true
      window.clearInterval(refreshId)
    }
  }, [activeChannel?.channelId, isJoined, session?.accessToken, setRoomPanelTab, applyVoiceMinutesRef])

  return {
    voiceChatLoaded: voiceChatChannelId === activeChannel?.channelId,
    voiceChatMessages,voiceChatInput,setVoiceChatInput,voiceMinutes,minutesDraft,setMinutesDraft,
    minutesTranscriptPending: Boolean(Object.values(transcriptPreviews).some(Boolean) || pendingTranscriptLinesRef.current.length),
    minutesInterimTranscript: Object.values(transcriptPreviews).join('\n'),applyTranscriptPreview,
    minutesActionItems,selectedMinutesActionItems,minutesSummaryReportOpen,setMinutesSummaryReportOpen,
    chatSending,chatClearing,minutesSaving,kanbanTaskCreating,speechRecognitionActive,minutesTextareaRef,
    appendVoiceChatMessage,applyVoiceMinutes,refreshVoiceMeetingPanel,voiceEventLabel,createVoiceEvent,
    shouldSyncMinutesDraftFromServer,startMinutesSpeechRecognition,stopMinutesSpeechRecognition,
    sendVoiceChatMessage,clearVoiceChatMessages,toggleMinutesRecording,saveMinutesDraft,
    toggleMinutesActionItem,generateMinutesSummary,createKanbanTasksFromMinutes,
  }
}
