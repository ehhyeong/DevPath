import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { FLOATING_REACTION_VISIBLE_MS, createFloatingReactionId, normalizeVoiceReaction } from './meeting-support'
import type { FloatingReaction } from './meeting-types'

type Props = {
  currentUserId?: number | null
  currentUserName?: string | null
  controlBoxRef: MutableRefObject<HTMLDivElement | null>
  reactionTimerIdsRef: MutableRefObject<number[]>
  setFloatingReactions: Dispatch<SetStateAction<FloatingReaction[]>>
  sendReaction: (reaction: string) => void
}

export function useMeetingReactions(props: Props) {
  const { currentUserId, currentUserName, controlBoxRef, reactionTimerIdsRef, setFloatingReactions, sendReaction } = props

  function showFloatingReaction(reaction: string, fromUserId?: number, fromUserName?: string) {
    const normalizedReaction = normalizeVoiceReaction(reaction)
    if (!normalizedReaction) return
    const controlRect = controlBoxRef.current?.getBoundingClientRect()
    const id = createFloatingReactionId()
    const timerId = window.setTimeout(() => {
      setFloatingReactions((current) => current.filter((item) => item.id !== id))
      reactionTimerIdsRef.current = reactionTimerIdsRef.current.filter((item) => item !== timerId)
    }, FLOATING_REACTION_VISIBLE_MS)
    reactionTimerIdsRef.current.push(timerId)
    setFloatingReactions((current) => [
      ...current.slice(-7),
      {
        id,
        reaction: normalizedReaction,
        left: controlRect ? controlRect.left + controlRect.width / 2 : window.innerWidth / 2,
        dx: (Math.random() - 0.5) * 300,
        fromUserId,
        fromUserName,
      },
    ])
  }

  function sendRoomReaction(reaction: string) {
    const normalizedReaction = normalizeVoiceReaction(reaction)
    if (!normalizedReaction) return
    showFloatingReaction(normalizedReaction, currentUserId ?? undefined, currentUserName ?? undefined)
    sendReaction(normalizedReaction)
  }

  return { showFloatingReaction, sendRoomReaction }
}
