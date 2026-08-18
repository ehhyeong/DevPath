import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminCourseReviewDetail } from '../../types/admin'
import {
  installCourseReviewModalBindings,
  openCourseReviewModal,
  previewCourseReviewLesson,
} from './admin-course-review'
import AdminCourseReviewModal from './shell/AdminCourseReviewModal'

const reviewDetail: AdminCourseReviewDetail = {
  courseId: 17,
  title: 'Spring 실전 강의',
  subtitle: '서비스 개발 과정',
  description: '검수할 강의 설명',
  status: 'IN_REVIEW',
  price: 39000,
  originalPrice: 49000,
  currency: 'KRW',
  difficultyLevel: 'INTERMEDIATE',
  language: '한국어',
  hasCertificate: true,
  thumbnailUrl: null,
  introVideoUrl: null,
  durationSeconds: 620,
  prerequisites: ['Java'],
  jobRelevance: ['백엔드 개발'],
  submittedAt: '2026-08-12T10:00:00',
  instructorId: 4,
  instructorName: '강사 사용자',
  instructorEmail: 'instructor@devpath.com',
  sectionCount: 1,
  lessonCount: 1,
  publishedLessonCount: 1,
  previewLessonCount: 0,
  totalDurationSeconds: 620,
  sections: [
    {
      sectionId: 5,
      title: '첫 번째 섹션',
      description: '섹션 설명',
      sortOrder: 1,
      published: true,
      lessons: [
        {
          lessonId: 9,
          title: '첫 강의',
          description: '차시 설명',
          lessonType: 'VIDEO',
          playbackUrl: null,
          thumbnailUrl: null,
          durationSeconds: 620,
          preview: false,
          published: true,
          sortOrder: 1,
        },
      ],
    },
  ],
  reviewHistory: [
    {
      id: 2,
      courseId: 17,
      instructorId: 4,
      adminId: 1,
      action: 'REJECTED',
      reason: '차시 설명을 보완해 주세요',
      processedAt: '2026-08-11T10:00:00',
    },
  ],
}

