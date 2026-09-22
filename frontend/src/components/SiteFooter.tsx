const serviceLinks = [
  { href: '/roadmap-hub', label: '로드맵' },
  { href: '/lecture-list', label: '강의' },
  { href: '/workspace-hub', label: '워크스페이스' },
  { href: '/job-matching', label: '채용 분석' },
]

const communityLinks = [
  { href: '/community-lounge', label: '라운지' },
  { href: '/mentoring-hub', label: '멘토링 찾기' },
  { href: '/dev-showcase', label: '쇼케이스' },
  { href: '/project-list', label: '프로젝트' },
]

const supportLinks = [
  { href: '/about', label: 'DevPath 소개' },
  { href: '#', label: '공지사항' },
  { href: '#', label: '자주 묻는 질문' },
  { href: '#', label: '문의하기' },
]

type SiteFooterProps = {
  onOpenNotices: () => void
}

export default function SiteFooter({ onOpenNotices }: SiteFooterProps) {
  return (
      <footer className="border-t border-gray-200 bg-gray-50 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="md:col-span-1">
              <a href="#" className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
                <i className="fas fa-code-branch text-brand" /> DevPath
              </a>
              <p className="text-sm leading-relaxed text-gray-500">
                개발자의 성장을 돕는 올인원 플랫폼.
                <br />
                Learn, Build, and Grow.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900">서비스</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {serviceLinks.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="hover:text-brand">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900">커뮤니티</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {communityLinks.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="hover:text-brand">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900">고객지원</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {supportLinks.map((item) => (
                  <li key={item.label}>
                    {item.label === '공지사항'
                      ? <button type="button" className="hover:text-brand" onClick={onOpenNotices}>{item.label}</button>
                      : <a href={item.href} className="hover:text-brand">{item.label}</a>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 text-center text-xs text-gray-400">
            &copy; 2026 DevPath Inc. All rights reserved.
          </div>
        </div>
      </footer>
  )
}
