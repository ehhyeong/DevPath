import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMeetingChatUnread } from './useMeetingChatUnread'
import type { VoiceChatMessage } from './meeting-types'

const message = (messageId: number, senderId = 8, channelId = 11): VoiceChatMessage => ({ messageId, senderId, channelId, senderName: '팀원', content: `메시지 ${messageId}` })
const initial = () => ({ channelId: 11, currentUserId: 7, ready: true, messages: [] as VoiceChatMessage[], chatVisible: false })

describe('회의 읽지 않은 팀 채팅', () => {
  it('최초 로드의 이전 기록은 제외하고 새 팀원 메시지만 센다', () => {
    const props = initial()
    const { result, rerender } = renderHook(useMeetingChatUnread, { initialProps: { ...props, ready: false } })
    rerender({ ...props, messages: [message(1)] })
    expect(result.current).toBe(0)
    rerender({ ...props, messages: [message(1), message(2), message(3, 7)] })
    expect(result.current).toBe(1)
  })

  it('실시간·조회 중복과 지연된 응답을 다시 세지 않으며 순서가 바뀐 새 메시지도 센다', () => {
    const props = initial()
    const { result, rerender } = renderHook(useMeetingChatUnread, { initialProps: props })
    rerender({ ...props, messages: [message(2), message(2)] })
    expect(result.current).toBe(1)
    rerender({ ...props, messages: [] })
    expect(result.current).toBe(1)
    rerender({ ...props, messages: [message(2), message(1)] })
    expect(result.current).toBe(2)
    rerender({ ...props, messages: [message(1), message(2)] })
    expect(result.current).toBe(2)
  })

  it('채팅을 열면 읽음 처리하고 닫힌 패널에서 도착한 메시지는 다시 집계한다', () => {
    const props = initial()
    const { result, rerender } = renderHook(useMeetingChatUnread, { initialProps: props })
    const messages = [message(1)]
    rerender({ ...props, messages })
    expect(result.current).toBe(1)
    rerender({ ...props, messages, chatVisible: true })
    expect(result.current).toBe(0)
    rerender({ ...props, messages: [...messages, message(2)], chatVisible: true })
    expect(result.current).toBe(0)
    rerender({ ...props, messages: [...messages, message(2), message(3)], chatVisible: false })
    expect(result.current).toBe(1)
  })

  it('다른 채널 이벤트는 제외하고 채널 변경·퇴장·재입장·계정 변경 시 초기화한다', () => {
    const props = initial()
    const { result, rerender } = renderHook(useMeetingChatUnread, { initialProps: props })
    rerender({ ...props, messages: [message(1), message(2, 8, 12)] })
    expect(result.current).toBe(1)
    rerender({ ...props, channelId: 12, messages: [message(2, 8, 12)] })
    expect(result.current).toBe(0)
    rerender({ ...props, ready: false })
    expect(result.current).toBe(0)
    rerender({ ...props, messages: [message(1)] })
    expect(result.current).toBe(0)
    rerender({ ...props, messages: [message(1), message(3)] })
    expect(result.current).toBe(1)
    rerender({ ...props, currentUserId: 8, messages: [message(1), message(3)] })
    expect(result.current).toBe(0)
  })
})
