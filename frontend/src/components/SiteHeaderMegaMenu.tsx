type MegaMenuItem = {
  href: string
  label: string
}

type SiteHeaderMegaMenuProps = {
  label: string
  items: MegaMenuItem[]
}

const iconClassByHref: Record<string, string> = {
  '/survey': 'fas fa-wand-magic-sparkles',
  '/roadmap-hub': 'fas fa-route',
  '/my-roadmap-list': 'fas fa-map-marked-alt',
  '/lounge-dashboard': 'fas fa-chart-pie',
  '/community-lounge': 'fas fa-users',
  '/mentoring-hub': 'fas fa-chalkboard-teacher',
  '/workspace-hub': 'fas fa-layer-group',
  '/dev-showcase': 'fas fa-rocket',
  '/community-list?category=all': 'fas fa-border-all',
  '/community-list?category=qa': 'fas fa-circle-question',
  '/community-list?category=tech': 'fas fa-code',
  '/community-list?category=career': 'fas fa-briefcase',
  '/community-list?category=free': 'fas fa-comments',
  '/instructor-dashboard': 'fas fa-tachometer-alt',
  '/course-management': 'fas fa-book-open',
  '/instructor-mentoring': 'fas fa-people-arrows',
  '/student-analytics': 'fas fa-chart-line',
  '/instructor-qna': 'fas fa-comment-alt',
  '/instructor-reviews': 'fas fa-star',
  '/instructor-revenue': 'fas fa-coins',
  '/instructor-marketing': 'fas fa-bullhorn',
}

export default function SiteHeaderMegaMenu({ label, items }: SiteHeaderMegaMenuProps) {
  return (
    <div className="site-header-mega-menu" role="menu" aria-label={`${label} 세부 메뉴`}>
      <div className="site-header-mega-panel">
        <div className="site-header-mega-heading">
          <div>
            <span className="site-header-mega-eyebrow">DEVPATH NAVIGATION</span>
            <strong className="site-header-mega-title">{label}</strong>
          </div>
        </div>

        <div className="site-header-mega-links">
          {items.map((item) => (
            <a key={item.href + item.label} href={item.href} className="site-header-mega-link" role="menuitem">
              <span className="site-header-mega-link-icon" aria-hidden="true">
                <i className={iconClassByHref[item.href] ?? 'fas fa-external-link-alt'} />
              </span>
              <span className="site-header-mega-link-label">{item.label}</span>
              <span className="site-header-mega-link-arrow" aria-hidden="true">
                <i className="fas fa-chevron-right" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
