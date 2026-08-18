import type { LearningCourseDetail } from '../../types/learning'
import { formatCoursePrice } from './course-detail-support'
import { getPlainDescription } from './course-detail-view-support'
import { StarRating } from './CourseDetailViewComponents'

type Props = {
  displayCourse: LearningCourseDetail
  heroTags: string[]
  reviewStats: { average: number; count: number }
  instructorChannelHref: string
  instructor: LearningCourseDetail['instructor']
  handlePreviewClick: () => void
  handleEnroll: () => Promise<void>
  enrollmentBusy: boolean
  isEnrolled: boolean
}

export default function CourseDetailHero(props: Props) {
  const { displayCourse, heroTags, reviewStats, instructorChannelHref, instructor, handlePreviewClick, handleEnroll, enrollmentBusy, isEnrolled } = props
  return (
        <section className="bg-gray-900 py-12 text-white">
          <div className="container mx-auto flex flex-col items-center gap-10 px-6 lg:px-20 md:flex-row">
            <div className="flex-1 space-y-4">
              <div className="course-detail-hero-tags mb-2 flex flex-wrap items-center! gap-2">
                <span className="course-detail-hero-badge inline-flex! min-h-[26px]! box-border items-center! justify-center! rounded bg-primary px-2 py-1 text-xs leading-[16px]! font-bold text-white">Best Seller</span>
                {heroTags.map((tag) => (
                  <span key={tag} className="job-tag inline-flex min-h-[26px] box-border items-center justify-center rounded-[6px] border-[1px] border-solid border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] px-[10px] py-[4px] text-[12px] leading-[16px] font-[600] text-[#e5e7eb]">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl leading-tight font-bold md:text-4xl">{displayCourse.title}</h1>
              <p className="text-sm text-gray-300 md:text-base">
                {getPlainDescription(displayCourse.subtitle ?? displayCourse.description ?? '')}
              </p>

              <div className="mt-4 flex items-center gap-4 text-sm">
                <StarRating rating={reviewStats.average} className="text-sm" />
                <span className="text-gray-300">
                  {reviewStats.average.toFixed(1)} ({reviewStats.count}개 수강평)
                </span>
              </div>

              <a href={instructorChannelHref} className="group inline-flex items-center gap-3 pt-4">
                <img
                  src={instructor?.profileImage ?? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100'}
                  className="h-10 w-10 rounded-full border-2 border-gray-700 transition group-hover:border-brand"
                  alt={instructor?.channelName ?? '강사 프로필'}
                />
                <div>
                  <p className="text-sm font-bold transition group-hover:text-white">{instructor?.channelName ?? '박강사'}</p>
                  <p className="text-xs text-gray-400 transition group-hover:text-gray-200">{instructor?.headline ?? '10년차 백엔드 개발자 · 실무 중심 자바 멘토'}</p>
                </div>
              </a>
            </div>

            <div className="w-full rounded-xl bg-white p-6 text-gray-900 shadow-2xl md:w-80">
              <button
                type="button"
                onClick={handlePreviewClick}
                className="group relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-gray-100 text-left"
              >
                <img
                  src={displayCourse.thumbnailUrl ?? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  alt={displayCourse.title}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
                  <i className="fas fa-play-circle text-5xl text-white opacity-80 shadow-xl transition group-hover:opacity-100" />
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">미리보기</span>
              </button>

              <div className="mb-6">
                <span className="text-3xl font-extrabold text-gray-900">{formatCoursePrice(displayCourse.price, displayCourse.currency)}</span>
                {displayCourse.originalPrice && displayCourse.originalPrice > (displayCourse.price ?? 0) ? (
                  <span className="ml-2 text-sm text-gray-400 line-through">{formatCoursePrice(displayCourse.originalPrice, displayCourse.currency)}</span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void handleEnroll()}
                disabled={enrollmentBusy}
                className="mb-3 w-full rounded-lg bg-primary py-3 text-lg font-bold text-white shadow-lg transition active:scale-95 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isEnrolled ? '학습하러 가기' : enrollmentBusy ? '처리 중...' : '수강 신청하기'}
              </button>

              <div className="mt-4 space-y-2 text-xs text-gray-500">
                <p><i className="fas fa-check mr-2 text-primary" />무제한 수강 가능</p>
                <p><i className="fas fa-check mr-2 text-primary" />수료증 발급</p>
              </div>
            </div>
          </div>
        </section>
  )
}
