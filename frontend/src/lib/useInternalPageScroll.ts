import { useEffect } from 'react'

export function useInternalPageScroll() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    html.classList.add('internal-page-scroll-document')
    body.classList.add('internal-page-scroll-body')

    return () => {
      html.classList.remove('internal-page-scroll-document')
      body.classList.remove('internal-page-scroll-body')
    }
  }, [])
}
