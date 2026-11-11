import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CompanyLogo from './CompanyLogo'
import { careerOptions, mapJobkoreaPosting, mapRecommendedJob, regionOptions, roleOptions } from './job-matching-model'

describe('기업 로고', () => {
  it('기업정보 경로만 지연 로딩하고 로딩 전에는 이니셜을 표시한다', () => {
    render(<CompanyLogo companyName="한국기업" companyUrl="http://www.jobkorea.co.kr/Recruit/Co_Read/C/company?api=private" className="h-12 w-12" />)
    const image = screen.getByRole('img', { name: '한국기업 로고' })
    expect(image).toHaveAttribute('src', '/api/jobs/company-logo?companyPath=%2FRecruit%2FCo_Read%2FC%2Fcompany')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveClass('opacity-0')
    expect(screen.getByText('한국')).toBeVisible()
    fireEvent.load(image)
    expect(image).toHaveClass('opacity-100')
  })

  it('이미지가 실패하면 이니셜로 대체하고 새 이미지 주소는 다시 로딩한다', () => {
    const { rerender } = render(<CompanyLogo companyName="한국기업" companyLogoUrl="https://cdn.example.com/logo.png" className="h-12 w-12" />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('한국')).toBeVisible()
    rerender(<CompanyLogo companyName="한국기업" companyLogoUrl="https://cdn.example.com/new.png" className="h-12 w-12" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/new.png')
  })

  it.each([undefined, '', 'invalid-url', 'https://other.example.com/Company/1/Info'])('이미지 주소가 없는 이전 결과도 표시한다 (%s)', companyUrl => {
    render(<CompanyLogo companyName="한국기업" companyUrl={companyUrl} className="h-12 w-12" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('한국')).toBeVisible()
  })

  it('외부 기본 매칭과 내부 추천의 이미지 정보를 카드에 전달한다', () => {
    const external = mapJobkoreaPosting({ companyName: '외부 기업', companyUrl: 'https://www.jobkorea.co.kr/Company/1/Info', areaCode: 'I010,I020,I030', careerCode: '3' }, 0, roleOptions[0], regionOptions[0], careerOptions[0])
    expect(external.companyUrl).toBe('https://www.jobkorea.co.kr/Company/1/Info')
    expect(external.regionLabel).toBe('강남구 · 강동구 외 1곳')
    expect(external.careerLabel).toBe('신입/경력')
    const internal = mapRecommendedJob({ jobId: 1, companyId: 1, companyName: '내부 기업', companyLogoUrl: 'https://cdn.example.com/logo.png', title: '개발자' }, roleOptions[0], regionOptions[0], careerOptions[0])
    expect(internal.companyLogoUrl).toBe('https://cdn.example.com/logo.png')
  })
})
