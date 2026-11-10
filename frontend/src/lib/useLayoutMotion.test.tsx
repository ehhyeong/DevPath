import { render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLayoutMotion } from './useLayoutMotion'

function Items({ ids }: { ids: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutMotion(ref, ids.join(','))
  return <div ref={ref}>{ids.map(id => <div key={id} data-motion-key={id}><input aria-label={id} defaultValue={id} /></div>)}</div>
}

const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate')
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalAnimate) Object.defineProperty(HTMLElement.prototype, 'animate', originalAnimate)
  else Reflect.deleteProperty(HTMLElement.prototype, 'animate')
})

function motionEnvironment(reduced = false) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced })))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const index = this.dataset.motionKey ? [...this.parentElement!.children].indexOf(this) : 0
    return { x: 0, y: index * 100, left: 0, top: index * 100, width: 200, height: 80, right: 200, bottom: index * 100 + 80, toJSON: () => ({}) }
  })
  const active: Array<{ cancel: ReturnType<typeof vi.fn>; playState: string }> = []
  const animate = vi.fn(() => {
    const animation = { cancel: vi.fn(), playState: 'finished' }
    active.push(animation)
    return animation as unknown as Animation
  })
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate })
  return { active, animate }
}

describe('레이아웃 변경 모션', () => {
  it('삭제·재정렬해도 남은 입력과 포커스를 보존하며 빈자리를 채우는 카드를 움직인다', () => {
    const { animate } = motionEnvironment()
    const view = render(<Items ids={['a', 'b', 'c']} />)
    const field = screen.getByRole('textbox', { name: 'c' }) as HTMLInputElement
    field.value = '편집한 값'
    field.focus()
    animate.mockClear()
    view.rerender(<Items ids={['c', 'b']} />)
    expect(screen.getByRole('textbox', { name: 'c' })).toBe(field)
    expect(field).toHaveValue('편집한 값')
    expect(field).toHaveFocus()
    expect(animate).toHaveBeenCalledTimes(1)
  })

  it('추가한 항목은 나타나고 제거된 항목과 언마운트의 애니메이션은 정리한다', () => {
    const { animate, active } = motionEnvironment()
    const view = render(<Items ids={['a']} />)
    view.rerender(<Items ids={['a', 'b']} />)
    expect(animate).toHaveBeenCalledTimes(2)
    view.rerender(<Items ids={['b']} />)
    expect(active[0].cancel).toHaveBeenCalled()
    view.unmount()
    expect(active.at(-1)!.cancel).toHaveBeenCalled()
  })

  it('움직임 감소 환경은 순서와 내용을 즉시 반영하고 애니메이션을 실행하지 않는다', () => {
    const { animate } = motionEnvironment(true)
    const view = render(<Items ids={['a', 'b']} />)
    view.rerender(<Items ids={['b']} />)
    expect(screen.queryByRole('textbox', { name: 'a' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'b' })).toBeInTheDocument()
    expect(animate).not.toHaveBeenCalled()
  })
})
