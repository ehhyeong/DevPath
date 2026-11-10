import { useLayoutEffect, useRef, type RefObject } from 'react'

type Position = { element: HTMLElement; x: number; y: number }

export function useLayoutMotion(container: RefObject<HTMLElement | null>, layoutKey: string) {
  const positions = useRef(new Map<string, Position>())
  const animations = useRef(new Map<HTMLElement, Animation>())

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const origin = root.getBoundingClientRect()
    const previous = positions.current
    const next = new Map<string, Position>()
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    for (const element of root.querySelectorAll<HTMLElement>('[data-motion-key]')) {
      const key = element.dataset.motionKey!
      const old = previous.get(key)
      const running = animations.current.get(element)
      // translate는 DnD·로드맵 레인의 기존 transform을 덮어쓰지 않는다.
      const offset = running?.playState === 'running' ? getComputedStyle(element).translate.split(' ').map(value => Number.parseFloat(value) || 0) : [0, 0]
      running?.cancel()
      animations.current.delete(element)
      const rect = element.getBoundingClientRect()
      const position = { element, x: rect.left - origin.left + root.scrollLeft, y: rect.top - origin.top + root.scrollTop }
      next.set(key, position)
      if (reduceMotion || !element.animate) continue
      const x = old?.element === element ? old.x + offset[0] - position.x : 0
      const y = old?.element === element ? old.y + (offset[1] ?? 0) - position.y : 8
      if (old?.element === element && Math.abs(x) < 1 && Math.abs(y) < 1) continue
      const animation = element.animate([
        { translate: `${x}px ${y}px`, ...(old?.element === element ? {} : { opacity: 0 }) },
        { translate: '0px 0px', opacity: 1 },
      ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
      animations.current.set(element, animation)
    }
    for (const [element, animation] of animations.current) {
      if (!root.contains(element)) { animation.cancel(); animations.current.delete(element) }
    }
    positions.current = next
  }, [container, layoutKey])

  useLayoutEffect(() => {
    const active = animations.current
    return () => { for (const animation of active.values()) animation.cancel(); active.clear() }
  }, [])
}
