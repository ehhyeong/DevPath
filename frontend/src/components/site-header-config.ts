type HeaderSubLink = {
  href: string
  label: string
}

type HeaderLink = HeaderSubLink & {
  children?: HeaderSubLink[]
}

export const siteHeaderLinks: HeaderLink[] = [
  {
    href: '/roadmap-hub',
    label: '\uB85C\uB4DC\uB9F5',
    children: [
      { href: '/survey', label: '\uB85C\uB4DC\uB9F5 \uCD94\uCC9C' },
      { href: '/roadmap-hub', label: '\uB85C\uB4DC\uB9F5 \uD0D0\uC0C9' },
      { href: '/my-roadmap-list', label: '\uB0B4 \uB85C\uB4DC\uB9F5' },
    ],
  },
  { href: '/lecture-list', label: '\uAC15\uC758' },
  {
    href: '/lounge-dashboard',
    label: '\uD504\uB85C\uC81D\uD2B8',
    children: [
      { href: '/lounge-dashboard', label: '\uD504\uB85C\uC81D\uD2B8 \uB300\uC2DC\uBCF4\uB4DC' },
      { href: '/community-lounge', label: '\uB77C\uC6B4\uC9C0 (\uD300 \uCC3E\uAE30)' },
      { href: '/mentoring-hub', label: '\uBA58\uD1A0\uB9C1 \uCC3E\uAE30' },
      { href: '/workspace-hub', label: '\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4' },
      { href: '/dev-showcase', label: '\uB7F0\uCE6D \uC1FC\uCF00\uC774\uC2A4' },
    ],
  },
  { href: '/job-matching', label: '\uCC44\uC6A9\uBD84\uC11D' },
  {
    href: '/community-list',
    label: '\uCEE4\uBBA4\uB2C8\uD2F0',
    children: [
      { href: '/community-list?category=all', label: '\uC804\uCCB4\uAE00' },
      { href: '/community-list?category=qa', label: 'Q&A' },
      { href: '/community-list?category=tech', label: '\uAE30\uC220 \uACF5\uC720' },
      { href: '/community-list?category=career', label: '\uCEE4\uB9AC\uC5B4/\uC774\uC9C1' },
      { href: '/community-list?category=free', label: '\uC790\uC720\uAC8C\uC2DC\uD310' },
    ],
  },
]

export const instructorDashboardLinks: HeaderSubLink[] = [
  { href: '/instructor-dashboard', label: '\uB300\uC2DC\uBCF4\uB4DC' },
  { href: '/course-management', label: '\uAC15\uC758 \uAD00\uB9AC' },
  { href: '/instructor-mentoring', label: '\uBA58\uD1A0\uB9C1 \uAD00\uB9AC' },
  { href: '/student-analytics', label: '\uC218\uAC15\uC0DD \uBD84\uC11D' },
  { href: '/instructor-qna', label: '\uC9C8\uBB38 \uAC8C\uC2DC\uD310' },
  { href: '/instructor-reviews', label: '\uC218\uAC15\uD3C9 \uAD00\uB9AC' },
  { href: '/instructor-revenue', label: '\uC815\uC0B0 \uAD00\uB9AC' },
  { href: '/instructor-marketing', label: '\uB9C8\uCF00\uD305 \uAD00\uB9AC' },
]

// Edit only this object when you want pixel-level header tuning.
export const siteHeaderTuning = {
  maxWidthPx: null,
  horizontalPaddingPx: 32,
  containerGapPx: 32,
  sideWidthPx: 240,
  brandSlotOffsetXPx: -54,
  navBaseXPx: -30,
  navGapPx: 40,
  instructorGapPx: 40,
  instructorLinkGapPx: 24,
  headerGroup: { x: 0, y: 0 },
  brandGroup: { x: 50, y: 0 },
  navGroup: { x: -50, y: 0 },
  userGroup: { x: -50, y: 0 },
} as const
