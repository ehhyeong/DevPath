import type { CSSProperties } from 'react'
import { getHeaderActiveHref } from './site-header-config'

type MegaMenuItem = {
  href: string
  label: string
}

type SiteHeaderMegaMenuProps = {
  links: (MegaMenuItem & { children?: (MegaMenuItem & { icon: string })[] })[]
  activeHref?: string | null
  style?: CSSProperties
}

export default function SiteHeaderMegaMenu({ links, activeHref, style }: SiteHeaderMegaMenuProps) {
  const currentHref = getHeaderActiveHref(activeHref ?? window.location.pathname)
  return (
    <div className="site-header-navigation" style={{ ...style, gridTemplateColumns: `repeat(${links.length}, max-content)` }}>
      {links.map((item) => {
        const active = currentHref === item.href || item.children?.some((child) => currentHref === child.href.split('?')[0])

        return (
          <div key={item.href} className="site-header-nav-group">
            <a
              href={item.href}
              className={`site-header-nav-link${active ? ' site-header-nav-link--active' : ''}`}
              aria-current={active ? 'true' : undefined}
              aria-haspopup={item.children?.length ? 'menu' : undefined}
            >
              {item.label}
              {item.children?.length ? <i className="fas fa-chevron-down site-header-nav-chevron" aria-hidden="true" /> : null}
            </a>
            {item.children?.length ? (
              <div className="site-header-mega-menu">
                <div className="site-header-mega-panel" role="menu" aria-label={`${item.label} 세부 메뉴`}>
                  <div className="site-header-mega-links">
                    {item.children.map((child) => (
                      <a key={child.href + child.label} href={child.href} className="site-header-mega-link" role="menuitem">
                        <i className={`${child.icon} site-header-mega-link-icon`} aria-hidden="true" />
                        <span className="site-header-mega-link-label">{child.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
