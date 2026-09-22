import { useEffect, useMemo, useRef, useState } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import type { AuthenticatedHomeDashboard, HomeProjectSummary, HomeTopCourse } from '../../types/home'

type WelcomeHomeDashboardProps = {
  dashboard: AuthenticatedHomeDashboard | null
  error: string | null
  greetingName: string
  loading: boolean
  onRetry: () => void
}

const projectTones = [
  'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]',
  'bg-[#faf5ff] text-[#9333ea] border-[#f3e8ff]',
  'bg-[#fff7ed] text-[#ea580c] border-[#ffedd5]',
]

function clampProgress(progress: number) {
  return Math.max(0, Math.min(progress, 100))
}

function EmptyMessage({ children }: { children: string }) {
  return <div className="flex h-full min-h-20 items-center justify-center rounded-xl border border-dashed border-[#d1d5db] px-4 text-center text-[11px] font-medium text-[#9ca3af]">{children}</div>
}

function ProjectCard({ project, index }: { project: HomeProjectSummary; index: number }) {
  const description = project.description?.trim() || `현재 진행률 ${clampProgress(project.progressPercentage)}%`

  return (
    <a className="block cursor-pointer rounded-xl border border-[#e5e7eb] bg-white p-3.5 shadow-xs transition hover:border-[#60a5fa]" href={project.href}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide ${projectTones[index % projectTones.length]}`}>{project.typeLabel}</span>
        <span className="text-[9px] font-bold text-[#9ca3af]">{clampProgress(project.progressPercentage)}%</span>
      </div>
      <h3 className="mb-1 truncate text-[13px] font-bold text-[#111827]">{project.title}</h3>
      <p className="truncate text-[10px] text-[#6b7280]">{description}</p>
    </a>
  )
}

function formatPrice(course: HomeTopCourse) {
  if (course.price === null) return '가격 미정'
  if (course.price === 0) return '무료'
  if (!course.currency) return course.price.toLocaleString('ko-KR')

  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: course.currency,
      maximumFractionDigits: 0,
    }).format(course.price)
  } catch {
    return `${course.price.toLocaleString('ko-KR')} ${course.currency}`
  }
}

function TopCourseCard({ course, rank }: { course: HomeTopCourse; rank: number }) {
  return (
    <a className="relative flex min-w-[280px] w-[280px] cursor-pointer snap-start flex-col justify-between overflow-hidden rounded-[1.25rem]! border border-[#e5e7eb] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-250 ease-[ease] hover:-translate-y-0.5 hover:border-[#d1d5db] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.06)] md:w-[300px]" href={course.href}>
      <div className={`absolute top-0 left-3 z-10 flex h-[38px] w-8 items-center justify-center font-black text-lg text-white [clip-path:polygon(0_0,100%_0,100%_100%,50%_85%,0_100%)] ${rank <= 3 ? 'bg-[#00c471]!' : 'bg-[#111827]!'}`}>{rank}</div>
      <div className="relative h-36 overflow-hidden bg-[#f3f4f6]">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} className="h-full w-full object-cover opacity-90 transition duration-500 hover:scale-105" alt="" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-[#d1d5db]"><i className="fas fa-book-open" aria-hidden="true"></i></div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="mb-1 text-[10px] font-bold text-[#9ca3af]">{course.categoryLabel} · 수강 {course.enrollmentCount.toLocaleString('ko-KR')}명</p>
          <h3 className="mb-2 line-clamp-2 text-sm font-extrabold leading-snug text-[#111827]">{course.title}</h3>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#f3f4f6] pt-3">
          <div className="flex gap-2 text-xs font-bold text-[#6b7280]">
            {course.averageRating === null ? (
              <span className="text-[#9ca3af]">평가 없음</span>
            ) : (
              <span className="flex items-center gap-1 text-[#eab308]"><i className="fas fa-star" aria-hidden="true"></i> {course.averageRating.toFixed(1)}</span>
            )}
          </div>
          <span className="text-sm font-black text-[#111827]">{formatPrice(course)}</span>
        </div>
      </div>
    </a>
  )
}

export default function WelcomeHomeDashboard({ dashboard, error, greetingName, loading, onRetry }: WelcomeHomeDashboardProps) {
  const categories = useMemo(() => dashboard?.topCourseCategories ?? [], [dashboard])
  const [activeCategoryKey, setActiveCategoryKey] = useState('')
  const courseListRef = useRef<HTMLDivElement>(null)
  const [canScrollCoursesLeft, setCanScrollCoursesLeft] = useState(false)
  const [canScrollCoursesRight, setCanScrollCoursesRight] = useState(false)

  useEffect(() => {
    if (!categories.some((category) => category.key === activeCategoryKey)) {
      setActiveCategoryKey(categories[0]?.key ?? '')
    }
  }, [activeCategoryKey, categories])

  const activeCategory = useMemo(
    () => categories.find((category) => category.key === activeCategoryKey) ?? categories[0] ?? null,
    [activeCategoryKey, categories],
  )
  const currentLearning = dashboard?.currentLearning ?? null
  const projects = dashboard?.participatingProjects ?? []
  const recentCourses = dashboard?.recentCourses ?? []

  function updateCourseScrollButtons() {
    const courseList = courseListRef.current
    if (!courseList) return

    setCanScrollCoursesLeft(courseList.scrollLeft > 1)
    setCanScrollCoursesRight(courseList.scrollLeft + courseList.clientWidth < courseList.scrollWidth - 1)
  }

  function scrollCourses(direction: -1 | 1) {
    const courseList = courseListRef.current
    if (!courseList) return

    courseList.scrollBy({ left: direction * Math.max(courseList.clientWidth * 0.85, 320), behavior: 'smooth' })
  }

  useEffect(() => {
    const courseList = courseListRef.current
    if (!courseList) return

    courseList.scrollLeft = 0
    const frameId = window.requestAnimationFrame(updateCourseScrollButtons)
    window.addEventListener('resize', updateCourseScrollButtons)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateCourseScrollButtons)
    }
  }, [activeCategory])

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.25rem]! border border-[#e5e7eb] bg-white p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-250 ease-[ease] before:absolute before:-top-1/2 before:-left-1/2 before:size-[200%] before:bg-[radial-gradient(circle,rgba(0,196,113,0.08)_0%,rgba(255,255,255,0)_70%)] before:opacity-0 before:transition-opacity before:duration-500 before:content-[''] hover:-translate-y-0.5 hover:border-[#d1d5db] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.06)] hover:before:opacity-100">
          <div>
            <div className="mb-3 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75"></span><span className="relative inline-flex h-2 w-2 rounded-full bg-[#00c471]"></span></span>
              <span className="text-[10px] font-extrabold tracking-wider text-[#00c471] uppercase">Learning Status</span>
            </div>
            <h2 className="mb-2 text-xl leading-tight font-black text-[#111827]">{greetingName}님, 오늘도<br />성장을 이어가세요!</h2>
            <p className="line-clamp-1 text-[12px] font-medium text-[#6b7280]">
              {loading ? '학습 기록을 불러오는 중입니다.' : currentLearning?.lessonTitle ?? (error ? '학습 기록을 불러오지 못했습니다.' : '아직 학습 기록이 없습니다.')}
            </p>
            {currentLearning ? <p className="mt-1 truncate text-[10px] text-[#9ca3af]">{currentLearning.courseTitle}</p> : null}
          </div>
          <div className="mt-6">
            {currentLearning ? (
              <>
                <div className="mb-2 flex justify-between text-[11px] font-bold text-[#4b5563]"><span>강의 전체 진행률</span><span className="text-[#00c471]">{clampProgress(currentLearning.progressPercentage)}%</span></div>
                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[#f3f4f6] shadow-[inset_0_2px_4px_0_rgb(0_0_0/0.06)]"><div className="h-2 rounded-full bg-[#00c471]" style={{ width: `${clampProgress(currentLearning.progressPercentage)}%` }}></div></div>
                <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111827] py-3 text-sm! leading-5! font-bold text-white shadow-xs transition hover:bg-black" onClick={() => navigateTo(currentLearning.href)} type="button"><i className="fas fa-play text-xs text-[#4ade80]" aria-hidden="true"></i> 이어서 학습하기</button>
              </>
            ) : error ? (
              <button className="w-full cursor-pointer rounded-xl border border-[#d1d5db] py-3 text-xs! font-bold text-[#4b5563]" onClick={onRetry} type="button">다시 불러오기</button>
            ) : (
              <button className="w-full cursor-pointer rounded-xl bg-[#111827] py-3 text-sm! leading-5! font-bold text-white" onClick={() => navigateTo('/lecture-list')} type="button">강의 둘러보기</button>
            )}
          </div>
        </div>

        <div className="flex h-[320px] flex-col rounded-[1.25rem]! border border-[#e5e7eb] bg-white p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-250 ease-[ease] hover:-translate-y-0.5 hover:border-[#d1d5db] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#111827]"><i className="fas fa-layer-group text-[#3b82f6]" aria-hidden="true"></i> 참여 중인 프로젝트</h2><a href="/workspace-hub" className="text-[10px] font-bold text-[#9ca3af] hover:text-[#111827]">전체보기 <i className="fas fa-chevron-right ml-0.5 text-[8px]" aria-hidden="true"></i></a></div>
          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
            {loading ? <EmptyMessage>프로젝트를 불러오는 중입니다.</EmptyMessage> : error ? <EmptyMessage>프로젝트를 불러오지 못했습니다.</EmptyMessage> : projects.length === 0 ? <EmptyMessage>참여 중인 프로젝트가 없습니다.</EmptyMessage> : projects.map((project, index) => <ProjectCard key={project.projectId} project={project} index={index} />)}
          </div>
        </div>

        <div className="flex h-[320px] flex-col rounded-[1.25rem]! border border-[#e5e7eb] bg-white p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-250 ease-[ease] hover:-translate-y-0.5 hover:border-[#d1d5db] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#111827]"><i className="fas fa-history text-[#374151]" aria-hidden="true"></i> 최근 본 강의</h2><a href="/lecture-list" className="text-[10px] font-bold text-[#9ca3af] hover:text-[#111827]">더보기 <i className="fas fa-chevron-right ml-0.5 text-[8px]" aria-hidden="true"></i></a></div>
          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-1">
            {loading ? <EmptyMessage>최근 강의를 불러오는 중입니다.</EmptyMessage> : error ? <EmptyMessage>최근 강의를 불러오지 못했습니다.</EmptyMessage> : recentCourses.length === 0 ? <EmptyMessage>최근 시청한 강의가 없습니다.</EmptyMessage> : recentCourses.map((course) => (
              <a className="group flex cursor-pointer gap-3" href={course.href} key={course.courseId}>
                <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6]">{course.thumbnailUrl ? <img src={course.thumbnailUrl} className="h-full w-full object-cover transition group-hover:scale-105" alt="" /> : <div className="flex h-full items-center justify-center text-[#d1d5db]"><i className="fas fa-book-open" aria-hidden="true"></i></div>}<div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100"><i className="fas fa-play text-[10px] text-white" aria-hidden="true"></i></div></div>
                <div className="flex min-w-0 flex-1 flex-col justify-center"><h3 className="mb-1 truncate text-xs font-bold text-[#111827] transition group-hover:text-[#00c471]">{course.title}</h3><div className="flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-[#f3f4f6]"><div className="h-1 rounded-full bg-[#00c471]" style={{ width: `${clampProgress(course.progressPercentage)}%` }}></div></div><span className="shrink-0 text-[10px] font-bold text-[#6b7280]">{clampProgress(course.progressPercentage)}%</span></div></div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8">
        <div className="mb-5 flex flex-col items-start justify-between gap-4 px-1 sm:flex-row sm:items-end"><h2 className="flex items-center gap-2 text-xl font-extrabold text-[#111827]"><i className="fas fa-fire-alt text-[#ef4444]" aria-hidden="true"></i> 카테고리별 TOP 10 강의</h2><a href="/lecture-list" className="shrink-0 text-sm font-bold text-[#6b7280] transition hover:text-[#111827]">전체 강의 보기 <i className="fas fa-chevron-right ml-0.5 text-xs" aria-hidden="true"></i></a></div>
        {loading ? <EmptyMessage>인기 강의를 불러오는 중입니다.</EmptyMessage> : error ? <EmptyMessage>인기 강의를 불러오지 못했습니다.</EmptyMessage> : categories.length === 0 ? <EmptyMessage>현재 공개된 강의가 없습니다.</EmptyMessage> : (
          <>
            <div className="mb-2 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((category) => <button key={category.key} type="button" onClick={() => setActiveCategoryKey(category.key)} className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-[13px]! leading-[18px]! font-bold transition-all duration-200 ${activeCategory?.key === category.key ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#111827]'}`}>{category.label}</button>)}
              </div>
              <div className="flex shrink-0 gap-2" aria-label="TOP 10 강의 이동">
                <button type="button" aria-label="이전 강의 보기" disabled={!canScrollCoursesLeft} onClick={() => scrollCourses(-1)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#374151] shadow-xs transition hover:border-[#9ca3af] hover:bg-[#f9fafb] disabled:cursor-default disabled:opacity-35"><i className="fas fa-chevron-left text-xs" aria-hidden="true"></i></button>
                <button type="button" aria-label="다음 강의 보기" disabled={!canScrollCoursesRight} onClick={() => scrollCourses(1)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#374151] shadow-xs transition hover:border-[#9ca3af] hover:bg-[#f9fafb] disabled:cursor-default disabled:opacity-35"><i className="fas fa-chevron-right text-xs" aria-hidden="true"></i></button>
              </div>
            </div>
            <div ref={courseListRef} onScroll={updateCourseScrollButtons} data-testid="top-course-list" className="flex snap-x gap-5 overflow-x-auto pt-2 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activeCategory?.courses.length ? activeCategory.courses.map((course, index) => <TopCourseCard key={course.courseId} course={course} rank={index + 1} />) : <EmptyMessage>이 카테고리에 공개된 강의가 없습니다.</EmptyMessage>}
            </div>
          </>
        )}
      </div>
    </>
  )
}