describe('강의 검수 상세 모달', () => {
  it('상세 확인과 메모 입력을 거친 뒤에만 승인 결정을 전달한다', async () => {
    const onDecision = vi.fn(async () => undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container } = render(<AdminCourseReviewModal />)

    installCourseReviewModalBindings(onDecision)
    openCourseReviewModal(reviewDetail)

    expect(container.querySelector('#courseReviewModal')).toHaveClass('active')
    expect(container).toHaveTextContent('Spring 실전 강의')
    expect(container).toHaveTextContent('첫 번째 섹션')
    expect(container).toHaveTextContent('차시 설명을 보완해 주세요')

    const approveButton = container.querySelector<HTMLButtonElement>('#courseReviewApprove')!
    const rejectButton = container.querySelector<HTMLButtonElement>('#courseReviewReject')!
    const reason = container.querySelector<HTMLTextAreaElement>('#courseReviewReason')!
    expect(approveButton).toBeDisabled()
    expect(rejectButton).toBeDisabled()

    fireEvent.input(reason, { target: { value: '구성과 영상을 모두 확인했습니다' } })
    expect(rejectButton).toBeEnabled()
    expect(approveButton).toBeDisabled()

    container
      .querySelectorAll<HTMLInputElement>('.course-review-check')
      .forEach((checkbox) => fireEvent.click(checkbox))
    expect(approveButton).toBeEnabled()

    fireEvent.click(approveButton)

    await waitFor(() =>
      expect(onDecision).toHaveBeenCalledWith(
        17,
        'APPROVE',
        '구성과 영상을 모두 확인했습니다',
      ),
    )
    await waitFor(() =>
      expect(container.querySelector('#courseReviewModal')).not.toHaveClass('active'),
    )
  })

  it('검수 영상의 재생, 정지, 10초 탐색과 전체 화면을 제어한다', async () => {
    const onDecision = vi.fn(async () => undefined)
    const { container } = render(<AdminCourseReviewModal />)
    const detailWithVideo: AdminCourseReviewDetail = {
      ...reviewDetail,
      sections: reviewDetail.sections.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => ({
          ...lesson,
          playbackUrl: '/videos/review.mp4',
          durationSeconds: 120,
        })),
      })),
    }

    installCourseReviewModalBindings(onDecision)
    openCourseReviewModal(detailWithVideo)
    const video = container.querySelector<HTMLVideoElement>('#courseReviewVideo')!
    const frame = container.querySelector<HTMLElement>('#courseReviewPlayerFrame')!
    let paused = true
    let currentTime = 30
    let fullscreenElement: Element | null = null
    Object.defineProperties(video, {
      paused: { configurable: true, get: () => paused },
      currentTime: {
        configurable: true,
        get: () => currentTime,
        set: (value: number) => { currentTime = value },
      },
      duration: { configurable: true, get: () => 120 },
      play: {
        configurable: true,
        value: vi.fn(async () => {
          paused = false
          video.dispatchEvent(new Event('play'))
        }),
      },
      pause: {
        configurable: true,
        value: vi.fn(() => {
          paused = true
          video.dispatchEvent(new Event('pause'))
        }),
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    })
    Object.defineProperty(frame, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(async () => {
        fullscreenElement = frame
        document.dispatchEvent(new Event('fullscreenchange'))
      }),
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn(async () => {
        fullscreenElement = null
        document.dispatchEvent(new Event('fullscreenchange'))
      }),
    })

    previewCourseReviewLesson(9)
    fireEvent.loadedMetadata(video)

    expect(container.querySelector('.admin-course-review-player')).toHaveClass('is-active')
    expect(container.querySelector('#courseReviewTime')).toHaveTextContent('00:30 / 02:00')
    expect(container.querySelector('#courseReviewPlayPause')).toHaveAttribute('aria-label', '일시정지')

    fireEvent.click(container.querySelector('#courseReviewForward')!)
    expect(currentTime).toBe(40)
    fireEvent.click(container.querySelector('#courseReviewRewind')!)
    expect(currentTime).toBe(30)

    fireEvent.input(container.querySelector('#courseReviewSeek')!, { target: { value: '75' } })
    expect(currentTime).toBe(75)
    expect(container.querySelector('#courseReviewTime')).toHaveTextContent('01:15 / 02:00')

    fireEvent.click(container.querySelector('#courseReviewPlayPause')!)
    expect(video.pause).toHaveBeenCalled()
    expect(container.querySelector('#courseReviewPlayPause')).toHaveAttribute('aria-label', '재생')

    fireEvent.click(container.querySelector('#courseReviewStop')!)
    expect(currentTime).toBe(0)
    expect(container.querySelector('#courseReviewTime')).toHaveTextContent('00:00 / 02:00')

    fireEvent.click(container.querySelector('#courseReviewMute')!)
    expect(video.muted).toBe(true)
    expect(container.querySelector('#courseReviewMute')).toHaveAttribute('aria-label', '음소거 해제')

    const fullscreenButton = container.querySelector('#courseReviewFullscreen')!
    fireEvent.click(fullscreenButton)
    await waitFor(() => expect(frame.requestFullscreen).toHaveBeenCalled())
    expect(fullscreenButton).toHaveAttribute('aria-label', '전체 화면 종료')
    expect(fullscreenButton).toHaveAttribute('aria-pressed', 'true')
    expect(fullscreenButton.querySelector('i')).toHaveClass('fa-compress')

    fireEvent.click(fullscreenButton)
    await waitFor(() => expect(document.exitFullscreen).toHaveBeenCalled())
    expect(fullscreenButton).toHaveAttribute('aria-label', '전체 화면')
    expect(fullscreenButton).toHaveAttribute('aria-pressed', 'false')
  })
})
