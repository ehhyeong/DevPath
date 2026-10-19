import { useEffect, useRef, useState } from 'react'
import { useDemoAccount, useDemoTyping } from '../lib/useDemoTyping'

export type AiSuggestion = {
  label: string
  prompt: string
}

/**
 * AI 답변. action이 있으면 답변 말풍선 안에 실행 버튼을 함께 노출한다.
 * run이 Promise를 돌려주면 끝날 때까지 버튼을 잠그고, 돌려준 문자열을 결과 메시지로 보여준다.
 */
export type AiAnswer = {
  text: string
  action?: {
    label: string
    run: () => void | Promise<string | void>
    // 미지정이면 빌더 기본값(fa-plus / '캔버스에 추가함')을 쓴다.
    icon?: string
    doneLabel?: string
  }
}

type AiAssistantPanelProps = {
  fabLabel: string
  panelTitle: string
  greeting: string
  resetGreeting: string
  placeholder: string
  thinkingLabel: string
  suggestions: AiSuggestion[]
  // 미지정이면 AI를 호출하지 않고 대체 응답만 보여준다.
  // history는 후속 질문을 위한 직전 대화이며 오래된 것부터 정렬된다.
  onAsk?: (question: string, history: AiHistoryMessage[]) => Promise<AiAnswer>
  // 지정하면 패널을 열 때마다 저장된 대화를 불러오고, 대화 비우기도 저장소에 반영한다.
  loadMessages?: () => Promise<AiStoredMessage[]>
  onReset?: () => Promise<void>
  demoPrompt?: { email: string; text: string; enabled?: boolean; scopeKey?: string | number | null; instant?: boolean }
}

export type AiHistoryMessage = {
  role: 'user' | 'assistant'
  text: string
}

/** 저장소에서 불러온 대화 한 건. author는 다른 사람이 보낸 질문일 때만 채운다. */
export type AiStoredMessage = {
  role: 'user' | 'bot'
  text: string
  author?: string
  action?: AiAnswer['action']
  actionDone?: boolean
}

type ChatMessage = {
  id: number
  role: 'user' | 'bot' | 'error'
  text: string
  author?: string
  action?: AiAnswer['action']
  actionDone?: boolean
  actionRunning?: boolean
}

/** AI 호출이 없거나 실패했을 때 보여주는 안전한 대체 응답. */
const FALLBACK_MESSAGE = 'AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.'
const FALLBACK_DELAY_MS = 600
/** 후속 질문용으로 함께 보내는 직전 대화 수. */
const HISTORY_LIMIT = 6

