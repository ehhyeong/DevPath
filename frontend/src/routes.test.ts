import { describe,expect,it } from 'vitest'
import { normalizePathname } from './routes'

describe('normalizePathname', () => {
  it.each([
    ['/', '/'],
    ['/dashboard', '/dashboard'],
    ['/dashboard/', '/dashboard'],
    ['/dashboard///', '/dashboard'],
    ['/singup', '/signup'],
    ['/singup/', '/signup'],
  ])('%s 경로를 %s로 정규화한다', (input, expected) => {
    expect(normalizePathname(input)).toBe(expected)
  })
})
