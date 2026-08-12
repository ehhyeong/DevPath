import { describe, expect, it } from 'vitest'
import { isHlsPlaybackUrl } from './useHlsVideoSource'

describe('HLS video source', () => {
  it('m3u8 경로와 쿼리 문자열이 있는 재생 목록을 식별한다', () => {
    expect(isHlsPlaybackUrl('/uploads/course/lesson/index.m3u8')).toBe(true)
    expect(isHlsPlaybackUrl('https://cdn.example/lesson.m3u8?token=abc')).toBe(true)
    expect(isHlsPlaybackUrl('/uploads/course/lesson.mp4')).toBe(false)
    expect(isHlsPlaybackUrl(null)).toBe(false)
  })
})
