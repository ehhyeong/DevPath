import { useEffect, useState } from 'react'
import { buildInstructorCourseOptions } from '../../instructor/course-display'
import { instructorCourseApi, instructorQnaApi } from '../../lib/api'
import { instructorNavItems, type InstructorNavItem, type InstructorPageKey } from '../navigation'

type SidebarColorTheme = 'blue' | 'orange' | 'teal' | 'purple' | 'yellow' | 'slate'
type InstructorNavItemSection = InstructorNavItem['section']

const sidebarMenuThemes: Record<InstructorPageKey, SidebarColorTheme> = {
  dashboard: 'blue',
  'course-management': 'orange',
  mentoring: 'teal',
  'student-analytics': 'purple',
  qna: 'blue',
  reviews: 'yellow',
  revenue: 'purple',
  marketing: 'slate',
}

const sections: InstructorNavItemSection[] = Array.from(
  new Set(instructorNavItems.map((item) => item.section)),
)

export default function InstructorSidebar({
  currentPageKey,
}: {
  currentPageKey: InstructorPageKey
}) {
  const [unansweredCount, setUnansweredCount] = useState<number | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    function loadUnansweredCount() {
      Promise.all([
        instructorQnaApi.getInbox('UNANSWERED', controller.signal),
        instructorCourseApi.getCourses(controller.signal),
      ])
        .then(([items, courses]) => {
          if (controller.signal.aborted) {
            return
          }

          const publishedCourseIds = new Set(
            buildInstructorCourseOptions(courses).map(([id]) => Number(id)),
          )
          const count = items.filter(
            (item) => item.courseId !== null && publishedCourseIds.has(item.courseId),
          ).length
          setUnansweredCount(count)
        })
        .catch(() => {})
    }

    loadUnansweredCount()
    window.addEventListener('devpath:instructor-qna-updated', loadUnansweredCount)

    return () => {
      controller.abort()
      window.removeEventListener('devpath:instructor-qna-updated', loadUnansweredCount)
    }
  }, [])

  return (
    <>
      <aside className="instructor-sidebar">
        <div className="sidebar-sticky-content">
          <nav className="sidebar-nav hide-scroll">
            {sections.map((section) => (
              <div key={section} className="sidebar-section">
                <p className="sidebar-section-title">{section}</p>
                <ul className="sidebar-menu-list">
                  {instructorNavItems
                    .filter((item) => item.section === section)
                    .map((item) => {
                      const active = item.key === currentPageKey
                      const badge = item.key === 'qna' && unansweredCount != null && unansweredCount > 0
                        ? String(unansweredCount)
                        : null

                      return (
                        <li key={item.key}>
                          <a
                            href={item.href}
                            className={`sidebar-menu-item theme-${sidebarMenuThemes[item.key]} ${active ? 'active' : ''}`}
                            aria-current={active ? 'page' : undefined}
                          >
                            <span className="menu-icon">
                              <i className={item.icon} />
                            </span>
                            <span className="menu-label">{item.label}</span>
                            {badge ? <span className="menu-badge">{badge}</span> : null}
                          </a>
                        </li>
                      )
                    })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="help-button" onClick={() => setIsGuideOpen(true)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              강사 가이드
            </button>
          </div>
        </div>
      </aside>

      {isGuideOpen ? (
        <div className="guide-modal-overlay" onClick={() => setIsGuideOpen(false)}>
          <div className="guide-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📖 DevPath 강사 가이드</h3>
              <button type="button" className="close-btn" onClick={() => setIsGuideOpen(false)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="guide-card">
                <h4>🚀 첫 강의 등록하기</h4>
                <p>좌측 '강의 관리' 메뉴에서 [새 강의 만들기]를 클릭하여 커리큘럼과 영상을 업로드할 수 있습니다.</p>
              </div>
              <div className="guide-card">
                <h4>👥 수강생 소통 방법</h4>
                <p>'수강생 관리' 메뉴에서 질문에 답변하고, 공지사항을 등록하여 학생들과 소통해 보세요.</p>
              </div>
              <div className="guide-card">
                <h4>💰 정산 및 수익 확인</h4>
                <p>매월 1일, '통계 및 수익' 탭에서 지난달의 수익 리포트를 확인하고 정산을 신청할 수 있습니다.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="primary-btn" onClick={() => setIsGuideOpen(false)}>
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
