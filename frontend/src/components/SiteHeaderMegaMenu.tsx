import type { CSSProperties } from 'react'

type MegaMenuItem = {
  href: string
  label: string
}

type SiteHeaderMegaMenuProps = {
  links: (MegaMenuItem & { children?: MegaMenuItem[] })[]
  activeHref?: string | null
  style?: CSSProperties
}

export default function SiteHeaderMegaMenu({ links, activeHref, style }: SiteHeaderMegaMenuProps) {
  const groups = links.filter((link) => link.children?.length)

  return (
    <div className="site-header-navigation" style={{ ...style, gridTemplateColumns: `repeat(${links.length}, max-content)` }}>
      {links.map((item, index) => {
        const active = activeHref === item.href || item.children?.some((child) => activeHref === child.href.split('?')[0])

        return (
          <a
            key={item.href}
            href={item.href}
            className={`site-header-nav-link${active ? ' site-header-nav-link--active' : ''}`}
            aria-haspopup={groups.length ? 'menu' : undefined}
            style={{ gridColumn: index + 1, gridRow: 1 }}
          >
            {item.label}
            {item.children?.length ? <i className="fas fa-chevron-down site-header-nav-chevron" aria-hidden="true" /> : null}
          </a>
        )
      })}
      <div className="site-header-mega-menu">
        <div className="site-header-mega-panel">
          {links.map((group, index) => group.children?.length ? (
            <div key={group.href} role="menu" aria-label={`${group.label} 세부 메뉴`} style={{ gridColumn: index + 1 }}>
              <div className="site-header-mega-links">
                {group.children?.map((item) => (
                  <a key={item.href + item.label} href={item.href} className="site-header-mega-link" role="menuitem">
                    <span className="site-header-mega-link-label">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  )
}