export default function AiAssistantPanel({
  fabLabel,
  panelTitle,
  greeting,
  resetGreeting,
  placeholder,
  thinkingLabel,
  suggestions,
  onAsk,
  loadMessages,
  onReset,
  demoPrompt,
}: AiAssistantPanelProps) {
  const [open, setOpen] = useState(false)
  const [greetingText, setGreetingText] = useState(greeting)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [chipsHidden, setChipsHidden] = useState(false)
  const demoAccount = useDemoAccount(demoPrompt?.email ?? '', open && Boolean(demoPrompt) && demoPrompt?.enabled !== false)
  const demoInput = useDemoTyping({ text: demoPrompt?.text ?? '', value: input, onValue: setInput,
    enabled: demoAccount, active: open && !busy, scopeKey: demoPrompt?.scopeKey, instant: demoPrompt?.instant })

  const panelRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messageSeq = useRef(0)
  const mountedRef = useRef(true)

  // 패널을 열면 입력창으로 포커스 이동 (열림 애니메이션 이후)
  useEffect(() => {
    if (!open) {
      return
    }

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 200)

    return () => clearTimeout(focusTimer)
  }, [open])

  // ESC 닫기 + 패널 내부 포커스 트랩
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        fabRef.current?.focus()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current

      if (!panel) {
        return
      }

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null)

      if (focusables.length === 0) {
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (!panel.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // 메시지가 늘어나면 대화창을 맨 아래로
  useEffect(() => {
    const list = listRef.current

    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [messages, busy])

  useEffect(() => {
    return () => {
      mountedRef.current = false

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  function closePanel() {
    setOpen(false)
    fabRef.current?.focus()
  }

  function togglePanel() {
    if (open) {
      closePanel()
      return
    }

    setOpen(true)

    // 실행 중인 변경이 있으면 결과 표시가 끊기지 않게 다시 불러오지 않는다.
    if (loadMessages && !busy && !messages.some((message) => message.actionRunning)) {
      void refreshMessages(loadMessages)
    }
  }

  async function refreshMessages(load: () => Promise<AiStoredMessage[]>) {
    setBusy(true)

    try {
      const loaded = await load()

      if (!mountedRef.current) {
        return
      }

      setMessages(loaded.map((message) => {
        messageSeq.current += 1
        return { ...message, id: messageSeq.current }
      }))

      if (loaded.length > 0) {
        setExpanded(true)
        setChipsHidden(true)
      }
    } catch {
      if (mountedRef.current) {
        appendMessage('error', '저장된 대화를 불러오지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false)
      }
    }
  }

  function appendMessage(role: ChatMessage['role'], text: string, action?: AiAnswer['action']) {
    messageSeq.current += 1
    const id = messageSeq.current
    setMessages((current) => [...current, { id, role, text, action }])
  }

  async function handleSubmit() {
    const text = input.trim()

    if (!text || busy || demoInput.typing) {
      return
    }

    setChipsHidden(true)
    setExpanded(true)
    appendMessage('user', text)
    setInput('')
    setBusy(true)

    if (!onAsk) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        appendMessage('error', FALLBACK_MESSAGE)
        setBusy(false)
      }, FALLBACK_DELAY_MS)
      return
    }

    // 대체 응답(error)은 실제 대화가 아니라 제외한다.
    const history = messages
      .filter((message) => message.role !== 'error')
      .slice(-HISTORY_LIMIT)
      .map((message) => ({
        role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
        text: message.text,
      }))

    try {
      const answer = await onAsk(text, history)

      if (mountedRef.current) {
        appendMessage('bot', answer.text, answer.action)
      }
    } catch {
      if (mountedRef.current) {
        appendMessage('error', FALLBACK_MESSAGE)
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false)
      }
    }
  }

  function updateMessage(messageId: number, patch: Partial<ChatMessage>) {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, ...patch } : message)),
    )
  }

  async function runAction(messageId: number) {
    const target = messages.find((message) => message.id === messageId)

    if (!target?.action || target.actionDone || target.actionRunning) {
      return
    }

    const pending = target.action.run()

    if (!(pending instanceof Promise)) {
      updateMessage(messageId, { actionDone: true })
      return
    }

    updateMessage(messageId, { actionRunning: true })

    try {
      const resultText = await pending

      if (mountedRef.current) {
        updateMessage(messageId, { actionRunning: false, actionDone: true })

        if (resultText) {
          appendMessage('bot', resultText)
        }
      }
    } catch (error) {
      // 실패하면 다시 누를 수 있게 버튼을 풀어 둔다.
      if (mountedRef.current) {
        updateMessage(messageId, { actionRunning: false })
        appendMessage('error', error instanceof Error && error.message ? error.message : FALLBACK_MESSAGE)
      }
    }
  }

  async function handleReset() {
    demoInput.stop()
    if (onReset) {
      try {
        await onReset()
      } catch (error) {
        appendMessage('error', error instanceof Error && error.message ? error.message : FALLBACK_MESSAGE)
        return
      }
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setBusy(false)
    setMessages([])
    setGreetingText(resetGreeting)
    setChipsHidden(false)
  }

  function handleSuggestion(prompt: string) {
    demoInput.change(prompt)
    inputRef.current?.focus()
  }

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={togglePanel}
        aria-expanded={open}
        aria-controls="aiPromptBar"
        aria-label={fabLabel}
        className={open ? 'ai-fab is-hidden' : 'ai-fab'}
      >
        <i aria-hidden="true" className="fas fa-compass ai-fab__icon" />
        <span className="ai-fab__label">{fabLabel}</span>
      </button>

      <div
        ref={panelRef}
        id="aiPromptBar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aiPanelTitle"
        inert={!open}
        className={`ai-panel fixed bottom-6 inset-x-0 mx-auto z-50 w-full max-w-xl px-4${open ? '' : ' hidden-panel'}`}
      >
        <div className="ai-panel-shell">
          <div className="ai-idbar">
            <div className="flex items-center gap-2">
              <span className="ai-live-dot" aria-hidden="true" />
              <span id="aiPanelTitle" className="ai-idbar__name">{panelTitle}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => void handleReset()} aria-label="대화 비우기" title="대화 비우기" className="ai-ghost-btn">
                <i aria-hidden="true" className="fas fa-trash-alt" />
              </button>
              <button type="button" onClick={closePanel} aria-label="AI 패널 닫기" title="닫기" className="ai-ghost-btn">
                <i aria-hidden="true" className="fas fa-times" />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-busy={busy}
            className={`ai-chat-body ai-chat-list ${expanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="ai-msg-bot">{greetingText}</div>
            {messages.map((message) => {
              if (message.role === 'user') {
                return (
                  <div key={message.id} className="ai-msg-user ai-bubble-in">
                    {message.author && <span className="block text-[11px] opacity-70">{message.author}</span>}
                    {message.text}
                  </div>
                )
              }

              if (message.role === 'error') {
                return (
                  <div key={message.id} className="ai-msg-bot ai-msg-bot--error ai-bubble-in">
                    <i aria-hidden="true" className="fas fa-exclamation-circle mr-1.5" />
                    {message.text}
                  </div>
                )
              }

              return (
                <div key={message.id} className="ai-msg-bot ai-bubble-in">
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.action && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => void runAction(message.id)}
                        disabled={message.actionDone || message.actionRunning}
                        className="ai-inline-btn"
                      >
                        <i
                          aria-hidden="true"
                          className={
                            message.actionDone
                              ? 'fas fa-check'
                              : message.actionRunning
                                ? 'fas fa-spinner fa-spin'
                                : `fas ${message.action.icon ?? 'fa-plus'}`
                          }
                        />
                        {message.actionDone ? (message.action.doneLabel ?? '캔버스에 추가함') : message.action.label}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {busy && (
              <div className="ai-bubble-in">
                <div className="ai-typing">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                  <span className="ml-1">{thinkingLabel}</span>
                </div>
              </div>
            )}
          </div>

          <div className="ai-input-row">
            <input
              ref={inputRef}
              type="text"
              value={input}
              {...demoInput.bindings}
              onKeyDown={(event) => {
                demoInput.keyDown(event)
                if (event.key === 'Enter' && !event.defaultPrevented) {
                  handleSubmit()
                }
              }}
              disabled={busy}
              aria-label={`${fabLabel} 프롬프트 입력`}
              placeholder={placeholder}
              className="ai-input"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || demoInput.typing}
              aria-label="전송"
              className={busy ? 'ai-send opacity-60 cursor-not-allowed' : 'ai-send'}
            >
              <i aria-hidden="true" className="fas fa-arrow-up" />
            </button>
          </div>

          <div className={chipsHidden ? 'ai-chips is-hidden' : 'ai-chips'}>
            <span className="ai-chips__label"><i aria-hidden="true" className="fas fa-lightbulb" />추천 질문</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => handleSuggestion(suggestion.prompt)}
                className="ai-chip"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
