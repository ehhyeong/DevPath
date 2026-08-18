import { useEffect,useRef,useState,type Dispatch,type SetStateAction } from 'react'
import type { AuthSession } from '../../../types/auth'
import { showAuthToast } from '../../../lib/auth-toast'
import { createSquadNotification,squadActorName } from '../notifications'
import { appendSquadVoiceMinutesTranscriptLine,clearSquadVoiceChatMessages,createSquadVoiceEvent,createSquadVoiceMinutesKanbanTasks,createSquadVoiceMinutesSummary,fetchSquadVoiceChatMessages,fetchSquadVoiceMinutes,sendSquadVoiceChatMessage,updateSquadVoiceMinutes } from './meeting-api'
import { normalizeVoiceMeetingSummaryResponse,useLatest } from './meeting-support'
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
  const [voiceChatInput, setVoiceChatInput] = useState('')
  const [voiceMinutes, setVoiceMinutes] = useState<VoiceMeetingMinutes | null>(null)
  const [minutesDraft, setMinutesDraft] = useState('')
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
    setVoiceMinutes(minutes)

    if (syncDraft || shouldSyncMinutesDraftFromServer()) {
      setMinutesDraft(minutes.transcript ?? '')
    }
  }

async function refreshVoiceMeetingPanel(channelId = activeChannel?.channelId, syncDraft = false) {
    if (!channelId) {
      return
    }

    const [messages, minutes] = await Promise.all([
      fetchVoiceChatMessages(channelId),
      fetchVoiceMinutes(channelId),
    ])

    setVoiceChatMessages(messages)
    applyVoiceMinutes(minutes, syncDraft)
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
    return Boolean(voiceMinutes?.recording) || document.activeElement !== minutesTextareaRef.current
  }

function formatLocalTranscriptLine(text: string) {
    const time = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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

    void appendMinutesTranscriptToServer(transcript)
  }

async function appendMinutesTranscriptToServer(text: string) {
    if (!activeChannel) {
      return
    }

    try {
      const minutes = await appendSquadVoiceMinutesTranscriptLine(activeChannel.channelId, text)

      minutesAppendErrorShownRef.current = false
      applyVoiceMinutes(minutes)
      broadcastMeetingSync('minutes-updated', { minutes })
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

    stopMinutesSpeechRecognition()

    try {
      const recognition = new SpeechRecognition()

      recognition.lang = 'ko-KR'
      recognition.continuous = true
      recognition.interimResults = false
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]

          if (result?.isFinal) {
            appendMinutesTranscript(result[0]?.transcript ?? '')
          }
        }
      }
      recognition.onerror = () => {
        setSpeechRecognitionActive(false)
      }
      recognition.onend = () => {
        setSpeechRecognitionActive(false)

        if (!speechRecognitionRestartRef.current || speechRecognitionRef.current !== recognition) {
          return
        }

        window.setTimeout(() => {
          if (!speechRecognitionRestartRef.current || speechRecognitionRef.current !== recognition) {
            return
          }

          try {
            recognition.start()
            setSpeechRecognitionActive(true)
          } catch {
            setSpeechRecognitionActive(false)
          }
        }, 300)
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
    const recognition = speechRecognitionRef.current
    speechRecognitionRef.current = null

    if (recognition) {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null

      try {
        recognition.stop()
      } catch {
        recognition.abort()
      }
    }

    setSpeechRecognitionActive(false)
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
      const minutes = await updateSquadVoiceMinutes(activeChannel.channelId, payload)

      applyVoiceMinutes(minutes, syncDraft)
      broadcastMeetingSync('minutes-updated', { minutes })

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

    if (minutesDraft !== (voiceMinutes?.transcript ?? '')) {
      const saved = await updateVoiceMinutes({ transcript: minutesDraft }, true)

      if (!saved) {
        return
      }
    }

    setMinutesSaving(true)

    try {
      const response = await createSquadVoiceMinutesSummary(activeChannel.channelId)

      const analysis = normalizeVoiceMeetingSummaryResponse(response)
      const minutes = analysis.minutes
      const actionItems = analysis.actionItems ?? []

      if (!minutes?.channelId) {
        throw new Error('회의 요약 응답을 읽지 못했습니다.')
      }

      applyVoiceMinutes(minutes, true)
      broadcastMeetingSync('minutes-updated', { minutes })
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
  const shouldSyncMinutesDraftFromServerRef = useLatest(shouldSyncMinutesDraftFromServer)

useEffect(() => {
    if (!isJoined) {
      stopMinutesSpeechRecognition()
    }
  }, [isJoined])

useEffect(() => {
    if (!isJoined || !voiceMinutes?.recording || isMuted) {
      stopMinutesSpeechRecognition()
      return
    }

    if (!speechRecognitionRef.current) {
      startMinutesSpeechRecognitionRef.current()
    }
  }, [activeChannel?.channelId, isJoined, isMuted, startMinutesSpeechRecognitionRef, voiceMinutes?.recording])

useEffect(() => {
    if (!activeChannel?.channelId || !isJoined || !session?.accessToken) {
      setVoiceChatMessages([])
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
        const [messages, minutes] = await Promise.all([
          fetchVoiceChatMessages(channelId),
          fetchVoiceMinutes(channelId),
        ])

        if (stopped) {
          return
        }

        setVoiceChatMessages(messages)
        setVoiceMinutes(minutes)
        if (shouldSyncMinutesDraftFromServerRef.current()) {
          setMinutesDraft(minutes.transcript ?? '')
        }
      } catch {
        // The call itself should stay usable even if the side panel refresh misses once.
      }
    }

    async function syncRoomPanel() {
      try {
        const [messages, minutes] = await Promise.all([
          fetchVoiceChatMessages(channelId),
          fetchVoiceMinutes(channelId),
        ])

        if (stopped) {
          return
        }

        setVoiceChatMessages(messages)
        setVoiceMinutes(minutes)

        if (shouldSyncMinutesDraftFromServerRef.current()) {
          setMinutesDraft(minutes.transcript ?? '')
        }
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
  }, [activeChannel?.channelId, isJoined, session?.accessToken, setRoomPanelTab, shouldSyncMinutesDraftFromServerRef])

  return {
    voiceChatMessages,voiceChatInput,setVoiceChatInput,voiceMinutes,minutesDraft,setMinutesDraft,
    minutesActionItems,selectedMinutesActionItems,minutesSummaryReportOpen,setMinutesSummaryReportOpen,
    chatSending,chatClearing,minutesSaving,kanbanTaskCreating,speechRecognitionActive,minutesTextareaRef,
    appendVoiceChatMessage,applyVoiceMinutes,refreshVoiceMeetingPanel,voiceEventLabel,createVoiceEvent,
    shouldSyncMinutesDraftFromServer,startMinutesSpeechRecognition,stopMinutesSpeechRecognition,
    sendVoiceChatMessage,clearVoiceChatMessages,toggleMinutesRecording,saveMinutesDraft,
    toggleMinutesActionItem,generateMinutesSummary,createKanbanTasksFromMinutes,
  }
}
