import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CourseDetailOverlays from './CourseDetailOverlays'

describe('CourseDetailOverlays 수강평 작성', () => {
  it('기존 강의 상세 모달에서 평점과 내용을 입력해 등록할 수 있다', () => {
    const setReviewRating = vi.fn()
    const setReviewContent = vi.fn()
    const handleSubmitReview = vi.fn()

    render(
      <CourseDetailOverlays
        enrollModalOpen={false}
        setEnrollModalOpen={vi.fn()}
        learningHref="/learning"
        selectedNews={null}
        setSelectedNews={vi.fn()}
        askModalOpen={false}
        setAskModalOpen={vi.fn()}
        questionDraft={{ title: '', tag: '', body: '' }}
        setQuestionDraft={vi.fn()}
        questionErrors={null}
        questionBusy={false}
        handleSubmitQuestion={vi.fn()}
        reviewModalOpen
        setReviewModalOpen={vi.fn()}
        reviewRating={5}
        setReviewRating={setReviewRating}
        reviewContent=""
        setReviewContent={setReviewContent}
        reviewError={null}
        reviewBusy={false}
        handleSubmitReview={handleSubmitReview}
        toastMessage={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '3점 선택' }))
    fireEvent.change(screen.getByLabelText('수강평'), { target: { value: '설명이 좋았습니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '수강평 등록' }))

    expect(setReviewRating).toHaveBeenCalledWith(3)
    expect(setReviewContent).toHaveBeenCalledWith('설명이 좋았습니다.')
    expect(handleSubmitReview).toHaveBeenCalledOnce()
  })
})
