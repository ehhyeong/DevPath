import { useState } from 'react'
import type { VoiceChatMessage } from './meeting-types'

type Options = {
  channelId: number | null
  currentUserId?: number | null
  ready: boolean
  messages: VoiceChatMessage[]
  chatVisible: boolean
}

export function useMeetingChatUnread({ channelId, currentUserId, ready, messages, chatVisible }: Options) {
  const scope = `${channelId}:${currentUserId}`
  const [snapshot, setSnapshot] = useState(() => ({ scope, ready, messages, seen: new Set(messages.filter((message) => message.channelId === channelId).map((message) => message.messageId)), unread: 0 }))

  // 최초 조회는 과거 기록이다. 채널/계정 변경과 재입장도 그 시점의 기록을 기준으로 시작한다.
  if (snapshot.scope !== scope || snapshot.ready !== ready) {
    setSnapshot({ scope, ready, messages, seen: new Set(messages.filter((message) => message.channelId === channelId).map((message) => message.messageId)), unread: 0 })
    return 0
  }
  if (!ready) return 0

  if (snapshot.messages !== messages || (chatVisible && snapshot.unread > 0)) {
    const seen = new Set(snapshot.seen)
    let unread = chatVisible ? 0 : snapshot.unread
    for (const message of messages) {
      if (message.channelId !== channelId || seen.has(message.messageId)) continue
      seen.add(message.messageId)
      if (!chatVisible && message.senderId !== currentUserId) unread++
    }
    // 메시지 ID를 기억해 WebSocket 수신과 뒤따르는 REST 조회가 겹쳐도 다시 세지 않는다.
    setSnapshot({ scope, ready, messages, seen, unread })
    return unread
  }
  return snapshot.unread
}
